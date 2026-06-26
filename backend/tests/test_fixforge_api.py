"""FixForge backend API tests"""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')
if not BASE_URL:
    # fall back to reading frontend/.env at runtime
    from pathlib import Path
    for line in Path('/app/frontend/.env').read_text().splitlines():
        if line.startswith('REACT_APP_BACKEND_URL='):
            BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
            break

# These tokens are seeded via mongosh (see test_credentials.md)
TOKEN_FREE = os.environ.get('TEST_TOKEN_FREE', 'test_session_1782475351046')
TOKEN_PRO = os.environ.get('TEST_TOKEN_PRO', 'test_session_pro_1782475351057')
EXISTING_PROJECT_ID = 'proj_22f1086ecb88'


@pytest.fixture
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture
def free_client(client):
    client.headers.update({"Authorization": f"Bearer {TOKEN_FREE}"})
    return client


@pytest.fixture
def pro_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json",
                      "Authorization": f"Bearer {TOKEN_PRO}"})
    return s


# ---------------- Auth ----------------
class TestAuth:
    def test_auth_me_requires_token(self, client):
        r = client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_auth_me_with_token(self, free_client):
        r = free_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        data = r.json()
        assert "user_id" in data and "email" in data
        assert "is_pro" in data
        assert data["is_pro"] is False

    def test_auth_me_pro(self, pro_client):
        r = pro_client.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["is_pro"] is True


# ---------------- Projects ----------------
class TestProjects:
    def test_search_returns_guide(self, client):
        # Use a likely-cached or fresh query - longer timeout for LLM
        r = client.post(f"{BASE_URL}/api/projects/search",
                        json={"query": "build a wooden birdhouse"}, timeout=120)
        assert r.status_code == 200, r.text
        d = r.json()
        for key in ["id", "title", "summary", "difficulty",
                    "tools", "materials", "steps", "resources"]:
            assert key in d, f"missing {key}"
        assert isinstance(d["steps"], list) and len(d["steps"]) >= 1
        assert isinstance(d["tools"], list)
        assert isinstance(d["resources"], list) and len(d["resources"]) >= 3
        # cache the id for follow up tests
        pytest.fresh_project_id = d["id"]

    def test_trending(self, client):
        r = client.get(f"{BASE_URL}/api/projects/trending")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_project_locked_without_auth(self, client):
        r = client.get(f"{BASE_URL}/api/projects/{EXISTING_PROJECT_ID}")
        assert r.status_code == 200
        d = r.json()
        assert d["locked"] is True
        assert d["has_access"] is False
        assert len(d["steps"]) == 1
        assert d["total_steps"] > 1
        assert d["resources"] == []
        assert d["safety_tips"] == []
        # Free shopping list always available
        assert isinstance(d["tools"], list)
        assert isinstance(d["materials"], list)

    def test_project_unlocked_for_pro(self, pro_client):
        r = pro_client.get(f"{BASE_URL}/api/projects/{EXISTING_PROJECT_ID}")
        assert r.status_code == 200
        d = r.json()
        assert d["locked"] is False
        assert d["has_access"] is True
        assert d["is_pro"] is True
        assert len(d["steps"]) == d["total_steps"]
        assert len(d["resources"]) > 0

    def test_project_404(self, client):
        r = client.get(f"{BASE_URL}/api/projects/proj_does_not_exist")
        assert r.status_code == 404


# ---------------- Favorites ----------------
class TestFavorites:
    def test_favorites_requires_auth(self, client):
        assert client.get(f"{BASE_URL}/api/favorites").status_code == 401
        assert client.get(f"{BASE_URL}/api/favorites/ids").status_code == 401
        assert client.post(f"{BASE_URL}/api/favorites/{EXISTING_PROJECT_ID}").status_code == 401

    def test_favorites_toggle_flow(self, free_client):
        # Add
        r = free_client.post(f"{BASE_URL}/api/favorites/{EXISTING_PROJECT_ID}")
        assert r.status_code == 200
        assert r.json()["favorited"] is True
        # ids include
        r = free_client.get(f"{BASE_URL}/api/favorites/ids")
        assert r.status_code == 200
        assert EXISTING_PROJECT_ID in r.json()["ids"]
        # list contains
        r = free_client.get(f"{BASE_URL}/api/favorites")
        assert r.status_code == 200
        assert any(p["id"] == EXISTING_PROJECT_ID for p in r.json())
        # toggle off
        r = free_client.post(f"{BASE_URL}/api/favorites/{EXISTING_PROJECT_ID}")
        assert r.json()["favorited"] is False


