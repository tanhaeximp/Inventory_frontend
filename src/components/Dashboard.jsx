// src/pages/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend
} from "recharts";
import {
  TrendingUp, TrendingDown, Package, DollarSign, RefreshCcw, Users2, Calendar, Tag, Factory
} from "lucide-react";
import api from "./api";

/* ---------------- helpers ---------------- */
const fmtMoney = new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT" });
const money = (n) => fmtMoney.format(Number(n || 0));

const iso = (d) => d.toISOString().slice(0, 10);
const ym = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
};
const rangeDays = (n) => {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(iso(d));
  }
  return out;
};
const monthsBetween = (from, to) => {
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T23:59:59");
  const cur = new Date(start);
  cur.setDate(1);
  const out = [];
  while (cur <= end) {
    out.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, "0")}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
};
function getRange(period = "30d") {
  const now = new Date();
  const end = iso(now);
  const start = new Date(now);
  if (period === "7d") start.setDate(start.getDate() - 6);
  else if (period === "30d") start.setDate(start.getDate() - 29);
  else start.setMonth(start.getMonth() - 11);
  return { from: iso(start), to: end };
}
const rowsOf = (payload) =>
  Array.isArray(payload?.rows) ? payload.rows : Array.isArray(payload) ? payload : [];

/* ---------------- ui primitives ---------------- */
function Card({ children, className = "" }) {
  return <div className={`rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}

function Stat({ label, value, icon, trend, trendDir = "up", sub }) {
  const Icon = icon;
  const color = trendDir === "up" ? "text-emerald-600" : "text-rose-600";
  const bg = trendDir === "up" ? "bg-emerald-50" : "bg-rose-50";

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-500">{label}</div>

          {/* ↓ Reduced font size slightly so amount fits in one line */}
          <div className="mt-1 text-xl font-semibold tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
            {value}
          </div>

          {sub && <div className="mt-1 text-xs text-gray-500">{sub}</div>}
        </div>

        <div className="shrink-0 rounded-xl bg-gray-50 p-2 text-gray-700">
          <Icon size={20} />
        </div>
      </div>

      {trend && (
        <div
          className={`mt-3 inline-flex items-center gap-2 text-xs font-medium ${color} ${bg} px-2 py-1 rounded-lg`}
        >
          {trendDir === "up" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trend}
        </div>
      )}
    </Card>
  );
}


function SegButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-sm rounded-lg border transition ${
        active ? "bg-white text-gray-900 border-white" : "bg-white/10 text-white/90 border-white/20 hover:bg-white/15"
      }`}
    >
      {children}
    </button>
  );
}

