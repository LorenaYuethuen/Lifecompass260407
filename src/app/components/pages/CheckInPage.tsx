import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { CheckCircle2, Circle, Flame, TrendingUp, ShieldCheck, Zap, Activity, Battery, CheckSquare, Target, CheckCheck, Save } from "lucide-react";
import { clsx } from "clsx";

export default function CheckInPage() {
  // DB-01 Check-In records
  const [items, setItems] = useState([
    { id: "sleep", label: "睡眠 > 7小时", checked: false, score: 10, cat: "health", linkedHabitId: "habit-sleep" },
    { id: "water", label: "饮水 2L", checked: true, score: 5, cat: "health", linkedHabitId: "habit-water" },
    { id: "workout", label: "运动 30分钟", checked: false, score: 15, cat: "health", linkedOKRId: "okr-1", checkInWeight: 2 },
    { id: "read", label: "阅读 20页", checked: false, score: 10, cat: "growth", linkedOKRId: "okr-2", checkInWeight: 1 },
    { id: "meditate", label: "冥想 10分钟", checked: true, score: 10, cat: "growth", linkedHabitId: "habit-meditate" },
    { id: "journal", label: "写日记", checked: false, score: 10, cat: "growth" },
    { id: "sunlight", label: "阳光照射 15分钟", checked: false, score: 5, cat: "health" },
    { id: "focus", label: "深度工作 2小时", checked: false, score: 15, cat: "wealth", linkedOKRId: "okr-1", checkInWeight: 3 },
  ]);

  const maxScore = items.reduce((a, b) => a + b.score, 0);
  const currentScore = items.filter(i => i.checked).reduce((a, b) => a + b.score, 0);
  const percentage = Math.round((currentScore / maxScore) * 100);
  
  // HSI Impacts
  const swipProtection = (percentage * 0.05).toFixed(1); 
  const energyBonus = (percentage * 0.2).toFixed(0); 

  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const toggleItem = (id: string) => {
    const item = items.find(i => i.id === id);
    const newChecked = !item?.checked;
    
    setItems(items.map(i => i.id === id ? { ...i, checked: newChecked } : i));

    if (newChecked && item) {
      // Broadcast specific events based on notification chain
      if (item.linkedHabitId) {
        setLastEvent(`HABIT_CHECKED: ${item.linkedHabitId}`);
      } else if (item.linkedOKRId) {
        setLastEvent(`CHECKIN_OKR_CONTRIBUTE: ${item.linkedOKRId} (Weight: ${item.checkInWeight})`);
      } else {
        setLastEvent(`CHECK_IN_COMPLETED: ${item.label}`);
      }
      setTimeout(() => setLastEvent(null), 2500);
    }
  };

  const handleFinishDailyCheckIn = () => {
    // 触发全局汇总事件 CHECK_IN_COMPLETED (针对整个打卡单)
    setLastEvent("CHECK_IN_COMPLETED: 整体早间打卡汇总 -> hsiSnapshot 同步");
    setTimeout(() => setLastEvent(null), 3000);
  };

  return (
    <div className="flex flex-col gap-6 pb-20 pt-2 h-full max-w-6xl mx-auto relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <CheckSquare className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">每日打卡 (DB-01)</h1>
            <p className="text-white/50 text-sm flex items-center gap-2 mt-1">
              <Zap className="w-4 h-4 text-emerald-400" />
              EventBus: 广播 CHECK_IN_COMPLETED 级联驱动 HSI / OKR / Habits
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {lastEvent && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 right-0 left-0 mx-auto w-max z-50 px-4 py-2 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-200 text-sm font-mono shadow-[0_0_20px_rgba(16,185,129,0.4)] backdrop-blur-md flex items-center gap-2"
          >
            <CheckCheck className="w-4 h-4" /> [EventBus] 广播: {lastEvent}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Col: Checklist (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-emerald-900/10 to-black/40 border border-white/10 backdrop-blur-2xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[60px] pointer-events-none group-hover:bg-emerald-500/10 transition-all" />
            
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              基础打卡项 (DB-01 字段)
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 relative z-10">
              {items.map((item) => (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={clsx(
                    "flex flex-col gap-1.5 p-4 rounded-2xl border transition-all duration-300 text-left relative overflow-hidden group",
                    item.checked 
                      ? "bg-gradient-to-r from-emerald-500/20 to-teal-500/10 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.15)] hover:shadow-[0_0_25px_rgba(16,185,129,0.25)]" 
                      : "bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  )}
                >
                  {item.checked && (
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full blur-[40px] pointer-events-none group-hover:bg-emerald-500/30 transition-all animate-pulse" />
                  )}
                  
                  <div className="flex items-center gap-3 relative z-10">
                    <div className={clsx(
                      "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300",
                      item.checked ? "bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-110" : "border-2 border-white/20 group-hover:border-white/40"
                    )}>
                      {item.checked && <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    <span className={clsx(
                      "font-semibold text-sm transition-colors",
                      item.checked ? "text-emerald-100 drop-shadow-md" : "text-white/80"
                    )}>
                      {item.label}
                    </span>
                  </div>
                  
                  {/* Event Tags */}
                  <div className="pl-9 flex gap-2 relative z-10">
                    <span className={clsx(
                      "text-[10px] font-mono",
                      item.checked ? "text-emerald-300 font-bold drop-shadow-sm" : "text-white/40"
                    )}>+{item.score} pt</span>
                    {item.linkedOKRId && (
                      <span className="text-[10px] px-1.5 rounded border border-purple-500/30 text-purple-300 bg-purple-500/10 flex items-center gap-1 shadow-[0_0_8px_rgba(168,85,247,0.15)] backdrop-blur-sm">
                        <Target className="w-2.5 h-2.5" /> OKR关联
                      </span>
                    )}
                    {item.linkedHabitId && (
                      <span className="text-[10px] px-1.5 rounded border border-blue-500/30 text-blue-300 bg-blue-500/10 flex items-center gap-1 shadow-[0_0_8px_rgba(59,130,246,0.15)] backdrop-blur-sm">
                        <Activity className="w-2.5 h-2.5" /> 习惯网络
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between relative z-10">
              <div className="text-white/50 text-xs flex flex-col gap-1">
                <span>每日基础得分将影响全局系统稳定性</span>
                <span className="font-mono text-[10px]">{"->"} HSIProvider / ReviewCache 接收打卡包</span>
              </div>
              <button 
                onClick={handleFinishDailyCheckIn}
                className="px-6 py-2.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/50 text-emerald-100 font-bold text-sm transition-all flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Save className="w-4 h-4" />
                提交早间打卡清单
              </button>
            </div>
          </div>
        </div>

        {/* Right Col: Status Impacts (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="p-8 rounded-3xl bg-gradient-to-br from-emerald-900/30 to-black/60 border border-emerald-500/30 backdrop-blur-xl shadow-[0_10px_40px_rgba(16,185,129,0.15)] relative overflow-hidden flex flex-col items-center justify-center min-h-[320px]">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
            
            <h3 className="text-white/70 font-semibold mb-6 z-10">今日完成度 (DB-01)</h3>
            
            <div className="relative w-48 h-48 flex items-center justify-center z-10">
              {/* Circular Progress SVG */}
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <circle 
                  cx="96" cy="96" r="88" 
                  fill="none" 
                  stroke="rgba(255,255,255,0.05)" 
                  strokeWidth="12" 
                />
                <motion.circle 
                  cx="96" cy="96" r="88" 
                  fill="none" 
                  stroke="url(#emerald-gradient)" 
                  strokeWidth="12" 
                  strokeLinecap="round"
                  initial={{ strokeDasharray: "0 1000" }}
                  animate={{ strokeDasharray: `${(percentage / 100) * 553} 1000` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="emerald-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#10B981" />
                    <stop offset="100%" stopColor="#34D399" />
                  </linearGradient>
                </defs>
              </svg>
              
              <div className="flex flex-col items-center justify-center bg-black/40 w-36 h-36 rounded-full border border-white/5 shadow-inner backdrop-blur-md">
                <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-emerald-200 tracking-tighter">
                  {percentage}<span className="text-xl">%</span>
                </span>
                <span className="text-xs text-white/40 mt-1 font-mono">{currentScore} / {maxScore}</span>
              </div>
            </div>
            
            <div className="mt-8 flex gap-3 z-10">
              <span className="px-3 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1">
                <Flame className="w-3 h-3" /> 连续 12 天
              </span>
            </div>
          </div>

          <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col gap-5">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-white/50" />
              HSI 系统增益映射 (实时)
            </h3>
            
            <div className="flex flex-col gap-4">
              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between group hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden shadow-inner hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.2)] border border-indigo-500/20 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white/90 group-hover:text-indigo-200 transition-colors drop-shadow-md">崩溃护盾加成</h4>
                    <p className="text-xs text-white/50 group-hover:text-indigo-300/70 transition-colors">降低 SWIP 敏感度</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-indigo-400 drop-shadow-[0_0_10px_rgba(99,102,241,0.6)] relative z-10 group-hover:scale-110 transition-transform">+{swipProtection}</div>
              </div>

              <div className="p-5 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between group hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-300 relative overflow-hidden shadow-inner hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.2)] border border-emerald-500/20 group-hover:scale-110 transition-transform">
                    <Battery className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white/90 group-hover:text-emerald-200 transition-colors drop-shadow-md">基础能量增幅</h4>
                    <p className="text-xs text-white/50 group-hover:text-emerald-300/70 transition-colors">提升可用认知资源</p>
                  </div>
                </div>
                <div className="text-2xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.6)] relative z-10 group-hover:scale-110 transition-transform">+{energyBonus}</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}