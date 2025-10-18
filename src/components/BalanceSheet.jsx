import { useEffect, useState } from "react";
import api from "../components/api";

const CURR = new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT" });

function Card({ title, children, className = "" }) {
  return (
    <div className={`rounded-2xl bg-white border border-gray-100 shadow-sm p-4 ${className}`}>
      {title && <div className="text-sm text-gray-500 mb-2">{title}</div>}
      {children}
    </div>
  );
}

export default function BalanceSheet() {
  const todayISO = new Date().toISOString().slice(0, 10);
  const monthStartISO = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    .toISOString()
    .slice(0, 10);

  const [asOf, setAsOf] = useState(todayISO);
  const [from, setFrom] = useState(monthStartISO);
  const [to, setTo] = useState(todayISO);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchData = async (params) => {
    const q = new URLSearchParams({
      asOf: params?.asOf ?? asOf,
      from: params?.from ?? from,
      to: params?.to ?? to,
    });
    setLoading(true);
    setErr("");
    try {
      const res = await api.get(`/api/reports/balance-sheet?${q.toString()}`);
      setData(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load balance sheet");
    } finally {
      setLoading(false);
    }
  };

  // initial load
  useEffect(() => { fetchData(); }, []); // eslint-disable-line

  // auto refresh when date inputs change
  useEffect(() => { fetchData({ asOf, from, to }); }, [asOf, from, to]); // eslint-disable-line

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10">
      {/* Header / Filters */}
      <div className="bg-gradient-to-r from-slate-700 to-gray-900 rounded-2xl p-4 sm:p-6 text-white shadow mb-6">
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1">
            <div className="text-sm/5 text-white/80">Reports</div>
            <h1 className="text-3xl font-bold tracking-tight">Balance Sheet</h1>
            {loading && <div className="text-white/80 mt-1">Loading...</div>}
          </div>

          {/* Filters: stack on mobile */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 w-full lg:w-auto">
            <label className="flex items-center justify-between gap-2 bg-white/10 rounded-xl px-3 h-[42px]">
              <span className="text-xs">As of</span>
              <input
                type="date"
                className="bg-white text-gray-900 rounded-lg px-2 py-1 h-[30px]"
                value={asOf}
                onChange={(e) => setAsOf(e.target.value)}
              />
            </label>
            <label className="flex items-center justify-between gap-2 bg-white/10 rounded-xl px-3 h-[42px]">
              <span className="text-xs">From</span>
              <input
                type="date"
                className="bg-white text-gray-900 rounded-lg px-2 py-1 h-[30px]"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label className="flex items-center justify-between gap-2 bg-white/10 rounded-xl px-3 h-[42px]">
              <span className="text-xs">To</span>
              <input
                type="date"
                className="bg-white text-gray-900 rounded-lg px-2 py-1 h-[30px]"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <button
              className="px-3.5 py-2 rounded-xl bg-indigo-500 hover:bg-indigo-600"
              onClick={() => fetchData()}
              disabled={loading}
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      {err && (
        <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
          {err}
        </div>
      )}

      {!data ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Top KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <Card title="Total Assets">
              <div className="text-2xl font-semibold">{CURR.format(data.assets.total)}</div>
            </Card>
            <Card title="Total Liabilities">
              <div className="text-2xl font-semibold">{CURR.format(data.liabilities.total)}</div>
            </Card>
            <Card title="Equity">
              <div className="text-2xl font-semibold">{CURR.format(data.equity.total)}</div>
            </Card>
            <Card title="As Of">
              <div className="text-2xl font-semibold">
                {new Date(data.asOf).toLocaleDateString()}
              </div>
            </Card>
          </div>

          {/* Assets & Liabilities – stack on mobile, side-by-side on md+ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card title="Assets" className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2">Cash</td>
                    <td className="py-2 text-right">{CURR.format(data.assets.cash)}</td>
                  </tr>
                  <tr>
                    <td className="py-2">Accounts Receivable</td>
                    <td className="py-2 text-right">
                      {CURR.format(data.assets.accountsReceivable)}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2">Inventory</td>
                    <td className="py-2 text-right">{CURR.format(data.assets.inventory)}</td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="py-2">Total Assets</td>
                    <td className="py-2 text-right">{CURR.format(data.assets.total)}</td>
                  </tr>
                </tbody>
              </table>
            </Card>

            <Card title="Liabilities" className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <tbody className="divide-y">
                  <tr>
                    <td className="py-2">Accounts Payable</td>
                    <td className="py-2 text-right">
                      {CURR.format(data.liabilities.accountsPayable)}
                    </td>
                  </tr>
                  <tr className="font-semibold">
                    <td className="py-2">Total Liabilities</td>
                    <td className="py-2 text-right">
                      {CURR.format(data.liabilities.total)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </Card>
          </div>

          {/* Period P&L snapshot */}
          <Card className="overflow-x-auto">
            <div className="text-sm text-gray-500 mb-2">
              Profit &amp; Loss{" "}
              ({new Date(data.period.from).toLocaleDateString()} →{" "}
              {new Date(data.period.to).toLocaleDateString()})
            </div>
            <table className="min-w-full text-sm">
              <tbody className="divide-y">
                <tr>
                  <td className="py-2">Revenue</td>
                  <td className="py-2 text-right">{CURR.format(data.pnl.revenue)}</td>
                </tr>
                <tr>
                  <td className="py-2">COGS</td>
                  <td className="py-2 text-right">{CURR.format(data.pnl.cogs)}</td>
                </tr>
                <tr className="font-medium">
                  <td className="py-2">Gross Profit</td>
                  <td className="py-2 text-right">
                    {CURR.format(data.pnl.grossProfit)}
                  </td>
                </tr>
                <tr>
                  <td className="py-2">Other Expenses</td>
                  <td className="py-2 text-right">
                    {CURR.format(data.pnl.otherExpenses)}
                  </td>
                </tr>
                <tr className="font-semibold">
                  <td className="py-2">Net Profit</td>
                  <td className="py-2 text-right">{CURR.format(data.pnl.netProfit)}</td>
                </tr>
              </tbody>
            </table>
          </Card>
        </>
      )}
    </div>
  );
}
