# FixForge — DIY Project Aggregator (SaaS + Mobile-responsive Web App)

## Original Problem Statement
"create a SAAS and a mobile app that can search and aggregate all the diy for a certain project"

## User Choices
- Both AI-generated guides + aggregated real web tutorials/videos
- Features: search projects + aggregated DIY steps/tools/materials, save favorites, personal collections, user accounts
- Auth: Emergent-managed Google login
- Mobile-responsive web app
- Theme: Bold & creative, brutalist industrial "mechanics/tools" aesthetic (dark, orange accents, Bebas Neue + Space Mono)

## Architecture
- Frontend: React 19, react-router 7, Tailwind (brutalist theme), shadcn/ui, sonner, lucide-react
- Backend: FastAPI (`/api` prefix), Motor/MongoDB
- LLM: Claude Sonnet 4.6 via emergentintegrations + EMERGENT_LLM_KEY (generates structured JSON DIY guides)
- Auth: Emergent Google OAuth, session_token httpOnly cookie + Bearer fallback

## Implemented (2026-06-26)
- Landing page: hero search, suggestion chips, feature cards, trending/popular builds grid
- AI guide generation: POST /api/projects/search → structured guide (title, summary, difficulty, time, cost, tools, materials, steps, safety, resources). Cached by query.
- Aggregated resources: LLM resources + guaranteed YouTube/Instructables/Google search links
- Project detail page: numbered steps, pro tips, safety, tools & materials, web resources, save + add-to-collection
- Auth: /api/auth/session, /api/auth/me, /api/auth/logout; AuthContext + AuthCallback
- Favorites: toggle + list (auth-gated)
- Collections: create, add/remove items, delete, list with projects (auth-gated)
- Dashboard "Workshop": favorites + collections tabs
- VERIFIED via curl: auth/me, favorites, collections, trending. Frontend renders.
- NOT YET VERIFIED: AI search end-to-end (Universal Key had $0 balance at build time).

## Step Media (added 2026-06-26)
- Each guide step gets a real Pexels stock photo (server-side `fetch_pexels`, cached in db.photo_cache + on the project) + a "Watch on YouTube" button (targeted search, no key).
- Media shown ONLY in unlocked/paid section; free preview step strips image_url. PEXELS_API_KEY in .env.
- Verified by testing agent (23/23 backend, browser pro vs free gating). Fixed Materials overflow + dead conditional.

## Backlog
- P1: True recurring Stripe subscription (current Pro is a one-time $9 unlock granting is_pro; recurring needs a Stripe Price ID set in Dashboard)
- P1: Streaming generation UX, search-history page, share guide link, Pro badge in navbar
- P2: comments/ratings, generated image per project, suppress initial 401 console noise

## Monetization (added 2026-06-26)
- Free preview: title, summary, difficulty/time/cost, FIRST step only; tools & materials shopping list always free with one-click Print/Save-PDF (browser print).
- Paid unlock (full steps + pro tips + safety + web resources): Stripe Checkout.
  - $2.99 one-time per-guide unlock (db.unlocks)
  - $9 Pro (sets users.is_pro=true; one-time charge in test mode — recurring not yet wired)
- Server-side fixed pricing (PACKAGES), payment_transactions collection, idempotent grant_access via processed flag, webhook + polling status. Verified by testing agent.
