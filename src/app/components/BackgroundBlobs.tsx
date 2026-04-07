import { motion } from "motion/react";

export default function BackgroundBlobs() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none mix-blend-screen opacity-70">
      <motion.div
        className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vh] rounded-full bg-gradient-to-r from-purple-600/40 to-pink-600/40 blur-[120px] mix-blend-screen"
        animate={{
          scale: [1, 1.1, 1],
          x: [0, 50, 0],
          y: [0, 30, 0],
        }}
        transition={{
          type: "keyframes",
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[70vh] rounded-full bg-gradient-to-l from-indigo-600/30 to-cyan-500/30 blur-[150px] mix-blend-screen"
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -70, 0],
          y: [0, -40, 0],
        }}
        transition={{
          type: "keyframes",
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 5,
        }}
      />
      <motion.div
        className="absolute top-[30%] left-[40%] w-[30vw] h-[40vh] rounded-full bg-gradient-to-b from-orange-500/20 to-red-500/20 blur-[140px] mix-blend-screen"
        animate={{
          scale: [1, 1.3, 1],
          x: [0, -40, 0],
          y: [0, 60, 0],
        }}
        transition={{
          type: "keyframes",
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />
      {/* Very faint noise overlay */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
    </div>
  );
}
