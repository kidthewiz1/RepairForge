from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import json
import logging
import uuid
import urllib.parse
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import httpx

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ['EMERGENT_LLM_KEY']
EMERGENT_AUTH_URL = "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------- Models ----------------
class Material(BaseModel):
    name: str
    quantity: str = ""


class Step(BaseModel):
    title: str
    detail: str
    tip: str = ""


class Resource(BaseModel):
    title: str
    type: str = "article"
    source: str = ""
    url: str = ""


class Project(BaseModel):
    id: str = Field(default_factory=lambda: f"proj_{uuid.uuid4().hex[:12]}")
    query: str
    title: str
    summary: str
    difficulty: str = "Beginner"
    estimated_time: str = ""
    estimated_cost: str = ""
    category: str = "General"
    tools: List[str] = []
    materials: List[Material] = []
    steps: List[Step] = []
    safety_tips: List[str] = []
    resources: List[Resource] = []
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    search_count: int = 1


class SearchRequest(BaseModel):
    query: str


class User(BaseModel):
    user_id: str
    email: str
    name: str
    picture: str = ""


class CollectionCreate(BaseModel):
    name: str


# ---------------- Auth helpers ----------------
async def get_current_user(request: Request) -> Optional[User]:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        return None

    session = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session:
        return None

    expires_at = session["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        return None

    user_doc = await db.users.find_one({"user_id": session["user_id"]}, {"_id": 0})
    if not user_doc:
        return None
    return User(**{k: user_doc.get(k, "") for k in ["user_id", "email", "name", "picture"]})


async def require_user(request: Request) -> User:
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user


# ---------------- Auth routes ----------------
@api_router.post("/auth/session")
async def process_session(request: Request, response: Response):
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing X-Session-ID")

    async with httpx.AsyncClient() as hc:
        r = await hc.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid session")
    data = r.json()

    existing = await db.users.find_one({"email": data["email"]}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data["name"], "picture": data.get("picture", "")}},
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": data["email"],
            "name": data["name"],
            "picture": data.get("picture", ""),
            "created_at": datetime.now(timezone.utc).isoformat(),
        })

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token", value=session_token, httponly=True,
        secure=True, samesite="none", path="/", max_age=7 * 24 * 60 * 60,
    )
    return {"user_id": user_id, "email": data["email"], "name": data["name"], "picture": data.get("picture", "")}


@api_router.get("/auth/me", response_model=User)
async def auth_me(user: User = Depends(require_user)):
    return user


@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ---------------- DIY generation ----------------
GUIDE_SYSTEM = """You are an expert DIY master who aggregates the best knowledge from across the web (instructables, youtube tutorials, manufacturer guides, maker blogs) into one definitive project guide.
Given a project request, produce a complete, practical, step-by-step build guide.
Return ONLY valid minified JSON (no markdown, no code fences) with EXACTLY this schema:
{
 "title": "string - concise project title",
 "summary": "string - 2 sentence overview",
 "difficulty": "Beginner|Intermediate|Advanced",
 "estimated_time": "string e.g. '3-4 hours'",
 "estimated_cost": "string e.g. '$40 - $80'",
 "category": "string e.g. Woodworking, Electronics, Home Repair, Crafts, Automotive, Gardening",
 "tools": ["list of required tools"],
 "materials": [{"name":"string","quantity":"string"}],
 "steps": [{"title":"short step title","detail":"clear instructions","tip":"optional pro tip"}],
 "safety_tips": ["list of safety notes"],
 "resources": [{"title":"string","type":"video|article|guide","source":"site/channel name","url":"a real plausible URL"}]
}
Provide 6-10 detailed steps, 4-8 tools, 4-10 materials, 3-5 safety tips, 3-5 resources. Be specific and accurate."""


def extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```", 2)[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1:
        text = text[start:end + 1]
    return json.loads(text)


async def generate_guide(query: str) -> dict:
    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"diy_{uuid.uuid4().hex[:8]}",
        system_message=GUIDE_SYSTEM,
    ).with_model("anthropic", "claude-sonnet-4-6")
    msg = UserMessage(text=f"Create a complete DIY guide for: {query}")
    resp = await chat.send_message(msg)
    data = extract_json(resp)
    return data


def aggregated_resources(query: str, llm_resources: list) -> list:
    """Combine LLM-suggested resources with guaranteed-valid search links."""
    q = urllib.parse.quote_plus(query + " DIY tutorial")
    out = list(llm_resources or [])
    out.append({
        "title": f"YouTube tutorials for '{query}'",
        "type": "video",
        "source": "YouTube",
        "url": f"https://www.youtube.com/results?search_query={q}",
    })
    out.append({
        "title": f"Instructables projects",
        "type": "guide",
        "source": "Instructables",
        "url": f"https://www.instructables.com/search/?q={urllib.parse.quote_plus(query)}",
    })
    out.append({
        "title": f"More guides on the web",
        "type": "article",
        "source": "Google",
        "url": f"https://www.google.com/search?q={q}",
    })
    return out


@api_router.post("/projects/search", response_model=Project)
async def search_project(req: SearchRequest):
    query = req.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query required")

    cached = await db.projects.find_one({"query_lower": query.lower()}, {"_id": 0})
    if cached:
        await db.projects.update_one({"id": cached["id"]}, {"$inc": {"search_count": 1}})
        cached.pop("query_lower", None)
        return Project(**cached)

    try:
        data = await generate_guide(query)
    except Exception as e:
        logger.error(f"LLM generation failed: {e}")
        raise HTTPException(status_code=502, detail="Could not generate guide. Try again.")

    data["resources"] = aggregated_resources(query, data.get("resources", []))
    project = Project(query=query, **{k: data.get(k) for k in [
        "title", "summary", "difficulty", "estimated_time", "estimated_cost",
        "category", "tools", "materials", "steps", "safety_tips", "resources"] if data.get(k) is not None})

    doc = project.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["query_lower"] = query.lower()
    await db.projects.insert_one(doc)
    return project


@api_router.get("/projects/trending", response_model=List[Project])
async def trending():
    docs = await db.projects.find({}, {"_id": 0}).sort("search_count", -1).limit(8).to_list(8)
    for d in docs:
        d.pop("query_lower", None)
    return [Project(**d) for d in docs]


@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Not found")
    doc.pop("query_lower", None)
    return Project(**doc)


# ---------------- Favorites ----------------
@api_router.get("/favorites", response_model=List[Project])
async def list_favorites(user: User = Depends(require_user)):
    favs = await db.favorites.find({"user_id": user.user_id}, {"_id": 0}).to_list(200)
    ids = [f["project_id"] for f in favs]
    docs = await db.projects.find({"id": {"$in": ids}}, {"_id": 0}).to_list(200)
    for d in docs:
        d.pop("query_lower", None)
    return [Project(**d) for d in docs]


@api_router.post("/favorites/{project_id}")
async def toggle_favorite(project_id: str, user: User = Depends(require_user)):
    existing = await db.favorites.find_one({"user_id": user.user_id, "project_id": project_id})
    if existing:
        await db.favorites.delete_one({"_id": existing["_id"]})
        return {"favorited": False}
    await db.favorites.insert_one({
        "user_id": user.user_id, "project_id": project_id,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    return {"favorited": True}


@api_router.get("/favorites/ids")
async def favorite_ids(user: User = Depends(require_user)):
    favs = await db.favorites.find({"user_id": user.user_id}, {"_id": 0, "project_id": 1}).to_list(500)
    return {"ids": [f["project_id"] for f in favs]}


# ---------------- Collections ----------------
@api_router.get("/collections")
async def list_collections(user: User = Depends(require_user)):
    cols = await db.collections.find({"user_id": user.user_id}, {"_id": 0}).to_list(100)
    result = []
    for c in cols:
        docs = await db.projects.find({"id": {"$in": c.get("project_ids", [])}}, {"_id": 0}).to_list(200)
        for d in docs:
            d.pop("query_lower", None)
        c["projects"] = docs
        result.append(c)
    return result


@api_router.post("/collections")
async def create_collection(body: CollectionCreate, user: User = Depends(require_user)):
    col = {
        "id": f"col_{uuid.uuid4().hex[:10]}",
        "user_id": user.user_id,
        "name": body.name,
        "project_ids": [],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.collections.insert_one(col)
    col.pop("_id", None)
    col["projects"] = []
    return col


@api_router.post("/collections/{collection_id}/items/{project_id}")
async def add_to_collection(collection_id: str, project_id: str, user: User = Depends(require_user)):
    col = await db.collections.find_one({"id": collection_id, "user_id": user.user_id})
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found")
    pids = set(col.get("project_ids", []))
    if project_id in pids:
        await db.collections.update_one({"id": collection_id}, {"$pull": {"project_ids": project_id}})
        return {"added": False}
    await db.collections.update_one({"id": collection_id}, {"$addToSet": {"project_ids": project_id}})
    return {"added": True}


@api_router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, user: User = Depends(require_user)):
    await db.collections.delete_one({"id": collection_id, "user_id": user.user_id})
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "DIY Aggregator API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
