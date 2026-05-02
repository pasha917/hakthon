"""
Authentication & email OTP for Cofoundry.
JWT (Bearer) based. Custom email/password + OTP-via-Gmail-SMTP forgot password.
"""
from fastapi import APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime, timezone, timedelta
import os
import jwt
import bcrypt
import secrets
import smtplib
import asyncio
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

JWT_ALGORITHM = "HS256"
ACCESS_TTL_MIN = 60 * 24 * 7  # 7 days

bearer_scheme = HTTPBearer(auto_error=False)


# -------- Pydantic models --------
class SignupIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: Optional[str] = None

class LoginIn(BaseModel):
    email: EmailStr
    password: str

class ForgotIn(BaseModel):
    email: EmailStr

class VerifyOtpIn(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=4, max_length=8)
    new_password: str = Field(min_length=6, max_length=128)


# -------- Helpers --------
def hash_password(pwd: str) -> str:
    return bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(pwd: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pwd.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def _jwt_secret() -> str:
    s = os.environ.get("JWT_SECRET")
    if not s:
        raise HTTPException(status_code=500, detail="JWT secret not configured")
    return s

def create_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "iat": datetime.now(timezone.utc),
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TTL_MIN),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm=JWT_ALGORITHM)

def _user_public(u: dict) -> dict:
    return {
        "id": u.get("id") or u.get("_id"),
        "email": u.get("email"),
        "name": u.get("name") or "",
        "created_at": u.get("created_at"),
    }


