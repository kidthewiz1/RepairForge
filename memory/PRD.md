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

## Backlog
- P0: Verify AI search once Universal Key has balance; run full testing agent
- P1: Streaming generation UX, project search-history page, share guide link
- P2: PDF export of guide, print shopping list, comments/ratings, image per project
