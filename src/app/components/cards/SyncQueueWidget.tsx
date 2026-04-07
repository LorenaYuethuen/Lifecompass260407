import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ServerCrash, WifiOff, CloudOff, RefreshCw, CheckCircle2, ShieldAlert, Wifi, HardDrive, Database } from "lucide-react";
import { clsx } from "clsx";
import { useSysStore } from "../../store/sysStore";
import { useSyncStore } from "../../store/syncStore";

export default function SyncQueueWidget() {
  const { isOffline, isSyncing, setOffline, setSyncing } = useSysStore();
  const { queue, initialized, loadQueue, flush, resetDemoQueue } = useSyncStore();

  useEffect(() => {
    const init = async () => {
      await loadQueue();
      if (!initialized) {
        await resetDemoQueue();
      }
    };
    init();
  }, [initialized]);

  const handleSimulateSync = () => {
    setOffline(false);
    setSyncing(true);
    // Simulate real flow with IDB
    flush();
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] border backdrop-blur-2xl p-6 md:p-8 flex flex-col gap-5 transition-all duration-700 shadow-[0_15px_40px_rgba(0,0,0,0.5)] bg-gradient-to-b from-black/80 to-[#0a0a1a]/90 border-white/5 group hover:border-white/10 h-full">
      
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-black/0 to-black/0 opacity-50 pointer-events-none" />
      
      {isOffline && (
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-500 shadow-[0_0_20px_#f59e0b] animate-pulse"></div>
      )}
      
      <div className="flex items-center justify-between z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-3 mb-1.5">
            <div className={clsx(
              "p-2 rounded-xl shadow-inner border transition-colors",
              isOffline ? "bg-orange-500/20 text-orange-400 border-orange-500/30" : isSyncing ? "bg-blue-500/20 text-blue-400 border-blue-500/30" : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            )}>
              {isOffline ? (
                <WifiOff className="w-5 h-5 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              ) : isSyncing ? (
                <RefreshCw className="w-5 h-5 animate-spin drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
              ) : (
                <Wifi className="w-5 h-5 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
              )}
            </div>
            <h2 className="text-xl font-black tracking-tight text-white drop-shadow-md">SyncQueue 离线架构</h2>
          </div>
          <p className="text-xs text-white/50 tracking-wide">
            {isOffline ? "当前离线降级可用。数据写入本地 IndexedDB 并入队。" : "已联网，列队数据已同步至 Notion。"}
          </p>
        </div>

        {isOffline ? (
          <button 
            onClick={handleSimulateSync}
            className="px-4 py-2 rounded-xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-sm font-bold transition-colors flex items-center gap-2"
          >
            <CloudOff className="w-4 h-4" /> 模拟联网 Flush()
          </button>
        ) : (
          <button 
            onClick={() => {
              setOffline(true);
              setSyncing(false);
            }}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-sm font-bold transition-colors flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> 同步完成 (模拟断网)
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 z-10">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-fit text-xs font-bold text-white/60 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-red-400"></div> P0 即时写入队列
          </div>
          <AnimatePresence>
            {queue.filter(q => q.priority === 0).map(item => (
              <motion.div 
                key={item.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: isSyncing ? 0.3 : 1, x: 0 }}
                className={clsx(
                  "p-3 rounded-xl border flex flex-col gap-2 transition-all",
                  isOffline ? "bg-black/60 border-yellow-500/20" : "bg-emerald-900/20 border-emerald-500/20"
                )}
              >
                <div className="flex items-center justify-between mb-3 relative z-10">
                  <span className="text-sm font-bold text-white/90 drop-shadow-md">{item.entity}</span>
                  {item.status === 'pending' && (
                    <span className="text-[10px] text-yellow-400/80 bg-yellow-500/10 px-2 py-0.5 rounded border border-yellow-500/20 font-bold uppercase tracking-widest">Pending</span>
                  )}
                  {item.status === 'syncing' && (
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 font-bold uppercase tracking-widest"><RefreshCw className="w-3 h-3 animate-spin"/> Syncing</span>
                  )}
                  {item.status === 'synced' && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-widest">Synced</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-white/60 relative z-10">
                  <span>{item.desc}</span>
                  <span className="font-mono text-[9px] bg-white/10 px-1 rounded">{item.conflict}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-fit text-xs font-bold text-white/60 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-orange-400"></div> P1 业务关键队列
          </div>
          <AnimatePresence>
            {queue.filter(q => q.priority === 1).map(item => (
              <motion.div 
                key={item.id}
                layout
                className={clsx(
                  "p-3 rounded-xl border flex flex-col gap-2 transition-all",
                  isOffline ? "bg-black/60 border-white/10" : "bg-emerald-900/20 border-emerald-500/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white/80">{item.entity}</span>
                  {item.status === 'pending' && (
                    <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">Pending</span>
                  )}
                  {item.status === 'syncing' && (
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Syncing</span>
                  )}
                  {item.status === 'synced' && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Synced</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{item.desc}</span>
                  <span className="font-mono text-[9px] bg-white/10 px-1 rounded">{item.conflict}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 w-fit text-xs font-bold text-white/60 uppercase tracking-wider">
            <div className="w-2 h-2 rounded-full bg-blue-400"></div> P2 异步/AI队列
          </div>
          <AnimatePresence>
            {queue.filter(q => q.priority === 2).map(item => (
              <motion.div 
                key={item.id}
                layout
                className={clsx(
                  "p-3 rounded-xl border flex flex-col gap-2 transition-all",
                  isOffline ? "bg-black/60 border-white/10 opacity-70" : "bg-emerald-900/20 border-emerald-500/20"
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white/80">{item.entity}</span>
                  {item.status === 'pending' && (
                    <span className="text-[10px] text-white/40 bg-white/5 px-2 py-0.5 rounded border border-white/10">Pending</span>
                  )}
                  {item.status === 'syncing' && (
                    <span className="text-[10px] text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">Syncing</span>
                  )}
                  {item.status === 'synced' && (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Synced</span>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-white/50">
                  <span>{item.desc}</span>
                  <span className="font-mono text-[9px] bg-white/10 px-1 rounded">{item.conflict}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      {isOffline && (
        <div className="mt-2 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3 z-10">
          <HardDrive className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
          <div className="flex flex-col text-sm">
            <span className="text-yellow-100 font-bold mb-1">功能降级生效中</span>
            <ul className="text-yellow-400/70 text-xs flex flex-col gap-1 list-disc list-inside">
              <li>TaskRecommendList：使用上次同步快照与节律基线</li>
              <li>KnowledgeEntryForm：本地保存完整 RIA，AI 分析跳过</li>
              <li>CrashRiskMonitor：仅使用行为层数据，无 DB-08 历史预测</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}