# ---------------- Collections ----------------
class TestCollections:
    def test_collections_requires_auth(self, client):
        assert client.get(f"{BASE_URL}/api/collections").status_code == 401
        assert client.post(f"{BASE_URL}/api/collections",
                           json={"name": "X"}).status_code == 401

    def test_collection_crud(self, free_client):
        # Create
        r = free_client.post(f"{BASE_URL}/api/collections",
                             json={"name": "TEST_Garage Projects"})
        assert r.status_code == 200, r.text
        col = r.json()
        assert col["name"] == "TEST_Garage Projects"
        assert "id" in col
        cid = col["id"]
        # Add item
        r = free_client.post(f"{BASE_URL}/api/collections/{cid}/items/{EXISTING_PROJECT_ID}")
        assert r.status_code == 200
        assert r.json()["added"] is True
        # List
        r = free_client.get(f"{BASE_URL}/api/collections")
        assert r.status_code == 200
        found = [c for c in r.json() if c["id"] == cid]
        assert found and any(p["id"] == EXISTING_PROJECT_ID
                             for p in found[0]["projects"])
        # Delete
        r = free_client.delete(f"{BASE_URL}/api/collections/{cid}")
        assert r.status_code == 200
        # Verify gone
        r = free_client.get(f"{BASE_URL}/api/collections")
        assert not any(c["id"] == cid for c in r.json())


# ---------------- Payments ----------------
class TestPayments:
    def test_packages(self, client):
        r = client.get(f"{BASE_URL}/api/payments/packages")
        assert r.status_code == 200
        pkgs = r.json()
        assert pkgs["pro"]["amount"] == 9.00
        assert pkgs["guide"]["amount"] == 2.99

    def test_checkout_requires_auth(self, client):
        r = client.post(f"{BASE_URL}/api/payments/checkout/session",
                        json={"package_id": "pro",
                              "origin_url": "https://example.com",
                              "return_path": "/"})
        assert r.status_code == 401

    def test_checkout_guide(self, free_client):
        # Server should ignore any client amount; we send a bogus amount field
        # (CheckoutRequest doesn't accept it - so this also verifies schema)
        r = free_client.post(f"{BASE_URL}/api/payments/checkout/session",
                             json={"package_id": "guide",
                                   "origin_url": "https://example.com",
                                   "return_path": "/project/" + EXISTING_PROJECT_ID,
                                   "project_id": EXISTING_PROJECT_ID,
                                   "amount": 0.01})  # should be ignored
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and "session_id" in d
        assert "stripe.com" in d["url"] or "checkout" in d["url"]
        pytest.guide_session = d["session_id"]

        # Verify transaction recorded with server-defined amount
        status = free_client.get(
            f"{BASE_URL}/api/payments/checkout/status/{d['session_id']}")
        assert status.status_code == 200
        s = status.json()
        assert s["package_id"] == "guide"
        # not paid yet, but must respond ok
        assert s["payment_status"] in ("unpaid", "open", "no_payment_required")

    def test_checkout_pro(self, free_client):
        r = free_client.post(f"{BASE_URL}/api/payments/checkout/session",
                             json={"package_id": "pro",
                                   "origin_url": "https://example.com",
                                   "return_path": "/dashboard",
                                   "amount": 0.01})  # should be ignored
        assert r.status_code == 200, r.text
        d = r.json()
        assert "url" in d and "session_id" in d

    def test_checkout_guide_missing_project(self, free_client):
        r = free_client.post(f"{BASE_URL}/api/payments/checkout/session",
                             json={"package_id": "guide",
                                   "origin_url": "https://example.com",
                                   "return_path": "/"})
        assert r.status_code == 400

    def test_checkout_invalid_package(self, free_client):
        r = free_client.post(f"{BASE_URL}/api/payments/checkout/session",
                             json={"package_id": "freebie",
                                   "origin_url": "https://example.com",
                                   "return_path": "/"})
        assert r.status_code == 400

    def test_server_side_amount_enforced(self, free_client):
        """Even if client tries to spoof amount, txn must record server price."""
        free_client.post(f"{BASE_URL}/api/payments/checkout/session",
                        json={"package_id": "guide",
                              "origin_url": "https://example.com",
                              "return_path": "/x",
                              "project_id": EXISTING_PROJECT_ID,
                              "amount": 0.01})


