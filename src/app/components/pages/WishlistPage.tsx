import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Sprout, Target, Heart, DollarSign, Brain, Globe, Users, Plus, Check, Search, Star, ShieldAlert, ArrowRight, Zap } from "lucide-react";
import { clsx } from "clsx";

interface Wish {
  id: string;
  title: string;
  description: string;
  category: string;
  manifestStatus: "🌱 种子" | "🌱 孕育中" | "✨ 已显化";
  seedDate: string;
  manifestedDate?: string;
  linkedOKRId: string | null;
  affirmation: string;
  energyInvestment: number;
}

const CATEGORIES = [
  { id: "health", label: "健康与身体", icon: Heart, color: "text-pink-400", bg: "bg-pink-500/20", border: "border-pink-500/30", glow: "shadow-[0_0_15px_rgba(244,114,182,0.3)]" },
  { id: "wealth", label: "财富与事业", icon: DollarSign, color: "text-amber-400", bg: "bg-amber-500/20", border: "border-amber-500/30", glow: "shadow-[0_0_15px_rgba(251,191,36,0.3)]" },
  { id: "growth", label: "认知与成长", icon: Brain, color: "text-purple-400", bg: "bg-purple-500/20", border: "border-purple-500/30", glow: "shadow-[0_0_15px_rgba(168,85,247,0.3)]" },
  { id: "experience", label: "体验与探索", icon: Globe, color: "text-blue-400", bg: "bg-blue-500/20", border: "border-blue-500/30", glow: "shadow-[0_0_15px_rgba(96,165,250,0.3)]" },
  { id: "relationship", label: "连接与关系", icon: Users, color: "text-rose-400", bg: "bg-rose-500/20", border: "border-rose-500/30", glow: "shadow-[0_0_15px_rgba(244,63,94,0.3)]" },
];

