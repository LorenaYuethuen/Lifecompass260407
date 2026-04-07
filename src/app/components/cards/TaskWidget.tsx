import { useState } from "react";
import { motion } from "motion/react";
import { Play, Check, Zap, Sparkles, BrainCircuit, Activity, Pause, ShieldAlert, BatteryWarning } from "lucide-react";
import { clsx } from "clsx";
import { useSysStore } from "../../store/sysStore";
import { useSyncStore } from "../../store/syncStore";

export default function TaskWidget() {
  const { emitEvent } = useSysStore();
  const { enqueue } = useSyncStore();

  const [tasks, setTasks] = useState([
    { id: 1, title: "起草 Q3 战略文档", load: 3, energy: "高", priority: "P1", status: "recommended", score: 94, active: false, filter: null },
    { id: 2, title: "深度算法重构", load: 5, energy: "极高", priority: "P0", status: "filtered", score: 0, active: false, filter: "crash_risk", filterReason: "崩溃风险硬过滤 (SWIP > 85)" },
    { id: 3, title: "团队绩效面谈", load: 4, energy: "高", priority: "P1", status: "filtered", score: 0, active: false, filter: "energy_gap", filterReason: "能量缺口过滤 (当前能量 < 40%)" },
    { id: 4, title: "整理周报数据", load: 1, energy: "低", priority: "P2", status: "pending", score: 88, active: false, filter: null },
  ]);

  const toggleTask = (id: number) => {
    setTasks(prev => prev.map(t => {
      if (t.status === "filtered") return t; // Cannot start filtered tasks
      
      if (t.id === id) {
        const newActive = !t.active;
        
        emitEvent('TaskEngine', newActive ? 'task_started' : 'task_paused', { taskId: t.id, title: t.title });
        
        enqueue({
          entity: "DB-03",
          op: "patch",
          priority: 0,
          desc: `任务状态变更: ${t.title} -> ${newActive ? '进行中' : '已暂停'}`,
          conflict: "last-write-wins"
        });

        return { ...t, active: newActive };
      }
      return { ...t, active: false }; // Only one active at a time
    }));
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-tl from-[#1E1E38]/80 to-[#101020]/90 border border-white/10 backdrop-blur-2xl p-8 h-full shadow-[0_15px_40px_0_rgba(0,0,0,0.4)]">
      
      <div className="absolute top-[-20%] left-[-20%] w-[300px] h-[300px] bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-indigo-400" />
            <h2 className="text-2xl font-bold tracking-tight text-white">动态任务队列</h2>
          </div>
          <span className="text-sm text-white/50 tracking-wide flex items-center gap-2">
            HSI 引擎实时过滤 <span className="text-pink-400 ml-1">2 任务被拦截</span>
          </span>
        </div>
        
        <div className="flex gap-2">
          <button className="px-5 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all text-sm font-bold text-white relative overflow-hidden group">
            <span className="relative z-10 flex items-center gap-2">
              <Zap className="w-4 h-4" /> 强制执行
            </span>
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform"></div>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-4 relative z-10">
        {tasks.map((t, i) => (
          <motion.div 
            key={t.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1, ease: "easeOut" }}
            className={clsx(
              "group relative p-5 rounded-2xl border transition-all overflow-hidden",
              t.status === "filtered" ? "bg-black/40 border-red-500/20 opacity-70" : "cursor-pointer",
              t.active ? "bg-indigo-500/20 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]" :
              t.status === "recommended" 
                ? "bg-indigo-500/10 border-indigo-500/30 hover:border-indigo-400/50 hover:bg-indigo-500/20" 
                : (t.status === "pending" ? "bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10" : "")
            )}
            onClick={() => t.status !== "filtered" && toggleTask(t.id)}
          >
            {t.status === "recommended" && (
              <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-500/20 rounded-bl-2xl border-b border-l border-indigo-500/30 flex items-center gap-1 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-indigo-300" />
                <span className="text-[10px] font-bold text-indigo-300 tracking-wider">最佳匹配 {t.score}</span>
              </div>
            )}
            
            {t.status === "filtered" && (
              <div className="absolute top-0 right-0 px-3 py-1 bg-red-500/10 rounded-bl-2xl border-b border-l border-red-500/20 flex items-center gap-1 backdrop-blur-md">
                {t.filter === "crash_risk" ? <ShieldAlert className="w-3 h-3 text-red-400" /> : <BatteryWarning className="w-3 h-3 text-orange-400" />}
                <span className={clsx("text-[10px] font-bold tracking-wider", t.filter === "crash_risk" ? "text-red-400" : "text-orange-400")}>
                  {t.filterReason}
                </span>
              </div>
            )}
            
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-3">
                <h3 className={clsx(
                  "text-lg font-semibold tracking-tight transition-colors flex items-center gap-2",
                  t.status === "filtered" ? "text-white/40 line-through decoration-red-500/30" :
                  t.active ? "text-indigo-300 drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]" : (t.status === "recommended" ? "text-indigo-100" : "text-white/90")
                )}>
                  {t.active && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse shadow-[0_0_10px_#818cf8]"></span>}
                  {t.title}
                </h3>
                
                <div className="flex items-center gap-3">
                  <span className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors",
                    t.active ? "bg-indigo-500/20 border-indigo-400/50 text-indigo-300" : "bg-white/5 border-white/10 text-white/60"
                  )}>
                    <Activity className={clsx("w-3 h-3", t.active ? "text-indigo-400 animate-pulse" : "text-white/40")} />
                    负荷: {t.load}
                  </span>
                  <span className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium font-mono transition-colors",
                    t.priority === "P0" ? "bg-red-500/10 border-red-500/30 text-red-400" :
                    t.priority === "P1" ? "bg-orange-500/10 border-orange-500/30 text-orange-400" :
                    "bg-white/5 border-white/10 text-white/60"
                  )}>
                    {t.priority}
                  </span>
                  <span className={clsx(
                    "flex items-center gap-1 px-2.5 py-1 rounded-md border text-xs font-medium transition-colors",
                    t.energy === "极高" || t.energy === "高" ? "bg-pink-500/10 border-pink-500/30 text-pink-400" : "bg-white/5 border-white/10 text-white/60"
                  )}>
                    能量: {t.energy}
                  </span>
                </div>
              </div>
              
              {t.status !== "filtered" && (
                <div className="flex flex-col items-center gap-2 mt-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleTask(t.id); }}
                    className={clsx(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 z-20 relative",
                    t.active ? "bg-indigo-600/50 text-indigo-200 shadow-[0_0_20px_rgba(99,102,241,0.8)] border border-indigo-400/50 hover:bg-indigo-500/50" :
                    t.status === "recommended" 
                      ? "bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.6)] hover:bg-indigo-400" 
                      : "bg-white/10 text-white/60 hover:bg-white/20 hover:text-white"
                  )}>
                    {t.active ? <Pause className="w-5 h-5" fill="currentColor" /> : <Play className="w-5 h-5 ml-0.5" fill="currentColor" />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

    </div>
  );
}
