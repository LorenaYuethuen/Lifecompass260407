import { motion, AnimatePresence } from "motion/react";
import { Terminal, Activity, Zap, Server } from "lucide-react";
import { useSysStore } from "../../store/sysStore";
import { format } from "date-fns";

export default function EventLogWidget() {
  const { events } = useSysStore();

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border backdrop-blur-2xl p-6 md:p-8 flex flex-col gap-5 transition-all duration-700 shadow-[0_15px_40px_0_rgba(0,0,0,0.4)] bg-[#05050f]/90 border-blue-500/20">
      
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold tracking-tight text-white">EventBus 全局事件总线</h2>
        </div>
        <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center gap-2 text-xs font-mono text-blue-400">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
          Listening...
        </div>
      </div>

      <div className="flex-1 bg-black/50 rounded-xl border border-white/5 p-4 overflow-y-auto h-[200px] font-mono text-xs no-scrollbar flex flex-col gap-1 relative">
        <AnimatePresence>
          {events.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-white/30 text-center mt-10">
              等待事件接入...
            </motion.div>
          )}
          {events.map((event, i) => (
            <motion.div
              key={event.timestamp + '-' + i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 text-white/70 py-1 hover:bg-white/5 px-2 rounded transition-colors"
            >
              <span className="text-white/40 shrink-0">
                {format(event.timestamp, "HH:mm:ss.SSS")}
              </span>
              <span className="text-blue-400 font-bold shrink-0 w-24">
                [{event.source}]
              </span>
              <span className="text-emerald-400 shrink-0">
                {event.type}
              </span>
              <span className="text-white/50 truncate">
                {JSON.stringify(event.data)}
              </span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
