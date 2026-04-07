import { motion } from "motion/react";
import { Activity, Brain, Battery, Zap, WifiOff, RefreshCw } from "lucide-react";
import { clsx } from "clsx";
import { useSysStore } from "../../store/sysStore";

export default function HSIWidget() {
  const { isOffline, isSyncing } = useSysStore();

  const metrics = [
    { name: "整体能量", value: 85, color: "text-pink-500", glow: "shadow-pink-500", bg: "bg-pink-500/20", icon: Battery },
    { name: "脑力容量", value: 92, color: "text-cyan-400", glow: "shadow-cyan-400", bg: "bg-cyan-400/20", icon: Brain },
    { name: "压力水平", value: 28, color: "text-purple-400", glow: "shadow-purple-400", bg: "bg-purple-400/20", icon: Activity },
  ];

  return (
    <div className={clsx(
      "relative overflow-hidden rounded-[2.5rem] border backdrop-blur-xl p-8 h-full flex flex-col justify-between shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] transition-all",
      isOffline ? "bg-white/5 border-orange-500/20" : "bg-white/5 border-white/10"
    )}>
      
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-pink-500/20 rounded-full blur-[80px]"></div>
      
      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-6 h-6 text-white/80" />
            <h2 className="text-2xl font-bold tracking-tight text-white/90 uppercase">HSI 引擎 第三层</h2>
          </div>
          <p className="text-sm text-white/50 tracking-wide">
            人类状态推断 <span className="text-pink-400 ml-1 font-mono">置信度 94%</span>
          </p>
        </div>
        
        <div className={clsx(
          "flex items-center gap-2 rounded-full px-4 py-1.5 border backdrop-blur-md transition-colors",
          isOffline 
            ? "bg-orange-500/10 border-orange-500/30 text-orange-400" 
            : isSyncing 
              ? "bg-blue-500/10 border-blue-500/30 text-blue-400" 
              : "bg-green-500/10 border-green-500/30 text-green-400"
        )}>
          {isOffline ? (
            <>
              <WifiOff className="w-3 h-3" />
              <span className="text-xs font-mono font-bold tracking-widest">离线降级</span>
            </>
          ) : isSyncing ? (
            <>
              <RefreshCw className="w-3 h-3 animate-spin" />
              <span className="text-xs font-mono font-bold tracking-widest">同步中</span>
            </>
          ) : (
            <>
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></div>
              <span className="text-xs font-mono font-bold tracking-widest">实时连接</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
        {metrics.map((m, i) => (
          <div key={i} className={clsx(
            "flex flex-col gap-4 p-5 rounded-2xl border backdrop-blur-sm group hover:scale-[1.02] transition-all cursor-pointer shadow-lg",
            isOffline ? "bg-black/40 border-orange-500/10" : "bg-black/20 border-white/5 hover:bg-black/40"
          )}>
            
            <div className="flex items-center justify-between">
              <div className={clsx("w-12 h-12 rounded-xl flex items-center justify-center border border-white/5", m.bg)}>
                <m.icon className={clsx("w-6 h-6", m.color)} />
              </div>
              <span className={clsx("text-3xl font-bold tracking-tighter", m.color, "drop-shadow-lg")}>
                {m.value}<span className="text-xl">%</span>
              </span>
            </div>
            
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-sm font-bold text-white/70 uppercase tracking-widest">{m.name}</span>
              
              {/* Segmented Track Bar */}
              <div className="w-full h-3 rounded-full bg-white/5 flex overflow-hidden relative border border-white/5">
                {[...Array(20)].map((_, idx) => (
                  <div key={idx} className="flex-1 border-r border-black/40 last:border-r-0 h-full relative z-10" />
                ))}
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${m.value}%` }}
                  transition={{ duration: 1.5, delay: i * 0.2, ease: "easeOut" }}
                  className={clsx(
                    "absolute top-0 left-0 h-full shadow-[0_0_15px_currentColor]", 
                    m.color.replace('text-', 'bg-')
                  )}
                >
                  <div className="absolute top-0 right-0 w-4 h-full bg-white/50 blur-[2px]" />
                </motion.div>
              </div>
            </div>
            
          </div>
        ))}
      </div>
      
    </div>
  );
}
