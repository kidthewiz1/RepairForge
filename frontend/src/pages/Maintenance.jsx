import { Hammer, Wrench } from "lucide-react";
import { motion } from "framer-motion";

export default function Maintenance() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-6 text-center">
      <div className="absolute inset-0 grid-texture opacity-40 pointer-events-none" />

      <motion.div
        className="relative text-orange-500 mb-8"
        animate={{ rotate: [0, -30, 10, 0] }}
        transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut", times: [0, 0.4, 0.6, 1] }}
        style={{ transformOrigin: "70% 80%" }}
      >
        <Hammer className="w-20 h-20" strokeWidth={2} />
      </motion.div>

      <span className="inline-block bg-orange-600 text-black font-mono2 text-xs font-bold uppercase tracking-[0.2em] px-3 py-1 mb-6">
        En maintenance
      </span>

      <h1 className="font-display text-5xl sm:text-7xl tracking-tight text-white uppercase leading-[0.9] mb-4">
        ON FORGE<br />
        <span className="text-orange-500">LA SUITE</span>
      </h1>

      <p className="font-mono2 text-zinc-400 text-sm max-w-md mt-4 leading-relaxed">
        RepairForge est temporairement hors ligne pour maintenance.<br />
        On revient bientôt — avec quelque chose de mieux.
      </p>

      <div className="flex items-center gap-3 mt-10 text-zinc-700">
        <Wrench className="w-4 h-4" />
        <div className="h-px w-24 bg-zinc-800" />
        <span className="font-mono2 text-xs uppercase tracking-widest">repairforge.ca</span>
        <div className="h-px w-24 bg-zinc-800" />
        <Wrench className="w-4 h-4 scale-x-[-1]" />
      </div>
    </div>
  );
}
