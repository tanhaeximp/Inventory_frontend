// src/pages/ProfitAndLossPage.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../components/api";
import {
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Button({ children, className = "", variant = "primary", ...rest }) {
  const base =
    "px-3.5 py-2 rounded-xl text-sm font-medium transition active:scale-[.98] disabled:opacity-50";
  const map = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    soft: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    ghost: "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50",
  };
  return (
    <button className={`${base} ${map[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

const CURR = new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT" });

export default function ProfitAndLoss() {
  const [gran, setGran] = useState("month"); // day|month|year
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchData = async () => {
    setLoading(true);
    setErr("");
    try {
      const qs = new URLSearchParams();
      if (gran) qs.set("granularity", gran);
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);
      const { data } = await api.get(`/api/reports/pnl${qs.toString() ? `?${qs.toString()}` : ""}`);
      setRows(Array.isArray(data?.rows) ? data.rows : []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load P&L");
    } finally {
      setLoading(false);
    }
  };

  // auto-refetch when filters change
  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gran, from, to]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (a, r) => ({
          revenue: a.revenue + Number(r.revenue || 0),
          cogs: a.cogs + Number(r.cogs || 0),
          profit: a.profit + Number(r.grossProfit || 0),
        }),
        { revenue: 0, cogs: 0, profit: 0 }
      ),
    [rows]
  );

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10">
      {/* Header */}
      <div className="mb-5">
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-2xl p-4 sm:p-6 text-white shadow-md">
          <div className="flex min-w-0 flex-col md:flex-row md:items-end gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="text-sm/5 text-white/80">Reports</div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Profit &amp; Loss</h1>
            </div>

            {/* Controls: stack on mobile */}
            <div className="w-full md:w-auto flex flex-col sm:flex-row gap-2">
              <select
                className="w-full sm:w-auto rounded-xl px-3 py-2 text-gray-900"
                value={gran}
                onChange={(e) => setGran(e.target.value)}
              >
                <option value="day">Daily</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
              <Button variant="soft" onClick={fetchData} disabled={loading} className="w-full sm:w-auto">
                {loading ? "Loading..." : "Refresh"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="min-w-0">
            <label className="text-xs text-gray-500 block mb-1">From</label>
            <input
              type="date"
              className="w-full border rounded-xl px-3 py-2"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>
          <div className="min-w-0">
            <label className="text-xs text-gray-500 block mb-1">To</label>
            <input
              type="date"
              className="w-full border rounded-xl px-3 py-2"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>
          {/* spacer on larger screens */}
          <div className="lg:col-span-2 hidden lg:block" />
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button variant="primary" onClick={fetchData} disabled={loading} className="w-full sm:w-auto">
              {loading ? "Loading..." : "Apply"}
            </Button>
            <Button
              variant="soft"
              className="w-full sm:w-auto"
              onClick={() => {
                setFrom("");
                setTo("");
                setGran("month");
              }}
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
        <Card className="p-4 sm:p-5">
          <div className="text-xs text-gray-500">Revenue</div>
          <div className="text-2xl font-semibold tabular-nums">{CURR.format(totals.revenue)}</div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="text-xs text-gray-500">COGS</div>
          <div className="text-2xl font-semibold tabular-nums">{CURR.format(totals.cogs)}</div>
        </Card>
        <Card className="p-4 sm:p-5">
          <div className="text-xs text-gray-500">Profit</div>
          <div className="text-2xl font-semibold tabular-nums">{CURR.format(totals.profit)}</div>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-3 sm:p-4 mb-4">
        {/* min-w-0 ensures ResponsiveContainer can compute width in flex contexts */}
        <div className="min-w-0 h-[260px] sm:h-72 md:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows}>
              <defs>
                <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="currentColor" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="currentColor" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis />
              <Tooltip formatter={(v) => CURR.format(Number(v || 0))} />
              <Area type="monotone" dataKey="grossProfit" stroke="currentColor" fill="url(#gp)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Table (md+), Cards (mobile) */}
      <Card className="overflow-x-auto hidden md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              <th className="px-3 py-2">Period</th>
              <th className="px-3 py-2 text-right">Revenue</th>
              <th className="px-3 py-2 text-right">COGS</th>
              <th className="px-3 py-2 text-right">Profit</th>
              <th className="px-3 py-2 text-right">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r.period}>
                <td className="px-3 py-2">{r.period}</td>
                <td className="px-3 py-2 text-right tabular-nums">{CURR.format(r.revenue || 0)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{CURR.format(r.cogs || 0)}</td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {CURR.format(r.grossProfit || 0)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {Number(r.margin || 0).toFixed(1)}%
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-10 text-center text-gray-500">
                  No results
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      {/* Mobile list */}
      <div className="space-y-2 md:hidden">
        {rows.length === 0 && !loading && (
          <Card className="p-4 text-center text-gray-500">No results</Card>
        )}
        {rows.map((r) => (
          <Card key={r.period} className="p-3">
            <div className="flex justify-between items-center">
              <div className="font-medium">{r.period}</div>
              <div className="text-xs text-gray-500">
                {Number(r.margin || 0).toFixed(1)}%
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <div>
                <div className="text-xs text-gray-500">Revenue</div>
                <div className="tabular-nums font-semibold">{CURR.format(r.revenue || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">COGS</div>
                <div className="tabular-nums font-semibold">{CURR.format(r.cogs || 0)}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Profit</div>
                <div className="tabular-nums font-semibold">{CURR.format(r.grossProfit || 0)}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {err && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
          {err}
        </div>
      )}
    </div>
  );
}
