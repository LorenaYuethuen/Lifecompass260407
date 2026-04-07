import { motion } from "motion/react";
import SyncQueueWidget from "../cards/SyncQueueWidget";
import EventLogWidget from "../cards/EventLogWidget";
import { Server, Zap, Database, Activity } from "lucide-react";
import { useSysStore } from "../../store/sysStore";
import { clsx } from "clsx";

export default function SystemPage() {
  const { isOffline, setOffline, isSyncing } = useSysStore();

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      className="flex flex-col gap-6 pb-20 pt-2 h-full"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      <motion.div variants={itemVariants} className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
            <Server className="w-8 h-8 text-cyan-400" />
            系统中枢控制台
          </h1>
          <p className="text-white/50 text-sm max-w-2xl">
            监控全局事件总线（EventBus）与 IndexedDB 本地同步队列（SyncQueue）。
            调整网络状态以测试离线降级逻辑与数据合并机制。
          </p>
        </div>

        <div className="flex items-center gap-4 bg-black/40 border border-white/10 backdrop-blur-xl p-3.5 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
          <div className="flex flex-col text-right z-10 relative">
            <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-0.5">Network</span>
            <span className={clsx("text-sm font-black tracking-wide drop-shadow-md", isOffline ? "text-orange-400" : "text-emerald-400")}>
              {isOffline ? "离线模式 (降级)" : "在线模式 (同步)"}
            </span>
          </div>
          
          <button 
            onClick={() => setOffline(!isOffline)}
            className={clsx(
              "relative w-[4.5rem] h-8 rounded-full transition-all duration-300 shadow-inner z-10",
              isOffline ? "bg-orange-950/60 border border-orange-500/50 shadow-[inset_0_0_15px_rgba(249,115,22,0.2)] hover:border-orange-400" : "bg-emerald-950/60 border border-emerald-500/50 shadow-[inset_0_0_15px_rgba(16,185,129,0.2)] hover:border-emerald-400"
            )}
          >
            <div className={clsx("absolute inset-0 rounded-full blur-[8px] transition-opacity duration-300 pointer-events-none", isOffline ? "bg-orange-500/30" : "bg-emerald-500/30")} />
            <motion.div 
              className={clsx(
                "absolute top-1 w-6 h-6 rounded-full shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center relative z-20 border border-white/20",
                isOffline ? "bg-orange-400 left-1" : "bg-emerald-400 left-[2.6rem]"
              )}
              layout
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {isOffline ? <Activity className="w-3.5 h-3.5 text-orange-950" /> : <Zap className="w-3.5 h-3.5 text-emerald-950" />}
            </motion.div>
          </button>
        </div>
      </motion.div>

      {/* Overview Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-black/40 border border-white/5 backdrop-blur-xl p-6 rounded-3xl flex items-center gap-5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] group hover:bg-cyan-950/30 hover:border-cyan-500/30 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-cyan-500/20 transition-colors" />
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20 shadow-inner group-hover:scale-110 transition-transform relative z-10">
            <Database className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-black text-white tracking-tight drop-shadow-md group-hover:text-cyan-100 transition-colors">IndexedDB</div>
            <div className="text-xs text-white/40 font-mono mt-1 group-hover:text-cyan-400/70 transition-colors">持久化存储引擎</div>
          </div>
        </div>

        <div className="bg-black/40 border border-white/5 backdrop-blur-xl p-6 rounded-3xl flex items-center gap-5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] group hover:bg-purple-950/30 hover:border-purple-500/30 transition-all duration-500 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-purple-500/20 transition-colors" />
          <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 shadow-inner group-hover:scale-110 transition-transform relative z-10">
            <Zap className="w-6 h-6 text-purple-400 drop-shadow-[0_0_10px_rgba(168,85,247,0.8)]" />
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-black text-white tracking-tight drop-shadow-md group-hover:text-purple-100 transition-colors">EventBus</div>
            <div className="text-xs text-white/40 font-mono mt-1 group-hover:text-purple-400/70 transition-colors">事件总线流转中心</div>
          </div>
        </div>
        
        <div className="bg-black/40 border border-white/5 backdrop-blur-xl p-6 rounded-3xl flex items-center gap-5 shadow-[0_10px_30px_rgba(0,0,0,0.3)] group hover:bg-emerald-950/30 hover:border-emerald-500/30 transition-all duration-500 relative overflow-hidden">
          <div className={clsx(
            "absolute top-0 left-0 w-32 h-32 rounded-full blur-[40px] pointer-events-none transition-colors",
            isSyncing ? "bg-emerald-500/20 animate-pulse" : "bg-white/5"
          )} />
          <div className={clsx(
            "w-14 h-14 rounded-2xl flex items-center justify-center border shadow-inner transition-all duration-500 relative z-10",
            isSyncing ? "bg-emerald-500/10 border-emerald-500/30 scale-110" : "bg-white/5 border-white/10 group-hover:scale-110"
          )}>
            <Activity className={clsx("w-6 h-6 transition-colors", isSyncing ? "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]" : "text-white/30")} />
          </div>
          <div className="relative z-10">
            <div className="text-2xl font-black text-white tracking-tight drop-shadow-md group-hover:text-emerald-100 transition-colors">{isSyncing ? "同步中..." : "待机"}</div>
            <div className="text-xs text-white/40 font-mono mt-1 group-hover:text-emerald-400/70 transition-colors">后台同步队列状态</div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-6 flex-1">
        <motion.div variants={itemVariants} className="col-span-12 xl:col-span-6 flex flex-col h-full">
          <SyncQueueWidget />
        </motion.div>
        
        <motion.div variants={itemVariants} className="col-span-12 xl:col-span-6 flex flex-col h-[600px] xl:h-auto">
          <EventLogWidget />
        </motion.div>
      </div>
    </motion.div>
  );
}
