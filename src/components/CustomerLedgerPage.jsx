// src/pages/CustomerLedgerPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "./api";
import ResponsiveTableCards from "../components/ResponsiveTableCards";

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl shadow-lg bg-white border border-gray-100 ${className}`}>{children}</div>;
}

export default function CustomerLedgerPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const [entries, setEntries] = useState([]);
  const [customer, setCustomer] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchLedger = async () => {
    setLoading(true); setErr("");
    try {
      const [c, l] = await Promise.all([
        api.get(`/api/customers/${id}`),
        api.get(`/api/ledger/customer/${id}`),
      ]);
      setCustomer(c.data);
      setEntries(l.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load ledger");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchLedger(); }, [id]);

  const columns = [
    { header: t("date") || "Date" },
    { header: t("description") || "Description" },
    { header: t("debit") || "Debit", className: "text-right" },
    { header: t("credit") || "Credit", className: "text-right" },
    { header: t("balance") || "Balance", className: "text-right" },
  ];

  const items = useMemo(() => entries, [entries]);

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10">
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white p-6 shadow">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <div className="text-sm/5 text-white/80">{t("customerLedger") || "Customer Ledger"}</div>
              <h1 className="text-3xl font-bold tracking-tight">{customer?.name || ""}</h1>
            </div>
            <div className="text-white/80">{loading ? (t("loading") || "Loading...") : null}</div>
          </div>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        {err && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{err}</div>}

        <ResponsiveTableCards
          items={items}
          columns={columns}
          minTableWidth={850}
          renderRow={(e, idx) => (
            <tr key={e._id || idx}>
              <td className="px-3 py-2">{new Date(e.date).toLocaleDateString()}</td>
              <td className="px-3 py-2">{e.note || e.ref || "-"}</td>
              <td className="px-3 py-2 text-right">{Number(e.debit || 0).toFixed(2)}</td>
              <td className="px-3 py-2 text-right">{Number(e.credit || 0).toFixed(2)}</td>
              <td className="px-3 py-2 text-right">{Number(e.balance || 0).toFixed(2)}</td>
            </tr>
          )}
          renderCard={(e, idx) => (
            <div key={e._id || idx} className="rounded-xl border p-3 bg-white space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{new Date(e.date).toLocaleDateString()}</div>
                <div className="text-sm text-gray-500">{e.note || e.ref || "-"}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <div className="text-xs text-gray-500">{t("debit")}</div>
                  <div className="font-semibold tabular-nums">{Number(e.debit || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">{t("credit")}</div>
                  <div className="font-semibold tabular-nums">{Number(e.credit || 0).toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">{t("balance")}</div>
                  <div className="font-semibold tabular-nums">{Number(e.balance || 0).toFixed(2)}</div>
                </div>
              </div>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
