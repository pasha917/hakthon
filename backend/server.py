from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File
from fastapi.responses import StreamingResponse, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import io
import json
import re
import base64
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai import OpenAISpeechToText, OpenAITextToSpeech
from auth import build_router as build_auth_router


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')
LLM_MODEL = "claude-sonnet-4-5-20250929"
LLM_PROVIDER = "anthropic"

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ================== MODELS ==================

class IdeaInput(BaseModel):
    idea: str
    session_id: Optional[str] = None

class ProblemPick(BaseModel):
    session_id: str
    selected_problem: Dict[str, Any]
    refined_idea: str

class SupportRequest(BaseModel):
    session_id: str
    domain: str
    country: Optional[str] = "India"

class VerdictRequest(BaseModel):
    session_id: Optional[str] = None

class VoiceChatInput(BaseModel):
    session_id: Optional[str] = None
    message: str
    language: Optional[str] = None


# ================== HELPERS ==================

def _extract_json(text: str) -> Any:
    """Extract first JSON object/array from an LLM response."""
    if not text:
        raise ValueError("Empty LLM response")
    # Strip markdown fences
    text = text.strip()
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    if fence:
        text = fence.group(1).strip()
    # Find first { ... } or [ ... ] block
    start_obj = text.find("{")
    start_arr = text.find("[")
    candidates = [i for i in (start_obj, start_arr) if i != -1]
    if not candidates:
        raise ValueError("No JSON found in response")
    start = min(candidates)
    snippet = text[start:]
    # Try parsing progressively
    for end in range(len(snippet), 0, -1):
        try:
            return json.loads(snippet[:end])
        except json.JSONDecodeError:
            continue
    raise ValueError("Failed to parse JSON from LLM response")


async def _llm_json(system_prompt: str, user_prompt: str, session_id: str, model: Optional[str] = None) -> Any:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model(LLM_PROVIDER, model or LLM_MODEL)
    msg = UserMessage(text=user_prompt)
    try:
        response = await chat.send_message(msg)
    except Exception as e:
        logging.exception("LLM call failed")
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    try:
        return _extract_json(response)
    except Exception as e:
        logging.error("JSON parse failed. Raw: %s", response[:500])
        raise HTTPException(status_code=502, detail=f"LLM returned invalid JSON: {e}")


