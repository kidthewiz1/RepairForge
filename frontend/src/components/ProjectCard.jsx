import { Link } from "react-router-dom";
import { Hammer, Gauge, Clock } from "lucide-react";

const DIFF_COLOR = {
  Beginner: "text-green-400 border-green-500",
  Intermediate: "text-yellow-400 border-yellow-500",
  Advanced: "text-red-400 border-red-500",
};

export default function ProjectCard({ project, index = 0 }) {
  return (
    <Link
      to={`/project/${project.id}`}
      className="card-brutal p-5 block animate-fade-up"
      style={{ animationDelay: `${index * 60}ms` }}
      data-testid={`project-card-${project.id}`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="bg-orange-600/20 border border-orange-600 text-orange-500 font-mono2 text-[10px] font-bold uppercase px-2 py-1">
          {project.category}
        </span>
        <span className={`font-mono2 text-[10px] font-bold uppercase px-2 py-1 border ${DIFF_COLOR[project.difficulty] || "text-zinc-400 border-zinc-600"}`}>
          {project.difficulty}
        </span>
      </div>
      <h3 className="font-display text-2xl tracking-wide text-white leading-none mb-2 uppercase">{project.title}</h3>
      <p className="font-mono2 text-sm text-zinc-400 line-clamp-2 mb-4">{project.summary}</p>
      <div className="flex flex-wrap gap-4 text-zinc-500 font-mono2 text-xs">
        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {project.estimated_time || "—"}</span>
        <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5" /> {project.estimated_cost || "—"}</span>
        <span className="flex items-center gap-1"><Hammer className="w-3.5 h-3.5" /> {project.tools?.length || 0} tools</span>
      </div>
    </Link>
  );
}