# -------- SMTP OTP sender --------
def _send_otp_email_sync(to_email: str, otp: str):
    host = os.environ.get("SMTP_HOST", "smtp.gmail.com")
    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASS")
    from_name = os.environ.get("SMTP_FROM_NAME", "Cofoundry")
    if not user or not password:
        raise RuntimeError("SMTP credentials missing")

    subj = "Your Cofoundry password reset code"
    html = f"""
    <html><body style="margin:0;padding:0;background:#0b0b14;font-family:Arial,sans-serif;color:#f4efe2">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:40px 20px">
        <tr><td align="center">
          <table role="presentation" width="540" cellspacing="0" cellpadding="0"
            style="background:linear-gradient(135deg,#13131e,#0b0b14);border:1px solid #2a2a3a;border-radius:24px;padding:40px;box-shadow:0 20px 60px rgba(0,0,0,.5)">
            <tr><td>
              <div style="font-size:11px;letter-spacing:3px;color:#e6c870;text-transform:uppercase;font-weight:700">Cofoundry</div>
              <h1 style="font-size:28px;color:#fff;margin:8px 0 4px">Your reset code</h1>
              <p style="color:#aaa9b6;margin:0 0 28px">Use this 6-digit code to reset your password. It expires in 10 minutes.</p>
              <div style="background:rgba(230,200,112,.1);border:1px solid rgba(230,200,112,.35);border-radius:18px;padding:28px;text-align:center">
                <div style="font-size:42px;letter-spacing:14px;color:#e6c870;font-weight:800">{otp}</div>
              </div>
              <p style="color:#7a7a86;font-size:13px;margin:28px 0 0">If you didn't request this, ignore this email. Your account is safe.</p>
              <p style="color:#7a7a86;font-size:11px;margin:24px 0 0">— Sent by {from_name}</p>
            </td></tr>
          </table>
        </td></tr>
      </table>
    </body></html>
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subj
    msg["From"] = f"{from_name} <{user}>"
    msg["To"] = to_email
    msg.attach(MIMEText(f"Your Cofoundry reset code is {otp}. It expires in 10 minutes.", "plain"))
    msg.attach(MIMEText(html, "html"))

    server = smtplib.SMTP(host, port, timeout=20)
    try:
        server.ehlo()
        server.starttls()
        server.login(user, password)
        server.sendmail(user, [to_email], msg.as_string())
    finally:
        try:
            server.quit()
        except Exception:
            pass


async def send_otp_email(to_email: str, otp: str):
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, _send_otp_email_sync, to_email, otp)
    except Exception as e:
        logger.exception("OTP email failed")
        raise HTTPException(status_code=502, detail=f"Email send failed: {e}")


# -------- Router factory --------
def build_router(db) -> APIRouter:
    router = APIRouter(prefix="/api/auth", tags=["auth"])

    async def _ensure_indexes():
        try:
            await db.users.create_index("email", unique=True)
            await db.password_otps.create_index("expires_at", expireAfterSeconds=0)
        except Exception:
            logger.warning("Index creation skipped")

    asyncio.get_event_loop().create_task(_ensure_indexes())

    async def _get_current_user(creds: HTTPAuthorizationCredentials = Depends(bearer_scheme)) -> dict:
        if not creds or not creds.credentials:
            raise HTTPException(status_code=401, detail="Not authenticated")
        try:
            payload = jwt.decode(creds.credentials, _jwt_secret(), algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            raise HTTPException(status_code=401, detail="Token expired")
        except jwt.InvalidTokenError:
            raise HTTPException(status_code=401, detail="Invalid token")
        user = await db.users.find_one({"id": payload.get("sub")}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user

    @router.post("/signup")
    async def signup(payload: SignupIn):
        email = payload.email.lower().strip()
        existing = await db.users.find_one({"email": email}, {"_id": 0})
        if existing:
            raise HTTPException(status_code=409, detail="Account already exists. Please log in.")
        import uuid
        uid = str(uuid.uuid4())
        doc = {
            "id": uid,
            "email": email,
            "name": (payload.name or "").strip() or email.split("@")[0],
            "password_hash": hash_password(payload.password),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(doc)
        token = create_token(uid, email)
        return {"token": token, "user": _user_public(doc)}

    @router.post("/login")
    async def login(payload: LoginIn):
        email = payload.email.lower().strip()
        user = await db.users.find_one({"email": email}, {"_id": 0})
        if not user or not verify_password(payload.password, user.get("password_hash", "")):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_token(user["id"], email)
        return {"token": token, "user": _user_public(user)}

    @router.get("/me")
    async def me(user: dict = Depends(_get_current_user)):
        return {"user": _user_public(user)}

    @router.post("/forgot-password")
    async def forgot(payload: ForgotIn):
        email = payload.email.lower().strip()
        user = await db.users.find_one({"email": email}, {"_id": 0})
        # Don't reveal if account exists; but we DO send for existing.
        if not user:
            return {"sent": True, "message": "If an account exists, a code has been sent."}
        otp = f"{secrets.randbelow(900000) + 100000:06d}"
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
        await db.password_otps.update_one(
            {"email": email},
            {"$set": {
                "email": email,
                "otp_hash": hash_password(otp),
                "expires_at": expires_at,
                "attempts": 0,
                "created_at": datetime.now(timezone.utc),
            }},
            upsert=True,
        )
        await send_otp_email(email, otp)
        return {"sent": True, "message": "OTP sent to your email."}

    @router.post("/verify-otp")
    async def verify_otp(payload: VerifyOtpIn):
        email = payload.email.lower().strip()
        rec = await db.password_otps.find_one({"email": email}, {"_id": 0})
        if not rec:
            raise HTTPException(status_code=400, detail="No reset code requested. Tap 'Forgot password' to receive one.")
        if rec.get("attempts", 0) >= 5:
            await db.password_otps.delete_one({"email": email})
            raise HTTPException(status_code=429, detail="Too many attempts. Request a new code.")
        # Expiry check (defensive — TTL handles it but we may run early)
        exp = rec.get("expires_at")
        if isinstance(exp, datetime) and exp.tzinfo is None:
            exp = exp.replace(tzinfo=timezone.utc)
        if exp and exp < datetime.now(timezone.utc):
            await db.password_otps.delete_one({"email": email})
            raise HTTPException(status_code=410, detail="Code expired. Request a new one.")
        if not verify_password(payload.otp.strip(), rec.get("otp_hash", "")):
            await db.password_otps.update_one({"email": email}, {"$inc": {"attempts": 1}})
            raise HTTPException(status_code=401, detail="Invalid OTP. Try again.")
        # Reset password
        await db.users.update_one({"email": email}, {"$set": {"password_hash": hash_password(payload.new_password)}})
        await db.password_otps.delete_one({"email": email})
        user = await db.users.find_one({"email": email}, {"_id": 0})
        token = create_token(user["id"], email)
        return {"token": token, "user": _user_public(user), "message": "Password updated."}

    return router
