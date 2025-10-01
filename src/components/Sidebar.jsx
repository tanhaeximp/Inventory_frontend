import { useEffect, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, ShoppingCart, ReceiptText,
  Users, UserRound, Boxes, Layers, FileSpreadsheet,
  UserCog, LogOut, ChevronDown, ChevronRight
} from "lucide-react";
import { useSidebar } from "./SidebarContext";

/* ---------- Small helpers ---------- */
function SubItem({ to, label, collapsed, onNavigate }) {
  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "block px-3 py-2 rounded-md text-sm transition",
          isActive ? "bg-blue-600/90 text-white font-semibold shadow" : "text-gray-300 hover:bg-white/10",
          collapsed ? "text-center" : ""
        ].join(" ")
      }
    >
      {collapsed ? label[0] : label}
    </NavLink>
  );
}

function MainMenu({ icon: Icon, title, open, onToggle, collapsed, children }) {
  return (
    <div>
      <button
        onClick={onToggle}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-white/10 transition ${
          collapsed ? "justify-center" : "text-gray-200"
        }`}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <Icon size={18} />
          {!collapsed && <span className="font-medium">{title}</span>}
        </div>
        {!collapsed && (open ? <ChevronDown size={16} /> : <ChevronRight size={16} />)}
      </button>

      {/* Submenu only when not collapsed */}
      {!collapsed && (
        <div
          className={`overflow-hidden transition-[max-height,opacity] duration-300 ${
            open ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
          aria-hidden={!open}
        >
          <div className="ml-6 mt-1 space-y-1">{children}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- Sidebar ---------- */
export default function Sidebar({ handleLogout }) {
  const { open, close } = useSidebar(); // mobile drawer state from context
  const [openMenu, setOpenMenu] = useState(null); // which accordion is open
  const [collapsed, setCollapsed] = useState(true); // desktop collapsed (icons-only)
  const location = useLocation();

  // Close drawer when navigating on mobile
  useEffect(() => {
    close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Only one submenu open at a time
  const toggleMenu = (k) => setOpenMenu((prev) => (prev === k ? null : k));

  // Common handler to close drawer after clicking a subitem on mobile
  const handleNavigate = () => {
    // Only relevant for mobile where drawer overlays
    close();
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 md:hidden transition-opacity ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={close}
      />

      {/* Sidebar panel
          - Mobile: off-canvas controlled by context 'open'
          - Desktop: collapses to 80px (icons) and expands to 256px on hover
      */}
      <aside
        onMouseEnter={() => setCollapsed(false)}
        onMouseLeave={() => setCollapsed(true)}
        className={[
          "fixed md:sticky top-0 md:top-14 left-0 h-full md:h-[calc(100vh-56px)]",
          "z-50 md:z-10",
          collapsed ? "md:w-20" : "md:w-64",
          "w-64 md:w-auto",
          "bg-gradient-to-b from-gray-900 to-gray-800 text-white shadow-xl",
          "transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          "md:border-r md:border-white/10"
        ].join(" ")}
        aria-label="Sidebar navigation"
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            <img src="/logo.png" alt="Logo" className="h-9 w-9 rounded shrink-0" />
            {/* Hide brand text when collapsed on desktop */}
            <div className={`transition-opacity ${collapsed ? "opacity-0 md:hidden" : "opacity-100"}`}>
              <div className="font-bold text-lg whitespace-nowrap">HFR Agency</div>
              <div className="text-xs text-gray-400">Manage Stocks &amp; Invoices</div>
            </div>
          </div>
          {/* Mobile close button */}
          <button
            className={`md:hidden p-2 rounded-lg hover:bg-white/10 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
            onClick={close}
            aria-label="Close sidebar"
          >
            {/* simple X icon */}
            <svg viewBox="0 0 24 24" width="20" height="20" className="fill-current">
              <path d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12l-4.9 4.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.9a1 1 0 0 0 1.41-1.41L13.41 12l4.9-4.89a1 1 0 0 0-.01-1.4Z" />
            </svg>
          </button>
        </div>

        {/* Nav list (scrollable) */}
        <nav className="p-3 overflow-y-auto h-[calc(100%-4rem)] space-y-2">
          {/* Dashboard (no submenu) */}
          <NavLink
            to="/dashboard"
            onClick={handleNavigate}
            className={({ isActive }) =>
              [
                "flex items-center gap-2 px-3 py-2 rounded-lg transition",
                isActive ? "bg-blue-600/90 text-white font-semibold shadow" : "text-gray-200 hover:bg-white/10",
                collapsed ? "justify-center" : ""
              ].join(" ")
            }
            aria-current={(match) => (match ? "page" : undefined)}
          >
            <LayoutDashboard size={18} />
            {!collapsed && "Dashboard"}
          </NavLink>

          {/* Sales */}
          <MainMenu
            icon={ShoppingCart}
            title="Sales"
            open={openMenu === "sales"}
            onToggle={() => toggleMenu("sales")}
            collapsed={collapsed}
          >
            <SubItem to="/sales/invoice" label="New Invoice" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/sales/new" label="New Sale (Single)" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/sales/summary" label="Sales Summary" collapsed={collapsed} onNavigate={handleNavigate} />
          </MainMenu>

          {/* Purchases */}
          <MainMenu
            icon={Package}
            title="Purchases"
            open={openMenu === "purchases"}
            onToggle={() => toggleMenu("purchases")}
            collapsed={collapsed}
          >
            <SubItem to="/purchases/invoice" label="New Invoice" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/purchases/add" label="Add Purchase (Single)" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/purchases/summary" label="Purchase Summary" collapsed={collapsed} onNavigate={handleNavigate} />
          </MainMenu>

          {/* Ledgers */}
          <MainMenu
            icon={ReceiptText}
            title="Ledgers"
            open={openMenu === "ledgers"}
            onToggle={() => toggleMenu("ledgers")}
            collapsed={collapsed}
          >
            <SubItem to="/ledger/customers" label="Customer Ledger" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/ledger/suppliers" label="Supplier Ledger" collapsed={collapsed} onNavigate={handleNavigate} />
          </MainMenu>

          {/* Products */}
          <MainMenu
            icon={Layers}
            title="Products"
            open={openMenu === "products"}
            onToggle={() => toggleMenu("products")}
            collapsed={collapsed}
          >
            <SubItem to="/products" label="Manage Products" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/product-types" label="Product Types" collapsed={collapsed} onNavigate={handleNavigate} />
          </MainMenu>

          {/* Stocks */}
          <MainMenu
            icon={Boxes}
            title="Stocks"
            open={openMenu === "stocks"}
            onToggle={() => toggleMenu("stocks")}
            collapsed={collapsed}
          >
            <SubItem to="/stocks" label="View Stocks" collapsed={collapsed} onNavigate={handleNavigate} />
          </MainMenu>

          {/* Customers */}
          <MainMenu
            icon={Users}
            title="Customers"
            open={openMenu === "customers"}
            onToggle={() => toggleMenu("customers")}
            collapsed={collapsed}
          >
            <SubItem to="/customers" label="Manage Customers" collapsed={collapsed} onNavigate={handleNavigate} />
          </MainMenu>

          {/* Suppliers */}
          <MainMenu
            icon={UserRound}
            title="Suppliers"
            open={openMenu === "suppliers"}
            onToggle={() => toggleMenu("suppliers")}
            collapsed={collapsed}
          >
            <SubItem to="/suppliers" label="Manage Suppliers" collapsed={collapsed} onNavigate={handleNavigate} />
          </MainMenu>

          {/* Reports */}
          <MainMenu
            icon={FileSpreadsheet}
            title="Reports"
            open={openMenu === "reports"}
            onToggle={() => toggleMenu("reports")}
            collapsed={collapsed}
          >
            <SubItem to="/reports/daily" label="Daily" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/reports/monthly" label="Monthly" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/reports/annual" label="Annual" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/reports/pnl" label="Profit & Loss" collapsed={collapsed} onNavigate={handleNavigate} />
            <SubItem to="/reports/balance-sheet" label="Balance Sheet" collapsed={collapsed} onNavigate={handleNavigate} />
            
          </MainMenu>

          {/* Users */}
          <MainMenu
            icon={UserCog}
            title="Users"
            open={openMenu === "users"}
            onToggle={() => toggleMenu("users")}
            collapsed={collapsed}
          >
            <SubItem to="/users" label="Manage Users" collapsed={collapsed} onNavigate={handleNavigate} />
          </MainMenu>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`mt-4 w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 transition ${
              collapsed ? "justify-center" : ""
            }`}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>
        </nav>
      </aside>
    </>
  );
}
