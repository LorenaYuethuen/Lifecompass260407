import { motion } from "motion/react";
import { AlertTriangle, TrendingUp, Brain, HeartPulse, Activity } from "lucide-react";
import { clsx } from "clsx";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from "recharts";

export default function CrashRiskWidget() {
  const isHighRisk = true; // Simulating a high risk state
  const swipScore = 68;

  // Field Dependency Simulation: computeSwipSlope()
  const swipLogs = [
    { time: "09:40", score: 35 },
    { time: "09:45", score: 42 },
    { time: "09:50", score: 48 },
    { time: "09:55", score: 58 },
    { time: "10:00", score: 68 },
  ];
  
  const hasEnoughLogs = swipLogs.length >= 2;
  const slope = hasEnoughLogs ? "+2.5/min" : 0;
  const slopeDisplay = hasEnoughLogs ? slope : "0 (日志不足降级)";

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 border border-white/20 backdrop-blur-xl p-2 rounded-xl text-xs flex flex-col gap-1 shadow-xl">
          <span className="text-white/60 font-mono">{label}</span>
          <span className="text-orange-400 font-bold">SWIP {payload[0].value}</span>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={clsx(
      "relative overflow-hidden rounded-[2.5rem] border backdrop-blur-2xl p-8 flex-1 transition-all duration-700 shadow-[0_15px_40px_0_rgba(0,0,0,0.4)] flex flex-col",
      isHighRisk 
        ? "bg-gradient-to-bl from-red-900/40 via-[#100505]/80 to-orange-900/30 border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.2)]" 
        : "bg-black/40 border-white/10"
    )}>
      
      {/* Warning Glow */}
      {isHighRisk && (
        <motion.div 
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }} 
          transition={{ type: "keyframes", duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 bg-red-500/10 pointer-events-none"
        />
      )}

      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <HeartPulse className={clsx("w-6 h-6", isHighRisk ? "text-red-400" : "text-white/40")} />
            <h2 className="text-xl font-bold tracking-tight text-white">崩溃风险监控</h2>
          </div>
          <span className={clsx("text-sm tracking-wide font-medium flex items-center gap-1", isHighRisk ? "text-orange-400" : "text-white/50")}>
            <TrendingUp className="w-3 h-3" /> 滑动得分趋势 {slopeDisplay}
            {!hasEnoughLogs && (
              <span className="ml-1 text-[10px] bg-white/10 px-2 py-0.5 rounded-md border border-white/20 text-white/50 cursor-help" title="需近5min内>2条日志 (DB-08)。当前判定仅凭SWIP绝对值。">
                缺失预判
              </span>
            )}
          </span>
        </div>
        
        {isHighRisk && (
          <motion.div 
            animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
            transition={{ type: "keyframes", duration: 1, repeat: Infinity, repeatDelay: 3 }}
            className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/50 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.5)] shrink-0"
          >
            <AlertTriangle className="w-6 h-6 text-red-400" />
          </motion.div>
        )}
      </div>

      <div className="flex flex-col gap-5 relative z-10 flex-1 justify-between">
        
        <div className="flex items-center justify-between">
          <div className="flex items-end gap-3">
            <span className="text-5xl font-extrabold text-white tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] leading-none">{swipScore}</span>
            <span className="text-sm font-bold text-white/50 uppercase tracking-widest pb-1">SWIP绝对值</span>
          </div>
        </div>

        {/* SWIP Timeline Chart */}
        <div className="mt-2 -ml-2" style={{ width: '100%', height: 128 }}>
          <ResponsiveContainer width="100%" height={128} minWidth={200} minHeight={128}>
            <AreaChart data={swipLogs} margin={{ top: 5, right: 0, left: 0, bottom: 0 }} id="crash-risk-area-chart">
              <defs key="defs-1">
                <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                  <stop key="stop-1" offset="5%" stopColor={isHighRisk ? "#f97316" : "#4ade80"} stopOpacity={0.8}/>
                  <stop key="stop-2" offset="95%" stopColor={isHighRisk ? "#ef4444" : "#22c55e"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                key="xaxis-1"
                dataKey="time" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontFamily: 'monospace' }} 
                dy={5}
              />
              <YAxis key="yaxis-1" hide domain={[0, 100]} />
              <Tooltip key="tooltip-1" content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2, strokeDasharray: '4 4' }} />
              <ReferenceLine key="ref-85" y={85} stroke="rgba(239,68,68,0.5)" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: '硬过滤阈值 (85)', fill: 'rgba(239,68,68,0.8)', fontSize: 10 }} />
              <ReferenceLine key="ref-50" y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
              <Area 
                key="area"
                type="monotone" 
                dataKey="score" 
                stroke={isHighRisk ? "#f97316" : "#4ade80"} 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorScore)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {isHighRisk && (
          <div className="p-4 rounded-2xl bg-black/40 border border-red-500/20 backdrop-blur-xl flex flex-col gap-3 group hover:bg-black/60 transition-colors mt-auto">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-semibold text-orange-100">需要干预介入</span>
            </div>
            <p className="text-xs text-white/60 leading-relaxed">
              SWIP 斜率异常 ({slope})，预计 10 分钟后触发系统强制锁定。建议立即执行一次恢复。
            </p>
            <button className="mt-1 w-full py-3 rounded-xl bg-gradient-to-r from-red-500/20 to-orange-500/20 hover:from-red-500/40 hover:to-orange-500/40 border border-red-500/30 text-red-100 text-sm font-bold tracking-wide transition-all uppercase flex items-center justify-center gap-2 relative overflow-hidden">
              <Activity className="w-4 h-4" /> 接受恢复协议
              <span className="text-white/40 font-normal ml-2 text-xs">应用 +20分钟 硬过滤</span>
              <motion.div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12" 
                animate={{ x: ['-100%', '200%'] }} 
                transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 3 }}
              />
            </button>
          </div>
        )}
        
      </div>
    </div>
  );
}