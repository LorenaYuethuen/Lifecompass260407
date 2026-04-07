import { useLocation } from "react-router";
import { motion } from "motion/react";
import { Zap, CheckSquare, Target, Activity, BookOpen, Settings } from "lucide-react";

export default function PlaceholderPage() {
  const location = useLocation();
  
  const getPageInfo = () => {
    switch (location.pathname) {
      case "/do":
        return { title: "执行引擎", icon: Zap, color: "text-indigo-400", bg: "bg-indigo-500/20" };
      case "/checkin":
        return { title: "打卡", icon: CheckSquare, color: "text-green-400", bg: "bg-green-500/20" };
      case "/review":
        return { title: "复盘", icon: Target, color: "text-orange-400", bg: "bg-orange-500/20" };
      case "/health":
        return { title: "健康度", icon: Activity, color: "text-pink-400", bg: "bg-pink-500/20" };
      case "/knowledge":
        return { title: "知识库", icon: BookOpen, color: "text-cyan-400", bg: "bg-cyan-500/20" };
      case "/settings":
        return { title: "设置", icon: Settings, color: "text-gray-400", bg: "bg-gray-500/20" };
      default:
        return { title: "模块未找到", icon: Activity, color: "text-white/40", bg: "bg-white/10" };
    }
  };

  const info = getPageInfo();
  const Icon = info.icon;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center h-full min-h-[60vh] gap-6"
    >
      <div className={`w-24 h-24 rounded-3xl flex items-center justify-center ${info.bg} border border-white/10 backdrop-blur-xl shadow-2xl`}>
        <Icon className={`w-12 h-12 ${info.color}`} />
      </div>
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-white tracking-tight">{info.title}</h1>
        <p className="text-white/50 max-w-md mx-auto">
          该模块目前正在 HSI 循环中进行初始化。预计将在未来的同步阶段进行开发。
        </p>
      </div>
    </motion.div>
  );
}
