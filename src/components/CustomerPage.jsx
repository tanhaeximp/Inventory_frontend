// src/components/CustomerPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import api from "./api";
import ResponsiveTableCards from "../components/ResponsiveTableCards";

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl shadow-lg bg-white border border-gray-100 ${className}`}>{children}</div>;
}
function Button({ children, onClick, type = "button", variant = "primary", disabled }) {
  const base = "px-4 py-2 rounded-xl text-sm font-medium transition active:scale-[.98] disabled:opacity-50";
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    soft: "bg-gray-100 hover:bg-gray-200 text-gray-800",
    danger: "bg-rose-600 hover:bg-rose-700 text-white",
  };
  return <button type={type} className={`${base} ${styles[variant] || styles.primary}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export default function Customers() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const fetchCustomers = async () => {
    setLoading(true); setErr("");
    try {
      const res = await api.get("/api/customers");
      setCustomers(res.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load customers");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchCustomers(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter(c =>
      String(c.name || "").toLowerCase().includes(term) ||
      String(c.phone || "").toLowerCase().includes(term) ||
      String(c.address || "").toLowerCase().includes(term)
    );
  }, [q, customers]);

  const onAdd = () => navigate("/customers/new");
  const onEdit = (c) => navigate(`/customers/${c._id}`);
  const onDelete = async (c) => {
    if (!window.confirm(`${t("delete") || "Delete"} "${c.name}"?`)) return;
    try { await api.delete(`/api/customers/${c._id}`); fetchCustomers(); }
    catch (e) { alert(e?.response?.data?.message || "Failed to delete"); }
  };

  const columns = [
    { header: t("name") || "Name" },
    { header: t("phone") || "Phone" },
    { header: t("address") || "Address" },
    { header: t("balance") || "Balance", className: "text-right" },
    { header: "" },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10">
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white p-6 shadow">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <div className="text-sm/5 text-white/80">{t("customers") || "customers"}</div>
              <h1 className="text-3xl font-bold tracking-tight">{t("customersList") || "customersList"}</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="soft" onClick={fetchCustomers} disabled={loading}>
                {loading ? (t("loading") || "loading") : (t("refresh") || "refresh")}
              </Button>
              <Button onClick={onAdd}>+ {t("add") || "add"}</Button>
            </div>
          </div>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        {err && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{err}</div>}

        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder={t("searchCustomers") || "searchCustomers"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />

        <ResponsiveTableCards
          items={filtered}
          columns={columns}
          minTableWidth={900}
          renderRow={(c, idx) => (
            <tr key={c._id || idx}>
              <td className="px-3 py-2">{c.name}</td>
              <td className="px-3 py-2">{c.phone || ""}</td>
              <td className="px-3 py-2">{c.address || ""}</td>
              <td className="px-3 py-2 text-right">{Number(c.balance || 0).toFixed(2)}</td>
              <td className="px-3 py-2">
                <div className="flex justify-end gap-2">
                  <Button variant="soft" onClick={() => onEdit(c)}>{t("edit") || "edit"}</Button>
                  <Button variant="danger" onClick={() => onDelete(c)}>{t("delete") || "delete"}</Button>
                </div>
              </td>
            </tr>
          )}
          renderCard={(c, idx) => (
            <div key={c._id || idx} className="rounded-xl border p-3 bg-white space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{c.name}</div>
                <div className="text-sm text-gray-500">{c.phone || ""}</div>
              </div>
              <div className="text-sm text-gray-600">{c.address || ""}</div>
              <div className="flex items-center justify-between pt-1">
                <div className="text-xs text-gray-500">{t("balance") || "balance"}</div>
                <div className="font-semibold tabular-nums">{Number(c.balance || 0).toFixed(2)}</div>
              </div>
              <div className="pt-2 flex gap-2">
                <Button variant="soft" onClick={() => onEdit(c)}>{t("edit") || "edit"}</Button>
                <Button variant="danger" onClick={() => onDelete(c)}>{t("delete") || "delete"}</Button>
              </div>
            </div>
          )}
        />
      </Card>
    </div>
  );
}
