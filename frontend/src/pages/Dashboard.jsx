import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bookmark, FolderOpen, Trash2, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import ProjectCard from "@/components/ProjectCard";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export default function Dashboard() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("favorites");
  const [favorites, setFavorites] = useState([]);
  const [collections, setCollections] = useState([]);
  const [newCol, setNewCol] = useState("");

  const load = () => {
    api.get("/favorites").then((r) => setFavorites(r.data)).catch(() => {});
    api.get("/collections").then((r) => setCollections(r.data)).catch(() => {});
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  if (loading) {
    return <div className="min-h-screen bg-black"><Navbar /><div className="py-40 text-center text-orange-500 font-mono2 uppercase animate-pulse">// Loading...</div></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-md mx-auto text-center py-32 px-4">
          <h1 className="font-display text-5xl text-white uppercase mb-4">Your Workshop</h1>
          <p className="font-mono2 text-zinc-400 mb-8">Sign in to save builds and organize your DIY collections.</p>
          <button onClick={login} className="btn-brutal px-8 py-3" data-testid="dashboard-login-btn">Sign In With Google</button>
        </div>
      </div>
    );
  }

  const createCol = async () => {
    if (!newCol.trim()) return;
    try { await api.post("/collections", { name: newCol.trim() }); setNewCol(""); load(); toast.success("Collection created"); }
    catch { toast.error("Failed"); }
  };

  const delCol = async (cid) => {
    try { await api.delete(`/collections/${cid}`); load(); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-display text-6xl tracking-tight text-white uppercase leading-none mb-2">Workshop</h1>
        <p className="font-mono2 text-zinc-500 mb-8">// {user.name}</p>

        <div className="flex gap-0 mb-8 border-b-2 border-zinc-800">
          {[["favorites", "Favorites", Bookmark], ["collections", "Collections", FolderOpen]].map(([k, label, Icon]) => (
            <button key={k} onClick={() => setTab(k)} className={`flex items-center gap-2 px-6 py-3 font-mono2 text-sm font-bold uppercase transition-none border-b-2 -mb-0.5 ${tab === k ? "text-orange-500 border-orange-500" : "text-zinc-500 border-transparent hover:text-white"}`} data-testid={`tab-${k}`}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "favorites" && (
          favorites.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-zinc-800">
              <p className="font-mono2 text-zinc-500 mb-4">No saved builds yet.</p>
              <button onClick={() => navigate("/")} className="btn-brutal px-6 py-2 text-xs inline-flex items-center gap-2"><Search className="w-4 h-4" /> Find a Project</button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {favorites.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
            </div>
          )
        )}

        {tab === "collections" && (
          <div>
            <div className="flex gap-0 mb-8 max-w-md">
              <input value={newCol} onChange={(e) => setNewCol(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createCol()} placeholder="New collection name" className="flex-1 bg-zinc-900 border-2 border-zinc-700 px-4 py-2 font-mono2 text-sm outline-none focus:border-orange-500" data-testid="dash-new-collection-input" />
              <button onClick={createCol} className="btn-brutal px-4 flex items-center gap-1 text-xs" data-testid="dash-create-collection-btn"><Plus className="w-4 h-4" /> Create</button>
            </div>

            {collections.length === 0 ? (
              <div className="text-center py-20 border-2 border-dashed border-zinc-800">
                <p className="font-mono2 text-zinc-500">No collections yet. Create one above.</p>
              </div>
            ) : (
              <div className="space-y-10">
                {collections.map((c) => (
                  <div key={c.id} data-testid={`collection-${c.id}`}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-display text-3xl tracking-wide text-orange-500 uppercase flex items-center gap-3">
                        <FolderOpen className="w-6 h-6" /> {c.name}
                        <span className="font-mono2 text-xs text-zinc-600">[{c.projects?.length || 0}]</span>
                      </h2>
                      <button onClick={() => delCol(c.id)} className="text-zinc-500 hover:text-red-500 transition-none" data-testid={`del-collection-${c.id}`}><Trash2 className="w-5 h-5" /></button>
                    </div>
                    {c.projects?.length ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {c.projects.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}
                      </div>
                    ) : (
                      <p className="font-mono2 text-sm text-zinc-600 border-2 border-dashed border-zinc-800 p-6">Empty — add builds from any project page.</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
