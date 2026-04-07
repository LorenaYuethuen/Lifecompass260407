import { Link, useLocation } from "react-router";
import { LayoutDashboard, CheckSquare, Target, Activity, BookOpen, Settings, Zap, Star, Server } from "lucide-react";
import { clsx } from "clsx";
import { motion } from "motion/react";

const NAV_ITEMS = [
  { name: "仪表盘", path: "/", icon: LayoutDashboard },
  { name: "执行 (任务)", path: "/do", icon: Zap },
  { name: "打卡", path: "/checkin", icon: CheckSquare },
  { name: "愿景显化", path: "/wishlist", icon: Star }, 
  { name: "复盘", path: "/review", icon: Target },
  { name: "健康度", path: "/health", icon: Activity },
  { name: "知识库", path: "/knowledge", icon: BookOpen },
  { name: "系统中枢", path: "/system", icon: Server },
  { name: "设置", path: "/settings", icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-[260px] h-[calc(100vh-2rem)] my-4 ml-4 rounded-[2.5rem] bg-white/5 border border-white/10 backdrop-blur-2xl flex flex-col p-6 shadow-2xl relative z-20">
      
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10 px-2 mt-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.5)] flex items-center justify-center">
          <Zap className="w-5 h-5 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
          指南针
        </span>
      </div>

      {/* Nav List */}
      <nav className="flex flex-col gap-2 flex-1">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={clsx(
                "flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                isActive ? "text-white" : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-white/10 backdrop-blur-md rounded-2xl z-0 border border-white/10 shadow-[inset_0_0_12px_rgba(255,255,255,0.05)]"
                  initial={false}
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              <item.icon className={clsx("w-5 h-5 relative z-10 transition-colors", isActive ? "text-pink-400" : "text-white/50 group-hover:text-white/80")} strokeWidth={isActive ? 2.5 : 2} />
              <span className="relative z-10 font-medium text-[15px]">{item.name}</span>
              
              {/* Subtle hover glow */}
              {!isActive && (
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-r from-white/0 via-white/5 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] pointer-events-none" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* 用户资料面板 */}
      <div className="mt-auto flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md cursor-pointer hover:bg-white/10 transition-colors">
        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 overflow-hidden shadow-inner">
          <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80" alt="用户" className="w-full h-full object-cover mix-blend-overlay" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-white/90">艾蕾诺拉 M.</span>
          <span className="text-xs text-white/50">8级 显化者</span>
        </div>
      </div>

    </aside>
  );
}
