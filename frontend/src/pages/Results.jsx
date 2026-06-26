import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Clock, DollarSign, Gauge, Wrench, Package, ShieldAlert, ExternalLink,
  Bookmark, BookmarkCheck, ArrowLeft, Video, FileText, BookOpen, FolderPlus, Check,
} from "lucide-react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const RES_ICON = { video: Video, article: FileText, guide: BookOpen };

export default function Results() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [collections, setCollections] = useState([]);
  const [newCol, setNewCol] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/project/${id}`.replace("/project/", "/projects/"))
      .then((r) => setProject(r.data))
      .catch(() => toast.error("Project not found"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    api.get("/favorites/ids").then((r) => setFavorited(r.data.ids.includes(id))).catch(() => {});
  }, [user, id]);

  const loadCollections = () => {
    api.get("/collections").then((r) => setCollections(r.data)).catch(() => {});
  };

  const toggleFav = async () => {
    if (!user) { login(); return; }
    try {
      const r = await api.post(`/favorites/${id}`);
      setFavorited(r.data.favorited);
      toast.success(r.data.favorited ? "Saved to favorites" : "Removed from favorites");
    } catch { toast.error("Action failed"); }
  };

  const createAndAdd = async () => {
    if (!newCol.trim()) return;
    try {
      const r = await api.post("/collections", { name: newCol.trim() });
      await api.post(`/collections/${r.data.id}/items/${id}`);
      setNewCol("");
      loadCollections();
      toast.success(`Added to "${r.data.name}"`);
    } catch { toast.error("Failed"); }
  };

  const addToCol = async (col) => {
    try {
      const r = await api.post(`/collections/${col.id}/items/${id}`);
      loadCollections();
      toast.success(r.data.added ? `Added to "${col.name}"` : `Removed from "${col.name}"`);
    } catch { toast.error("Failed"); }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="flex items-center justify-center py-40 text-orange-500 font-mono2 uppercase tracking-widest animate-pulse">
          // Loading blueprint...
        </div>
      </div>
    );
  }
  if (!project) return <div className="min-h-screen bg-black"><Navbar /></div>;

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-400 hover:text-orange-500 font-mono2 text-xs uppercase mb-6" data-testid="back-btn">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        {/* Header */}
        <div className="border-2 border-zinc-800 bg-zinc-950 p-6 sm:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            <div className="flex-1">
              <span className="bg-orange-600/20 border border-orange-600 text-orange-500 font-mono2 text-[10px] font-bold uppercase px-2 py-1">
                {project.category}
              </span>
              <h1 className="font-display text-5xl sm:text-6xl tracking-tight text-white uppercase leading-none mt-4 mb-3">{project.title}</h1>
              <p className="font-mono2 text-zinc-300 max-w-2xl">{project.summary}</p>
              <div className="flex flex-wrap gap-6 mt-6 font-mono2 text-sm">
                <span className="flex items-center gap-2 text-zinc-300"><Gauge className="w-4 h-4 text-orange-500" /> {project.difficulty}</span>
                <span className="flex items-center gap-2 text-zinc-300"><Clock className="w-4 h-4 text-orange-500" /> {project.estimated_time}</span>
                <span className="flex items-center gap-2 text-zinc-300"><DollarSign className="w-4 h-4 text-orange-500" /> {project.estimated_cost}</span>
              </div>
            </div>
            <div className="flex flex-col gap-3 lg:w-56">
              <button onClick={toggleFav} className={favorited ? "btn-ghost px-4 py-3 flex items-center justify-center gap-2" : "btn-brutal px-4 py-3 flex items-center justify-center gap-2"} data-testid="favorite-btn">
                {favorited ? <><BookmarkCheck className="w-4 h-4" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save</>}
              </button>
              <Dialog onOpenChange={(o) => o && (user ? loadCollections() : login())}>
                <DialogTrigger asChild>
                  <button className="border-2 border-zinc-700 text-white font-mono2 font-bold uppercase px-4 py-3 flex items-center justify-center gap-2 hover:border-orange-500 transition-none text-sm" data-testid="add-collection-btn">
                    <FolderPlus className="w-4 h-4" /> Collection
                  </button>
                </DialogTrigger>
                <DialogContent className="bg-zinc-950 border-2 border-orange-600 rounded-none text-white">
                  <DialogHeader>
                    <DialogTitle className="font-display text-3xl tracking-wide uppercase text-orange-500">Add to Collection</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    {collections.map((c) => {
                      const inside = c.project_ids?.includes(id);
                      return (
                        <button key={c.id} onClick={() => addToCol(c)} className="w-full flex items-center justify-between border-2 border-zinc-700 hover:border-orange-500 px-4 py-3 font-mono2 text-sm transition-none" data-testid={`collection-opt-${c.id}`}>
                          <span>{c.name}</span>
                          {inside && <Check className="w-4 h-4 text-green-400" />}
                        </button>
                      );
                    })}
                    <div className="flex gap-0 pt-2">
                      <input value={newCol} onChange={(e) => setNewCol(e.target.value)} placeholder="New collection name" className="flex-1 bg-zinc-900 border-2 border-zinc-700 px-3 py-2 font-mono2 text-sm outline-none focus:border-orange-500" data-testid="new-collection-input" />
                      <button onClick={createAndAdd} className="btn-brutal px-4 text-xs" data-testid="create-collection-btn">Add</button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Steps */}
          <div className="lg:col-span-2">
            <h2 className="font-display text-4xl tracking-tight text-orange-500 uppercase mb-6">Build Steps</h2>
            <div className="space-y-4">
              {project.steps?.map((s, i) => (
                <div key={i} className="border-2 border-zinc-800 bg-zinc-950 p-5 flex gap-5" data-testid={`step-${i}`}>
                  <span className="font-display text-5xl text-orange-600 leading-none">{String(i + 1).padStart(2, "0")}</span>
                  <div>
                    <h3 className="font-mono2 font-bold uppercase text-white mb-2">{s.title}</h3>
                    <p className="font-mono2 text-sm text-zinc-300">{s.detail}</p>
                    {s.tip && <p className="font-mono2 text-xs text-orange-400 mt-3 border-l-2 border-orange-600 pl-3">PRO TIP: {s.tip}</p>}
                  </div>
                </div>
              ))}
            </div>

            {project.safety_tips?.length > 0 && (
              <div className="border-2 border-red-900 bg-red-950/20 p-5 mt-8">
                <h3 className="flex items-center gap-2 font-mono2 font-bold uppercase text-red-400 mb-3"><ShieldAlert className="w-5 h-5" /> Safety</h3>
                <ul className="space-y-2">
                  {project.safety_tips.map((t, i) => (
                    <li key={i} className="font-mono2 text-sm text-zinc-300 flex gap-2"><span className="text-red-500">›</span> {t}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-8">
            <div className="border-2 border-zinc-800 bg-zinc-950 p-5">
              <h3 className="flex items-center gap-2 font-mono2 font-bold uppercase text-white mb-4"><Wrench className="w-5 h-5 text-orange-500" /> Tools</h3>
              <ul className="space-y-2">
                {project.tools?.map((t, i) => (
                  <li key={i} className="font-mono2 text-sm text-zinc-300 flex gap-2"><span className="text-orange-500">▪</span> {t}</li>
                ))}
              </ul>
            </div>

            <div className="border-2 border-zinc-800 bg-zinc-950 p-5">
              <h3 className="flex items-center gap-2 font-mono2 font-bold uppercase text-white mb-4"><Package className="w-5 h-5 text-orange-500" /> Materials</h3>
              <ul className="space-y-2">
                {project.materials?.map((m, i) => (
                  <li key={i} className="font-mono2 text-sm text-zinc-300 flex justify-between gap-2 border-b border-zinc-800 pb-2">
                    <span>{m.name}</span>
                    <span className="text-orange-400 whitespace-nowrap">{m.quantity}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-2 border-zinc-800 bg-zinc-950 p-5">
              <h3 className="font-mono2 font-bold uppercase text-white mb-4">Web Resources</h3>
              <div className="space-y-3">
                {project.resources?.map((r, i) => {
                  const Icon = RES_ICON[r.type] || FileText;
                  return (
                    <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="flex items-start gap-3 group" data-testid={`resource-${i}`}>
                      <Icon className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="font-mono2 text-sm text-zinc-200 group-hover:text-orange-400 transition-none flex items-center gap-1">
                          {r.title} <ExternalLink className="w-3 h-3 opacity-50" />
                        </p>
                        <p className="font-mono2 text-[10px] text-zinc-500 uppercase">{r.source}</p>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