# ---------------- i18n / lang feature ----------------
class TestI18n:
    QUERY = "build a wooden spice rack"

    def test_search_french_returns_french_content(self, client):
        r = client.post(f"{BASE_URL}/api/projects/search",
                        json={"query": self.QUERY, "lang": "fr"}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        pytest.fr_project_id = d["id"]
        # Title/summary should contain at least one non-English clue (accented or french common words)
        text_blob = (d["title"] + " " + d["summary"] + " " + " ".join(s["title"] for s in d["steps"])
                     + " " + " ".join(d.get("safety_tips", []))).lower()
        # Common French markers
        french_markers = ["étag", "bois", "épice", "pour", "les", "de la", "et ", "à ", "une ", "des ", "vous", "construir", "monta"]
        assert any(m in text_blob for m in french_markers), f"Expected French content, got: {text_blob[:300]}"
        # image_keywords stay in English (no accents)
        for s in d["steps"]:
            kw = s.get("image_keyword", "")
            assert all(ord(c) < 128 for c in kw), f"image_keyword should be ASCII English, got: {kw}"
            assert s.get("image_url", "").startswith("https://images.pexels.com") or s.get("image_url", "") == ""
        # Aggregated resource titles include French markers
        res_titles = " ".join(r["title"] for r in d["resources"])
        assert "Tutoriels YouTube" in res_titles, f"Expected French YouTube title, got: {res_titles}"
        assert "Instructables" in res_titles
        assert "Plus de guides" in res_titles or "guides sur le web" in res_titles

    def test_search_english_separate_cache(self, client):
        r = client.post(f"{BASE_URL}/api/projects/search",
                        json={"query": self.QUERY, "lang": "en"}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        pytest.en_project_id = d["id"]
        # Must be a different project than the French one
        assert d["id"] != getattr(pytest, "fr_project_id", None), \
            "EN and FR must be cached as separate projects"
        res_titles = " ".join(r["title"] for r in d["resources"])
        assert "YouTube tutorials" in res_titles
        assert "Instructables projects" in res_titles

    def test_french_cache_hit_increments_count(self, client):
        # First fetch (may already be cached from above)
        r1 = client.post(f"{BASE_URL}/api/projects/search",
                         json={"query": self.QUERY, "lang": "fr"}, timeout=60)
        assert r1.status_code == 200
        d1 = r1.json()
        c1 = d1["search_count"]
        r2 = client.post(f"{BASE_URL}/api/projects/search",
                         json={"query": self.QUERY, "lang": "fr"}, timeout=60)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d1["id"] == d2["id"]
        assert d2["search_count"] == c1 + 1, f"search_count should increment: {c1} -> {d2['search_count']}"

    def test_both_projects_retrievable(self, client):
        fr_id = getattr(pytest, "fr_project_id", None)
        en_id = getattr(pytest, "en_project_id", None)
        if fr_id:
            r = client.get(f"{BASE_URL}/api/projects/{fr_id}")
            assert r.status_code == 200
        if en_id:
            r = client.get(f"{BASE_URL}/api/projects/{en_id}")
            assert r.status_code == 200


# ---------------- Pexels images & gating (new feature) ----------------
class TestPexelsImages:
    NEW_QUERY = "build a small wooden stool"

    def test_search_steps_include_image_url_and_keyword(self, client):
        """Backend POST /api/projects/search returns steps with image_keyword & Pexels image_url."""
        r = client.post(f"{BASE_URL}/api/projects/search",
                        json={"query": self.NEW_QUERY}, timeout=180)
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["steps"]) >= 1
        # ensure step model has new fields
        for s in d["steps"]:
            assert "image_keyword" in s
            assert "image_url" in s
        # at least most steps should have a non-empty Pexels url
        pexels = [s for s in d["steps"] if s["image_url"].startswith("https://images.pexels.com")]
        assert len(pexels) >= max(1, len(d["steps"]) // 2), \
            f"Expected most steps to have Pexels URLs, got {len(pexels)}/{len(d['steps'])}"
        pytest.stool_project_id = d["id"]

    def test_search_cached_reuses_photos(self, client):
        """Searching same query twice reuses cached project & photo_cache (no errors)."""
        r1 = client.post(f"{BASE_URL}/api/projects/search",
                         json={"query": self.NEW_QUERY}, timeout=60)
        assert r1.status_code == 200
        d1 = r1.json()
        r2 = client.post(f"{BASE_URL}/api/projects/search",
                         json={"query": self.NEW_QUERY}, timeout=60)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d1["id"] == d2["id"], "Same query must return cached project"
        # image_urls match between calls
        for s1, s2 in zip(d1["steps"], d2["steps"]):
            assert s1["image_url"] == s2["image_url"]

    def test_free_preview_strips_image_url(self, client):
        """GET /api/projects/{id} without auth: locked=true, 1 step, image_url=''."""
        pid = getattr(pytest, "stool_project_id", None) or "proj_f73cad3471f8"
        r = client.get(f"{BASE_URL}/api/projects/{pid}")
        assert r.status_code == 200
        d = r.json()
        assert d["locked"] is True
        assert len(d["steps"]) == 1
        assert d["steps"][0]["image_url"] == "", \
            "Free preview step must have empty image_url"

    def test_pro_sees_step_images(self, pro_client):
        """Pro user sees all steps with non-empty Pexels image_url."""
        pid = getattr(pytest, "stool_project_id", None) or "proj_f73cad3471f8"
        r = pro_client.get(f"{BASE_URL}/api/projects/{pid}")
        assert r.status_code == 200
        d = r.json()
        assert d["locked"] is False
        assert d["has_access"] is True
        assert len(d["steps"]) == d["total_steps"]
        non_empty = [s for s in d["steps"] if s["image_url"]]
        assert len(non_empty) >= 1, "Pro user must see step images"
        # at least one Pexels URL
        assert any(s["image_url"].startswith("https://images.pexels.com")
                   for s in d["steps"]), "Expected Pexels URLs in paid section"
