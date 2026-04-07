import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Activity, ShieldAlert, HeartPulse, Brain, Battery, Shield, AlertTriangle, Info, Zap, Dumbbell, Apple, Utensils, Clock, ArrowRight, Target, CheckCircle2, ShoppingCart, Layers, RefreshCw, MessageSquare } from "lucide-react";
import { clsx } from "clsx";

// --- MOCK DATA ---
const MOCK_IDEAS = [
  { id: "wi-1", name: "杠铃卧推", muscle: "胸部", sets: 4, reps: 8, weight: 80, usage: 12, pb: 100 },
  { id: "wi-2", name: "深蹲", muscle: "腿部", sets: 4, reps: 8, weight: 100, usage: 8, pb: 120 },
  { id: "wi-3", name: "引体向上", muscle: "背部", sets: 3, reps: 10, weight: 0, usage: 15, pb: 20 },
];

const MOCK_GROCERIES = [
  { id: "g1", name: "鸡胸肉", qty: "2片", store: "Butchers", inStock: true },
  { id: "g2", name: "生菜", qty: "1把", store: "Supermarket", inStock: true },
  { id: "g3", name: "牛排", qty: "2块", store: "Butchers", inStock: true },
  { id: "g4", name: "全麦意面", qty: "1包", store: "Supermarket", inStock: false },
  { id: "g5", name: "全麦面包", qty: "1袋", store: "Mini Market", inStock: false },
  { id: "g6", name: "牛奶", qty: "1瓶", store: "Supermarket", inStock: false },
];

const MOCK_RECIPES = [
  { id: "r1", name: "高蛋白鸡胸肉沙拉", course: "Lunch", time: "15 min", ingredients: ["g1", "g2"] },
  { id: "r2", name: "牛排全麦意面", course: "Dinner", time: "30 min", ingredients: ["g3", "g4"] },
  { id: "r3", name: "全麦三明治", course: "Breakfast", time: "5 min", ingredients: ["g5", "g6"] }
];

const MOCK_MEALS = [
  { id: "mp1", name: "健康快手早餐", meal: "Breakfast", recipeId: "r3", eaten: false },
  { id: "mp2", name: "工作餐", meal: "Lunch", recipeId: "r1", eaten: false },
  { id: "mp3", name: "增肌晚餐", meal: "Dinner", recipeId: "r2", eaten: false },
];