async def _save_session(session_id: str, update: Dict[str, Any]):
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.sessions.update_one(
        {"session_id": session_id},
        {"$set": update, "$setOnInsert": {"session_id": session_id,
                                          "created_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )


async def _get_session(session_id: str) -> Dict[str, Any]:
    doc = await db.sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return doc


# ================== ROUTES ==================

@api_router.get("/")
async def root():
    return {"message": "AI Startup Advisor API", "status": "ok"}


@api_router.post("/analyze-idea")
async def analyze_idea(payload: IdeaInput):
    """Step 1: Analyze raw idea -> suggest domain/field + surface 4 world problems."""
    session_id = payload.session_id or str(uuid.uuid4())
    system = (
        "You are an expert startup analyst. Always respond with STRICT valid JSON only, "
        "no prose, no markdown fences."
    )
    user = f"""
The user has this rough startup idea:
\"\"\"{payload.idea}\"\"\"

1) Identify the single best-fit INDUSTRY / FIELD for this idea.
2) Explain in 2-3 sentences why this field suits the idea.
3) Generate EXACTLY 4 real, high-impact WORLD PROBLEMS in that field that a founder could realistically tackle.

Return JSON with this exact schema:
{{
  "domain": "string",
  "why_fit": "string",
  "tags": ["tag1","tag2","tag3"],
  "problems": [
    {{"id":"p1","title":"short punchy title","impact":"who is affected + scale","severity":"High|Medium|Low","summary":"2-3 sentence explanation"}},
    {{"id":"p2","title":"...","impact":"...","severity":"...","summary":"..."}},
    {{"id":"p3","title":"...","impact":"...","severity":"...","summary":"..."}},
    {{"id":"p4","title":"...","impact":"...","severity":"...","summary":"..."}}
  ]
}}
"""
    data = await _llm_json(system, user, session_id, model="claude-haiku-4-5-20251001")
    await _save_session(session_id, {"step1": {"idea": payload.idea, "result": data}})
    return {"session_id": session_id, **data}


@api_router.post("/analyze-problem")
async def analyze_problem(payload: ProblemPick):
    """Step 3: Given selected problem + refined idea, run deep analysis."""
    system = (
        "You are a seasoned startup mentor with VC & product expertise. "
        "Respond with STRICT valid JSON only, no prose, no markdown fences."
    )
    user = f"""
Selected world problem: {json.dumps(payload.selected_problem)}

User's refined startup idea to solve it:
\"\"\"{payload.refined_idea}\"\"\"

Analyze deeply and return JSON with this exact schema:
{{
  "novelty_score": 0-100,
  "market_fit_score": 0-100,
  "one_line_pitch": "string",
  "existing_players": [
    {{"name":"...","url":"...","how_they_do_it":"1 line","gap_you_can_exploit":"1 line"}}
  ],
  "unique_angles": ["3-5 concrete differentiators the user can add"],
  "what_to_learn": [
    {{"skill":"...","why":"...","resource":"title or link"}}
  ],
  "things_to_keep_in_mind": ["5 critical caveats, risks, legal/ethical notes"],
  "next_actions": ["3-5 immediate concrete actions the founder should take this week"]
}}
Return between 3 and 5 items for existing_players and what_to_learn.
"""
    data = await _llm_json(system, user, payload.session_id, model="claude-haiku-4-5-20251001")
    await _save_session(payload.session_id, {
        "step2": {"selected_problem": payload.selected_problem},
        "step3": {"refined_idea": payload.refined_idea, "result": data},
    })
    return {"session_id": payload.session_id, **data}


@api_router.post("/support-resources")
async def support_resources(payload: SupportRequest):
    """Step 4: Govt schemes + financial / grant support matching domain."""
    system = (
        "You are a startup-funding research assistant with deep knowledge of government "
        "schemes, grants, accelerators and financial institutions globally. "
        "Respond with STRICT valid JSON only."
    )
    user = f"""
Domain / field: {payload.domain}
Founder country: {payload.country}

Return 8 REAL, well-known support resources (government portals, startup schemes,
grants, accelerators, banks offering startup loans). Prioritize country-specific ones,
then global.

JSON schema:
{{
  "resources": [
    {{
      "name":"...",
      "kind":"Government|Grant|Accelerator|Bank|NGO",
      "country":"...",
      "url":"https://...",
      "what_it_offers":"1-2 lines",
      "eligibility":"short summary",
      "why_relevant":"why it fits this domain"
    }}
  ]
}}
"""
    data = await _llm_json(system, user, payload.session_id, model="claude-haiku-4-5-20251001")
    await _save_session(payload.session_id, {"step4": {"domain": payload.domain, "country": payload.country, "result": data}})
    return {"session_id": payload.session_id, **data}


@api_router.post("/final-verdict")
async def final_verdict(payload: VerdictRequest):
    """Step 5: Aggregate everything, generate verdict + chart data."""
    if not payload.session_id:
        raise HTTPException(status_code=400, detail="session_id is required. Please restart the flow.")
    session = await _get_session(payload.session_id)
    system = (
        "You are a top startup strategist. Based on all prior analysis, produce a final verdict "
        "with data suitable for charts. Respond with STRICT valid JSON only."
    )
    context_blob = json.dumps({
        "idea": (session.get("step1") or {}).get("idea"),
        "domain": ((session.get("step1") or {}).get("result") or {}).get("domain"),
        "selected_problem": (session.get("step2") or {}).get("selected_problem"),
        "refined_idea": (session.get("step3") or {}).get("refined_idea"),
        "analysis": (session.get("step3") or {}).get("result"),
    })[:6000]
    user = f"""
Context:
{context_blob}

Be concise. Return ONLY valid JSON, no prose.

Schema:
{{
  "verdict_summary": "2-3 sentences",
  "viability_score": 0-100,
  "world_impact_score": 0-100,
  "years_to_success": {{"min": int, "likely": int, "max": int}},
  "growth_projection": [
    {{"year":1,"users":int,"revenue_usd":int}},
    {{"year":2,"users":int,"revenue_usd":int}},
    {{"year":3,"users":int,"revenue_usd":int}},
    {{"year":4,"users":int,"revenue_usd":int}},
    {{"year":5,"users":int,"revenue_usd":int}}
  ],
  "funding_breakdown": [
    {{"setup":"From Home (Solo)","initial_usd":int,"monthly_burn_usd":int,"runway_months":int,"team_size":1}},
    {{"setup":"Registered Company (Lean)","initial_usd":int,"monthly_burn_usd":int,"runway_months":int,"team_size":int}},
    {{"setup":"Company + Employees (Scaled)","initial_usd":int,"monthly_burn_usd":int,"runway_months":int,"team_size":int}}
  ],
  "cost_categories": [
    {{"name":"Product/Tech","pct":int}},
    {{"name":"Marketing","pct":int}},
    {{"name":"Operations","pct":int}},
    {{"name":"Legal/Compliance","pct":int}},
    {{"name":"Salaries","pct":int}}
  ],
  "risk_radar": [
    {{"axis":"Market","score":0-100}},
    {{"axis":"Tech","score":0-100}},
    {{"axis":"Funding","score":0-100}},
    {{"axis":"Team","score":0-100}},
    {{"axis":"Regulatory","score":0-100}}
  ],
  "final_advice": "2-3 sentences, clear go/no-go + first step"
}}
pct values in cost_categories must sum to 100. Keep all strings short.
"""
    data = await _llm_json(system, user, payload.session_id, model="claude-haiku-4-5-20251001")
    # Normalize: sort growth_projection by year, ensure cost pct sums ~100
    try:
        gp = data.get("growth_projection")
        if isinstance(gp, list):
            data["growth_projection"] = sorted(gp, key=lambda r: r.get("year", 0))
        cc = data.get("cost_categories")
        if isinstance(cc, list) and cc:
            total = sum(float(c.get("pct", 0) or 0) for c in cc)
            if total and abs(total - 100) > 0.5:
                for c in cc:
                    c["pct"] = round(float(c.get("pct", 0) or 0) * 100.0 / total, 1)
    except Exception:
        pass
    await _save_session(payload.session_id, {"step5": {"result": data}})
    return {"session_id": payload.session_id, **data}


@api_router.post("/voice-chat")
async def voice_chat(payload: VoiceChatInput):
    """Conversational Q&A; uses session context if available."""
    session_id = payload.session_id or str(uuid.uuid4())
    context = ""
    if payload.session_id:
        doc = await db.sessions.find_one({"session_id": payload.session_id}, {"_id": 0})
        if doc:
            context = json.dumps({k: v for k, v in doc.items() if k.startswith("step")})[:6000]
    system = (
        "You are Cofoundry — a warm, witty startup mentor having a real-time voice conversation. "
        "Sound like a thoughtful human friend, not a chatbot. Keep replies SHORT (1-3 sentences, ~25-50 words max). "
        "Ask one focused follow-up question when natural. Never use markdown, bullet points, lists, emojis, or special characters. "
        "CRITICAL: Always respond in the SAME language and script the user is speaking. "
        f"Detected language code: {payload.language or 'auto'}. "
        "If unsure, mirror the user's last message language exactly. Speak in plain spoken form. "
        "Acknowledge what the user said before answering."
    )
    user = f"User said: {payload.message}\n\nContext (may be empty):\n{context}"
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model(LLM_PROVIDER, "claude-haiku-4-5-20251001")
    try:
        reply = await chat.send_message(UserMessage(text=user))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    return {"session_id": session_id, "reply": reply}


@api_router.get("/session/{session_id}")
async def get_session(session_id: str):
    doc = await db.sessions.find_one({"session_id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return doc


# =============== VOICE: STT (Whisper) ===============
@api_router.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    try:
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        data = await audio.read()
        if not data:
            raise HTTPException(status_code=400, detail="Empty audio")
        # Whisper expects a file-like with a name + content_type for proper handling
        buf = io.BytesIO(data)
        buf.name = audio.filename or "audio.webm"
        resp = await stt.transcribe(file=buf, model="whisper-1", response_format="verbose_json")
        text = getattr(resp, "text", None) or (resp.get("text") if isinstance(resp, dict) else "") or ""
        # Whisper auto-detects language; surface it to the caller for downstream prompts
        lang = getattr(resp, "language", None) or (resp.get("language") if isinstance(resp, dict) else None) or "en"
        return {"text": text.strip(), "language": lang}
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("STT failed")
        raise HTTPException(status_code=502, detail=f"STT error: {e}")


# =============== VOICE: TTS (OpenAI) ===============
class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "nova"
    model: Optional[str] = "tts-1"
    speed: Optional[float] = 1.05

@api_router.post("/tts")
async def text_to_speech(payload: TTSRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    if not payload.text or not payload.text.strip():
        raise HTTPException(status_code=400, detail="Empty text")
    try:
        tts = OpenAITextToSpeech(api_key=EMERGENT_LLM_KEY)
        audio_bytes = await tts.generate_speech(
            text=payload.text[:4000],
            model=payload.model or "tts-1",
            voice=payload.voice or "nova",
            speed=payload.speed or 1.05,
            response_format="mp3",
        )
        return Response(content=audio_bytes, media_type="audio/mpeg")
    except Exception as e:
        logging.exception("TTS failed")
        raise HTTPException(status_code=502, detail=f"TTS error: {e}")


# =============== LOGO / BRAND IDENTITY (Nano Banana) ===============
class LogoRequest(BaseModel):
    session_id: Optional[str] = None
    brand_name: str
    style: Optional[str] = "modern, luxurious, minimal, premium"
    palette: Optional[str] = "deep navy, gold, ivory accents"

@api_router.post("/generate-logo")
async def generate_logo(payload: LogoRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    sid = payload.session_id or str(uuid.uuid4())
    domain = ""
    pitch = ""
    if payload.session_id:
        s = await db.sessions.find_one({"session_id": payload.session_id}, {"_id": 0})
        if s:
            domain = ((s.get("step1") or {}).get("result") or {}).get("domain", "") or ""
            pitch = ((s.get("step3") or {}).get("result") or {}).get("one_line_pitch", "") or ""
    prompt = (
        f"A premium minimalist startup LOGO for a brand named '{payload.brand_name}'. "
        f"Industry: {domain or 'startup'}. Vibe: {pitch or 'innovative and trustworthy'}. "
        f"Style: {payload.style}. Color palette: {payload.palette}. "
        "Centered on a clean background. Vector-like flat marks, geometric, no text watermarks, "
        "high contrast, balanced composition, suitable for app icon and website header. "
        "Render only ONE single iconic mark."
    )
    try:
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"logo-{sid}", system_message="You are a premium brand designer.")
        chat.with_model("gemini", "gemini-3.1-flash-image-preview").with_params(modalities=["image", "text"])
        _text, images = await chat.send_message_multimodal_response(UserMessage(text=prompt))
        if not images:
            raise HTTPException(status_code=502, detail="No image returned")
        img = images[0]
        return {
            "session_id": sid,
            "brand_name": payload.brand_name,
            "mime_type": img.get("mime_type", "image/png"),
            "image_b64": img.get("data"),
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Logo generation failed")
        raise HTTPException(status_code=502, detail=f"Logo error: {e}")


# =============== PITCH DECK GENERATOR ===============
class PitchDeckRequest(BaseModel):
    session_id: str
    brand_name: Optional[str] = None

@api_router.post("/pitch-deck")
async def pitch_deck(payload: PitchDeckRequest):
    session = await _get_session(payload.session_id)
    brand = payload.brand_name or "Your Startup"
    ctx = json.dumps({
        "domain": ((session.get("step1") or {}).get("result") or {}).get("domain"),
        "selected_problem": (session.get("step2") or {}).get("selected_problem"),
        "refined_idea": (session.get("step3") or {}).get("refined_idea"),
        "analysis": (session.get("step3") or {}).get("result"),
        "verdict": (session.get("step5") or {}).get("result"),
    })[:7000]
    system = "You are a top-tier YC partner crafting a 10-slide investor deck. Return STRICT valid JSON only."
    user = f"""
Brand name: {brand}
Context: {ctx}

Produce a punchy 10-slide pitch deck. JSON schema:
{{
  "brand": "string",
  "tagline": "5-8 words",
  "slides": [
    {{"n":1,"title":"Title","bullets":["punchy line"],"speaker_notes":"1-2 sentences"}},
    {{"n":2,"title":"Problem","bullets":["3-4 bullets"],"speaker_notes":"..."}},
    {{"n":3,"title":"Solution","bullets":["..."],"speaker_notes":"..."}},
    {{"n":4,"title":"Why Now","bullets":["..."],"speaker_notes":"..."}},
    {{"n":5,"title":"Market Size","bullets":["TAM/SAM/SOM with numbers"],"speaker_notes":"..."}},
    {{"n":6,"title":"Product","bullets":["..."],"speaker_notes":"..."}},
    {{"n":7,"title":"Business Model","bullets":["pricing, unit economics"],"speaker_notes":"..."}},
    {{"n":8,"title":"Traction & Roadmap","bullets":["..."],"speaker_notes":"..."}},
    {{"n":9,"title":"Team","bullets":["roles needed, founder strengths"],"speaker_notes":"..."}},
    {{"n":10,"title":"The Ask","bullets":["amount, runway, milestones"],"speaker_notes":"..."}}
  ]
}}
Each bullet under 12 words. Speaker notes under 30 words.
"""
    data = await _llm_json(system, user, payload.session_id, model="claude-haiku-4-5-20251001")
    await _save_session(payload.session_id, {"pitch_deck": data})
    return {"session_id": payload.session_id, **data}


# =============== MVP TECH STACK & COST ===============
class TechStackRequest(BaseModel):
    session_id: str

@api_router.post("/tech-stack")
async def tech_stack(payload: TechStackRequest):
    session = await _get_session(payload.session_id)
    ctx = json.dumps({
        "domain": ((session.get("step1") or {}).get("result") or {}).get("domain"),
        "refined_idea": (session.get("step3") or {}).get("refined_idea"),
        "analysis": (session.get("step3") or {}).get("result"),
    })[:5000]
    system = "You are a pragmatic CTO advisor. Return STRICT valid JSON only."
    user = f"""
Context: {ctx}

Recommend a lean MVP tech stack and 3-month build plan. JSON schema:
{{
  "stack": [
    {{"category":"Frontend","choice":"...","why":"...","monthly_cost_usd": int}},
    {{"category":"Backend","choice":"...","why":"...","monthly_cost_usd": int}},
    {{"category":"Database","choice":"...","why":"...","monthly_cost_usd": int}},
    {{"category":"AI/ML","choice":"...","why":"...","monthly_cost_usd": int}},
    {{"category":"Hosting","choice":"...","why":"...","monthly_cost_usd": int}},
    {{"category":"Auth","choice":"...","why":"...","monthly_cost_usd": int}},
    {{"category":"Analytics","choice":"...","why":"...","monthly_cost_usd": int}}
  ],
  "milestones": [
    {{"week": 1, "goal":"...","deliverable":"..."}},
    {{"week": 2, "goal":"...","deliverable":"..."}},
    {{"week": 4, "goal":"...","deliverable":"..."}},
    {{"week": 8, "goal":"...","deliverable":"..."}},
    {{"week": 12, "goal":"...","deliverable":"..."}}
  ],
  "total_monthly_cost_usd": int,
  "build_time_weeks": int,
  "tips": ["3 sharp tips for a solo / lean team"]
}}
Be realistic with costs.
"""
    data = await _llm_json(system, user, payload.session_id, model="claude-haiku-4-5-20251001")
    await _save_session(payload.session_id, {"tech_stack": data})
    return {"session_id": payload.session_id, **data}


# =============== INVESTOR PITCH PRACTICE (voice role-play) ===============
class PitchPracticeInput(BaseModel):
    session_id: Optional[str] = None
    message: str
    persona: Optional[str] = "tough"  # tough | friendly | technical

@api_router.post("/pitch-practice")
async def pitch_practice(payload: PitchPracticeInput):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    sid = payload.session_id or str(uuid.uuid4())
    context = ""
    if payload.session_id:
        doc = await db.sessions.find_one({"session_id": payload.session_id}, {"_id": 0})
        if doc:
            context = json.dumps({
                "refined_idea": (doc.get("step3") or {}).get("refined_idea"),
                "analysis": (doc.get("step3") or {}).get("result"),
                "verdict": (doc.get("step5") or {}).get("result"),
            })[:4000]
    persona_prompt = {
        "tough": "You are SARAH KIM, a sharp Sequoia partner. Skeptical, direct, asks brutal questions about traction, unit economics, defensibility, and competition. Never sugar-coat.",
        "friendly": "You are an encouraging angel investor. Curious and warm but probes for clarity.",
        "technical": "You are a CTO-turned-investor. Drill into tech feasibility, scalability, and engineering risks.",
    }.get(payload.persona, "You are a tough investor.")
    system = (
        f"{persona_prompt} You are role-playing an investor pitch meeting. "
        "Stay strictly IN CHARACTER. Speak conversationally — short replies (1-3 sentences, ~30-60 words). "
        "Ask one focused question at a time. No markdown. After the founder pitches, push hard on weak points. "
        "Periodically score them privately and adapt."
    )
    user = f"Founder said: {payload.message}\n\nStartup context (private):\n{context}"
    chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=f"pitch-{sid}", system_message=system).with_model("anthropic", "claude-haiku-4-5-20251001")
    try:
        reply = await chat.send_message(UserMessage(text=user))
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LLM error: {e}")
    return {"session_id": sid, "reply": (reply or "").strip()}


# =============== MARKETING PLAN ===============
class MarketingRequest(BaseModel):
    session_id: str

@api_router.post("/marketing-plan")
async def marketing_plan(payload: MarketingRequest):
    session = await _get_session(payload.session_id)
    ctx = json.dumps({
        "domain": ((session.get("step1") or {}).get("result") or {}).get("domain"),
        "refined_idea": (session.get("step3") or {}).get("refined_idea"),
        "verdict": (session.get("step5") or {}).get("result"),
    })[:4500]
    system = "You are a growth marketer. Return STRICT valid JSON only."
    user = f"""
Context: {ctx}

Build a 30/60/90-day go-to-market plan focused on lean budget. JSON schema:
{{
  "north_star_metric":"...",
  "ideal_customer":"1-2 sentences",
  "channels": [
    {{"channel":"...","priority":"High|Medium|Low","budget_usd": int,"weekly_actions":["..."],"kpi":"..."}}
  ],
  "30_days": ["3-5 actions"],
  "60_days": ["3-5 actions"],
  "90_days": ["3-5 actions"],
  "viral_hooks": ["3 sharp hooks specifically tailored to this startup"]
}}
List 5-7 channels.
"""
    data = await _llm_json(system, user, payload.session_id, model="claude-haiku-4-5-20251001")
    await _save_session(payload.session_id, {"marketing": data})
    return {"session_id": payload.session_id, **data}


# =============== INVESTOR COLD-EMAIL DRAFTER ===============
class EmailDraftRequest(BaseModel):
    session_id: str
    investor_name: Optional[str] = "Investor"
    fund_name: Optional[str] = "your fund"

@api_router.post("/investor-emails")
async def investor_emails(payload: EmailDraftRequest):
    session = await _get_session(payload.session_id)
    ctx = json.dumps({
        "domain": ((session.get("step1") or {}).get("result") or {}).get("domain"),
        "refined_idea": (session.get("step3") or {}).get("refined_idea"),
        "analysis": (session.get("step3") or {}).get("result"),
        "verdict": (session.get("step5") or {}).get("result"),
    })[:4500]
    system = "You are a YC-grade founder copywriter. Return STRICT valid JSON only."
    user = f"""
Context: {ctx}
Investor: {payload.investor_name} at {payload.fund_name}.

Write 3 short cold investor emails (max 110 words each, plain text, no markdown). Different angles. JSON schema:
{{
  "emails": [
    {{"angle":"Direct Pitch","subject":"...","body":"..."}},
    {{"angle":"Warm Intro Ask","subject":"...","body":"..."}},
    {{"angle":"Curiosity Hook","subject":"...","body":"..."}}
  ]
}}
End each body with one specific call-to-action. Keep authentic, not salesy.
"""
    data = await _llm_json(system, user, payload.session_id, model="claude-haiku-4-5-20251001")
    return {"session_id": payload.session_id, **data}


# =============== LEGAL & COMPLIANCE CHECKLIST ===============
class LegalRequest(BaseModel):
    session_id: str
    country: Optional[str] = "India"

@api_router.post("/legal-checklist")
async def legal_checklist(payload: LegalRequest):
    session = await _get_session(payload.session_id)
    ctx = json.dumps({
        "domain": ((session.get("step1") or {}).get("result") or {}).get("domain"),
        "refined_idea": (session.get("step3") or {}).get("refined_idea"),
    })[:3000]
    system = "You are a startup-savvy lawyer. Return STRICT valid JSON only."
    user = f"""
Context: {ctx}
Founder country: {payload.country}

Generate a practical legal checklist with REAL portal links where applicable. JSON schema:
{{
  "incorporation": [
    {{"item":"...","why":"...","priority":"Critical|High|Medium","link":"https://..."}}
  ],
  "ip_protection": [{{"item":"...","why":"...","priority":"...","link":"..."}}],
  "compliance": [{{"item":"...","why":"...","priority":"...","link":"..."}}],
  "contracts_needed": ["NDA","Founders Agreement","Privacy Policy","ToS","Employment letters"],
  "first_3_steps": ["sharp 3 actions to take this week"]
}}
List 3-5 items per category.
"""
    data = await _llm_json(system, user, payload.session_id, model="claude-haiku-4-5-20251001")
    return {"session_id": payload.session_id, **data}


# =============== CUSTOMER PERSONAS ===============
class PersonaRequest(BaseModel):
    session_id: str

@api_router.post("/personas")
async def personas(payload: PersonaRequest):
    session = await _get_session(payload.session_id)
    ctx = json.dumps({
        "domain": ((session.get("step1") or {}).get("result") or {}).get("domain"),
        "selected_problem": (session.get("step2") or {}).get("selected_problem"),
        "refined_idea": (session.get("step3") or {}).get("refined_idea"),
    })[:3500]
    system = "You are a senior product researcher. Return STRICT valid JSON only."
    user = f"""
Context: {ctx}

Create 3 vivid customer personas. JSON schema:
{{
  "personas": [
    {{
      "name":"First Last",
      "role":"job title",
      "age": int,
      "location":"city, country",
      "snapshot":"2-3 sentence story",
      "goals":["3-4 goals"],
      "pains":["3-4 pains"],
      "channels_to_reach":["3 specific channels"],
      "willingness_to_pay_usd": int,
      "killer_quote":"1-line quote in their voice"
    }}
  ]
}}
Make them realistic and culturally specific to the domain.
"""
    data = await _llm_json(system, user, payload.session_id, model="claude-haiku-4-5-20251001")
    return {"session_id": payload.session_id, **data}


# ====================================================================
# VALIDATION LAB — 10 data-driven validation endpoints
# ====================================================================

def _ctx_for(session: dict, max_chars: int = 4500) -> str:
    return json.dumps({
        "domain": ((session.get("step1") or {}).get("result") or {}).get("domain"),
        "selected_problem": (session.get("step2") or {}).get("selected_problem"),
        "refined_idea": (session.get("step3") or {}).get("refined_idea"),
        "analysis": (session.get("step3") or {}).get("result"),
        "verdict": (session.get("step5") or {}).get("result"),
    })[:max_chars]


class ValBase(BaseModel):
    session_id: str


@api_router.post("/validation/market-sizing")
async def market_sizing(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s)}

Compute realistic TAM / SAM / SOM with backing assumptions.
Return JSON:
{{
  "tam":{{"value_usd": int,"basis":"1-line"}},
  "sam":{{"value_usd": int,"basis":"..."}},
  "som_year_3":{{"value_usd": int,"basis":"..."}},
  "growth_rate_pct": int,
  "key_assumptions":["3-5 bullets"],
  "data_sources":["3 reputable sources"]
}}
"""
    return {"session_id": payload.session_id, **(await _llm_json("Market analyst. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001"))}


@api_router.post("/validation/competitor-matrix")
async def competitor_matrix(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s)}

Build a benchmarking matrix vs 4 real competitors on 6 axes (1-5 each).
Axes: Product Quality, Pricing, UX, Distribution, Brand Strength, Innovation.
Return JSON:
{{
  "competitors":[
    {{"name":"...","url":"https://...","summary":"1 line",
      "scores":{{"Product Quality":1-5,"Pricing":1-5,"UX":1-5,"Distribution":1-5,"Brand Strength":1-5,"Innovation":1-5}},
      "strengths":["..."],"weaknesses":["..."]}}
  ],
  "your_advantage":["3 specific edges"],
  "saturation_score": 0-100,
  "verdict":"1-2 sentences"
}}
Exactly 4 competitors.
"""
    return {"session_id": payload.session_id, **(await _llm_json("Competitive analyst. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001"))}


@api_router.post("/validation/survey")
async def validation_survey(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s)}

Generate 12 customer-validation survey questions (Mom Test inspired — past behavior, not opinions).
Return JSON:
{{
  "title":"...","intro":"...",
  "questions":[
    {{"n":1,"q":"...","type":"open|scale|multi","options":["if multi"],"why":"hypothesis tested"}}
  ],
  "target_responses": 30,
  "distribution_channels":["3 specific places"]
}}
"""
    return {"session_id": payload.session_id, **(await _llm_json("UX researcher. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001"))}


@api_router.post("/validation/landing-copy")
async def landing_copy(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s)}

Write a high-converting landing page in 3 hook variants.
Return JSON:
{{
  "variants":[
    {{"angle":"Pain-first|Outcome-first|Curiosity",
      "headline":"max 10 words","subhead":"1 sentence",
      "primary_cta":"3-4 words","social_proof":"1 line",
      "feature_bullets":["3 bullets, 8 words max"],
      "objection_buster":"1 sentence"}}
  ],
  "ab_test_hypothesis":"What you're testing"
}}
Exactly 3 variants.
"""
    return {"session_id": payload.session_id, **(await _llm_json("Conversion copywriter. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001"))}


@api_router.post("/validation/financials")
async def financials(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s)}

Build a realistic 5-year P&L. USD.
Return JSON:
{{
  "years":[
    {{"year":1,"revenue":int,"cogs":int,"gross_profit":int,"opex":int,"ebitda":int,"users":int,"arpu_usd":int}},
    {{"year":2,...}},{{"year":3,...}},{{"year":4,...}},{{"year":5,...}}
  ],
  "break_even_month": int,
  "cumulative_burn_usd": int,
  "key_drivers":["3 sensitivity drivers"],
  "unit_economics":{{"cac_usd":int,"ltv_usd":int,"payback_months":int}}
}}
"""
    return {"session_id": payload.session_id, **(await _llm_json("Startup CFO. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001"))}


@api_router.post("/validation/pricing")
async def pricing_strategy(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s)}

Recommend a 3-tier pricing structure with reasoning.
Return JSON:
{{
  "model":"freemium|usage|subscription|one-time",
  "tiers":[
    {{"name":"Free","price_usd":0,"target":"...","features":["3-5"],"limits":"..."}},
    {{"name":"Pro","price_usd":int,"target":"...","features":["..."],"limits":"..."}},
    {{"name":"Business","price_usd":int,"target":"...","features":["..."],"limits":"..."}}
  ],
  "anchor_competitor_pricing":[{{"name":"...","price_usd":int}}],
  "expected_paid_conversion_pct": int,
  "rationale":"3-4 sentences"
}}
"""
    return {"session_id": payload.session_id, **(await _llm_json("Pricing strategist. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001"))}


@api_router.post("/validation/feature-priority")
async def feature_priority(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s)}

List 10 candidate MVP features with RICE scoring (Reach 1-100, Impact 1-3, Confidence 1-100, Effort weeks 1-12).
Return JSON:
{{
  "features":[
    {{"name":"...","reach":int,"impact":int,"confidence":int,"effort_weeks":int,"rice_score":number,"category":"Must|Should|Could|Wont","why":"1 line"}}
  ]
}}
rice_score = (reach * impact * confidence/100) / effort_weeks. Sort desc. Exactly 10.
"""
    return {"session_id": payload.session_id, **(await _llm_json("Product manager. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001"))}


@api_router.post("/validation/risk-heatmap")
async def risk_heatmap(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s)}

Identify 8 specific risks with likelihood × impact scoring.
Return JSON:
{{
  "risks":[
    {{"name":"...","category":"Market|Tech|Team|Finance|Legal|Ops","likelihood":1-5,"impact":1-5,"severity":number,"early_signals":"1 line","mitigation":"1-2 sentences"}}
  ]
}}
severity = likelihood * impact. Exactly 8. Sort desc.
"""
    return {"session_id": payload.session_id, **(await _llm_json("Risk analyst. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001"))}


@api_router.post("/validation/investor-match")
async def investor_match(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s)}

Suggest 6 REAL investors / VC firms whose thesis matches.
Mix global + India focused. Return JSON:
{{
  "investors":[
    {{"name":"firm","type":"VC|Angel|Accelerator","stage":"Pre-seed|Seed|Series A",
      "thesis":"1 line","why_match":"1-2 sentences",
      "check_size_usd":"e.g. $250k - $2M",
      "portfolio_examples":["2 relevant"],"outreach_tip":"1 sentence","url":"https://..."}}
  ]
}}
Use only real, verifiable firms.
"""
    return {"session_id": payload.session_id, **(await _llm_json("VC analyst. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001"))}


@api_router.post("/validation/scorecard")
async def validation_scorecard(payload: ValBase):
    s = await _get_session(payload.session_id)
    user = f"""
Context: {_ctx_for(s, 6500)}

Produce a 100-point Validation Scorecard with 8 categories scored 0-100.
Return JSON:
{{
  "categories":[
    {{"name":"Problem Severity","score":0-100,"insight":"1 line"}},
    {{"name":"Market Size","score":0-100,"insight":"..."}},
    {{"name":"Solution Novelty","score":0-100,"insight":"..."}},
    {{"name":"Competitive Edge","score":0-100,"insight":"..."}},
    {{"name":"Business Model","score":0-100,"insight":"..."}},
    {{"name":"Founder Fit","score":0-100,"insight":"..."}},
    {{"name":"Capital Efficiency","score":0-100,"insight":"..."}},
    {{"name":"Timing","score":0-100,"insight":"..."}}
  ],
  "final_score":0-100,
  "tier":"Diamond|Gold|Silver|Bronze|Re-validate",
  "go_no_go":"GO|NO-GO|PIVOT",
  "headline":"max 16 words",
  "top_3_strengths":["..."],
  "top_3_gaps":["..."],
  "next_3_actions":["next 14 days"]
}}
final_score = average of category scores (rounded int).
"""
    data = await _llm_json("Senior YC partner. JSON only.", user, payload.session_id, model="claude-haiku-4-5-20251001")
    await _save_session(payload.session_id, {"validation_scorecard": data})
    return {"session_id": payload.session_id, **data}


app.include_router(api_router)
app.include_router(build_auth_router(db))

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
