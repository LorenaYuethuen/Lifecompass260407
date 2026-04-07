import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Target, CheckCircle2, ChevronRight, BarChart, Flag, Clock, CalendarCheck, Sparkles, TrendingUp, AlertTriangle, Brain, Save, Activity, Zap, Terminal, Database } from "lucide-react";
import { clsx } from "clsx";
import { useSyncStore } from "../../store/syncStore";
import { format } from "date-fns";

export default function ReviewPage() {
  const { queue } = useSyncStore();
  
  const [stats] = useState({
    completionRate: 85,
    checkInRate: 92,
    energyLevelAvg: 7.2,
  });

  const [okrs] = useState([
    {
      id: "okr-1",
      title: "产品架构演进 Q3",
      overallProgress: 68,
      status: "进行中",
      reviewNote: "核心库重构符合预期，但 API 延迟尚未达标。",
      krs: [
        { id: "kr-1", title: "完成核心组件库重构", current: 80, target: 100, unit: "%", progress: 80 },
        { id: "kr-2", title: "API 响应延迟 < 200ms", current: 280, target: 200, unit: "ms", progress: 60 }
      ]
    },
    {
      id: "okr-2",
      title: "技术影响力与分享",
      overallProgress: 100,
      status: "✨ 已完成",
      reviewNote: "本周成功发布4篇高质量技术文章。",
      krs: [
        { id: "kr-3", title: "发布技术文章", current: 4, target: 4, unit: "篇", progress: 100 },
      ]
    }
  ]);

  const [milestones] = useState([
    { id: "m-1", title: "升级 4K 显示器", date: "2026-04-05", type: "wishlist" },
    { id: "m-2", title: "达到 10% 体脂率", date: "2026-04-02", type: "fitness" }
  ]);

  const [tasks, setTasks] = useState([
    { id: "t-1", title: "重构 TaskMatcher 算法", priority: 0 },
    { id: "t-2", title: "补充复盘模块测试用例", priority: 0 },
    { id: "t-3", title: "调研 Next.js 15 RSC 特性", priority: 0 },
    { id: "t-4", title: "整理本周技术分享 PPT", priority: 0 }
  ]);

  const [activeTab, setActiveTab] = useState<"okr" | "priority" | "milestone" | "event_log">("okr");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);

  const handlePriorityChange = (taskId: string, val: number) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, priority: val } : t));
  };

  const handleConfirmReview = () => {
    setReviewConfirmed(true);
    setTimeout(() => setReviewConfirmed(false), 3000);
  };

  return (
    <div className="flex flex-col gap-6 pb-20 pt-2 h-full max-w-6xl mx-auto relative">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-500/30 blur-[20px] rounded-full" />
            <div className="relative w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 border border-purple-500/30 flex items-center justify-center backdrop-blur-xl shadow-[0_0_20px_rgba(168,85,247,0.3)]">
              <Target className="w-7 h-7 text-purple-400" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-100 to-fuchsia-400 tracking-tight">全局复盘与 OKR (DB-04)</h1>
            <p className="text-purple-400/60 text-sm flex items-center gap-2 mt-1 font-mono">
              <Activity className="w-4 h-4 text-purple-500" />
              WEEKLY_REVIEW_ROUTINE // 驱动 DB-03.weeklyPriority
            </p>
          </div>
        </div>
        
        {activeTab === "priority" && (
          <button 
            onClick={handleConfirmReview}
            className={clsx(
              "px-6 py-3 rounded-2xl font-bold text-sm transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-105",
              reviewConfirmed 
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]" 
                : "bg-purple-600 hover:bg-purple-500 text-white border border-purple-400/50"
            )}
          >
            {reviewConfirmed ? <><CheckCircle2 className="w-5 h-5" /> EVENT_EMITTED</> : <><Zap className="w-5 h-5 fill-white" /> 触发 REVIEW_CONFIRMED</>}
          </button>
        )}
      </div>

      {/* Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none animate-pulse" />

        <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl group hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-colors relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="text-white/40 text-xs mb-1 font-mono flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" /> ReviewCache.taskCompletionRate</div>
          <div className="text-5xl font-black text-white tracking-tighter mb-2 group-hover:text-emerald-400 transition-colors drop-shadow-md">{stats.completionRate}<span className="text-2xl text-white/30">%</span></div>
          <div className="text-emerald-400 text-xs flex items-center gap-1 font-mono bg-emerald-500/10 px-2 py-1 rounded-md w-fit border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
            <TrendingUp className="w-3 h-3" /> +12% vs LAST_WEEK
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl group hover:border-purple-500/50 hover:bg-purple-500/5 transition-colors relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
          <div className="text-white/40 text-xs mb-1 font-mono flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)] animate-pulse" /> ReviewCache.checkInRate</div>
          <div className="text-5xl font-black text-white tracking-tighter mb-2 group-hover:text-purple-400 transition-colors drop-shadow-md">{stats.checkInRate}<span className="text-2xl text-white/30">%</span></div>
          <div className="text-purple-400 text-xs flex items-center gap-1 font-mono bg-purple-500/10 px-2 py-1 rounded-md w-fit border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]">
            <CheckCircle2 className="w-3 h-3" /> DB-01 SYNC_OK
          </div>
        </div>

        <div className="p-6 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl group hover:border-orange-500/50 hover:bg-orange-500/5 transition-colors relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
          <div className="text-white/40 text-xs mb-1 font-mono flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.8)] animate-pulse" /> HSI.energy.overallAvg</div>
          <div className="text-5xl font-black text-white tracking-tighter mb-2 group-hover:text-orange-400 transition-colors drop-shadow-md">{stats.energyLevelAvg}<span className="text-2xl text-white/30">/10</span></div>
          <div className="text-orange-400 text-xs flex items-center gap-1 font-mono bg-orange-500/10 px-2 py-1 rounded-md w-fit border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.2)]">
            <AlertTriangle className="w-3 h-3" /> WED_PM_CRASH_DETECTED
          </div>
        </div>
      </div>

      <div className="flex gap-2 border-b border-white/10 mt-4 pb-2 overflow-x-auto hide-scrollbar">
        {[
          { id: "okr", label: "OKR 追踪阵列", icon: Target },
          { id: "priority", label: "优先级重排矩阵", icon: Brain },
          { id: "milestone", label: "里程碑 (DB-07)", icon: Sparkles },
          { id: "event_log", label: "底层事件流水 (SyncQueue)", icon: Terminal }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={clsx(
              "px-5 py-3 rounded-xl text-sm font-bold transition-all relative flex items-center gap-2 whitespace-nowrap",
              activeTab === tab.id 
                ? "text-purple-100 bg-white/10 shadow-inner" 
                : "text-white/40 hover:text-white/80 hover:bg-white/5"
            )}
          >
            <tab.icon className={clsx("w-4 h-4", activeTab === tab.id ? "text-purple-400" : "text-white/40")} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div layoutId="reviewTab" className="absolute bottom-[-9px] left-1/4 right-1/4 h-1 bg-purple-500 rounded-t-full shadow-[0_0_15px_rgba(168,85,247,0.8)]" />
            )}
          </button>
        ))}
      </div>

      <div className="mt-2 flex-1 relative">
        <AnimatePresence mode="wait">
          {activeTab === "okr" && (
            <motion.div
              key="okr"
              initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              {okrs.map(okr => (
                <div key={okr.id} className="p-6 md:p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl relative overflow-hidden group hover:border-purple-500/30 transition-all">
                  <div className="absolute -top-32 -right-32 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-purple-500/20 transition-all" />
                  
                  <div className="flex flex-col md:flex-row justify-between items-start mb-8 relative z-10 gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={clsx("w-2 h-8 rounded-full", okr.overallProgress === 100 ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" : "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.8)]")} />
                        <h2 className="text-2xl font-bold text-white tracking-tight">{okr.title}</h2>
                        <span className={clsx(
                          "text-xs px-3 py-1 rounded-full font-bold border",
                          okr.status === "✨ 已完成" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-purple-500/20 text-purple-300 border-purple-500/30"
                        )}>
                          {okr.status}
                        </span>
                      </div>
                      <div className="flex items-start gap-3 bg-white/5 p-4 rounded-2xl border border-white/5">
                        <MessageSquare className="w-5 h-5 text-white/30 shrink-0 mt-0.5" />
                        <p className="text-sm text-white/70 leading-relaxed font-mono">
                          <span className="text-purple-400 block text-xs mb-1">DB-04.reviewNote</span>
                          {okr.reviewNote}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex flex-col items-end shrink-0">
                      <div className="text-[10px] font-mono text-white/40 mb-1 tracking-widest">OVERALL_PROGRESS</div>
                      <div className={clsx("text-6xl font-black tracking-tighter drop-shadow-lg", okr.overallProgress === 100 ? "text-emerald-400" : "text-purple-400")}>{okr.overallProgress}<span className="text-3xl text-white/20">%</span></div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 relative z-10">
                    <div className="text-xs font-mono text-white/30 tracking-widest mb-1">KEY_RESULTS (KR)</div>
                    {okr.krs.map(kr => (
                      <div key={kr.id} className="relative p-5 rounded-2xl bg-black/60 border border-white/5 overflow-hidden group-hover:border-white/10 transition-colors">
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-white/10" />
                        
                        <div className="flex justify-between items-center mb-3">
                          <h4 className="text-white/90 text-sm font-bold tracking-wide">{kr.title}</h4>
                          <span className="text-xs font-mono text-white/50 bg-white/10 px-2 py-1 rounded border border-white/5">{kr.current} / {kr.target} {kr.unit}</span>
                        </div>
                        
                        <div className="w-full h-3 bg-black/80 rounded-full overflow-hidden shadow-inner relative border border-white/5">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${kr.progress}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={clsx("absolute top-0 left-0 h-full rounded-full", kr.progress === 100 ? "bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.8)]" : "bg-gradient-to-r from-purple-600 to-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.8)]")}
                          >
                            <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/30" />
                          </motion.div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === "priority" && (
            <motion.div
              key="priority"
              initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="p-8 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[60px] pointer-events-none" />
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">优先级重排矩阵 (weeklyPriorityMap)</h2>
                </div>
                <p className="text-sm text-white/50 mb-8 relative z-10 font-mono">
                  为以下待办任务打分 (1-5分)。确认复盘后系统将触发 <code>REVIEW_CONFIRMED</code> 事件，并在 TaskMatcherEngine 中全量重排。
                </p>

                <div className="flex flex-col gap-4 relative z-10">
                  {tasks.map(task => (
                    <div key={task.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-blue-500/30 hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-4 mb-4 md:mb-0">
                        <div className="w-2.5 h-2.5 rounded-full bg-blue-500/50 group-hover:bg-blue-400 group-hover:shadow-[0_0_10px_rgba(96,165,250,0.8)] transition-all" />
                        <span className="font-bold text-white/90 tracking-wide text-sm">{task.title}</span>
                      </div>
                      <div className="flex items-center gap-2 bg-black/40 p-1.5 rounded-xl border border-white/10 shadow-inner">
                        {[1, 2, 3, 4, 5].map(val => (
                          <button
                            key={val}
                            onClick={() => handlePriorityChange(task.id, val)}
                            className={clsx(
                              "w-10 h-10 rounded-lg text-sm font-bold transition-all",
                              task.priority === val 
                                ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] scale-110 z-10" 
                                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white"
                            )}
                          >
                            P{val}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "milestone" && (
            <motion.div
              key="milestone"
              initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-100/90 text-sm flex items-start gap-4 backdrop-blur-md shadow-[0_0_30px_rgba(16,185,129,0.1)]">
                <div className="p-2 bg-emerald-500/20 rounded-xl border border-emerald-500/30">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="mt-1">
                  <div className="font-bold text-base mb-1 text-emerald-300">显化里程碑 (DB-07)</div>
                  <p className="text-emerald-200/60 text-xs font-mono leading-relaxed">
                    侦听到 <code>OKR_COMPLETED</code> 事件。自动触发状态机流转：愿望状态 <code>manifestStatus</code> 更新为 <code>'✨已显化'</code>。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {milestones.map((m, i) => (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.1 }}
                    key={m.id} 
                    className="p-6 rounded-3xl bg-black/40 border border-white/10 flex flex-col gap-4 relative overflow-hidden group hover:border-emerald-500/40 transition-all cursor-default"
                  >
                    <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
                    
                    <div className="flex justify-between items-start relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        </div>
                        <h4 className="font-bold text-lg text-white tracking-wide group-hover:text-emerald-300 transition-colors">{m.title}</h4>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/5 relative z-10">
                      <div className="flex items-center gap-2 text-xs font-mono text-emerald-400/50 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/10">
                        <Target className="w-3.5 h-3.5" /> TYPE: {m.type.toUpperCase()}
                      </div>
                      <span className="text-xs font-mono text-white/30 tracking-widest">
                        {m.date}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
          {activeTab === "event_log" && (
            <motion.div
              key="event_log"
              initial={{ opacity: 0, y: 10, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(10px)" }}
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-6"
            >
              <div className="p-5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-100/90 text-sm flex items-start gap-4 backdrop-blur-md shadow-[0_0_30px_rgba(99,102,241,0.1)]">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-500/30">
                  <Database className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="mt-1">
                  <div className="font-bold text-base mb-1 text-indigo-300 flex items-center gap-2">
                    SyncQueue 审计日志
                    <span className="text-[10px] bg-indigo-500/20 border border-indigo-500/40 px-2 py-0.5 rounded-full font-mono text-indigo-300">
                      TOTAL: {queue.length}
                    </span>
                  </div>
                  <p className="text-indigo-200/60 text-xs font-mono leading-relaxed">
                    全局复盘期间，系统需拉取底层同步队列中的全量变更记录。包含已完成状态流转的离线积压数据。
                  </p>
                </div>
              </div>

              <div className="relative pl-6 before:absolute before:left-3.5 before:top-4 before:bottom-4 before:w-px before:bg-white/10 flex flex-col gap-8">
                {queue.slice().reverse().map((item, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    key={item.id} 
                    className="relative group"
                  >
                    <div className={clsx(
                      "absolute -left-6 w-3 h-3 rounded-full mt-1.5 border-2 z-10 transition-colors shadow-lg",
                      item.status === 'synced' ? "bg-emerald-500/20 border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
                      item.status === 'syncing' ? "bg-blue-500/20 border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse" :
                      "bg-orange-500/20 border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                    )} />
                    
                    <div className="bg-black/40 border border-white/10 rounded-2xl p-5 ml-4 hover:border-indigo-500/30 hover:bg-white/5 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 font-mono text-xs">
                          <span className="text-white/40">{format(item.timestamp, "MM/dd HH:mm:ss")}</span>
                          <span className={clsx(
                            "px-2 py-0.5 rounded border text-[10px] font-bold tracking-widest",
                            item.op === 'create' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                            item.op === 'update' || item.op === 'patch' ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                            "bg-red-500/10 border-red-500/20 text-red-400"
                          )}>
                            {item.op.toUpperCase()}
                          </span>
                          <span className="text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20 text-[10px]">
                            {item.entity}
                          </span>
                        </div>
                        <div className={clsx(
                          "text-[10px] font-mono font-bold tracking-widest flex items-center gap-1",
                          item.status === 'synced' ? "text-emerald-400" :
                          item.status === 'syncing' ? "text-blue-400" : "text-orange-400"
                        )}>
                          {item.status.toUpperCase()}
                        </div>
                      </div>
                      
                      <div className="text-white/80 font-medium text-sm leading-relaxed mb-3">
                        {item.desc}
                      </div>

                      <div className="flex gap-4 text-[10px] font-mono text-white/30 bg-black/60 p-2.5 rounded-xl border border-white/5">
                        <span><strong className="text-white/50">ID:</strong> {item.id.slice(0, 8)}...</span>
                        <span><strong className="text-white/50">PRIORITY:</strong> {item.priority}</span>
                        <span><strong className="text-white/50">CONFLICT:</strong> {item.conflict}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {queue.length === 0 && (
                  <div className="ml-4 p-8 rounded-2xl border border-white/5 border-dashed bg-black/20 flex flex-col items-center justify-center text-center">
                    <Database className="w-8 h-8 text-white/20 mb-2" />
                    <p className="text-sm font-mono text-white/40">SyncQueue 审计队列为空<br/>暂无积压的底座变更记录。</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function MessageSquare(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
  );
}
