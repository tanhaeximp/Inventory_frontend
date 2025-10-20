import { useMemo, useState } from "react";
import {
  Menu, Search, PlusCircle, ShoppingCart, Package, Bell, ChevronDown, CalendarDays
} from "lucide-react";
import { useSidebar } from "./SidebarContext";
import { Link } from "react-router-dom";

/**
 * Props:
 * - title?: string (page title, e.g. "Dashboard")
 * - subtitle?: string (small caption under title)
 * - period?: { from: string, to: string } // optional badge on the right
 * - onSearch?: (query: string) => void
 */
export default function Navbar({ title = "Dashboard", subtitle = "", period, onSearch }) {
  const { toggle } = useSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const [q, setQ] = useState("");

  const company = useMemo(
    () => (import.meta?.env?.VITE_COMPANY_NAME || "Hazi Fazlul Haque Rice Agency"),
    []
  );

  const submitSearch = (e) => {
    e.preventDefault();
    onSearch?.(q.trim());
  };

  return (
    <header className="sticky top-0 z-40">
      {/* Glass gradient bar */}
      <div className="
        supports-[backdrop-filter]:backdrop-blur-xl
        bg-gradient-to-r from-indigo-600/90 via-blue-600/90 to-cyan-600/90
        dark:from-slate-900/80 dark:to-slate-800/80
        border-b border-white/10
      ">
        <div className="mx-auto max-w-screen-2xl px-3 sm:px-4 md:px-6 lg:px-8 h-14 flex items-center gap-3">
          {/* Mobile: sidebar toggle */}
          <button
            onClick={toggle}
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 active:scale-95"
            aria-label="Open sidebar"
          >
            <Menu size={18} />
          </button>

          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 rounded-lg shadow-sm ring-1 ring-white/20" />
            <div className="hidden sm:block min-w-0">
              <div className="text-white font-semibold truncate">{company}</div>
              <div className="text-white/70 text-xs truncate">{subtitle}</div>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={submitSearch} className="ml-auto md:ml-6 flex-1 max-w-xl hidden sm:block">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products, invoices, customers…"
                className="
                  w-full pl-9 pr-3 h-9 rounded-lg
                  bg-white/15 text-white placeholder:text-white/70
                  outline-none ring-1 ring-white/20 focus:ring-2 focus:ring-white/40
                "
              />
            </div>
          </form>

          {/* Quick actions */}
          <div className="ml-auto sm:ml-4 flex items-center gap-2">
            <Link
              to="/sales/invoice"
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white text-gray-900 hover:bg-gray-50 active:scale-[.98]"
              title="New Sales Invoice"
            >
              <ShoppingCart size={16} /> <span className="text-sm font-medium">Sale</span>
            </Link>
            <Link
              to="/purchases/invoice"
              className="hidden md:inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-white/10 text-white hover:bg-white/15 active:scale-[.98] ring-1 ring-white/20"
              title="New Purchase Invoice"
            >
              <Package size={16} /> <span className="text-sm font-medium">Purchase</span>
            </Link>

            <Link
              to="/sales/new"
              className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white text-gray-900 hover:bg-gray-50 active:scale-95"
              title="Quick add"
            >
              <PlusCircle size={18} />
            </Link>

            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/15 active:scale-95 ring-1 ring-white/20"
              title="Notifications"
            >
              <Bell size={18} />
            </button>

            {/* Period chip (optional) */}
            {period?.from && period?.to && (
              <div className="hidden lg:inline-flex items-center gap-1 h-9 px-2.5 rounded-lg bg-white/10 text-white ring-1 ring-white/20">
                <CalendarDays size={16} />
                <span className="text-sm">{period.from} → {period.to}</span>
              </div>
            )}

            {/* Profile dropdown (headless) */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(v => !v)}
                className="inline-flex items-center gap-2 h-9 pl-1 pr-2 rounded-full bg-white/10 text-white hover:bg-white/15 active:scale-95 ring-1 ring-white/20"
              >
                <img
                  src="/avatar.png"
                  alt="User"
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-white/30"
                  onError={(e) => { e.currentTarget.src = 'https://i.pravatar.cc/40?img=1'; }}
                />
                <span className="hidden sm:block text-sm font-medium">Account</span>
                <ChevronDown size={16} className="hidden sm:block opacity-80" />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-xl ring-1 ring-black/5 overflow-hidden"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <Link to="/profile" className="block px-3 py-2 text-sm hover:bg-gray-50">Profile</Link>
                  <Link to="/settings" className="block px-3 py-2 text-sm hover:bg-gray-50">Settings</Link>
                  <Link to="/other-transactions" className="block px-3 py-2 text-sm hover:bg-gray-50">Other Transactions</Link>
                  <div className="h-px bg-gray-100" />
                  <Link to="/logout" className="block px-3 py-2 text-sm text-rose-600 hover:bg-rose-50">Sign out</Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>      
    </header>
  );
}
