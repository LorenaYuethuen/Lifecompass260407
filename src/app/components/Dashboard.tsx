import HSIWidget from "./cards/HSIWidget";
import TaskWidget from "./cards/TaskWidget";
import OKRWidget from "./cards/OKRWidget";
import CheckInWidget from "./cards/CheckInWidget";
import CrashRiskWidget from "./cards/CrashRiskWidget";
import { motion } from "motion/react";
import { Zap } from "lucide-react";

export default function Dashboard() {
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
      className="flex flex-col gap-6 pb-20 pt-2 h-full relative"
      variants={containerVariants}
      initial="hidden"
      animate="show"
    >
      {/* Background ambient glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none z-0" />

      <motion.div variants={itemVariants} className="flex items-center justify-between mb-2 relative z-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-pink-100 to-fuchsia-400 mb-2 flex items-center gap-3 drop-shadow-sm">
            <div className="p-2 rounded-2xl bg-pink-500/20 border border-pink-500/30 shadow-[0_0_15px_rgba(236,72,153,0.3)]">
              <Zap className="w-8 h-8 text-pink-400 drop-shadow-[0_0_10px_rgba(236,72,153,0.8)]" />
            </div>
            LIFE COMPASS 全息控制台
          </h1>
          <p className="text-white/60 text-sm max-w-2xl font-mono tracking-wide mt-3 ml-2">
            HSI 能量引擎已连接。正在执行崩溃风险硬过滤。打卡状态实时同步。
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-12 gap-6 relative z-10">
        {/* Top Row: HSI Inference Status (Wide) & Check-In (Flow 1) */}
        <motion.div variants={itemVariants} className="col-span-12 xl:col-span-8">
          <HSIWidget />
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-12 xl:col-span-4 flex flex-col h-full">
          <CheckInWidget />
        </motion.div>

        {/* Middle Row: Active DO Tasks (Flow 3) & Crash Risk Monitor (Flow 2) */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-7 flex flex-col gap-6">
          <TaskWidget />
          <OKRWidget />
        </motion.div>
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-5 flex flex-col h-full">
          <CrashRiskWidget />
        </motion.div>
      </div>

    </motion.div>
  );
}
