import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Hammer, Wrench, Cog, Settings } from "lucide-react";

const MESSAGES = [
  "Scanning the maker web...",
  "Aggregating tutorials & videos...",
  "Sorting tools & materials...",
  "Hammering out the steps...",
  "Forging your blueprint...",
];

export default function ForgingLoader({ query }) {
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setMsgIndex((i) => (i + 1) % MESSAGES.length), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      data-testid="forging-loader"
    >
      <div className="absolute inset-0 grid-texture opacity-60" />
      <div className="relative flex flex-col items-center px-6 text-center">
        {/* Rotating gears behind the hammer */}
        <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
          <motion.div
            className="absolute -left-2 top-2 text-zinc-700"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
          >
            <Settings className="w-16 h-16" strokeWidth={1.5} />
          </motion.div>
          <motion.div
            className="absolute right-0 bottom-0 text-zinc-800"
            animate={{ rotate: -360 }}
            transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          >
            <Cog className="w-12 h-12" strokeWidth={1.5} />
          </motion.div>

          {/* Striking hammer */}
          <motion.div
            className="relative text-orange-500 z-10"
            animate={{ rotate: [0, -38, 12, 0] }}
            transition={{ repeat: Infinity, duration: 0.9, ease: "easeInOut", times: [0, 0.4, 0.6, 1] }}
            style={{ transformOrigin: "70% 80%" }}
          >
            <Hammer className="w-20 h-20" strokeWidth={2} />
          </motion.div>

          {/* Spark on impact */}
          <motion.div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400"
            animate={{ scale: [0, 2.2, 0], opacity: [0, 1, 0] }}
            transition={{ repeat: Infinity, duration: 0.9, times: [0, 0.55, 0.7], ease: "easeOut" }}
            style={{ boxShadow: "0 0 12px 4px rgba(250,204,21,0.8)" }}
          />
        </div>

        {/* Anvil bar */}
        <motion.div
          className="flex items-center gap-3 mb-6 text-zinc-600"
          animate={{ x: [0, -3, 3, 0] }}
          transition={{ repeat: Infinity, duration: 0.9 }}
        >
          <Wrench className="w-5 h-5" />
          <div className="h-0.5 w-24 bg-zinc-700" />
          <Wrench className="w-5 h-5 scale-x-[-1]" />
        </motion.div>

        <h2 className="font-display text-4xl sm:text-5xl tracking-tight text-white uppercase mb-3">
          Forging Guide
        </h2>
        {query && (
          <p className="font-mono2 text-orange-500 text-sm uppercase tracking-wider mb-4 max-w-md truncate">
            // {query}
          </p>
        )}
        <motion.p
          key={msgIndex}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="font-mono2 text-zinc-400 text-sm h-5"
          data-testid="forging-status"
        >
          {MESSAGES[msgIndex]}
        </motion.p>

        {/* Progress shimmer bar */}
        <div className="mt-6 w-64 h-1 bg-zinc-800 overflow-hidden">
          <motion.div
            className="h-full w-1/3 bg-orange-500"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
          />
        </div>
      </div>
    </motion.div>
  );
}
