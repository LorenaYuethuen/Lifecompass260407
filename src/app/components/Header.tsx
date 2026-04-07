import { Search, Bell, Sparkles } from "lucide-react";
import { motion } from "motion/react";

export default function Header() {
  return (
    <header className="h-[5rem] mt-4 mx-6 flex items-center justify-between rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-2xl px-6 relative z-20 shadow-[0_10px_40px_rgba(0,0,0,0.3)] shrink-0 group">
      
      {/* 左侧 / 欢迎语 */}
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-400 via-purple-400 to-indigo-400 animate-text">
            早上好，艾蕾诺拉
          </span>
          <Sparkles className="w-5 h-5 text-pink-400" />
        </div>
        <span className="text-xs text-white/50 tracking-wide">
          你的认知负荷处于最佳状态。有3个待处理的复盘。
        </span>
      </div>

      {/* 右侧工具 */}
      <div className="flex items-center gap-4">
        {/* 搜索栏 */}
        <div className="relative group/search hidden md:block">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-white/40 group-focus-within/search:text-pink-400 transition-colors">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            className="w-[260px] h-12 bg-black/20 border border-white/10 rounded-full pl-10 pr-4 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all backdrop-blur-md"
            placeholder="搜索任务、知识库..."
          />
        </div>

        {/* 通知 */}
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="relative w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl hover:bg-white/10 transition-colors"
        >
          <Bell className="w-5 h-5 text-white/80" />
          <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,1)]"></div>
        </motion.button>

        {/* 全局HSI状态微型指示器 */}
        <div className="h-12 px-4 rounded-full bg-white/5 border border-white/10 backdrop-blur-xl flex items-center justify-center gap-3 cursor-pointer hover:bg-white/10 transition-colors relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          
          <div className="flex flex-col text-right">
            <span className="text-[10px] uppercase font-bold text-white/40 tracking-wider">滑动得分</span>
            <span className="text-sm font-semibold text-white/90">24 <span className="text-green-400">正常</span></span>
          </div>
          
          <div className="w-8 h-8 rounded-full border-2 border-green-500/50 flex items-center justify-center relative">
            <div className="absolute inset-0 rounded-full border-2 border-green-400 blur-[2px]"></div>
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80]"></div>
            </div>
          </div>
        </div>

      </div>

    </header>
  );
}
