"""End-to-end backend test for the AI Startup Advisor 5-step flow.
Covers: GET /api/, POST /api/analyze-idea, /api/analyze-problem,
/api/support-resources, /api/final-verdict, /api/voice-chat,
and GET /api/session/{session_id} persistence.
"""
import os
import pytest
import requests
from dotenv import load_dotenv
from pathlib import Path

# Load frontend .env to pick REACT_APP_BACKEND_URL
load_dotenv(Path('/app/frontend/.env'))
BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/')

LLM_TIMEOUT = 120  # LLM calls are slow

IDEA = "An app that helps small farmers predict rainfall using cheap sensors"
REFINED_IDEA = "Low-cost solar rain sensor + SMS alerts in local languages"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def state():
    """Mutable state shared between tests in this module."""
    return {}


# ---------- Health ----------
def test_root(session):
    r = session.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("message")
    assert body.get("status") == "ok"
    assert "_id" not in body


# ---------- Step 1: analyze-idea ----------
def test_analyze_idea(session, state):
    r = session.post(f"{BASE_URL}/api/analyze-idea", json={"idea": IDEA}, timeout=LLM_TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    # Schema checks
    assert isinstance(data.get("session_id"), str) and data["session_id"]
    assert isinstance(data.get("domain"), str) and data["domain"]
    assert isinstance(data.get("why_fit"), str) and data["why_fit"]
    assert isinstance(data.get("tags"), list) and len(data["tags"]) >= 1
    problems = data.get("problems")
    assert isinstance(problems, list) and len(problems) == 4
    for p in problems:
        for k in ("id", "title", "impact", "severity", "summary"):
            assert k in p, f"missing {k} in problem {p}"
            assert isinstance(p[k], str) and p[k]
    state["session_id"] = data["session_id"]
    state["domain"] = data["domain"]
    state["selected_problem"] = problems[0]


# ---------- Step 3: analyze-problem ----------
def test_analyze_problem(session, state):
    assert "session_id" in state, "Step 1 must run first"
    payload = {
        "session_id": state["session_id"],
        "selected_problem": state["selected_problem"],
        "refined_idea": REFINED_IDEA,
    }
    r = session.post(f"{BASE_URL}/api/analyze-problem", json=payload, timeout=LLM_TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert data.get("session_id") == state["session_id"]
    assert isinstance(data.get("novelty_score"), (int, float))
    assert 0 <= data["novelty_score"] <= 100
    assert isinstance(data.get("market_fit_score"), (int, float))
    assert 0 <= data["market_fit_score"] <= 100
    assert isinstance(data.get("one_line_pitch"), str) and data["one_line_pitch"]
    ep = data.get("existing_players")
    assert isinstance(ep, list) and 3 <= len(ep) <= 5
    for p in ep:
        for k in ("name", "url", "how_they_do_it", "gap_you_can_exploit"):
            assert k in p
    ua = data.get("unique_angles")
    assert isinstance(ua, list) and 3 <= len(ua) <= 5
    wl = data.get("what_to_learn")
    assert isinstance(wl, list) and 3 <= len(wl) <= 5
    for item in wl:
        for k in ("skill", "why", "resource"):
            assert k in item
    tk = data.get("things_to_keep_in_mind")
    assert isinstance(tk, list) and len(tk) == 5
    na = data.get("next_actions")
    assert isinstance(na, list) and 3 <= len(na) <= 5


# ---------- Step 4: support-resources ----------
def test_support_resources(session, state):
    assert "session_id" in state
    payload = {
        "session_id": state["session_id"],
        "domain": state["domain"],
        "country": "India",
    }
    r = session.post(f"{BASE_URL}/api/support-resources", json=payload, timeout=LLM_TIMEOUT)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    res = data.get("resources")
    assert isinstance(res, list)
    # Spec says ~8; accept 6-12 to allow LLM variance
    assert 6 <= len(res) <= 12, f"expected ~8 resources got {len(res)}"
    for item in res:
        for k in ("name", "kind", "country", "url", "what_it_offers", "eligibility", "why_relevant"):
            assert k in item, f"missing {k} in resource {item}"
            assert isinstance(item[k], str) and item[k]


# ---------- Step 5: final-verdict ----------
def test_final_verdict(session, state):
    assert "session_id" in state
    r = session.post(
        f"{BASE_URL}/api/final-verdict",
        json={"session_id": state["session_id"]},
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert isinstance(data.get("verdict_summary"), str) and data["verdict_summary"]
    assert 0 <= data["viability_score"] <= 100
    assert 0 <= data["world_impact_score"] <= 100

    yts = data.get("years_to_success")
    assert isinstance(yts, dict)
    for k in ("min", "likely", "max"):
        assert k in yts and isinstance(yts[k], (int, float))
    assert yts["min"] <= yts["likely"] <= yts["max"]

    growth = data.get("growth_projection")
    assert isinstance(growth, list) and len(growth) == 5
    years = [g["year"] for g in growth]
    assert years == [1, 2, 3, 4, 5]
    for g in growth:
        assert isinstance(g.get("users"), (int, float))
        assert isinstance(g.get("revenue_usd"), (int, float))

    fb = data.get("funding_breakdown")
    assert isinstance(fb, list) and len(fb) == 3
    setups = [f["setup"] for f in fb]
    # Looser substring checks: Home, Registered, Employees
    joined = " | ".join(setups).lower()
    assert "home" in joined
    assert "registered" in joined or "company (lean)" in joined
    assert "employee" in joined
    for f in fb:
        for k in ("initial_usd", "monthly_burn_usd", "runway_months", "team_size"):
            assert k in f and isinstance(f[k], (int, float))

    cc = data.get("cost_categories")
    assert isinstance(cc, list) and len(cc) >= 3
    total_pct = sum(c.get("pct", 0) for c in cc)
    assert 90 <= total_pct <= 110, f"cost_categories pct sum {total_pct} not ~100"

    rr = data.get("risk_radar")
    assert isinstance(rr, list) and len(rr) == 5
    axes = [r["axis"] for r in rr]
    for needed in ("Market", "Tech", "Funding", "Team", "Regulatory"):
        assert needed in axes
    for r_ in rr:
        assert 0 <= r_["score"] <= 100

    assert isinstance(data.get("final_advice"), str) and data["final_advice"]


# ---------- Voice chat ----------
def test_voice_chat_no_session(session):
    r = session.post(
        f"{BASE_URL}/api/voice-chat",
        json={"message": "Give me a one-line tip on validating a startup idea."},
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert "_id" not in data
    assert isinstance(data.get("session_id"), str) and data["session_id"]
    assert isinstance(data.get("reply"), str) and len(data["reply"]) > 0


def test_voice_chat_with_session(session, state):
    if "session_id" not in state:
        pytest.skip("no session id")
    r = session.post(
        f"{BASE_URL}/api/voice-chat",
        json={"session_id": state["session_id"], "message": "Summarise my idea in one sentence."},
        timeout=LLM_TIMEOUT,
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["session_id"] == state["session_id"]
    assert isinstance(data["reply"], str) and len(data["reply"]) > 0


# ---------- Persistence ----------
def test_session_persistence(session, state):
    assert "session_id" in state
    r = session.get(f"{BASE_URL}/api/session/{state['session_id']}", timeout=15)
    assert r.status_code == 200, r.text
    doc = r.json()
    assert "_id" not in doc
    assert doc.get("session_id") == state["session_id"]
    for step in ("step1", "step2", "step3", "step4", "step5"):
        assert step in doc, f"{step} missing from saved session"


def test_session_not_found(session):
    r = session.get(f"{BASE_URL}/api/session/does-not-exist-xyz", timeout=15)
    assert r.status_code == 404
