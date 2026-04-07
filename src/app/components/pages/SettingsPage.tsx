import { useState } from "react";
import { Settings, Save, Server, WifiOff, Activity, Zap, Database, Terminal, ShieldAlert, Cpu, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { clsx } from "clsx";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"engine" | "sync" | "eventbus">("engine");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const handleSave = () => {
    setSaveStatus("saving");
    setTimeout(() => setSaveStatus("saved"), 1000);
    setTimeout(() => setSaveStatus("idle"), 3000);
  };

  const logs = [
    { time: "10:42:05", level: "INFO", event: "CHECKIN_SYNC_QUEUED", payload: "DB-01 -> Cache" },
    { time: "10:41:12", level: "WARN", event: "HSI_DEGRADATION_TRIGGERED", payload: "Offline Mode Active" },
    { time: "10:39:55", level: "INFO", event: "TASK_COMPLETED", payload: "taskId: 42, score: 94" },
    { time: "10:30:01", level: "ERROR", event: "SYNC_CONFLICT", payload: "Resolve strategy: LATEST_WIN" }
  ];

  return (
    <div className="flex flex-col gap-6 pb-20 pt-2 h-full max-w-6xl mx-auto relative">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
        <div className="flex items-center gap-5">
          <div className="relative group">
            <div className="absolute inset-0 bg-fuchsia-500/20 blur-[30px] rounded-full group-hover:bg-fuchsia-500/40 transition-colors duration-700 pointer-events-none" />
            <div className="relative w-16 h-16 rounded-[1.5rem] bg-gradient-to-br from-fuchsia-500/20 to-purple-700/20 border border-fuchsia-500/30 flex items-center justify-center backdrop-blur-xl shadow-[0_0_30px_rgba(217,70,239,0.3)] overflow-hidden">
              <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
              <Settings className="w-8 h-8 text-fuchsia-300 drop-shadow-[0_0_10px_rgba(217,70,239,0.8)] group-hover:rotate-90 transition-transform duration-1000 ease-in-out" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-100 to-purple-400 tracking-tight drop-shadow-sm">全局配置中心 (Settings)</h1>
            <p className="text-fuchsia-200/60 text-sm flex items-center gap-2 mt-1 font-mono tracking-wide">
              <Cpu className="w-4 h-4 text-fuchsia-500/70" />
              HSI_ENGINE // EVENT_BUS // DEGRADATION_RULES
            </p>
          </div>
        </div>

        <button 
          onClick={handleSave}
          className={clsx(
            "h-12 px-6 rounded-2xl font-bold text-sm transition-all duration-300 flex items-center gap-2.5 overflow-hidden relative group",
            saveStatus === "saved" ? "bg-emerald-950/40 text-emerald-400 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]" :
            saveStatus === "saving" ? "bg-fuchsia-900/40 text-fuchsia-300 border border-fuchsia-500/50 shadow-[0_0_20px_rgba(217,70,239,0.3)]" :
            "bg-black/40 hover:bg-fuchsia-950/30 text-white border border-white/10 hover:border-fuchsia-500/40 shadow-[0_10px_30px_rgba(0,0,0,0.5)] hover:shadow-[0_0_25px_rgba(217,70,239,0.2)]"
          )}
        >
          {saveStatus === "saving" && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-fuchsia-500/20 to-transparent -translate-x-full animate-[scan_1.5s_ease-in-out_infinite]" />
          )}
          <AnimatePresence mode="wait">
            {saveStatus === "saved" ? (
              <motion.div key="saved" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]" /> CONFIG_SAVED
              </motion.div>
            ) : saveStatus === "saving" ? (
              <motion.div key="saving" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="flex items-center gap-2 font-mono">
                <Settings className="w-5 h-5 animate-spin drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" /> SAVING_SYS_STATE...
              </motion.div>
            ) : (
              <motion.div key="idle" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="flex items-center gap-2">
                <Save className="w-5 h-5 group-hover:text-fuchsia-400 transition-colors" /> 写入全局配置
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      <div className="flex gap-3 border-b border-white/10 mt-2 pb-4">
        {[
          { id: "engine", label: "HSI 引擎参数", icon: Zap },
          { id: "sync", label: "降级与同步策略", icon: WifiOff },
          { id: "eventbus", label: "EventBus 监视器", icon: Terminal }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "px-5 py-3 rounded-2xl text-sm font-bold transition-all relative flex items-center gap-2 overflow-hidden group",
              activeTab === tab.id 
                ? "text-fuchsia-200 bg-fuchsia-500/10 border border-fuchsia-500/30 shadow-[inset_0_0_20px_rgba(217,70,239,0.1)]" 
                : "text-white/40 hover:text-white/80 hover:bg-white/5 border border-transparent"
            )}
          >
            <tab.icon className={clsx("w-4 h-4 transition-colors", activeTab === tab.id ? "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(217,70,239,0.8)]" : "text-white/40 group-hover:text-white/60")} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="settingsTab" className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-fuchsia-500 to-transparent shadow-[0_0_15px_rgba(217,70,239,0.8)]" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden mt-2 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-fuchsia-500/5 rounded-full blur-[120px] pointer-events-none" />

        {activeTab === "engine" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10"
          >
            <div className="p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-orange-500/30 hover:bg-orange-950/20 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-orange-500/20 transition-all" />
              <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-xl bg-orange-500/20 border border-orange-500/40 shadow-inner">
                  <ShieldAlert className="w-5 h-5 text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
                </div>
                崩溃干预机制 (Hard Filter)
              </h2>
              
              <div className="flex flex-col gap-8 relative z-10">
                <div className="flex justify-between items-start gap-4 group/item">
                  <div>
                    <h4 className="text-white/90 font-bold mb-1.5 group-hover/item:text-orange-300 transition-colors">硬过滤阈值 (SWIP)</h4>
                    <p className="text-xs text-white/50 font-mono tracking-wide leading-relaxed">当 SWIP 超过此值，引擎锁定高负荷任务</p>
                  </div>
                  <select defaultValue="60" className="bg-black/60 border border-white/10 hover:border-orange-500/50 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-orange-500 shadow-inner focus:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all outline-none appearance-none pr-8 relative z-20 cursor-pointer w-40">
                    <option value="40">40 (极敏感)</option>
                    <option value="60">60 (标准)</option>
                    <option value="80">80 (迟钝)</option>
                  </select>
                </div>

                <div className="flex justify-between items-start gap-4 group/item">
                  <div>
                    <h4 className="text-white/90 font-bold mb-1.5 group-hover/item:text-orange-300 transition-colors">锁定期的最大负荷允许</h4>
                    <p className="text-xs text-white/50 font-mono tracking-wide leading-relaxed">硬过滤激活后，任务最大 Cognitive Load</p>
                  </div>
                  <select defaultValue="2" className="bg-black/60 border border-white/10 hover:border-orange-500/50 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-orange-500 shadow-inner focus:shadow-[0_0_15px_rgba(249,115,22,0.2)] transition-all outline-none appearance-none pr-8 relative z-20 cursor-pointer w-40">
                    <option value="1">1 (极低负荷)</option>
                    <option value="2">2 (默认)</option>
                    <option value="3">3 (较高风险)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-cyan-500/30 hover:bg-cyan-950/20 transition-all duration-500 shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/0 via-cyan-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
              <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
              <h2 className="text-xl font-bold text-white mb-8 flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-xl bg-cyan-500/20 border border-cyan-500/40 shadow-inner">
                  <Activity className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                </div>
                推断算法权重 (Weights)
              </h2>
              
              <div className="flex flex-col gap-8 relative z-10">
                <div className="flex justify-between items-start gap-4 group/item">
                  <div className="flex-1">
                    <h4 className="text-white/90 font-bold mb-1.5 group-hover/item:text-cyan-300 transition-colors">认知契合度乘数 (Cognitive Fit)</h4>
                    <p className="text-xs text-white/50 font-mono tracking-wide leading-relaxed">符合心智容量时的得分加成奖励倍率</p>
                  </div>
                  <input type="number" defaultValue="1.1" step="0.1" className="w-24 bg-black/60 border border-white/10 hover:border-cyan-500/50 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all text-center relative z-20" />
                </div>

                <div className="flex justify-between items-start gap-4 group/item">
                  <div className="flex-1">
                    <h4 className="text-white/90 font-bold mb-1.5 group-hover/item:text-cyan-300 transition-colors">拒绝惩罚系数 (Rejection Penalty)</h4>
                    <p className="text-xs text-white/50 font-mono tracking-wide leading-relaxed">被跳过的任务在重排时的分数衰减</p>
                  </div>
                  <input type="number" defaultValue="0.8" step="0.1" className="w-24 bg-black/60 border border-white/10 hover:border-cyan-500/50 rounded-xl px-3 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-cyan-500 shadow-inner focus:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all text-center relative z-20" />
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "sync" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col gap-6 relative z-10"
          >
            <div className="p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl relative overflow-hidden group border-l-4 border-l-yellow-500 shadow-[0_10px_30px_rgba(0,0,0,0.3)] hover:bg-yellow-950/20 hover:border-r-yellow-500/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/0 via-yellow-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />
              <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-yellow-500/20 transition-all" />
              <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-3 relative z-10">
                <div className="p-2 rounded-xl bg-yellow-500/20 border border-yellow-500/40 shadow-inner">
                  <Server className="w-5 h-5 text-yellow-400 drop-shadow-[0_0_8px_rgba(234,179,8,0.8)]" />
                </div>
                降级模式策略 (Offline Degradation)
              </h2>
              <p className="text-sm text-white/50 font-mono mb-8 relative z-10 tracking-wide">当网络断开或服务端不可用时，系统自动切入降级模式。采用本地快照进行 HSI 推断。</p>
              
              <div className="flex flex-col gap-5 relative z-10">
                <div className="flex justify-between items-center p-5 rounded-2xl bg-black/60 border border-white/5 hover:border-yellow-500/30 transition-colors group/item shadow-inner">
                  <div>
                    <h4 className="text-white/90 font-bold tracking-wide group-hover/item:text-yellow-300 transition-colors">自动 UI 降级 (Low-Energy Mode)</h4>
                    <p className="text-xs text-white/40 mt-1 font-mono">切断复杂动画与高频轮询，保留核心卡片</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500 shadow-[inset_0_0_15px_rgba(234,179,8,0.3)] peer-checked:shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                  </label>
                </div>
                
                <div className="flex justify-between items-center p-5 rounded-2xl bg-black/60 border border-white/5 hover:border-yellow-500/30 transition-colors group/item shadow-inner">
                  <div>
                    <h4 className="text-white/90 font-bold tracking-wide group-hover/item:text-yellow-300 transition-colors">启用 SyncQueue 队列缓存</h4>
                    <p className="text-xs text-white/40 mt-1 font-mono">断网期间的所有打卡、修改存储至本地 IndexedDB</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-12 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500 shadow-[inset_0_0_15px_rgba(234,179,8,0.3)] peer-checked:shadow-[0_0_15px_rgba(234,179,8,0.5)]"></div>
                  </label>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl group hover:border-emerald-500/30 hover:bg-emerald-950/20 transition-all duration-500 overflow-hidden relative shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3 relative z-10">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 shadow-inner">
                    <Database className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"/>
                  </div>
                  冲突解决策略
                </h3>
                <select defaultValue="latest" className="w-full bg-black/60 border border-white/10 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 shadow-inner focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all outline-none appearance-none cursor-pointer relative z-20">
                  <option value="latest">LATEST_WIN (本地最后修改优先)</option>
                  <option value="server">SERVER_WIN (服务端数据优先)</option>
                  <option value="merge">MANUAL_MERGE (手动合并)</option>
                </select>
              </div>
              <div className="p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl group hover:border-emerald-500/30 hover:bg-emerald-950/20 transition-all duration-500 overflow-hidden relative shadow-[0_10px_30px_rgba(0,0,0,0.3)]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-emerald-500/20 transition-colors" />
                <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3 relative z-10">
                  <div className="p-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 shadow-inner">
                    <Activity className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]"/>
                  </div>
                  重试退避算法
                </h3>
                <select defaultValue="expo" className="w-full bg-black/60 border border-white/10 hover:border-emerald-500/50 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-emerald-500 shadow-inner focus:shadow-[0_0_15px_rgba(16,185,129,0.2)] transition-all outline-none appearance-none cursor-pointer relative z-20">
                  <option value="expo">EXPONENTIAL_BACKOFF (指数退避)</option>
                  <option value="linear">LINEAR (线性重试)</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === "eventbus" && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="h-[500px] flex flex-col relative z-10 p-8 rounded-3xl bg-black/60 border border-white/10 font-mono shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] backdrop-blur-2xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:10px_10px] pointer-events-none" />
            
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-6 h-6 rounded-full bg-emerald-500/20 animate-ping" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(16,185,129,1)]" />
                </div>
                <span className="text-emerald-400 font-bold text-sm tracking-[0.2em] drop-shadow-[0_0_5px_rgba(16,185,129,0.8)]">SYSTEM.EVENT_BUS // REALTIME</span>
              </div>
              <button className="text-[10px] font-bold tracking-widest text-white/40 hover:text-white px-4 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-colors shadow-inner">CLEAR_LOGS</button>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-4 space-y-3 custom-scrollbar relative z-10">
              {logs.map((log, i) => (
                <div key={i} className="flex flex-col md:flex-row md:items-start gap-2 md:gap-4 p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-colors group">
                  <span className="text-white/20 text-xs shrink-0 pt-0.5 group-hover:text-white/40 transition-colors">[{log.time}]</span>
                  <span className={clsx(
                    "text-xs font-black shrink-0 pt-0.5 tracking-wider drop-shadow-sm",
                    log.level === "INFO" ? "text-cyan-400" :
                    log.level === "WARN" ? "text-amber-400" :
                    "text-rose-400"
                  )}>
                    {log.level}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-white/80 text-sm font-bold group-hover:text-white transition-colors">{log.event}</span>
                    <span className="text-white/40 text-[11px] mt-1.5 leading-relaxed bg-white/5 p-2 rounded-lg border border-white/5">Payload: {log.payload}</span>
                  </div>
                </div>
              ))}
              <div className="flex items-center gap-2 text-emerald-400/50 text-xs pt-4 pl-2 font-bold tracking-wider">
                <span className="animate-pulse">█</span> AWAITING_INCOMING_EVENTS...
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
