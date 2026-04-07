import { motion } from "motion/react";
import { Target, Star, CloudOff, RefreshCw, Zap, Brain, Sparkles } from "lucide-react";
import { clsx } from "clsx";
import { useSysStore } from "../../store/sysStore";

export default function OKRWidget() {
  const { isOffline, isSyncing } = useSysStore();
  
  const progress = 68;
  const checkInContribution = 24;
  const linkedKnowledgeCount = 7;
  const manifested = false;
  
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className={clsx(
      "relative overflow-hidden rounded-[2.5rem] border backdrop-blur-2xl p-8 flex-1 transition-all group",
      isOffline ? "bg-gradient-to-tr from-orange-950/40 to-black/60 border-orange-500/30 shadow-[0_15px_40px_rgba(249,115,22,0.15)] hover:shadow-[0_15px_50px_rgba(249,115,22,0.25)]" : "bg-gradient-to-tr from-indigo-950/40 to-black/60 border-indigo-500/30 shadow-[0_15px_40px_rgba(99,102,241,0.15)] hover:shadow-[0_15px_50px_rgba(99,102,241,0.25)]"
    )}>
      
      <div className={clsx(
        "absolute -bottom-20 -left-20 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-colors duration-700",
        isOffline ? "bg-orange-500/20 group-hover:bg-orange-500/30" : "bg-indigo-500/20 group-hover:bg-indigo-500/30"
      )}></div>

      {manifested && (
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[60px] pointer-events-none animate-pulse" />
      )}

      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <div className={clsx(
              "p-2 rounded-xl shadow-inner border",
              isOffline ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
            )}>
              <Target className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white drop-shadow-md">产品架构演进 Q3</h2>
            {manifested && (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-bold shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                ✨ 已显化
              </span>
            )}
          </div>
          <span className="text-sm tracking-wide flex items-center gap-2 mt-2">
            {isOffline ? (
              <span className="text-orange-400/80 flex items-center gap-1 font-mono text-xs bg-orange-500/10 px-2 py-0.5 rounded-md border border-orange-500/20 shadow-inner">
                <CloudOff className="w-3 h-3" /> 使用本地快照 (LOOP-07 降级)
              </span>
            ) : isSyncing ? (
              <span className="text-blue-400 flex items-center gap-1 font-mono text-xs bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 shadow-inner">
                <RefreshCw className="w-3 h-3 animate-spin" /> DB-04/DB-05 同步中
              </span>
            ) : (
              <span className="text-indigo-400 flex items-center gap-1 font-mono text-xs bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20 shadow-inner">
                <Sparkles className="w-3 h-3" /> LOOP-07 公式实时驱动
              </span>
            )}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-8 relative z-10">
        
        {/* Glowing Progress Ring */}
        <div className="relative w-36 h-36 flex items-center justify-center shrink-0">
          <motion.div 
            animate={{ rotate: 360 }} 
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className={clsx(
              "absolute inset-0 rounded-full border border-dashed pointer-events-none",
              isOffline ? "border-orange-500/20" : "border-indigo-500/30"
            )}
          />
          <svg className="w-full h-full transform -rotate-90 relative z-10">
            <circle
              className="text-white/5"
              strokeWidth="8"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="72"
              cy="72"
            />
            <motion.circle
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 2, ease: "easeOut" }}
              className={clsx(
                "transition-colors",
                manifested ? "text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.8)]" :
                isOffline ? "text-orange-500 drop-shadow-[0_0_15px_rgba(249,115,22,0.6)]" : "text-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.8)]"
              )}
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
              r={radius}
              cx="72"
              cy="72"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={clsx(
              "text-3xl font-extrabold tracking-tighter drop-shadow-md",
              manifested ? "text-emerald-400" : isOffline ? "text-orange-100" : "text-white"
            )}>
              {progress}<span className="text-xl">%</span>
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4 flex-1">
          <div className="flex flex-col gap-2 group/kr">
            <div className="flex justify-between items-center text-sm font-semibold text-white/80 group-hover/kr:text-white transition-colors">
              <span>完成核心组件库重构</span>
              <span className="font-mono text-xs text-white/50">80/100%</span>
            </div>
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
              <motion.div initial={{ width: 0 }} animate={{ width: "80%" }} transition={{ delay: 0.5, duration: 1 }} className={clsx("h-full shadow-[0_0_10px_currentColor]", isOffline ? "bg-orange-400 text-orange-400" : "bg-cyan-400 text-cyan-400")} />
            </div>
          </div>
          <div className="flex flex-col gap-2 group/kr">
            <div className="flex justify-between items-center text-sm font-semibold text-white/80 group-hover/kr:text-white transition-colors">
              <span>核心算法推断延迟 &lt; 50ms</span>
              <span className="font-mono text-xs text-white/50">42/100%</span>
            </div>
            <div className="w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5 shadow-inner relative">
              <motion.div initial={{ width: 0 }} animate={{ width: "42%" }} transition={{ delay: 0.7, duration: 1 }} className={clsx("h-full shadow-[0_0_10px_currentColor]", isOffline ? "bg-red-400 text-red-400" : "bg-pink-400 text-pink-400")} />
            </div>
          </div>
          
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1 p-3 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all group/stat relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-transparent -translate-x-full group-hover/stat:translate-x-full transition-transform duration-1000" />
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/60 group-hover/stat:text-indigo-200">
                <Zap className="w-3.5 h-3.5" /> 习惯打��贡献
              </div>
              <div className="text-xl font-black text-white group-hover/stat:text-indigo-400 drop-shadow-md transition-colors">{checkInContribution} 次</div>
            </div>
            
            <div className="flex flex-col gap-1 p-3 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all group/stat relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-transparent -translate-x-full group-hover/stat:translate-x-full transition-transform duration-1000" />
              <div className="flex items-center gap-1.5 text-xs font-bold text-white/60 group-hover/stat:text-cyan-200">
                <Brain className="w-3.5 h-3.5" /> 关联知识库
              </div>
              <div className="text-xl font-black text-white group-hover/stat:text-cyan-400 drop-shadow-md transition-colors">{linkedKnowledgeCount} 条</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
