// src/components/Navbar.jsx
import { useSidebar } from "./SidebarContext";

export default function Navbar() {
  const { toggle } = useSidebar();
  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
      <div className="max-w-screen-2xl mx-auto flex items-center justify-between h-14 px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border"
            onClick={toggle}
            aria-label="Open sidebar"
          >
            <span aria-hidden>☰</span>
          </button>
          <div className="font-semibold">Your App</div>
        </div>
        <div className="flex items-center gap-2">
          {/* right side actions / profile etc */}
        </div>
      </div>
    </nav>
  );
}
