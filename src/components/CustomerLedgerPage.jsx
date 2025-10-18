// src/pages/CustomerLedgerPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Select from "react-select";
import api from "./api";
import ResponsiveTableCards from "../components/ResponsiveTableCards";

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl shadow-lg bg-white border border-gray-100 ${className}`}>{children}</div>;
}

const selectPortalProps = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : null,
  menuPosition: "fixed",
  styles: { menuPortal: (base) => ({ ...base, zIndex: 9999 }) },
  menuShouldScrollIntoView: false,
};

export default function CustomerLedgerPage() {
  const { t } = useTranslation();
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  // ── Controls ──────────────────────────────────────────────────────────────
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState(routeId || "");
  const [fromDate, setFromDate] = useState(""); // "YYYY-MM-DD"
  const [toDate, setToDate] = useState("");

  // ── Data ─────────────────────────────────────────────────────────────────
  const [customer, setCustomer] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ── Initial customers list ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/customers");
        setCustomers(res.data.map((c) => ({ value: c._id, label: c.name })));
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // Keep local state in sync with route param (if you navigate directly)
  useEffect(() => {
    if (routeId && routeId !== customerId) setCustomerId(routeId);
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Loader (auto-runs on change) ──────────────────────────────────────────
  const loadLedger = async (id, from, to) => {
    if (!id) { setCustomer(null); setEntries([]); return; }
    setLoading(true); setErr("");
    try {
      const qs = new URLSearchParams();
      if (from) qs.set("from", from);
      if (to) qs.set("to", to);

      const [c, l] = await Promise.all([
        api.get(`/api/customers/${id}`),
        api.get(`/api/ledger/customer/${id}${qs.toString() ? `?${qs.toString()}` : ""}`),
      ]);
      setCustomer(c.data);
      setEntries(l.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };

  // 🔁 AUTO-FETCH whenever customerId / fromDate / toDate changes
  useEffect(() => {
    // Optional: reflect selection in URL so refresh/deeplink works
    if (customerId && routeId !== customerId) navigate(`/ledger/customers/${customerId}`, { replace: true });
    loadLedger(customerId, fromDate, toDate);
  }, [customerId, fromDate, toDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── UI helpers ────────────────────────────────────────────────────────────
  const columns = [
    { header: t("date") || "Date" },
    { header: t("type") || "Type" },             // if your API returns type; else remove this column
    { header: t("description") || "Description" },
    { header: t("debit") || "Debit", className: "text-right" },
    { header: t("credit") || "Credit", className: "text-right" },
    { header: t("balance") || "Balance", className: "text-right" },
  ];
  const items = useMemo(() => entries, [entries]);

  const fmt = (n) => Number(n || 0).toFixed(2);

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10">
      {/* Header / Filters */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white p-6 shadow">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <div className="flex-1">
              <div className="text-sm/5 text-white/80">{t("customerLedger") || "Customer Ledger"}</div>
              <h1 className="text-3xl font-bold tracking-tight">
                {customer?.name || t("selectCustomer") || "Select Customer"}
              </h1>
            </div>

            {/* Customer select */}
            <div className="min-w-[260px]">
              <Select
                {...selectPortalProps}
                options={customers}
                value={customerId ? customers.find((c) => c.value === customerId) || null : null}
                onChange={(opt) => setCustomerId(opt?.value || "")}   // 👈 auto loads via useEffect
                placeholder={t("selectCustomer") || "Select customer"}
                isSearchable
              />
            </div>

            {/* Dates (auto-trigger on change) */}
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-[42px] rounded-xl px-3 text-gray-900 bg-white/95"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-[42px] rounded-xl px-3 text-gray-900 bg-white/95"
            />

            {/* (Optional) keep other buttons like Export/Print if you have them */}
            {/* <button className="h-[42px] px-4 rounded-xl bg-white/10 hover:bg-white/20">Export CSV</button> */}
            {/* <button className="h-[42px] px-4 rounded-xl bg-white/10 hover:bg-white/20">Print</button> */}
          </div>

          {loading && <div className="mt-2 text-white/80">{t("loading") || "Loading..."}</div>}
        </div>
      </div>

      {/* Body */}
      <Card className="p-5 space-y-4">
        {err && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{err}</div>}

        {/* Optional summary cards like Opening / Closing / Transactions */}
        {customer && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border p-4 bg-gray-50">
              <div className="text-xs text-gray-500">{t("openingReceivable") || "OPENING RECEIVABLE"}</div>
              <div className="text-lg font-semibold">BDT {fmt(customer.openingReceivable || 0)}</div>
            </div>
            <div className="rounded-xl border p-4 bg-gray-50">
              <div className="text-xs text-gray-500">{t("transactions") || "TRANSACTIONS"}</div>
              <div className="text-lg font-semibold">{items.length}</div>
            </div>
            <div className="rounded-xl border p-4 bg-gray-50">
              <div className="text-xs text-gray-500">{t("closingReceivable") || "CLOSING RECEIVABLE"}</div>
              <div className="text-lg font-semibold">BDT {fmt(customer.closingReceivable || 0)}</div>
            </div>
          </div>
        )}

        <ResponsiveTableCards
          items={items}
          columns={columns}
          minTableWidth={900}
          renderRow={(e, idx) => (
            <tr key={e._id || idx}>
              <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
              <td className="px-3 py-2">{e.type || "-"}</td>
              <td className="px-3 py-2">{e.note || e.ref || "-"}</td>
              <td className="px-3 py-2 text-right">{fmt(e.debit)}</td>
              <td className="px-3 py-2 text-right">{fmt(e.credit)}</td>
              <td className="px-3 py-2 text-right">{fmt(e.balance)}</td>
            </tr>
          )}
          renderCard={(e, idx) => (
            <div key={e._id || idx} className="rounded-xl border p-3 bg-white space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{new Date(e.date).toLocaleDateString()}</div>
                <div className="text-sm text-gray-500">{e.type || "-"}</div>
              </div>
              <div className="text-sm text-gray-600">{e.note || e.ref || "-"}</div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div><div className="text-xs text-gray-500">{t("debit")}</div><div className="font-semibold tabular-nums">{fmt(e.debit)}</div></div>
                <div><div className="text-xs text-gray-500">{t("credit")}</div><div className="font-semibold tabular-nums">{fmt(e.credit)}</div></div>
                <div><div className="text-xs text-gray-500">{t("balance")}</div><div className="font-semibold tabular-nums">{fmt(e.balance)}</div></div>
              </div>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
