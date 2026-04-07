import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { CheckCircle2, Flame, RefreshCcw, Database } from "lucide-react";
import { clsx } from "clsx";
import { useSysStore } from "../../store/sysStore";
import { useSyncStore } from "../../store/syncStore";
import { getLocalCache, setLocalCache } from "../../lib/db";

interface Habit {
  id: string;
  name: string;
  done: boolean;
  streak: number;
}

const DEFAULT_HABITS: Habit[] = [
  { id: 'h1', name: "晨间冥想", done: false, streak: 12 },
  { id: 'h2', name: "补水目标", done: false, streak: 4 },
  { id: 'h3', name: "深度工作时间段", done: false, streak: 2 },
  { id: 'h4', name: "晚间复盘", done: false, streak: 8 },
];

export default function CheckInWidget() {
  const { emitEvent, isOffline } = useSysStore();
  const { enqueue } = useSyncStore();

  const [habits, setHabits] = useState<Habit[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loadHabits = async () => {
      try {
        const cached = await getLocalCache('checkin_habits');
        if (cached) {
          setHabits(cached);
        } else {
          setHabits(DEFAULT_HABITS);
        }
      } catch (e) {
        console.error("Failed to load habits from cache", e);
        setHabits(DEFAULT_HABITS);
      } finally {
        setIsLoaded(true);
      }
    };
    loadHabits();
  }, []);

  const toggleHabit = async (id: string) => {
    const newHabits = habits.map(h => {
      if (h.id === id) {
        const newDone = !h.done;
        const newStreak = newDone ? h.streak + 1 : Math.max(0, h.streak - 1);
        
        emitEvent('CheckInWidget', 'habit_toggled', { habit: h.name, done: newDone });
        
        enqueue({
          entity: "DB-01",
          op: "patch",
          priority: 0,
          desc: `LIFEMATRICES 打卡: ${h.name} -> ${newDone ? '完成' : '撤销'}`,
          conflict: "last-write-wins"
        });

        return { ...h, done: newDone, streak: newStreak };
      }
      return h;
    });

    setHabits(newHabits);
    await setLocalCache('checkin_habits', newHabits);
  };

  const totalStreak = habits.reduce((acc, h) => acc + (h.done ? h.streak : 0), 0);

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-900/40 to-black/60 border border-white/10 backdrop-blur-2xl p-8 h-full shadow-[0_15px_40px_0_rgba(0,0,0,0.4)] flex flex-col">
      
      {/* Background Glow */}
      <div className="absolute top-[-20%] right-[-10%] w-48 h-48 bg-cyan-500/20 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-white">每日打卡</h2>
          <div className="flex items-center gap-1.5 text-xs font-medium text-white/40">
            <Database className={clsx("w-3 h-3", isOffline ? "text-orange-400" : "text-green-400")} />
            {isOffline ? "离线缓存降级" : "IDB 本地读取"}
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 backdrop-blur-md shadow-[0_0_15px_rgba(249,115,22,0.2)]">
          <Flame className="w-4 h-4 text-orange-400" />
          <span className="text-sm font-bold text-orange-400">能量 {totalStreak}</span>
        </div>
      </div>

      <div className="flex flex-col gap-4 relative z-10 flex-1 overflow-y-auto hide-scrollbar pr-2">
        {!isLoaded ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin"></div>
          </div>
        ) : (
          habits.map((h, i) => (
            <motion.div 
              key={h.id}
              onClick={() => toggleHabit(h.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={clsx(
                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden",
                h.done 
                  ? "bg-green-500/10 border-green-500/30 shadow-[0_0_15px_rgba(74,222,128,0.15)]" 
                  : "bg-white/5 border-white/10 hover:border-white/30 hover:bg-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]"
              )}
            >
              {h.done && (
                <motion.div 
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear", repeatDelay: 1 }}
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/5 to-transparent w-full" 
                />
              )}
              
              <div className="flex items-center gap-4 relative z-10">
                <div className={clsx(
                  "flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all shadow-inner",
                  h.done ? "border-green-400 bg-green-400 shadow-[0_0_15px_rgba(74,222,128,0.6)]" : "border-white/30 group-hover:border-indigo-400 group-hover:shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                )}>
                  {h.done && <CheckCircle2 className="w-4 h-4 text-black drop-shadow-sm" strokeWidth={3} />}
                </div>
                <span className={clsx(
                  "text-sm font-semibold tracking-wide transition-colors",
                  h.done ? "text-green-300 drop-shadow-[0_0_8px_rgba(74,222,128,0.4)]" : "text-white/90 group-hover:text-white"
                )}>
                  {h.name}
                </span>
              </div>
              
              <div className={clsx(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold transition-colors",
                h.done ? "bg-green-500/20 text-green-400" : "bg-white/5 text-white/40 group-hover:bg-white/10 group-hover:text-white/60"
              )}>
                <RefreshCcw className={clsx("w-3 h-3", h.done && "animate-spin-slow")} /> {h.streak}
              </div>
            </motion.div>
          ))
        )}
      </div>

    </div>
  );
}