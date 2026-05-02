# BubblePilot — AI Startup Advisor

## Original Problem Statement (verbatim)
User wants an app where a person tells their startup idea and the AI does deep research:
1. Step 1 — AI analyzes the idea, picks best-fit field, surfaces real-world problems.
2. Step 2 — User selects a world problem they want to solve.
3. Step 3 — User describes a refined idea; AI analyzes novelty, competitors, what to learn, tips, keep-in-mind.
4. Step 4 — AI suggests govt/financial support sites & grants for the domain.
5. Step 5 — AI analyzes all four steps, gives verdict: years to succeed, viability, funding for Home vs Company vs Company+Employees setups, charts + text summary.
Plus: voice talk feature, bubble UI/UX.

## Architecture
- **Frontend**: React + Tailwind + shadcn/ui + framer-motion + recharts + lucide-react
  - Routing: single-page wizard (`/app/frontend/src/pages/Wizard.jsx`)
  - Background: CSS blur-blob bubbles (`BubbleBackground.jsx`)
  - Step progress bubble map (`StepProgress.jsx`)
  - Persistent floating voice mic orb with Web Speech API + speech synthesis (`VoiceOrb.jsx`)
- **Backend**: FastAPI, MongoDB (Motor), emergentintegrations LlmChat → Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`) via `EMERGENT_LLM_KEY`
- **Data**: `sessions` collection stores step1-step5 results keyed by session_id.

## API Endpoints (all prefixed `/api`)
- `GET  /` health
- `POST /analyze-idea`      → Step 1 (domain + 4 world problems)
- `POST /analyze-problem`   → Step 3 (novelty, competitors, learning path, caveats, actions)
- `POST /support-resources` → Step 4 (govt + financial grants)
- `POST /final-verdict`     → Step 5 (scores, charts data, verdict, advice)
- `POST /voice-chat`        → conversational bubble assistant
- `GET  /session/{id}`      → fetch full session

## User Personas
- **Aspiring founder** — raw idea in hand, wants validation + roadmap.
- **Student / first-time entrepreneur** — needs learning path + govt support discovery.
- **Side-project hacker** — wants quick viability check with funding comparison (home vs company).

## What's Implemented (Feb 2026)
- Full 5-step wizard (text + voice input on step 1)
- AI-driven world problem generation, deep solution analysis, resource discovery, final verdict
- Charts: area (growth), pie (viability & cost split), bar (setup comparison), radar (risk)
- Floating Bubble voice assistant with Web Speech recognition + browser TTS
- Bubble UI/UX: glass-morphism, blur blobs, gradient bubble mic, staggered spring transitions
- Session persistence in MongoDB; export/print final verdict
- Backend tested end-to-end (100% pass, 9 pytest cases, /app/backend/tests/test_advisor_flow.py)

## Prioritized Backlog
- **P1** Server-side schema normalization (enforce counts, sort growth projection, cost pct=100)
- **P1** Frontend E2E test pass via testing agent
- **P2** Session history drawer (list past analyses)
- **P2** Shareable public link for verdict page
- **P2** Upgrade voice to OpenAI Whisper + TTS for premium quality
- **P2** Multi-language UI + voice
- **P3** PDF export with branded layout
- **P3** Country selector on Step 4 (currently defaults to India)

## Next Actions
- Ship to user for review, gather feedback on wording/personality of Bubble voice
- Offer premium voice (ElevenLabs) as optional upgrade
