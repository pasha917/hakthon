from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import re
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
from emergentintegrations.llm.chat import LlmChat, UserMessage


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
    session_id: str

class VoiceChatInput(BaseModel):
    session_id: Optional[str] = None
    message: str


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


async def _llm_json(system_prompt: str, user_prompt: str, session_id: str) -> Any:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system_prompt,
    ).with_model(LLM_PROVIDER, LLM_MODEL)
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
    data = await _llm_json(system, user, session_id)
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
    data = await _llm_json(system, user, payload.session_id)
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
    data = await _llm_json(system, user, payload.session_id)
    await _save_session(payload.session_id, {"step4": {"domain": payload.domain, "country": payload.country, "result": data}})
    return {"session_id": payload.session_id, **data}


@api_router.post("/final-verdict")
async def final_verdict(payload: VerdictRequest):
    """Step 5: Aggregate everything, generate verdict + chart data."""
    session = await _get_session(payload.session_id)
    system = (
        "You are a top startup strategist. Based on all prior analysis, produce a final verdict "
        "with data suitable for charts. Respond with STRICT valid JSON only."
    )
    context_blob = json.dumps({
        "step1": session.get("step1"),
        "step2": session.get("step2"),
        "step3": session.get("step3"),
        "step4": session.get("step4"),
    })[:12000]
    user = f"""
Full analysis context so far:
{context_blob}

Produce the final verdict. Be realistic with numbers. Currency in USD.

JSON schema:
{{
  "verdict_summary": "3-4 sentences overall judgement",
  "viability_score": 0-100,
  "world_impact_score": 0-100,
  "years_to_success": {{"min": number, "likely": number, "max": number}},
  "growth_projection": [
    {{"year": 1, "users": number, "revenue_usd": number}},
    {{"year": 2, "users": number, "revenue_usd": number}},
    {{"year": 3, "users": number, "revenue_usd": number}},
    {{"year": 4, "users": number, "revenue_usd": number}},
    {{"year": 5, "users": number, "revenue_usd": number}}
  ],
  "funding_breakdown": [
    {{"setup":"From Home (Solo)","initial_usd": number,"monthly_burn_usd": number,"runway_months": number,"team_size": 1}},
    {{"setup":"Registered Company (Lean)","initial_usd": number,"monthly_burn_usd": number,"runway_months": number,"team_size": number}},
    {{"setup":"Company + Employees (Scaled)","initial_usd": number,"monthly_burn_usd": number,"runway_months": number,"team_size": number}}
  ],
  "cost_categories": [
    {{"name":"Product/Tech","pct": number}},
    {{"name":"Marketing","pct": number}},
    {{"name":"Operations","pct": number}},
    {{"name":"Legal/Compliance","pct": number}},
    {{"name":"Salaries","pct": number}}
  ],
  "risk_radar": [
    {{"axis":"Market","score": 0-100}},
    {{"axis":"Tech","score": 0-100}},
    {{"axis":"Funding","score": 0-100}},
    {{"axis":"Team","score": 0-100}},
    {{"axis":"Regulatory","score": 0-100}}
  ],
  "final_advice": "paragraph with clear verdict: go/no-go + why + first step"
}}
Ensure cost_categories sum approximately to 100.
"""
    data = await _llm_json(system, user, payload.session_id)
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
        "You are Bubble, a friendly startup mentor AI. Keep replies concise (2-4 sentences), "
        "warm, and action-oriented. You are speaking out loud so avoid markdown and bullet points."
    )
    user = f"User said: {payload.message}\n\nContext (may be empty):\n{context}"
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="LLM key not configured")
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=session_id,
        system_message=system,
    ).with_model(LLM_PROVIDER, LLM_MODEL)
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


app.include_router(api_router)

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
