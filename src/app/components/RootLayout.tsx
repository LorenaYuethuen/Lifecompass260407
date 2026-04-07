import { Outlet } from "react-router";
import Sidebar from "./Sidebar";
import Header from "./Header";
import BackgroundBlobs from "./BackgroundBlobs";

export default function RootLayout() {
  return (
    <div className="flex h-screen w-full bg-[#0A0A1A] text-white overflow-hidden font-sans relative selection:bg-purple-500/30">
      <BackgroundBlobs />
      
      {/* Sidebar - fixed or flex depending on layout */}
      <Sidebar />
      
      <main className="flex flex-col flex-1 relative z-10 overflow-hidden">
        <Header />
        <div className="flex-1 overflow-y-auto px-6 pb-6 pt-2 hide-scrollbar">
          <Outlet />
        </div>
      </main>

      {/* Global CSS for hiding scrollbar cleanly */}
      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
}
