"""
Backend tests for:
  - Auth endpoints: /api/auth/signup, /login, /me, /forgot-password, /verify-otp
  - New AI endpoints: /api/investor-emails, /api/legal-checklist, /api/personas
  - Existing endpoints regression: /api/pitch-deck, /api/tech-stack, /api/marketing-plan,
    /api/pitch-practice, /api/tts, /api/generate-logo

Uses existing session_id 87310059-5f64-4a16-b593-c3f63118e8f7 (full 5-step flow).
"""
import os
import uuid
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path("/app/frontend/.env"))
BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

LLM_TIMEOUT = 90
LOGO_TIMEOUT = 120
EXISTING_SESSION_ID = "87310059-5f64-4a16-b593-c3f63118e8f7"

DEMO_EMAIL = "demo@bubblepilot.app"
DEMO_PASSWORD = "demo1234"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def state():
    return {}


# =======================================================================
# AUTH TESTS
# =======================================================================

# ---------- signup ----------
def test_signup_creates_user_and_returns_token(client, state):
    email = f"test-{uuid.uuid4().hex[:10]}@bubblepilot.app"
    password = "Str0ngPass!"
    r = client.post(
        f"{BASE_URL}/api/auth/signup",
        json={"email": email, "password": password, "name": "Test User"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert "token" in data and isinstance(data["token"], str) and len(data["token"]) > 20
    assert "user" in data
    user = data["user"]
    assert user.get("email") == email
    assert user.get("name") == "Test User"
    assert isinstance(user.get("id"), str) and user["id"]
    # stash for downstream tests
    state["signup_email"] = email
    state["signup_password"] = password
    state["signup_token"] = data["token"]
    state["signup_user_id"] = user["id"]


def test_signup_duplicate_returns_409(client, state):
    email = state.get("signup_email")
    assert email, "signup must run first"
    r = client.post(
        f"{BASE_URL}/api/auth/signup",
        json={"email": email, "password": "whatever123", "name": "Dup"},
        timeout=15,
    )
    assert r.status_code == 409, r.text
    body = r.json()
    assert "detail" in body
    assert "already" in body["detail"].lower() or "exists" in body["detail"].lower()


# ---------- login ----------
def test_login_success(client, state):
    email = state.get("signup_email")
    password = state.get("signup_password")
    r = client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert isinstance(data.get("token"), str) and data["token"]
    assert data["user"]["email"] == email
    state["login_token"] = data["token"]


def test_login_wrong_password_returns_401(client, state):
    email = state.get("signup_email")
    r = client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": "definitely-wrong-pwd-123"},
        timeout=15,
    )
    assert r.status_code == 401, r.text
    body = r.json()
    assert "detail" in body
    assert "invalid" in body["detail"].lower()


def test_login_demo_user(client, state):
    """Verify pre-seeded demo user still works."""
    r = client.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["user"]["email"] == DEMO_EMAIL
    assert data.get("token")
    state["demo_token"] = data["token"]


# ---------- /me ----------
def test_me_with_valid_token(client, state):
    token = state.get("login_token")
    assert token
    r = client.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=15,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "user" in data
    assert data["user"]["email"] == state["signup_email"]
    assert "_id" not in data
    assert "password_hash" not in data["user"]


def test_me_without_token_returns_401(client):
    r = client.get(f"{BASE_URL}/api/auth/me", timeout=15)
    assert r.status_code == 401, r.text


def test_me_with_invalid_token_returns_401(client):
    r = client.get(
        f"{BASE_URL}/api/auth/me",
        headers={"Authorization": "Bearer not.a.valid.token"},
        timeout=15,
    )
    assert r.status_code == 401, r.text


# ---------- forgot password ----------
def test_forgot_password_non_existent_returns_200_generic(client):
    """Non-existent email should return generic success (no leak)."""
    r = client.post(
        f"{BASE_URL}/api/auth/forgot-password",
        json={"email": f"nonexistent-{uuid.uuid4().hex[:8]}@bubblepilot.app"},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("sent") is True


def test_forgot_password_existing_user_reaches_smtp(client, state):
    """
    For an existing email, the handler creates an OTP record then attempts SMTP send.
    Per problem statement, Gmail creds are invalid -> expect 502 with BadCredentials detail
    (NOT a crash, NOT 500). If SMTP has been fixed, accept 200.
    """
    email = state.get("signup_email")
    assert email
    r = client.post(
        f"{BASE_URL}/api/auth/forgot-password",
        json={"email": email},
        timeout=40,
    )
    assert r.status_code in (200, 502), f"unexpected status {r.status_code}: {r.text}"
    if r.status_code == 502:
        detail = (r.json().get("detail") or "").lower()
        # Accept any SMTP auth/creds failure signature
        assert ("badcredentials" in detail
                or "authentication" in detail
                or "email send failed" in detail
                or "smtp" in detail), f"unexpected 502 detail: {detail}"
    else:
        assert r.json().get("sent") is True


# ---------- verify-otp ----------
def test_verify_otp_bogus_without_request_returns_400(client):
    """User that never called forgot-password should get 400 'No reset code requested'."""
    fresh_email = f"never-requested-{uuid.uuid4().hex[:8]}@bubblepilot.app"
    r = client.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json={"email": fresh_email, "otp": "000000", "new_password": "NewPass123"},
        timeout=15,
    )
    assert r.status_code == 400, r.text
    body = r.json()
    assert "no reset code" in body.get("detail", "").lower()


def test_verify_otp_with_bogus_otp_after_forgot_returns_401(client, state):
    """
    If forgot-password successfully stored an OTP record (even though email send
    failed, record is still upserted BEFORE send). Bogus OTP -> 401 Invalid OTP.
    If record wasn't created (SMTP failure aborted the request), we'd see 400.
    Both are acceptable per the request spec.
    """
    email = state.get("signup_email")
    r = client.post(
        f"{BASE_URL}/api/auth/verify-otp",
        json={"email": email, "otp": "000000", "new_password": "NewPass123"},
        timeout=15,
    )
    assert r.status_code in (400, 401), r.text
    detail = (r.json().get("detail") or "").lower()
    if r.status_code == 401:
        assert "invalid otp" in detail
    else:
        assert "no reset code" in detail


# =======================================================================
# NEW AI ENDPOINTS
# =======================================================================

def test_investor_emails(client):
    r = client.post(
        f"{BASE_URL}/api/investor-emails",
        json={
            "session_id": EXISTING_SESSION_ID,
            "investor_name": "Sarah Kim",
            "fund_name": "Sequoia",
        },
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert data.get("session_id") == EXISTING_SESSION_ID
    emails = data.get("emails")
    assert isinstance(emails, list) and len(emails) == 3, f"expected 3 emails got {len(emails) if isinstance(emails,list) else emails}"
    for e in emails:
        for k in ("angle", "subject", "body"):
            assert k in e and isinstance(e[k], str) and e[k].strip(), f"missing/empty {k} in {e}"


def test_legal_checklist(client):
    r = client.post(
        f"{BASE_URL}/api/legal-checklist",
        json={"session_id": EXISTING_SESSION_ID, "country": "India"},
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert data.get("session_id") == EXISTING_SESSION_ID
    for key in ("incorporation", "ip_protection", "compliance"):
        assert key in data, f"missing {key}"
        assert isinstance(data[key], list) and len(data[key]) >= 1
        for item in data[key]:
            for k in ("item", "why", "priority"):
                assert k in item and isinstance(item[k], str) and item[k]
    assert isinstance(data.get("contracts_needed"), list) and len(data["contracts_needed"]) >= 1
    assert isinstance(data.get("first_3_steps"), list) and len(data["first_3_steps"]) >= 1


def test_personas(client):
    r = client.post(
        f"{BASE_URL}/api/personas",
        json={"session_id": EXISTING_SESSION_ID},
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert data.get("session_id") == EXISTING_SESSION_ID
    personas = data.get("personas")
    assert isinstance(personas, list) and len(personas) == 3, f"expected 3 personas got {len(personas) if isinstance(personas,list) else personas}"
    for p in personas:
        for k in ("name", "role", "age", "goals", "pains", "killer_quote"):
            assert k in p, f"missing {k} in persona {p}"
        assert isinstance(p["goals"], list) and len(p["goals"]) >= 1
        assert isinstance(p["pains"], list) and len(p["pains"]) >= 1
        assert isinstance(p["killer_quote"], str) and p["killer_quote"]


# =======================================================================
# EXISTING ENDPOINTS REGRESSION
# =======================================================================

def test_pitch_deck_existing(client):
    r = client.post(
        f"{BASE_URL}/api/pitch-deck",
        json={"session_id": EXISTING_SESSION_ID, "brand_name": "RainSense"},
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert data["session_id"] == EXISTING_SESSION_ID
    assert isinstance(data.get("tagline"), str) and data["tagline"]
    slides = data.get("slides")
    assert isinstance(slides, list) and len(slides) == 10
    for s in slides:
        assert "n" in s and "title" in s and "bullets" in s
        assert isinstance(s["bullets"], list) and len(s["bullets"]) >= 1


def test_tech_stack_existing(client):
    r = client.post(
        f"{BASE_URL}/api/tech-stack",
        json={"session_id": EXISTING_SESSION_ID},
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    stack = data.get("stack")
    assert isinstance(stack, list) and len(stack) >= 5
    for s in stack:
        for k in ("category", "choice", "why", "monthly_cost_usd"):
            assert k in s
    milestones = data.get("milestones")
    assert isinstance(milestones, list) and len(milestones) >= 3
    assert isinstance(data.get("total_monthly_cost_usd"), (int, float))
    assert isinstance(data.get("build_time_weeks"), (int, float))


def test_marketing_plan_existing(client):
    r = client.post(
        f"{BASE_URL}/api/marketing-plan",
        json={"session_id": EXISTING_SESSION_ID},
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert isinstance(data.get("north_star_metric"), str) and data["north_star_metric"]
    channels = data.get("channels")
    assert isinstance(channels, list) and len(channels) >= 4
    for c in channels:
        for k in ("channel", "priority", "kpi"):
            assert k in c
    for day_key in ("30_days", "60_days", "90_days"):
        assert day_key in data and isinstance(data[day_key], list) and len(data[day_key]) >= 1


def test_pitch_practice_existing(client):
    r = client.post(
        f"{BASE_URL}/api/pitch-practice",
        json={
            "session_id": EXISTING_SESSION_ID,
            "message": "Hi, I'm building a low-cost rainfall prediction sensor for small farmers.",
            "persona": "tough",
        },
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data.get("reply"), str) and len(data["reply"]) > 0
    assert data.get("session_id") == EXISTING_SESSION_ID


def test_tts_returns_audio(client):
    r = client.post(
        f"{BASE_URL}/api/tts",
        json={"text": "Hello world from BubblePilot.", "voice": "nova"},
        timeout=60,
    )
    assert r.status_code == 200, r.text
    assert r.headers.get("content-type", "").startswith("audio/mpeg")
    assert len(r.content) > 1000, f"audio too small: {len(r.content)} bytes"


def test_generate_logo_returns_base64(client):
    r = client.post(
        f"{BASE_URL}/api/generate-logo",
        json={
            "session_id": EXISTING_SESSION_ID,
            "brand_name": "RainSense",
            "style": "modern, minimal",
            "palette": "navy, gold",
        },
        timeout=LOGO_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert data.get("brand_name") == "RainSense"
    assert data.get("mime_type", "").startswith("image/")
    b64 = data.get("image_b64")
    assert isinstance(b64, str) and len(b64) > 2000, f"image_b64 too short: {len(b64) if b64 else 0}"


# ---------- existing 5-step flow quick smoke ----------
def test_session_persistence_existing(client):
    r = client.get(f"{BASE_URL}/api/session/{EXISTING_SESSION_ID}", timeout=15)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert "_id" not in doc
    assert doc.get("session_id") == EXISTING_SESSION_ID
    # Should have all 5 steps (per problem statement this is a complete flow)
    for step in ("step1", "step2", "step3", "step4", "step5"):
        assert step in doc, f"{step} missing"