/* ---------------- dashboard ---------------- */
export default function Dashboard() {
  const [period, setPeriod] = useState("30d");
  const { from, to } = getRange(period);

  // data
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [stock, setStock] = useState([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [suppliersCount, setSuppliersCount] = useState(0);

  // meta
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      const [s, p, st, c, sp] = await Promise.all([
        api.get(`/api/invoices/sales?from=${from}&to=${to}&limit=5000`),
        api.get(`/api/invoices/purchases?from=${from}&to=${to}&limit=5000`),
        api.get("/api/stock/summary"),
        api.get("/api/customers"),
        api.get("/api/suppliers"),
      ]);

      setSales(rowsOf(s.data));
      setPurchases(rowsOf(p.data));

      const stockRows = Array.isArray(st.data?.rows) ? st.data.rows : st.data || [];
      setStock(
        stockRows.map((r) => ({
          productId: r.productId || r._id,
          name: r.name,
          unit: r.unit,
          stock: Number(r.stock || 0),
          avgCost: Number(r.avgCost || 0),
          totalValue: Number(r.totalValue || 0),
          category: r.category || "Uncategorized",
        }))
      );

      setCustomersCount(Array.isArray(c.data) ? c.data.length : 0);
      setSuppliersCount(Array.isArray(sp.data) ? sp.data.length : 0);
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [period]);

  /* --------- derivations --------- */
  const kpis = useMemo(() => {
    const salesTotal = sales.reduce((s, r) => s + Number(r.grandTotal || 0), 0);
    const salesPaid = sales.reduce((s, r) => s + Number(r.paid || 0), 0);
    const purchaseTotal = purchases.reduce((s, r) => s + Number(r.grandTotal || 0), 0);
    const stockValue = stock.reduce((s, r) => s + Number(r.totalValue || 0), 0);
    const gross = salesTotal - purchaseTotal;
    return { salesTotal, salesPaid, purchaseTotal, stockValue, gross };
  }, [sales, purchases, stock]);

  // daily/monthly time series
  const series = useMemo(() => {
    if (period === "12m") {
      const months = monthsBetween(from, to);
      const sMap = Object.fromEntries(months.map((m) => [m, 0]));
      const pMap = Object.fromEntries(months.map((m) => [m, 0]));
      sales.forEach((r) => { const k = ym(r.date || r.createdAt); if (k in sMap) sMap[k] += Number(r.grandTotal || 0); });
      purchases.forEach((r) => { const k = ym(r.date || r.createdAt); if (k in pMap) pMap[k] += Number(r.grandTotal || 0); });
      return months.map((m) => ({ x: m, sales: sMap[m], purchases: pMap[m] }));
    }
    const days = rangeDays(period === "7d" ? 7 : 30);
    const sMap = Object.fromEntries(days.map((d) => [d, 0]));
    const pMap = Object.fromEntries(days.map((d) => [d, 0]));
    sales.forEach((r) => { const k = (r.date || r.createdAt || "").slice(0, 10); if (k in sMap) sMap[k] += Number(r.grandTotal || 0); });
    purchases.forEach((r) => { const k = (r.date || r.createdAt || "").slice(0, 10); if (k in pMap) pMap[k] += Number(r.grandTotal || 0); });
    return days.map((d) => ({
      x: new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      sales: sMap[d],
      purchases: pMap[d],
    }));
  }, [sales, purchases, period, from, to]);

  const paidDue = useMemo(() => {
    const paid = sales.reduce((s, r) => s + Number(r.paid || 0), 0);
    const due = sales.reduce(
      (s, r) => s + Number(r.due ?? (Number(r.grandTotal || 0) - Number(r.paid || 0))),
      0
    );
    return [{ name: "Paid", value: paid }, { name: "Due", value: due }];
  }, [sales]);

  const topCustomers = useMemo(() => {
    const map = {};
    sales.forEach((r) => {
      const name = r.customer?.name || "Unknown";
      map[name] = (map[name] || 0) + Number(r.grandTotal || 0);
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [sales]);

  const activity = useMemo(() => {
    const s = sales.map((r) => ({
      id: r._id, type: "sale", title: r.invoiceNo || "Sale",
      party: r.customer?.name || "", amount: Number(r.grandTotal || 0),
      at: new Date(r.date || r.createdAt || Date.now())
    }));
    const p = purchases.map((r) => ({
      id: r._id, type: "purchase", title: r.invoiceNo || "Purchase",
      party: r.supplier?.name || "", amount: Number(r.grandTotal || 0),
      at: new Date(r.date || r.createdAt || Date.now())
    }));
    return [...s, ...p].sort((a, b) => b.at - a.at).slice(0, 8);
  }, [sales, purchases]);

  const topStock = useMemo(
    () => [...stock].sort((a, b) => b.totalValue - a.totalValue).slice(0, 6),
    [stock]
  );

  /* ---------- NEW INSIGHTS ---------- */

  // Top Products by Sales
  const topProducts = useMemo(() => {
    const map = {};
    sales.forEach((r) => {
      (r.items || []).forEach((it) => {
        const name = it.product?.name || "Unknown";
        map[name] = (map[name] || 0) + (Number(it.quantity || 0) * Number(it.price || 0));
      });
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [sales]);

  // Sales by Category
  const salesByCategory = useMemo(() => {
    const map = {};
    sales.forEach((r) => {
      (r.items || []).forEach((it) => {
        const cat = it.product?.category || "Uncategorized";
        map[cat] = (map[cat] || 0) + (Number(it.quantity || 0) * Number(it.price || 0));
      });
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [sales]);

  // Best Suppliers by Purchase Amount
  const topSuppliers = useMemo(() => {
    const map = {};
    purchases.forEach((r) => {
      const name = r.supplier?.name || "Unknown";
      map[name] = (map[name] || 0) + Number(r.grandTotal || 0);
    });
    return Object.entries(map)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [purchases]);

  /* --------- ui --------- */
  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 pb-10">
      {/* header */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-6 text-white shadow">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1">
              <div className="text-sm/5 text-white/70">Overview</div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <div className="text-sm/5 text-white/80 mt-1 inline-flex items-center gap-2">
                <Calendar size={14} className="opacity-80" />
                <span>{from} → {to}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SegButton active={period === "7d"} onClick={() => setPeriod("7d")}>7d</SegButton>
              <SegButton active={period === "30d"} onClick={() => setPeriod("30d")}>30d</SegButton>
              <SegButton active={period === "12m"} onClick={() => setPeriod("12m")}>12m</SegButton>
              <button
                onClick={load}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-2 text-sm font-medium hover:bg-white/15 active:scale-[.98] border border-white/20"
              >
                <RefreshCcw size={16} /> Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {err && <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-700">{err}</div>}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <Stat label="Sales" value={money(kpis.salesTotal)} icon={TrendingUp} />
        <Stat label="Purchases" value={money(kpis.purchaseTotal)} icon={TrendingDown} />
        <Stat label="Stock Value" value={money(kpis.stockValue)} icon={Package} sub="FIFO snapshot" />
        <Stat label="Paid" value={money(kpis.salesPaid)} icon={DollarSign} sub="Sales collected" />
        <Stat label="Gross" value={money(kpis.gross)} icon={DollarSign} sub="Sales − Purchases" />
        <Stat label="Network" value={`${customersCount} / ${suppliersCount}`} icon={Users2} sub="Customers / Suppliers" />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 text-sm text-gray-600">Sales vs Purchases</div>
          <div className="h-72">
            <ResponsiveContainer>
              <AreaChart data={series}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" />
                <YAxis />
                <Tooltip formatter={(v) => money(v)} />
                <Area type="monotone" dataKey="sales" stroke="#2563eb" fill="#93c5fd" />
                <Area type="monotone" dataKey="purchases" stroke="#16a34a" fill="#86efac" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 text-sm text-gray-600">Paid vs Due</div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={paidDue} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {paidDue.map((_, i) => <Cell key={i} fill={i === 0 ? "#22c55e" : "#ef4444"} />)}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 text-sm text-gray-600">Top Customers</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topCustomers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="total" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* NEW: Sales by Category */}
        <Card className="p-5">
          <div className="mb-3 text-sm text-gray-600 inline-flex items-center gap-2">
            <Tag size={14} /> Sales by Category
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={salesByCategory} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {salesByCategory.map((_, i) => (
                    <Cell key={i} fill={["#6366f1","#06b6d4","#22c55e","#f59e0b","#ef4444","#8b5cf6","#14b8a6","#84cc16"][i % 8]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={(v) => money(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row 3 (NEW sections) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 mb-6">
        {/* NEW: Top Products */}
        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 text-sm text-gray-600">Top Products by Sales</div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="total" name="Sales" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* NEW: Top Suppliers */}
        <Card className="p-5">
          <div className="mb-3 text-sm text-gray-600 inline-flex items-center gap-2">
            <Factory size={14} /> Top Suppliers
          </div>
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topSuppliers}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" interval={0} angle={-15} textAnchor="end" height={60} />
                <YAxis />
                <Tooltip formatter={(v) => money(v)} />
                <Bar dataKey="total" name="Purchases" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* recent activity + inventory snapshot */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <Card className="p-5 xl:col-span-2">
          <div className="mb-3 text-sm text-gray-600">Recent Activity</div>
          <div className="divide-y">
            {activity.map((a) => (
              <div key={`${a.type}-${a.id}`} className="py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-gray-500">
                    {a.type === "sale" ? "Sale" : "Purchase"} • {a.party || "—"} • {a.at.toLocaleString()}
                  </div>
                </div>
                <div className={`text-sm font-semibold tabular-nums ${a.type === "sale" ? "text-emerald-600" : "text-blue-600"}`}>
                  {money(a.amount)}
                </div>
              </div>
            ))}
            {activity.length === 0 && <div className="py-8 text-center text-gray-500 text-sm">No activity in this period.</div>}
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-3 text-sm text-gray-600">Inventory Snapshot (Top by Value)</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="px-3 py-2 text-left">Product</th>
                  <th className="px-3 py-2 text-left">Unit</th>
                  <th className="px-3 py-2 text-right">Avg Cost</th>
                  <th className="px-3 py-2 text-right">Stock</th>
                  <th className="px-3 py-2 text-right">Total Value</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topStock.map((r) => (
                  <tr key={r.productId}>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.unit || "-"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{money(r.avgCost)}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.stock ?? 0}</td>
                    <td className="px-3 py-2 text-right tabular-nums font-medium">{money(r.totalValue)}</td>
                  </tr>
                ))}
                {topStock.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-gray-500 text-sm">No inventory data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* loading overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-50">
          <div className="animate-spin h-6 w-6 rounded-full border-2 border-gray-300 border-t-transparent" />
          <span className="ml-3 text-sm text-gray-700">Loading dashboard…</span>
        </div>
      )}
    </div>
  );
}
