import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Zap, BrainCircuit, Activity, BarChart, SlidersHorizontal, 
  CheckCircle2, XCircle, Play, Sparkles, Filter, ChevronRight, 
  Target, ShieldAlert, Lock, AlertTriangle, ArrowDownRight, Clock, Battery, AlertOctagon, Undo2
} from "lucide-react";
import { clsx } from "clsx";
import { useSysStore } from "../../store/sysStore";
import { useSyncStore } from "../../store/syncStore";

interface Task {
  id: number;
  title: string;
  load: number | null;
  energy: string;
  priority: number;
  status: string;
  baseScore: number;
  bestTimeSlot: string | null;
  rejectionLog: any[];
}

export default function DoPage() {
  const { emitEvent, isOffline } = useSysStore();
  const { enqueue } = useSyncStore();

  const overallEnergy = 65; // Current Energy
  const swipScore = 68; // Crash Risk Score
  const hardFilterEnabled = swipScore > 60; // Hard Filter Triggered
  const maxCogLoad = hardFilterEnabled ? 2 : 5; // Load limit when filtered

  const hsiContext = {
    mentalCapacity: 4, // hsi.focus.mentalCapacity
    timeOfDay: "morning", // hsi.temporal.timeOfDay
    isOffline: isOffline, // Simulate offline mode to trigger SyncQueue/Degradation
  };

  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, title: "深度工作: 架构设计核心模块", load: 5, energy: "极高", priority: 1, status: "pending", baseScore: 95, bestTimeSlot: "morning", rejectionLog: [] },
    { id: 2, title: "起草 Q3 战略分析文档", load: 3, energy: "高", priority: 2, status: "pending", baseScore: 88, bestTimeSlot: "afternoon", rejectionLog: [{ at: "yesterday" }] },
    { id: 3, title: "回顾本周运营核心指标", load: null, energy: "中", priority: 3, status: "pending", baseScore: 82, bestTimeSlot: null, rejectionLog: [] }, // Missing fields to trigger degradation
    { id: 4, title: "与设计团队同步 UI 规范", load: 1, energy: "低", priority: 4, status: "pending", baseScore: 75, bestTimeSlot: "any", rejectionLog: [] },
    { id: 5, title: "更新基础技术组件文档", load: 2, energy: "低", priority: 5, status: "pending", baseScore: 60, bestTimeSlot: "any", rejectionLog: [] },
  ]);

  const [activeTask, setActiveTask] = useState<any>(null);
  const [overrideTarget, setOverrideTarget] = useState<any>(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTask) {
      interval = setInterval(() => {
        setTimer(prev => prev + 1);
      }, 1000);
    } else {
      setTimer(0);
    }
    return () => clearInterval(interval);
  }, [activeTask]);

  const handleSkip = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    emitEvent('TaskEngine', 'skip_task', { taskId, title: task?.title });
    enqueue({
      entity: "DB-03",
      op: "patch",
      priority: 0,
      desc: `跳过任务: ${task?.title}`,
      conflict: "last-write-wins"
    });
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: "skipped" } : t));
  };

  const handleComplete = (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    emitEvent('TaskEngine', 'complete_task', { taskId, title: task?.title, duration: timer });
    enqueue({
      entity: "DB-03",
      op: "patch",
      priority: 1,
      desc: `完成任务: ${task?.title}`,
      conflict: "last-write-wins"
    });
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status: "completed" } : t));
    setActiveTask(null);
  };

  const handleStartNormal = (task: any) => {
    setActiveTask({ ...task, isOverride: false });
    emitEvent('TaskEngine', 'start_task', { taskId: task.id, type: 'normal' });
  };

  const handleRequestOverride = (task: any) => {
    setOverrideTarget(task);
  };

  const confirmOverride = () => {
    setActiveTask({ ...overrideTarget, isOverride: true });
    emitEvent('TaskEngine', 'force_override', { taskId: overrideTarget.id, load: overrideTarget.load });
    enqueue({
      entity: "DB-08", // Event Log
      op: "create",
      priority: 2,
      desc: `⚠️ 强制越权执行高风险任务: ${overrideTarget.title}`,
      conflict: "append"
    });
    setOverrideTarget(null);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // --- Task Matcher Engine Simulation (Flow 3) ---
  // Applying field-dependency-matrix rules
  const filteredTasks = tasks.filter(t => t.status === "pending").map(t => {
    let energyGapWarning = false;
    let isHardFiltered = false;

    // Field Dependency: Rejection Penalty (DB-03.rejectionLog[])
    let rejectionPenalty = 1.0; 
    if (t.status === "skipped" || (t.rejectionLog && t.rejectionLog.length > 0)) {
      rejectionPenalty = 0.8; // memory penalty
    } else {
      rejectionPenalty = 1.0; // "rejectionLog 为空→ penalty=1.0（无记忆）"
    }

    // Field Dependency: Cognitive Fit Multiplier (DB-03.cognitiveLoad, hsi.focus.mentalCapacity)
    let cognitiveFitMultiplier = 1.0;
    if (t.load === null) {
      cognitiveFitMultiplier = 1.0; // "cognitiveLoad 缺失→ multiplier=1.0（不奖不惩）"
    } else if (t.load <= hsiContext.mentalCapacity) {
      cognitiveFitMultiplier = 1.1; // Bonus for fit
    } else {
      cognitiveFitMultiplier = 0.9; // Penalty for overload
    }

    // Field Dependency: Time Slot Fit Bonus (DB-03.bestTimeSlot, hsi.temporal.timeOfDay)
    let timeSlotFitBonus = 0;
    if (!t.bestTimeSlot) {
      timeSlotFitBonus = 0.05; // "bestTimeSlot 缺失→ bonus=0.05（any 默认值）"
    } else if (t.bestTimeSlot === hsiContext.timeOfDay || t.bestTimeSlot === "any") {
      timeSlotFitBonus = 0.1;
    }

    // Simulate energy required mapping
    const requiredEnergyMap: Record<string, number> = { "极高": 90, "高": 70, "中": 40, "低": 20 };
    const requiredEnergy = requiredEnergyMap[t.energy] || 50;
    
    // Energy Gap Rule: If required > current + 20, warn.
    if (requiredEnergy - overallEnergy > 10) {
      energyGapWarning = true;
    }
    
    // Hard Filter Rule: if SWIP > 60, limit max load.
    if (hardFilterEnabled && t.load !== null && t.load > maxCogLoad) {
      isHardFiltered = true;
    }

    const finalScore = Math.round((t.baseScore * rejectionPenalty * cognitiveFitMultiplier) + (t.baseScore * timeSlotFitBonus));
    return { ...t, requiredEnergy, energyGapWarning, isHardFiltered, finalScore, rejectionPenalty, cognitiveFitMultiplier, timeSlotFitBonus };
  }).sort((a, b) => b.finalScore - a.finalScore);

  const recommendedTasks = filteredTasks.filter(t => !t.isHardFiltered && !t.energyGapWarning).slice(0, 2);
  const otherPendingTasks = filteredTasks.filter(t => !recommendedTasks.includes(t));
  const completedTasks = tasks.filter(t => t.status === "completed");

  return (
    <div className="flex flex-col gap-6 pb-20 pt-2 h-full max-w-6xl mx-auto relative">
      
      {/* --------------------------- */}
      {/* Focus Mode Overlay */}
      {/* --------------------------- */}
      <AnimatePresence>
        {activeTask && (
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 z-50 bg-black/90 backdrop-blur-3xl rounded-[3rem] border border-white/10 flex flex-col p-12 overflow-hidden"
          >
            {activeTask.isOverride && (
              <>
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse" />
                <div className="absolute inset-0 pointer-events-none border-[4px] border-red-500/20 rounded-[3rem] opacity-50 animate-pulse" />
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-red-500/20 blur-[100px] pointer-events-none animate-pulse" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-orange-500/20 blur-[100px] pointer-events-none animate-pulse" />
              </>
            )}

            {!activeTask.isOverride && (
              <>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500/20 blur-[100px] pointer-events-none" />
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-purple-500/20 blur-[100px] pointer-events-none" />
                <motion.div 
                  className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjEiPjxsaW5lIHgxPSIwIiB5MT0iNDAiIHgyPSI0MCIgeTI9IjAiIC8+PC9nPjwvc3ZnPg==')] pointer-events-none opacity-20"
                  animate={{ backgroundPosition: ["0px 0px", "40px 40px"] }}
                  transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                />
              </>
            )}

            <button 
              onClick={() => setActiveTask(null)}
              className="absolute top-8 left-8 p-3 rounded-full bg-white/5 border border-white/10 text-white/50 hover:text-white transition-colors z-10 hover:bg-white/10"
            >
              <Undo2 className="w-5 h-5" />
            </button>

            <div className="flex flex-col items-center justify-center flex-1 text-center max-w-2xl mx-auto relative z-10">
              {activeTask.isOverride && (
                <motion.div 
                  initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                  className="mb-8 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-bold shadow-[0_0_20px_rgba(239,68,68,0.2)]"
                >
                  <AlertOctagon className="w-5 h-5 animate-pulse" />
                  强制越权模式：状态不佳，注意认知崩溃风险，请随时终止
                </motion.div>
              )}

              <span className="text-sm font-bold text-indigo-400 tracking-widest uppercase mb-4 flex items-center gap-2 drop-shadow-md">
                <Target className="w-4 h-4" /> 当前专注目标
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white leading-tight mb-12 drop-shadow-xl">
                {activeTask.title}
              </h2>

              <div className="relative w-64 h-64 flex items-center justify-center mb-12">
                <motion.div 
                  animate={{ rotate: 360 }}
                  transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                  className={clsx(
                    "absolute inset-0 rounded-full border-2 border-dashed pointer-events-none",
                    activeTask.isOverride ? "border-red-500/30" : "border-indigo-500/30"
                  )}
                />
                <motion.div 
                  animate={{ rotate: -360 }}
                  transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                  className={clsx(
                    "absolute inset-4 rounded-full border border-dotted pointer-events-none opacity-50",
                    activeTask.isOverride ? "border-orange-500/40" : "border-purple-500/40"
                  )}
                />
                <div className={clsx(
                  "text-[5rem] font-mono font-bold text-transparent bg-clip-text bg-gradient-to-b tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.2)]",
                  activeTask.isOverride ? "from-red-100 to-red-500/50 drop-shadow-[0_0_30px_rgba(239,68,68,0.4)]" : "from-white to-indigo-500/30"
                )}>
                  {formatTime(timer)}
                </div>
              </div>

              <div className="flex gap-4 w-full">
                <button 
                  onClick={() => handleComplete(activeTask.id)}
                  className={clsx(
                    "flex-1 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 transition-all",
                    activeTask.isOverride 
                      ? "bg-gradient-to-r from-orange-500 to-red-600 shadow-[0_0_30px_rgba(239,68,68,0.4)] hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] text-white hover:scale-[1.02]"
                      : "bg-indigo-500 hover:bg-indigo-400 shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_40px_rgba(99,102,241,0.6)] text-white hover:scale-[1.02]"
                  )}
                >
                  <CheckCircle2 className="w-6 h-6" /> 目标达成
                </button>
                <button 
                  onClick={() => setActiveTask(null)}
                  className="px-8 py-5 rounded-2xl font-bold bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
                >
                  中止
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --------------------------- */}
      {/* Override Confirmation Modal */}
      {/* --------------------------- */}
      <AnimatePresence>
        {overrideTarget && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-md bg-gradient-to-b from-[#1a0a0a] to-black border border-red-500/30 rounded-[2rem] p-8 z-[70] shadow-[0_20px_60px_rgba(239,68,68,0.3)] overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/20 blur-[50px] pointer-events-none" />
              
              <div className="flex justify-center mb-6 relative z-10">
                <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center relative">
                  <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }} transition={{ duration: 2, repeat: Infinity }} className="absolute inset-0 rounded-full border border-red-500/50" />
                  <AlertOctagon className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <h3 className="text-2xl font-black text-center text-white mb-2 relative z-10">强制越权执行</h3>
              <p className="text-center text-white/60 text-sm mb-6 relative z-10">
                您当前的 SWIP 得分 (<span className="text-orange-400 font-bold">{swipScore}</span>) 已触发硬过滤。该任务认知负荷 ({overrideTarget.load}) 超过当前可用上限 ({maxCogLoad})。
              </p>

              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 mb-8 relative z-10">
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest mb-1 block">越权后果预测</span>
                <ul className="text-xs text-white/50 space-y-2">
                  <li className="flex items-center gap-2"><ArrowDownRight className="w-3 h-3 text-red-500" /> 执行崩溃概率增加 45%</li>
                  <li className="flex items-center gap-2"><ArrowDownRight className="w-3 h-3 text-red-500" /> 后续恢复周期将强制翻倍 (40min+)</li>
                  <li className="flex items-center gap-2"><ArrowDownRight className="w-3 h-3 text-red-500" /> 该越权事件将被写入底层日���审计</li>
                </ul>
              </div>

              <div className="flex gap-3 relative z-10">
                <button onClick={() => setOverrideTarget(null)} className="flex-1 py-3.5 rounded-xl font-bold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors">
                  取消
                </button>
                <button onClick={confirmOverride} className="flex-1 py-3.5 rounded-xl font-black bg-gradient-to-r from-red-600 to-orange-600 text-white shadow-lg hover:shadow-[0_0_20px_rgba(239,68,68,0.5)] transition-all flex items-center justify-center gap-2">
                  <Zap className="w-4 h-4 fill-current" /> 确认越权
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header section with HSI context */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center backdrop-blur-xl shadow-[0_0_20px_rgba(99,102,241,0.3)]">
            <Zap className="w-7 h-7 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">执行与任务匹配 (Flow 3)</h1>
            <p className="text-white/50 text-sm flex items-center gap-2 mt-1">
              <BrainCircuit className="w-4 h-4 text-indigo-400" />
              基于能量缺口与崩溃风险的智能推荐引擎
            </p>
          </div>
        </div>
      </div>

      {/* Engine Status Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-2">
        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md flex items-center justify-between shadow-inner relative group overflow-hidden hover:border-yellow-500/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none" />
          {hsiContext.isOffline && (
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-yellow-500/20 blur-md shadow-[0_0_15px_rgba(234,179,8,0.5)] flex items-center justify-center animate-pulse z-0"></div>
          )}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(234,179,8,0.2)] group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5 text-yellow-400 drop-shadow-md" />
            </div>
            <div>
              <p className="text-xs text-white/50 font-bold tracking-wider">{hsiContext.isOffline ? "SyncQueue 降级模式" : "在线同步"}</p>
              <h4 className="text-[13px] font-black text-yellow-400 mt-1 drop-shadow-[0_0_8px_rgba(234,179,8,0.4)]">
                {hsiContext.isOffline ? "使用节律基线快照" : "全量特征激活"}
              </h4>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md flex items-center justify-between shadow-inner relative group overflow-hidden hover:border-emerald-500/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-bl from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(16,185,129,0.2)] group-hover:scale-110 transition-transform">
              <Battery className="w-5 h-5 text-emerald-400 drop-shadow-md" />
            </div>
            <div>
              <p className="text-xs text-white/50 font-bold tracking-wider">当前可用能量</p>
              <h4 className="text-xl font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.4)]">{overallEnergy}<span className="text-sm text-white/40">/100</span></h4>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md flex items-center justify-between shadow-inner relative group overflow-hidden hover:border-orange-500/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/5 to-transparent pointer-events-none" />
          {hardFilterEnabled && <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-[30px] pointer-events-none animate-pulse" />}
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-orange-500/10 border border-orange-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(249,115,22,0.2)] group-hover:scale-110 transition-transform">
              <ShieldAlert className="w-5 h-5 text-orange-400 drop-shadow-md" />
            </div>
            <div>
              <p className="text-xs text-white/50 font-bold tracking-wider">硬过滤状态</p>
              <h4 className={clsx("text-sm font-black mt-1", hardFilterEnabled ? "text-orange-400 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]" : "text-white/50")}>
                {hardFilterEnabled ? `已拦截 (Load上限 ${maxCogLoad})` : "未激活"}
              </h4>
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-black/40 border border-white/5 backdrop-blur-md flex items-center justify-between shadow-inner relative group overflow-hidden hover:border-blue-500/30 transition-colors">
          <div className="absolute inset-0 bg-gradient-to-tl from-blue-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.2)] group-hover:scale-110 transition-transform">
              <SlidersHorizontal className="w-5 h-5 text-blue-400 drop-shadow-md" />
            </div>
            <div>
              <p className="text-xs text-white/50 font-bold tracking-wider">AI 引擎匹配基准</p>
              <h4 className="text-[13px] font-black text-blue-400 mt-1 drop-shadow-[0_0_8px_rgba(59,130,246,0.4)]">优先认知契合度</h4>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Col: Recommended Task & Execution (2 cols) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold text-white tracking-wide">今日最优推荐任务</h2>
          </div>

          <AnimatePresence mode="popLayout">
            {recommendedTasks.length > 0 ? (
              recommendedTasks.map((task, index) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  key={task.id} 
                  className={clsx(
                    "p-6 rounded-3xl border backdrop-blur-xl relative overflow-hidden group transition-all",
                    index === 0 
                      ? "bg-gradient-to-br from-indigo-900/40 to-black/60 border-indigo-500/40 shadow-[0_10px_40px_rgba(99,102,241,0.2)]" 
                      : "bg-white/5 border-white/10 hover:bg-white/10"
                  )}
                >
                  {index === 0 && (
                    <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/20 rounded-full blur-[60px] pointer-events-none" />
                  )}
                  
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-indigo-300 bg-indigo-500/20 px-2.5 py-1 rounded-md border border-indigo-500/30 w-fit cursor-help relative group/tooltip">
                          Score: {task.finalScore}
                          
                          {/* Breakdown Tooltip */}
                          <div className="absolute top-full left-0 mt-2 w-64 p-3 bg-black/90 border border-white/10 rounded-xl opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none z-50">
                            <p className="text-xs text-white/70 mb-2 border-b border-white/10 pb-1">TaskMatcher 引擎权重 (依赖降级保护)</p>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-white/50">Base Score:</span>
                              <span className="text-white/90">{task.baseScore}</span>
                            </div>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-white/50">Rejection Penalty:</span>
                              <span className={task.rejectionPenalty < 1 ? "text-red-400" : "text-white/90"}>{task.rejectionPenalty}x {task.rejectionPenalty === 1 && "(无记忆)"}</span>
                            </div>
                            <div className="flex justify-between text-[10px] mb-1">
                              <span className="text-white/50">Cognitive Fit:</span>
                              <span className={task.cognitiveFitMultiplier > 1 ? "text-emerald-400" : task.cognitiveFitMultiplier < 1 ? "text-orange-400" : "text-white/90"}>{task.cognitiveFitMultiplier}x {task.load === null && "(缺失降级=1.0)"}</span>
                            </div>
                            <div className="flex justify-between text-[10px]">
                              <span className="text-white/50">Time Slot Bonus:</span>
                              <span className="text-emerald-400">+{task.timeSlotFitBonus} {task.timeSlotFitBonus === 0.05 && "(any缺失默认值)"}</span>
                            </div>
                          </div>
                        </span>
                        {task.load === null && <span className="text-[10px] text-yellow-400 border border-yellow-400/20 bg-yellow-400/10 px-2 py-0.5 rounded-full">缺少 Load 字段</span>}
                        {task.bestTimeSlot === null && <span className="text-[10px] text-yellow-400 border border-yellow-400/20 bg-yellow-400/10 px-2 py-0.5 rounded-full">缺少最佳时段</span>}
                      </div>
                      <h3 className="text-2xl font-black text-white mt-1 leading-tight tracking-tight">{task.title}</h3>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-white/40">认知负荷</span>
                        <div className="flex gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <div key={i} className={clsx("w-2 h-4 rounded-sm", i < task.load ? "bg-indigo-400 shadow-[0_0_8px_rgba(99,102,241,0.5)]" : "bg-white/10")} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mb-8 relative z-10 text-sm">
                    <span className="flex items-center gap-1.5 text-white/60 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <Battery className="w-4 h-4 text-emerald-400" />
                      需 {task.requiredEnergy} 能量
                    </span>
                    <span className="flex items-center gap-1.5 text-white/60 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <Target className="w-4 h-4 text-cyan-400" />
                      关联 P{task.priority} 目标
                    </span>
                  </div>

                  <div className="flex gap-3 relative z-10">
                    <button 
                      onClick={() => handleStartNormal(task)}
                      className="flex-1 py-3.5 rounded-xl font-black bg-indigo-500 hover:bg-indigo-400 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)] flex items-center justify-center gap-2 transition-all scale-100 hover:scale-[1.02]"
                    >
                      <Play className="w-5 h-5 fill-white" /> 开始执行
                    </button>
                    <button 
                      onClick={() => handleSkip(task.id)}
                      className="px-6 py-3.5 rounded-xl font-bold bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white transition-all flex items-center gap-2 group"
                      title="跳过将施加 0.8x 拒绝惩罚系数"
                    >
                      <XCircle className="w-5 h-5 group-hover:text-red-400 transition-colors" /> 跳过
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="p-8 rounded-3xl bg-black/40 border border-white/5 flex flex-col items-center justify-center text-center text-white/40 h-64 border-dashed">
                <CheckCircle2 className="w-12 h-12 mb-3 opacity-20 text-emerald-400" />
                <p>当前所有优选任务均被过滤，<br/>或已全部完成。</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Col: Secondary Queue & Filtered Tasks (1 col) */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-white/50" />
            <h2 className="text-lg font-bold text-white/80">引擎过滤与备选队列</h2>
          </div>

          <div className="flex flex-col gap-4">
            <AnimatePresence mode="popLayout">
              {otherPendingTasks.map(task => (
                <motion.div 
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  key={task.id} 
                  className={clsx(
                    "p-4 rounded-2xl border relative overflow-hidden transition-all",
                    task.isHardFiltered 
                      ? "bg-black/60 border-orange-500/20 opacity-60" 
                      : task.energyGapWarning 
                        ? "bg-black/40 border-yellow-500/20" 
                        : "bg-white/5 border-white/10"
                  )}
                >
                  {task.isHardFiltered && (
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGcgc3Ryb2tlPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMDUpIiBzdHJva2Utd2lkdGg9IjIiPjxsaW5lIHgxPSIwIiB5MT0iNDAiIHgyPSI0MCIgeTI9IjAiIC8+PC9nPjwvc3ZnPg==')] pointer-events-none" />
                  )}

                  <div className="flex justify-between items-start mb-2 relative z-10">
                    <h4 className="font-bold text-white/90 text-sm leading-tight line-clamp-2">{task.title}</h4>
                    {task.isHardFiltered && <Lock className="w-4 h-4 text-orange-400 shrink-0 ml-2" />}
                  </div>

                  {task.isHardFiltered ? (
                    <div className="mt-3 flex items-start gap-1.5 text-[11px] text-orange-400/80 bg-orange-500/10 p-2 rounded-lg border border-orange-500/20">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>硬过滤拦截：任务负荷 ({task.load}) &gt; 当前允许上限 ({maxCogLoad})</span>
                    </div>
                  ) : task.energyGapWarning ? (
                    <div className="mt-3 flex items-start gap-1.5 text-[11px] text-yellow-400/80 bg-yellow-500/10 p-2 rounded-lg border border-yellow-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>能量缺口警告：需 {task.requiredEnergy}，高于当前 {overallEnergy}，执行可能引发崩溃。</span>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center justify-between text-xs text-white/50">
                      <span>Score: {task.finalScore}</span>
                      <span>Load: {task.load === null ? '??' : task.load} {task.load === null && "(字段降级)"}</span>
                    </div>
                  )}

                  {task.isHardFiltered ? (
                    <button 
                      onClick={() => handleRequestOverride(task)}
                      className="mt-3 w-full py-2 rounded-lg bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <AlertOctagon className="w-3.5 h-3.5" /> 申请强制越权执行
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStartNormal(task)}
                      className="mt-3 w-full py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-white/80 text-xs font-bold transition-all"
                    >
                      强制执行
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {completedTasks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-white/10 flex flex-col gap-3">
                <h3 className="text-xs font-bold text-white/40 uppercase tracking-wider mb-1">最近完成 (DB-03)</h3>
                {completedTasks.map(task => (
                  <div key={task.id} className="flex items-center gap-3 text-sm text-white/40 group cursor-default">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                    <span className="line-through truncate flex-1">{task.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}