import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { BookOpen, Sparkles, Save, Lightbulb, Brain, ChevronDown, CheckCircle2, Zap, Target } from "lucide-react";
import { clsx } from "clsx";

export default function KnowledgePage() {
  const [reading, setReading] = useState("");
  const [insight, setInsight] = useState("");
  const [action, setAction] = useState("");
  const [linkedOKR, setLinkedOKR] = useState("okr-1");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [aiTaskGenerated, setAiTaskGenerated] = useState(false);
  const [lastEvent, setLastEvent] = useState<string | null>(null);

  const okrs = [
    { id: "okr-1", title: "产品架构演进 Q3" },
    { id: "okr-2", title: "技术影响力与分享" }
  ];

  const [recentKnowledge, setRecentKnowledge] = useState([
    { id: 1, title: "系统思考模式", r: "阅读了关于全局优化而非局部优化的理论。", i: "HSI 循环也适用全局优化。", matchScore: 95, isOfflineDraft: false, action: "" },
    { id: 2, title: "原子习惯", r: "行为改变的微小累积。", i: "每日打卡系统的设计就是为了微小累积。", matchScore: 88, isOfflineDraft: false, action: "为每日打卡增加进度环。" }
  ]);

  const handleSave = () => {
    if (!reading || !insight) return;
    
    setIsSaving(true);
    
    // Simulate DB-06 PATCH P0 + AI Async P1 (LOOP-03)
    setTimeout(() => {
      setIsSaving(false);
      setSaveSuccess(true);
      
      const isOffline = false; // Field Dependency Matrix: 模拟在线状态
      const newId = Date.now();
      
      const newItem = {
        id: newId,
        title: "新洞见记录 (DB-06)",
        r: reading.slice(0, 50) + "...",
        i: insight.slice(0, 50) + "...",
        matchScore: isOffline ? null : Math.floor(Math.random() * 15) + 85,
        isOfflineDraft: isOffline,
        action: action
      };
      
      setRecentKnowledge(prev => [newItem, ...prev]);

      if (action.length > 0) {
        if (isOffline) {
          console.warn("Offline: Action queued to SyncQueue for LOOP-03");
        } else {
          // Event: KNOWLEDGE_ACTION_SAVED -> Task Module
          setLastEvent(`KNOWLEDGE_ACTION_SAVED: action="${action.slice(0,10)}..." -> 批量生成 DB-03 Tasks`);
          setAiTaskGenerated(true);
          setTimeout(() => {
            setAiTaskGenerated(false);
            setLastEvent(null);
          }, 4000);
        }
      }

      setTimeout(() => setSaveSuccess(false), 3000);
      setReading("");
      setInsight("");
      setAction("");
      
    }, 1500);
  };

  const handleAcceptRecommendation = () => {
    // Event: KNOWLEDGE_OKR_LINKED -> OKR Module
    setLastEvent(`KNOWLEDGE_OKR_LINKED: linkedOKRId="${linkedOKR}" -> DB-04.linkedKnowledgeCount++`);
    setTimeout(() => setLastEvent(null), 3000);
  };

  return (
    <div className="flex flex-col gap-6 pb-20 pt-2 h-full max-w-6xl mx-auto relative">
      
      <AnimatePresence>
        {lastEvent && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-0 right-0 left-0 mx-auto w-max z-50 bg-cyan-500/20 text-cyan-200 px-5 py-2.5 rounded-full shadow-[0_10px_30px_rgba(6,182,212,0.4)] flex items-center gap-3 border border-cyan-400/50 backdrop-blur-xl font-mono text-sm"
          >
            <Zap className="w-5 h-5 text-yellow-300" />
            [EventBus] 广播: {lastEvent}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-2">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-[1.25rem] bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center backdrop-blur-xl shadow-[0_0_20px_rgba(6,182,212,0.3)]">
            <BookOpen className="w-7 h-7 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight">知识录入 (DB-06)</h1>
            <p className="text-white/50 text-sm flex items-center gap-2 mt-1">
              <Brain className="w-4 h-4 text-cyan-400" />
              EventBus: A_action 驱动任务系统, linkedOKR 驱动目标网络
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mt-2">
        {/* Left Column: Input Form (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-b from-white/10 to-black/40 border border-white/10 backdrop-blur-2xl shadow-2xl relative">
            <div className="absolute top-0 left-0 w-64 h-64 bg-cyan-500/5 rounded-full blur-[60px] pointer-events-none" />
            
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2 relative z-10">
              <Sparkles className="w-5 h-5 text-cyan-400" /> 
              新建知识卡片 (RIA模型)
            </h2>
            
            <div className="flex flex-col gap-6 relative z-10">
              <div className="flex flex-col gap-3 relative group/field">
                <div className="absolute inset-0 bg-blue-500/5 blur-xl rounded-xl opacity-0 group-focus-within/field:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <label className="text-white/80 font-bold flex items-center gap-2 text-sm tracking-wide">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500/30 to-cyan-500/10 text-blue-400 flex items-center justify-center text-sm font-black shadow-[0_0_15px_rgba(59,130,246,0.3)] border border-blue-500/40 relative overflow-hidden group-focus-within/field:scale-110 group-focus-within/field:text-cyan-300 transition-all">
                    <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none opacity-0 group-focus-within/field:opacity-100" />
                    R
                  </span>
                  Reading (原文摘要)
                </label>
                <textarea 
                  value={reading}
                  onChange={e => setReading(e.target.value)}
                  className="w-full h-28 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-blue-500/50 focus:bg-black/60 focus:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all resize-none relative z-10"
                  placeholder="在这里输入原文内容或核心概念..."
                />
              </div>

              <div className="flex flex-col gap-3 relative group/field">
                <div className="absolute inset-0 bg-purple-500/5 blur-xl rounded-xl opacity-0 group-focus-within/field:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <label className="text-white/80 font-bold flex items-center gap-2 text-sm tracking-wide">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500/30 to-fuchsia-500/10 text-purple-400 flex items-center justify-center text-sm font-black shadow-[0_0_15px_rgba(168,85,247,0.3)] border border-purple-500/40 relative overflow-hidden group-focus-within/field:scale-110 group-focus-within/field:text-fuchsia-300 transition-all">
                    <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none opacity-0 group-focus-within/field:opacity-100" />
                    I
                  </span>
                  Insight (内化洞见)
                </label>
                <textarea 
                  value={insight}
                  onChange={e => setInsight(e.target.value)}
                  className="w-full h-28 bg-black/40 border border-white/10 rounded-xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:border-purple-500/50 focus:bg-black/60 focus:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all resize-none relative z-10"
                  placeholder="这段内容对你有什么启发？它是如何与你现有的知识体系连接的？"
                />
              </div>

              <div className="flex flex-col gap-3 relative group/field">
                <div className="absolute inset-0 bg-orange-500/5 blur-xl rounded-xl opacity-0 group-focus-within/field:opacity-100 transition-opacity duration-500 pointer-events-none" />
                <label className="text-white/80 font-bold flex items-center gap-2 text-sm tracking-wide">
                  <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-orange-500/30 to-amber-500/10 text-orange-400 flex items-center justify-center text-sm font-black shadow-[0_0_15px_rgba(249,115,22,0.3)] border border-orange-500/40 relative overflow-hidden group-focus-within/field:scale-110 group-focus-within/field:text-amber-300 transition-all">
                    <div className="absolute inset-0 bg-white/10 animate-pulse pointer-events-none opacity-0 group-focus-within/field:opacity-100" />
                    A
                  </span>
                  Action (行动项 - 可选)
                </label>
                <div className="relative z-10">
                  <textarea 
                    value={action}
                    onChange={e => setAction(e.target.value)}
                    className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-4 pb-8 text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 focus:bg-black/60 focus:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all resize-none"
                    placeholder="基于此洞见，你接下来准备怎么做？"
                  />
                  <div className="absolute bottom-3 left-4 right-4 flex justify-between items-center pointer-events-none">
                    <span className="text-[10px] text-orange-400/60 font-mono drop-shadow-sm">填写将触发 KNOWLEDGE_ACTION_SAVED 事件</span>
                    <Target className="w-3 h-3 text-orange-400/60 drop-shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 pt-4 border-t border-white/5">
                <label className="text-white/70 font-semibold text-sm">强关联 OKR 目标 (手动指定)</label>
                <div className="relative">
                  <select 
                    value={linkedOKR}
                    onChange={e => setLinkedOKR(e.target.value)}
                    className="w-full appearance-none bg-black/50 border border-white/10 rounded-xl p-3.5 pl-4 text-white text-sm focus:outline-none focus:border-cyan-500/50 transition-colors shadow-inner"
                  >
                    {okrs.map(okr => (
                      <option key={okr.id} value={okr.id} className="bg-gray-900">{okr.title}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" />
                </div>
              </div>

              <button 
                onClick={handleSave}
                disabled={!reading || !insight || isSaving}
                className={clsx(
                  "mt-2 h-14 rounded-xl font-bold tracking-wide flex items-center justify-center gap-2 transition-all duration-300",
                  reading && insight 
                    ? "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_25px_rgba(6,182,212,0.4)] scale-100 hover:scale-[1.02]" 
                    : "bg-white/5 border border-white/10 text-white/30 cursor-not-allowed"
                )}
              >
                {isSaving ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Sparkles className="w-5 h-5 text-white/80" />
                  </motion.div>
                ) : saveSuccess ? (
                  <><CheckCircle2 className="w-5 h-5" /> 已保存至知识库</>
                ) : (
                  <><Save className="w-5 h-5" /> 保存知识并生成全网关联 (EventBus)</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: AI Suggestions & Recent (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="p-6 rounded-3xl bg-gradient-to-br from-cyan-900/40 to-black/60 border border-cyan-500/30 backdrop-blur-xl shadow-[0_10px_40px_rgba(6,182,212,0.2)] relative overflow-hidden group">
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20" />
            <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] -mr-10 -mt-10 pointer-events-none group-hover:bg-cyan-500/20 transition-all duration-1000" />
            
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-5 relative z-10">
              <Brain className="w-5 h-5 text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
              AI 语义匹配推荐 (DB-06)
            </h2>

            {reading.length > 10 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-5 rounded-2xl bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md relative z-10 shadow-[0_0_20px_rgba(6,182,212,0.15)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/0 via-cyan-500/5 to-cyan-500/0 translate-y-[-100%] animate-[scan_3s_ease-in-out_infinite] pointer-events-none" />
                <div className="absolute top-3 right-3 text-[10px] font-mono text-cyan-200 bg-cyan-900/60 px-2.5 py-1 rounded-md border border-cyan-400/40 flex items-center gap-1.5 shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  <Zap className="w-3 h-3 text-yellow-300" /> 置信度 92%
                </div>
                <p className="text-sm text-cyan-50 leading-relaxed mt-2 pr-24 font-medium">
                  系统检测到您的阅读摘要涉及系统设计与架构模式。建议强关联至您的 OKR <span className="font-black text-cyan-300 drop-shadow-[0_0_5px_rgba(6,182,212,0.6)]">「产品架构演进 Q3」</span>。这将提升该目标的进度权重因子。
                </p>
                <div className="flex gap-2 mt-6">
                  <button 
                    onClick={handleAcceptRecommendation}
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold hover:shadow-[0_0_20px_rgba(6,182,212,0.6)] hover:scale-[1.02] transition-all duration-300 border border-cyan-400/50"
                  >
                    确认 AI 匹配 (KNOWLEDGE_OKR_LINKED)
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-white/40 relative z-10 bg-black/40 rounded-2xl border border-white/5 border-dashed group-hover:border-cyan-500/30 transition-colors">
                <Lightbulb className="w-8 h-8 mb-3 opacity-30 text-cyan-400 group-hover:opacity-60 transition-opacity drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                <p className="text-sm">输入至少 10 个���的摘要<br/>AI 将自动计算 OKR 匹配度</p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-bold text-white/90 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-white/40" />
              知识库沉淀 (Top 10)
            </h2>
            
            <div className="flex flex-col gap-3">
              <AnimatePresence>
                {recentKnowledge.map(k => (
                  <motion.div 
                    key={k.id}
                    layout
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/10 transition-colors cursor-pointer flex flex-col gap-3 group"
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">{k.title}</h4>
                      {(k as any).isOfflineDraft ? (
                        <span className="text-[10px] font-mono text-yellow-400 bg-yellow-500/10 px-2 py-1 rounded-md border border-yellow-500/20" title="离线草稿，等待 SyncQueue 刷新触发语义匹配">
                          Pending AI
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-md border border-cyan-500/20">
                          匹配度 {k.matchScore}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <p className="text-xs text-white/60 line-clamp-1 leading-relaxed">
                        <span className="text-blue-400 font-bold mr-1.5 px-1 bg-blue-500/10 rounded">R</span>
                        {k.r}
                      </p>
                      <p className="text-xs text-white/60 line-clamp-1 leading-relaxed">
                        <span className="text-purple-400 font-bold mr-1.5 px-1 bg-purple-500/10 rounded">I</span>
                        {k.i}
                      </p>
                      {(k as any).action && (
                        <p className="text-xs text-orange-300/80 line-clamp-1 mt-1 bg-orange-500/10 p-1.5 rounded">
                          <span className="text-orange-400 font-bold mr-1.5">A</span>
                          {(k as any).action}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}