export default function WishlistPage() {
  const [wishes, setWishes] = useState<Wish[]>([
    {
      id: "w-1",
      title: "完成人生首个半马",
      description: "在2小时15分内跑完半程马拉松，感受身体的突破与力量。",
      category: "health",
      manifestStatus: "🌱 孕育中",
      seedDate: "2024-03-01",
      linkedOKRId: "okr-3",
      affirmation: "我的身体每天都在变得更强壮，我享受奔跑时的自由。",
      energyInvestment: 65
    },
    {
      id: "w-2",
      title: "建立 HSI 架构知识库",
      description: "将关于HSI和状态机架构��实践经验整理成核心文档。",
      category: "growth",
      manifestStatus: "🌱 种子",
      seedDate: "2024-04-03",
      linkedOKRId: null,
      affirmation: "我的知识能够帮助他人，我拥有清晰表达复杂概念的能力。",
      energyInvestment: 20
    },
    {
      id: "w-3",
      title: "带家人去冰岛看极光",
      description: "进行为期10天的环岛旅行，体验极昼的壮丽。",
      category: "experience",
      manifestStatus: "✨ 已显化",
      seedDate: "2023-11-15",
      manifestedDate: "2024-02-20",
      linkedOKRId: null,
      affirmation: "世界充满奇迹，我值得拥有极致的体验。",
      energyInvestment: 100
    }
  ]);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);

  const filteredWishes = activeCategory === "all" ? wishes : wishes.filter(w => w.category === activeCategory);

  const getCategoryConfig = (catId: string) => CATEGORIES.find(c => c.id === catId) || CATEGORIES[0];

  return (
    <div className="flex flex-col gap-6 pb-20 pt-2 h-full max-w-6xl mx-auto relative">
      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 flex items-center justify-center backdrop-blur-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]">
            <Sprout className="w-7 h-7 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-100 to-teal-400 tracking-tight">
              愿望显化系统 (DB-07)
            </h1>
            <p className="text-emerald-400/60 text-sm flex items-center gap-2 mt-1">
              <Zap className="w-4 h-4 text-emerald-500" />
              通过 OKR 连接与 HSI 能量投资，加速愿望显化
            </p>
          </div>
        </div>

        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5" /> 播种新愿望
        </button>
      </div>

      {/* Categories Filter */}
      <div className="flex flex-wrap gap-3 border-b border-white/5 pb-6 mb-4 relative">
        <div className="absolute bottom-0 left-0 w-1/3 h-[1px] bg-gradient-to-r from-emerald-500/50 to-transparent" />
        <button
          onClick={() => setActiveCategory("all")}
          className={clsx(
            "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border relative overflow-hidden group",
            activeCategory === "all" 
              ? "bg-white/10 text-white border-white/30 shadow-[0_0_20px_rgba(255,255,255,0.1)]" 
              : "bg-black/40 text-white/40 border-white/5 hover:text-white/80 hover:bg-white/10 hover:border-white/20"
          )}
        >
          {activeCategory === "all" && <div className="absolute inset-0 bg-white/5 animate-pulse" />}
          <span className="relative z-10">全部分类</span>
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={clsx(
              "px-5 py-2.5 rounded-2xl text-sm font-bold transition-all border flex items-center gap-2 relative overflow-hidden group",
              activeCategory === cat.id 
                ? `${cat.bg} ${cat.color} border-${cat.id}-400/50 ${cat.glow} scale-105 shadow-lg` 
                : "bg-black/40 text-white/40 border-white/5 hover:text-white/80 hover:bg-white/10 hover:border-white/20"
            )}
          >
            {activeCategory === cat.id && (
              <motion.div 
                layoutId="activeCategoryGlow"
                className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none" 
              />
            )}
            <cat.icon className={clsx("w-4 h-4 relative z-10", activeCategory === cat.id ? "drop-shadow-md" : "")} /> 
            <span className="relative z-10">{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
        {/* Glow behind grid */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />

        <AnimatePresence mode="popLayout">
          {filteredWishes.map(wish => {
            const config = getCategoryConfig(wish.category);
            return (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: -20 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                key={wish.id}
                className="group relative h-[380px] rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl overflow-hidden flex flex-col hover:border-white/30 transition-all hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
              >
                {wish.manifestStatus === "✨ 已显化" && (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-transparent pointer-events-none z-0" />
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/20 blur-[50px] pointer-events-none animate-pulse z-0" />
                  </>
                )}
                {wish.manifestStatus === "🌱 孕育中" && (
                  <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 blur-[50px] pointer-events-none animate-pulse z-0" />
                )}
                
                <div className="p-6 flex-1 flex flex-col z-10 relative">
                  <div className="flex justify-between items-start mb-6">
                    <div className={clsx("w-14 h-14 rounded-[1.25rem] flex items-center justify-center border shadow-inner group-hover:scale-110 transition-transform", config.bg, config.border, config.glow)}>
                      <config.icon className={clsx("w-6 h-6", config.color)} />
                    </div>
                    <div className={clsx(
                      "px-3 py-1 rounded-lg text-xs font-bold border",
                      wish.manifestStatus === "✨ 已显化" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" :
                      wish.manifestStatus === "🌱 孕育中" ? "bg-teal-500/20 border-teal-500/30 text-teal-400" :
                      "bg-white/10 border-white/20 text-white/60"
                    )}>
                      {wish.manifestStatus}
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">{wish.title}</h3>
                  <p className="text-sm text-white/50 line-clamp-3 mb-4 flex-1">{wish.description}</p>

                  <div className="bg-black/50 rounded-xl p-3 border border-white/5 mb-4 relative overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500/50" />
                    <p className="text-xs text-emerald-100/70 italic font-medium leading-relaxed pl-2">
                      "{wish.affirmation}"
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-white/5 border-t border-white/5 z-10 flex items-center justify-between text-xs text-white/40 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    能量注入: {wish.energyInvestment}%
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5" />
                    {wish.linkedOKRId ? "已关联 OKR" : "独立显化"}
                  </div>
                </div>

                {/* Progress bar at the very bottom */}
                <div className="h-1.5 w-full bg-black/50 relative z-10">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${wish.energyInvestment}%` }}
                    transition={{ duration: 1, delay: 0.2 }}
                    className={clsx("h-full", 
                      wish.manifestStatus === "✨ 已显化" ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.8)]" : 
                      wish.manifestStatus === "🌱 孕育中" ? "bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.6)]" : 
                      "bg-white/20"
                    )}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="group relative h-[380px] rounded-3xl bg-emerald-900/20 border border-emerald-500/30 backdrop-blur-xl overflow-hidden flex flex-col p-6 shadow-[0_0_30px_rgba(16,185,129,0.15)]"
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Sprout className="w-5 h-5 text-emerald-400" /> 种下新愿望
            </h3>
            
            <div className="flex flex-col gap-3 flex-1">
              <input 
                type="text" 
                placeholder="愿望标题..." 
                className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
              />
              <textarea 
                placeholder="描述这幅画面的细节..." 
                className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none h-20"
              />
              <input 
                type="text" 
                placeholder="自我肯定宣言 (例如: 我值得...)" 
                className="w-full bg-black/40 border border-emerald-500/20 rounded-xl px-4 py-2.5 text-sm text-emerald-200 placeholder-emerald-200/30 focus:outline-none focus:border-emerald-500/50 transition-colors italic"
              />
            </div>
            
            <div className="flex gap-3 mt-4">
              <button 
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 font-bold text-sm transition-colors"
              >
                取消
              </button>
              <button 
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm transition-colors shadow-[0_0_15px_rgba(16,185,129,0.4)] flex justify-center items-center gap-2"
              >
                <Check className="w-4 h-4" /> 确认播种
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