export default function HealthPage() {
  const [activeTab, setActiveTab] = useState<"monitor" | "workout" | "nutrition">("nutrition");

  // -- Monitor State (Flow 2) --
  const [swipScore, setSwipScore] = useState(62);
  const [slope] = useState(-3.5);
  const riskLevel = swipScore > 90 ? "critical" : swipScore > 70 ? "high" : swipScore >= 60 ? "medium" : "low";
  const [dailyOverlayCount] = useState(1);
  const [showIntervention, setShowIntervention] = useState(false);

  const [overallEnergy, setOverallEnergy] = useState(85);
  const uiMode = overallEnergy < 30 ? "low-energy" : overallEnergy > 80 ? "focused" : "normal";

  const closeIntervention = () => setShowIntervention(false);

  // -- Habits Tracker State (data-source-839) --
  const [habits, setHabits] = useState({
    sleep: false,
    water: false,
    breakfast: false,
    lunch: false,
    dinner: false,
    exercises: false
  });

  // Calculate % Done
  const checkedHabitsCount = Object.values(habits).filter(Boolean).length;
  const habitsPercent = Math.round((checkedHabitsCount / 6) * 100);
  
  // LOOP-15: % Done -> energyBoostFactor
  const energyBoostFactor = habitsPercent >= 83 ? 1.1 : habitsPercent <= 33 ? 0.9 : 1.0;

  // -- Workout State (3-Layer Architecture) --
  const [activeIdeas, setActiveIdeas] = useState(MOCK_IDEAS);
  const [trackerSession, setTrackerSession] = useState<{id: string, name: string, muscle: string, sets: number, reps: number, weight: number}[]>([]);
  const [workoutStats, setWorkoutStats] = useState({ totalVolume: 4500, sessions: 12, krContrib: 4500 });
  const [workoutSubmitted, setWorkoutSubmitted] = useState(false);

  const addIdeaToTracker = (idea: any) => {
    if (trackerSession.find(t => t.id === idea.id)) return;
    setTrackerSession([...trackerSession, { ...idea }]);
  };

  const submitWorkoutSession = () => {
    if (trackerSession.length === 0) return;
    
    // Aggregate Volume
    const sessionVolume = trackerSession.reduce((acc, t) => acc + (t.sets * t.reps * (t.weight || 1)), 0);
    
    // Update L3 Stats
    setWorkoutStats(prev => ({
      totalVolume: prev.totalVolume + sessionVolume,
      sessions: prev.sessions + 1,
      krContrib: prev.krContrib + sessionVolume
    }));

    // Update L1 Ideas (usageCount + PB)
    setActiveIdeas(prev => prev.map(idea => {
      const tracked = trackerSession.find(t => t.id === idea.id);
      if (tracked) {
        return { 
          ...idea, 
          usage: idea.usage + 1,
          pb: Math.max(idea.pb, tracked.weight)
        };
      }
      return idea;
    }));

    // LOOP-12a -> Write to Habits.Exercises
    setHabits(prev => ({ ...prev, exercises: true }));

    setWorkoutSubmitted(true);
    setTrackerSession([]);
    setTimeout(() => setWorkoutSubmitted(false), 4000);
  };

  // -- Nutrition State (Meal Plan, Recipes, Groceries) --
  const [groceries, setGroceries] = useState(MOCK_GROCERIES);
  const [meals, setMeals] = useState(MOCK_MEALS);
  const [recipes] = useState(MOCK_RECIPES);

  const toggleGroceryInStock = (groceryId: string) => {
    setGroceries(prev => prev.map(g => g.id === groceryId ? { ...g, inStock: !g.inStock } : g));
  };

  const handleEatMeal = (mealId: string, mealType: string) => {
    // 1. Mark meal as eaten
    setMeals(prev => prev.map(m => m.id === mealId ? { ...m, eaten: true } : m));
    
    // 2. LOOP-13 -> Write to Habits Breakfast/Lunch/Dinner
    if (mealType === "Breakfast") setHabits(prev => ({ ...prev, breakfast: true }));
    else if (mealType === "Lunch") setHabits(prev => ({ ...prev, lunch: true }));
    else if (mealType === "Dinner") setHabits(prev => ({ ...prev, dinner: true }));
  };

  return (
    <div className="flex flex-col gap-6 pb-20 pt-2 h-full max-w-6xl mx-auto relative">
      
      {/* Risk Intervention Overlay */}
      <AnimatePresence>
        {showIntervention && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={clsx(
              "absolute z-50 left-0 right-0 top-0 p-6 rounded-3xl backdrop-blur-2xl border flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)]",
              riskLevel === "critical" 
                ? "bg-red-950/80 border-red-500/50 shadow-red-900/20" 
                : "bg-orange-950/80 border-orange-500/50 shadow-orange-900/20"
            )}
          >
            <div className="flex gap-5 items-start">
              <div className={clsx(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-inner",
                riskLevel === "critical" ? "bg-red-500/20 text-red-400 border border-red-500/30" : "bg-orange-500/20 text-orange-400 border border-orange-500/30"
              )}>
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div className="flex flex-col gap-1.5">
                <h3 className={clsx("text-xl font-bold tracking-wide", riskLevel === "critical" ? "text-red-400" : "text-orange-400")}>
                  {riskLevel === "critical" ? "严重崩溃风险警告" : "高负荷建议休息"}
                </h3>
                <p className="text-white/80 text-sm max-w-xl leading-relaxed">
                  您的 SWIP 得分在过去 5 分钟内快速下降。为了保护您的认知精力，系统已自动限制高负荷任务（认知负荷上限设为 3）。建议您立即进行 15 分钟的恢复活动。
                </p>
              </div>
            </div>
            <div className="flex gap-3 w-full md:w-auto shrink-0">
              <button onClick={closeIntervention} className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:bg-white/10 hover:text-white transition-all w-full md:w-auto">
                稍后提醒
              </button>
              <button onClick={closeIntervention} className={clsx(
                "px-8 py-2.5 rounded-xl font-bold text-white shadow-[0_0_20px_rgba(0,0,0,0.3)] w-full md:w-auto transition-all scale-100 hover:scale-105",
                riskLevel === "critical" ? "bg-gradient-to-r from-red-600 to-rose-600 shadow-red-500/30" : "bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/30"
              )}>
                开始恢复
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={clsx("transition-all duration-500", showIntervention ? "pt-36 opacity-30 pointer-events-none filter blur-sm" : "pt-0")}>
        
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-pink-500/20 to-purple-500/20 border border-pink-500/30 flex items-center justify-center backdrop-blur-xl shadow-[0_0_20px_rgba(236,72,153,0.3)]">
              <Activity className="w-7 h-7 text-pink-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">健康与状态枢纽</h1>
              <p className="text-white/50 text-sm flex items-center gap-2 mt-1">
                <ShieldAlert className="w-4 h-4 text-pink-400" />
                监控生理状态，驱动 HSI 能量算法
              </p>
            </div>
          </div>

          <div className="flex bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/0 via-pink-500/5 to-purple-500/0 pointer-events-none" />
            {[
              { id: "monitor", label: "大盘监控", icon: Brain },
              { id: "workout", label: "体能训练", icon: Dumbbell },
              { id: "nutrition", label: "营养饮食", icon: Apple }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={clsx(
                  "relative flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 z-10",
                  activeTab === tab.id 
                    ? "text-white shadow-[0_0_20px_rgba(236,72,153,0.15)] border border-pink-500/30" 
                    : "text-white/40 hover:text-white/70 hover:bg-white/5 border border-transparent"
                )}
              >
                {activeTab === tab.id && (
                  <motion.div 
                    layoutId="healthActiveTab" 
                    className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-purple-500/20 rounded-xl animate-pulse pointer-events-none" 
                  />
                )}
                <tab.icon className={clsx("w-4 h-4", activeTab === tab.id ? "text-pink-400 drop-shadow-md" : "")} /> 
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          
          {/* TAB 1: MONITOR */}
          {activeTab === "monitor" && (
            <motion.div 
              key="monitor"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-900/40 to-black/60 border border-indigo-500/30 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-indigo-500/20 transition-all" />
                  <div className="flex justify-between items-start mb-6 z-10">
                    <div className="flex items-center gap-2 text-indigo-400 font-semibold">
                      <Brain className="w-5 h-5" /> SWIP 压力指数 (HSI)
                    </div>
                    <span className={clsx(
                      "text-xs px-2.5 py-1 rounded-md border backdrop-blur-md",
                      swipScore >= 90 ? "bg-red-500/20 text-red-300 border-red-500/50" : 
                      swipScore >= 70 ? "bg-orange-500/20 text-orange-300 border-orange-500/50" :
                      swipScore >= 60 ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/50" :
                      "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    )}>
                      {riskLevel.toUpperCase()}
                    </span>
                  </div>
                  <div className="z-10 w-full relative">
                    <div className="flex items-baseline gap-2 mb-4 relative z-10">
                      <span className={clsx(
                        "text-6xl font-black tracking-tighter transition-colors drop-shadow-xl",
                        swipScore >= 90 ? "text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.5)]" : swipScore >= 70 ? "text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,0.5)]" : swipScore >= 60 ? "text-yellow-400 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)]" : "text-white"
                      )}>{swipScore}</span>
                      <span className="text-white/40 font-medium">/ 100</span>
                    </div>
                    <div className="relative group/slider">
                      <div className="absolute inset-0 bg-indigo-500/20 blur-md rounded-full pointer-events-none group-hover/slider:bg-indigo-500/30 transition-all" />
                      <input 
                        type="range" min="0" max="100" value={swipScore} 
                        onChange={(e) => setSwipScore(Number(e.target.value))}
                        className="w-full accent-indigo-400 cursor-pointer h-3 bg-black/60 rounded-full appearance-none shadow-inner border border-white/10 relative z-10 hover:border-indigo-500/50 transition-colors" 
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-4 text-xs bg-indigo-950/40 w-fit px-3 py-1.5 rounded-lg border border-indigo-500/20 shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                      <span className="text-indigo-200/70 font-mono">控制以触发 EventBus</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900/20 to-black/60 border border-emerald-500/20 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-emerald-500/20 transition-all" />
                  <div className="flex justify-between items-start mb-6 z-10">
                    <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                      <Battery className="w-5 h-5" /> 基础能量储备 (overallEnergy)
                    </div>
                  </div>
                  <div className="z-10 w-full relative">
                    <div className="flex items-baseline gap-2 mb-4 relative z-10">
                      <span className={clsx(
                        "text-6xl font-black tracking-tighter transition-colors drop-shadow-xl",
                        overallEnergy < 30 ? "text-red-400 drop-shadow-[0_0_20px_rgba(248,113,113,0.5)]" : overallEnergy > 80 ? "text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]" : "text-white"
                      )}>{overallEnergy}</span>
                      <span className="text-white/40 font-medium">%</span>
                    </div>
                    <div className="relative group/slider">
                      <div className="absolute inset-0 bg-emerald-500/20 blur-md rounded-full pointer-events-none group-hover/slider:bg-emerald-500/30 transition-all" />
                      <input 
                        type="range" min="0" max="100" value={overallEnergy} 
                        onChange={(e) => setOverallEnergy(Number(e.target.value))}
                        className="w-full accent-emerald-400 cursor-pointer h-3 bg-black/60 rounded-full appearance-none shadow-inner border border-white/10 relative z-10 hover:border-emerald-500/50 transition-colors" 
                      />
                    </div>
                    <div className="flex items-center justify-between mt-4 text-xs bg-emerald-950/30 px-3 py-2 rounded-lg border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                      <span className="text-emerald-200/50 font-mono">当前 UIMode:</span>
                      <span className={clsx("font-bold tracking-wider", uiMode === 'low-energy' ? "text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]" : uiMode === 'focused' ? "text-emerald-400 drop-shadow-[0_0_5px_rgba(52,211,153,0.8)]" : "text-white")}>{uiMode}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-900/20 to-black/60 border border-cyan-500/20 backdrop-blur-xl flex flex-col justify-between relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
                  <div className="flex justify-between items-start mb-6 z-10">
                    <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                      <HeartPulse className="w-5 h-5" /> 恢复卡片额度
                    </div>
                    <span className="text-xs text-white/40 font-mono bg-white/5 px-2 py-1 rounded">Today</span>
                  </div>
                  <div className="z-10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-6xl font-black text-white tracking-tighter">{dailyOverlayCount}</span>
                      <span className="text-white/40 font-medium">/ 2 次</span>
                    </div>
                    <p className="text-sm text-white/50 mt-4 flex items-center gap-1.5">
                      <Info className="w-4 h-4" /> SWIP {'>'} 90 时触发全屏干预
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden">
                <div className={clsx(
                  "absolute inset-0 pointer-events-none transition-colors duration-500",
                  swipScore >= 90 ? "bg-[radial-gradient(ellipse_at_top_right,rgba(239,68,68,0.1),transparent_50%)]" :
                  swipScore >= 70 ? "bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,0.1),transparent_50%)]" :
                  swipScore >= 60 ? "bg-[radial-gradient(ellipse_at_top_right,rgba(234,179,8,0.1),transparent_50%)]" :
                  "bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.05),transparent_50%)]"
                )} />
                <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                  <Shield className="w-6 h-6 text-indigo-400" />
                  基于 EventBus 的级联干预响应 (CrashRiskMonitor)
                </h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className={clsx(
                    "p-5 rounded-2xl border flex items-start gap-4 transition-all duration-300",
                    swipScore >= 60 ? "bg-black/60 border-yellow-500/30 shadow-[0_0_20px_rgba(234,179,8,0.1)]" : "bg-black/40 border-white/5 opacity-50 grayscale"
                  )}>
                    <div className="p-3 rounded-xl bg-yellow-500/10 text-yellow-400 mt-1 shadow-inner border border-yellow-500/20">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg flex items-center gap-2">
                        任务负荷硬过滤 (swip {'>='} 60)
                        {swipScore >= 60 && <span className="flex h-2 w-2 rounded-full bg-yellow-400"></span>}
                      </h4>
                      <p className="text-sm text-white/60 mt-2 leading-relaxed">
                        当 SWIP 跨越 60 阈值，系统通过 HSI 广播触发 <code>TaskMatcherEngine.applyHardFilter(maxCogLoad=3)</code>。高负荷任务在 Do 页面将被隐藏或降级。
                      </p>
                    </div>
                  </div>
                  
                  <div className={clsx(
                    "p-5 rounded-2xl border flex items-start gap-4 transition-all duration-300",
                    swipScore >= 70 && swipScore < 90 ? "bg-black/60 border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)]" : "bg-black/40 border-white/5 opacity-50 grayscale"
                  )}>
                    <div className="p-3 rounded-xl bg-orange-500/10 text-orange-400 mt-1 shadow-inner border border-orange-500/20">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg flex items-center gap-2">
                        轻度行为干预 (swip {'>'} 70)
                        {swipScore >= 70 && swipScore < 90 && <span className="flex h-2 w-2 rounded-full bg-orange-400"></span>}
                      </h4>
                      <p className="text-sm text-white/60 mt-2 leading-relaxed">
                        触发 <code>CrashInterventionOverlay mode=suggestion</code>。UI 将弹出温和建议，提示您休息或进行微习惯打卡（如喝水/深呼吸）。
                      </p>
                    </div>
                  </div>

                  <div className={clsx(
                    "p-5 rounded-2xl border flex items-start gap-4 transition-all duration-300",
                    swipScore >= 90 ? "bg-red-900/20 border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]" : "bg-black/40 border-white/5 opacity-50 grayscale"
                  )}>
                    <div className="p-3 rounded-xl bg-red-500/20 text-red-400 mt-1 shadow-inner border border-red-500/30">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-red-100 text-lg flex items-center gap-2">
                        全屏阻断介入 (swip {'>'} 90)
                        {swipScore >= 90 && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse"></span>}
                      </h4>
                      <p className="text-sm text-red-200/70 mt-2 leading-relaxed">
                        触发 <code>CrashInterventionOverlay mode=fullscreen</code>。消耗一次卡片额度，强行冻结大部分交互，直至完成指定恢复流程（如 5 分钟冥想）。
                      </p>
                    </div>
                  </div>

                  <div className={clsx(
                    "p-5 rounded-2xl border flex items-start gap-4 transition-all duration-300",
                    overallEnergy < 30 ? "bg-black/60 border-purple-500/30 shadow-[0_0_20px_rgba(168,85,247,0.1)]" : "bg-black/40 border-white/5 opacity-50 grayscale"
                  )}>
                    <div className="p-3 rounded-xl bg-purple-500/10 text-purple-400 mt-1 shadow-inner border border-purple-500/20">
                      <Battery className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-lg flex items-center gap-2">
                        低能量保护 (energy {'<'} 30)
                        {overallEnergy < 30 && <span className="flex h-2 w-2 rounded-full bg-purple-400"></span>}
                      </h4>
                      <p className="text-sm text-white/60 mt-2 leading-relaxed">
                        触发 <code>RecommendedList 重排 (低能量过滤)</code> 与 <code>FitnessTracker.lowEnergyVariant 切换</code>。运动模块只允许拉伸与恢复训练。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: WORKOUT TRACKER */}
          {activeTab === "workout" && (
            <motion.div 
              key="workout"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col lg:flex-row gap-6"
            >
              {/* L1: Workout Ideas */}
              <div className="lg:w-1/3 flex flex-col gap-6">
                <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl h-full">
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-indigo-400" />
                    Layer 1: 训练灵感库 (Ideas)
                  </h3>
                  <div className="flex flex-col gap-3">
                    {activeIdeas.map(idea => (
                      <div key={idea.id} className="p-4 rounded-xl bg-black/40 border border-white/5 hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all cursor-pointer group" onClick={() => addIdeaToTracker(idea)}>
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{idea.name}</h4>
                          <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                            {idea.muscle}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-xs text-white/50">
                          <span className="flex items-center gap-1"><RefreshCw className="w-3 h-3" /> 使用 {idea.usage} 次</span>
                          <span className="flex items-center gap-1"><Target className="w-3 h-3" /> PB {idea.pb}kg</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* L2: Workout Tracker DB-09 */}
              <div className="lg:w-1/3 flex flex-col gap-6">
                <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-900/30 to-black/40 border border-emerald-500/20 backdrop-blur-xl relative overflow-hidden h-full">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500/10 rounded-full blur-[50px] pointer-events-none" />
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <Dumbbell className="w-6 h-6 text-emerald-400" />
                    Layer 2: 训练记录 (DB-09)
                  </h2>

                  <div className="flex flex-col gap-4 relative z-10 h-[calc(100%-60px)]">
                    <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                      <AnimatePresence>
                        {trackerSession.map((exercise, index) => (
                          <motion.div 
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            key={exercise.id + index} 
                            className="p-4 rounded-xl bg-black/60 border border-emerald-500/30 flex flex-col gap-3"
                          >
                            <h4 className="font-bold text-emerald-100 text-sm">{exercise.name}</h4>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="flex flex-col">
                                <label className="text-[10px] text-white/50 mb-1">组数</label>
                                <input type="number" value={exercise.sets} onChange={e => {
                                  const newSession = [...trackerSession];
                                  newSession[index].sets = Number(e.target.value);
                                  setTrackerSession(newSession);
                                }} className="bg-black/50 border border-white/10 rounded-md p-1.5 text-white text-xs text-center" />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] text-white/50 mb-1">次数</label>
                                <input type="number" value={exercise.reps} onChange={e => {
                                  const newSession = [...trackerSession];
                                  newSession[index].reps = Number(e.target.value);
                                  setTrackerSession(newSession);
                                }} className="bg-black/50 border border-white/10 rounded-md p-1.5 text-white text-xs text-center" />
                              </div>
                              <div className="flex flex-col">
                                <label className="text-[10px] text-white/50 mb-1">重量(kg)</label>
                                <input type="number" value={exercise.weight} onChange={e => {
                                  const newSession = [...trackerSession];
                                  newSession[index].weight = Number(e.target.value);
                                  setTrackerSession(newSession);
                                }} className="bg-black/50 border border-white/10 rounded-md p-1.5 text-white text-xs text-center" />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                      {trackerSession.length === 0 && (
                        <div className="text-center py-10 border border-dashed border-white/10 rounded-xl text-white/30 text-sm">
                          从左侧灵感库点击添加动作
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={submitWorkoutSession}
                      disabled={trackerSession.length === 0}
                      className={clsx(
                        "w-full py-3.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                        trackerSession.length > 0 
                          ? "bg-gradient-to-r from-emerald-500 to-green-500 text-black shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] scale-100 hover:scale-[1.02]"
                          : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                      )}
                    >
                      {workoutSubmitted ? <><CheckCircle2 className="w-5 h-5" /> 聚合至统计层 (L3)</> : "提交训练完成 (LOOP-11)"}
                    </button>
                  </div>
                </div>
              </div>

              {/* L3: Workout Statistics */}
              <div className="lg:w-1/3 p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl flex flex-col gap-6">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-400" />
                  Layer 3: 训练统计 (Statistics)
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-xs text-white/50">历史总容量</span>
                    <div className="text-2xl font-black text-white mt-1">{workoutStats.totalVolume.toLocaleString()} <span className="text-xs font-normal text-white/40">kg</span></div>
                  </div>
                  <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-xs text-white/50">累计训练次</span>
                    <div className="text-2xl font-black text-white mt-1">{workoutStats.sessions} <span className="text-xs font-normal text-white/40">次</span></div>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-black/40 border border-white/5 mt-auto">
                  <div className="flex justify-between items-end mb-3">
                    <div>
                      <h4 className="text-white font-medium mb-1">本周举铁 KR (DB-05)</h4>
                      <div className="text-sm text-white/50 font-mono">
                        {workoutStats.krContrib} / 10000 kg
                      </div>
                    </div>
                    <span className="text-2xl font-black text-emerald-400">{Math.min(100, Math.round((workoutStats.krContrib / 10000) * 100))}%</span>
                  </div>
                  <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <motion.div 
                      initial={false}
                      animate={{ width: `${Math.min(100, Math.round((workoutStats.krContrib / 10000) * 100))}%` }}
                      transition={{ type: "spring", bounce: 0.2, duration: 1 }}
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-full relative"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: NUTRITION & MEALS */}
          {activeTab === "nutrition" && (
            <motion.div 
              key="nutrition"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-6"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Meal Plan Calendar DB-726 & Recipe Book DB-802 */}
                <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-br from-rose-900/30 to-black/40 border border-rose-500/20 backdrop-blur-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-[60px] pointer-events-none" />
                  <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
                    <Utensils className="w-6 h-6 text-rose-400" />
                    饮食计划 (DB-726)
                  </h2>

                  <div className="flex flex-col gap-4 relative z-10">
                    {meals.map(meal => {
                      const recipe = recipes.find(r => r.id === meal.recipeId);
                      const recipeGroceries = recipe?.ingredients.map(ig => groceries.find(g => g.id === ig));
                      const totalIngredients = recipeGroceries?.length || 0;
                      const inStockCount = recipeGroceries?.filter(g => g?.inStock).length || 0;
                      
                      const allInStock = totalIngredients > 0 && inStockCount === totalIngredients;
                      const notInStock = inStockCount === 0;
                      const partialInStock = inStockCount > 0 && inStockCount < totalIngredients;

                      return (
                        <div key={meal.id} className={clsx(
                          "p-5 rounded-2xl border transition-all",
                          meal.eaten ? "bg-rose-500/5 border-rose-500/20 opacity-70" : "bg-black/60 border-white/10 hover:border-rose-500/30"
                        )}>
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] font-mono text-rose-300 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                  {meal.meal}
                                </span>
                                <h4 className={clsx("font-bold text-sm", meal.eaten ? "text-rose-200/50" : "text-white")}>{meal.name}</h4>
                              </div>
                              <p className="text-xs text-white/50 mt-1.5 flex gap-2 items-center">
                                <span>关联食谱: {recipe?.name}</span>
                                <span className="text-white/30">|</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe?.time}</span>
                              </p>
                              
                              <div className="mt-3 flex items-center gap-2">
                                <span className="text-[10px] text-white/40">In Stock? (DB-802 Rollup):</span>
                                {allInStock && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-emerald-500/20 text-emerald-300 border-emerald-500/30 flex items-center gap-1">✅ 食材备齐</span>}
                                {notInStock && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-red-500/20 text-red-300 border-red-500/30 flex items-center gap-1">🛒 需采购</span>}
                                {partialInStock && <span className="text-[10px] px-1.5 py-0.5 rounded border bg-orange-500/20 text-orange-300 border-orange-500/30 flex items-center gap-1">⚠️ 缺 {totalIngredients - inStockCount} 项食材</span>}
                              </div>
                            </div>
                            
                            <button 
                              onClick={() => handleEatMeal(meal.id, meal.meal)}
                              disabled={meal.eaten}
                              className={clsx(
                                "px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shrink-0",
                                meal.eaten 
                                  ? "bg-rose-500/20 text-rose-300 cursor-not-allowed" 
                                  : "bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:shadow-[0_0_15px_rgba(225,29,72,0.4)]"
                              )}
                            >
                              {meal.eaten ? <><CheckCircle2 className="w-3 h-3" /> 已写 Habits</> : "打卡 (LOOP-13)"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-6">
                  {/* 2. Healthy Habits Tracker DB-839 */}
                  <div className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
                    <div className="flex justify-between items-start mb-5 z-10 relative">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Target className="w-5 h-5 text-cyan-400" />
                        Habits Tracker (DB-839)
                      </h2>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">Today</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 relative z-10">
                      {Object.entries(habits).map(([key, value]) => (
                        <div key={key} className={clsx(
                          "px-3 py-2 rounded-xl border flex items-center gap-2 text-xs transition-all",
                          value ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-200" : "bg-black/40 border-white/5 text-white/40"
                        )} onClick={() => setHabits(prev => ({...prev, [key]: !prev[key as keyof typeof prev]}))}>
                          <div className={clsx("w-3.5 h-3.5 rounded flex items-center justify-center shrink-0 border", value ? "bg-cyan-500 text-black border-cyan-400" : "bg-black/50 border-white/20")}>
                            {value && <CheckCircle2 className="w-2.5 h-2.5" />}
                          </div>
                          <span className="capitalize">{key}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 pt-5 border-t border-white/10 relative z-10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs text-white/60 font-mono">% Done Formula</span>
                        <span className="text-sm font-black text-cyan-400">{habitsPercent}%</span>
                      </div>
                      <div className="w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                        <motion.div animate={{ width: `${habitsPercent}%` }} className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" />
                      </div>
                      <p className="text-[10px] text-white/40 mt-3 flex items-center gap-1.5 bg-black/30 p-2 rounded-lg">
                        <Brain className="w-3 h-3 text-purple-400" /> 
                        LOOP-15: % Done 驱动 HSI 能量乘数 ({energyBoostFactor.toFixed(1)}x)
                      </p>
                    </div>
                  </div>

                  {/* 3. Groceries DB-1048 & LOOP-14 */}
                  <div className="p-6 rounded-3xl bg-black/40 border border-white/5 backdrop-blur-xl flex flex-col gap-4 relative">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-orange-400" />
                      购物清单 (DB-1048)
                    </h2>
                    
                    <div className="flex flex-col gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                      {groceries.filter(g => !g.inStock).length === 0 ? (
                        <div className="text-center py-4 text-xs text-white/40">🎉 所有食材已备齐</div>
                      ) : (
                        groceries.filter(g => !g.inStock).map(grocery => (
                          <div key={grocery.id} className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/20 flex justify-between items-center group hover:bg-orange-500/10 transition-colors">
                            <div className="flex flex-col">
                              <span className="text-sm text-white font-medium group-hover:text-orange-200 transition-colors">{grocery.name} <span className="text-[10px] text-white/40 ml-1">({grocery.qty})</span></span>
                              <span className="text-[10px] text-white/30 mt-0.5 font-mono">{grocery.store}</span>
                            </div>
                            <button 
                              onClick={() => toggleGroceryInStock(grocery.id)}
                              className="w-6 h-6 rounded border border-white/20 bg-black/50 flex items-center justify-center hover:border-orange-500/50 hover:bg-orange-500/20 transition-all shrink-0"
                              title="点击完成采购 (触发 LOOP-14)"
                            >
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="mt-1 p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-[10px] text-orange-200/70 leading-relaxed">
                      <p className="flex items-center gap-1 mb-1 font-bold text-orange-300"><RefreshCw className="w-3 h-3" /> LOOP-14 级联响应</p>
                      勾选采买完成 → 更新 Groceries.InStock=true → Recipe Book.InStock? Rollup 重算 → 左侧饮食计划角标自动变绿。
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}