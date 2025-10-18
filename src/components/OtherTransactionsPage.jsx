// src/pages/OtherTransactionsPage.jsx
import { useState, useEffect } from "react";
import Select from "react-select";
import api from "./api";

const currency = (n) =>
  Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "BDT" });

// MUST match backend: "revenue" | "expense"
const typeOptions = [
  { value: "revenue", label: "Revenue" },
  { value: "expense", label: "Expense" },
];

const categoryPresets = {
  revenue: ["Commission", "Interest", "Misc Revenue"],
  expense: ["Rent", "Utilities", "Office Supplies", "Misc Expense"],
};

const selectPortalProps = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : null,
  menuPosition: "fixed",
  styles: { menuPortal: (base) => ({ ...base, zIndex: 9999 }) },
  menuShouldScrollIntoView: false,
};

export default function OtherTransactionsPage() {
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true); setErr("");
    try {
      const res = await api.get("/api/other-transactions");
      setRows(res.data || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/api/other-transactions", {
        type, category, amount: Number(amount), note, date, description,
      });
      setCategory(""); setAmount(""); setDescription(""); setNote("");
      setDate(new Date().toISOString().slice(0, 10));
      await load();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to add transaction");
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10">
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 sm:p-6 shadow">
          <div className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <div className="text-white/80 text-sm">Finance</div>
              <h1 className="text-3xl font-bold tracking-tight">Other Income &amp; Expenses</h1>
              {loading && <div className="text-white/80 mt-1">Loading...</div>}
            </div>
          </div>
        </div>
      </div>

      {err && <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{err}</div>}

      {/* Form */}
      <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-4 mb-6">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div className="md:col-span-1">
            <label className="text-sm text-gray-600">Type</label>
            <Select
              {...selectPortalProps}
              options={typeOptions}
              value={typeOptions.find((t) => t.value === type)}
              onChange={(opt) => {
                setType(opt.value);
                setCategory("");
              }}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-sm text-gray-600">Category</label>
            <Select
              {...selectPortalProps}
              options={(categoryPresets[type] || []).map((c) => ({ value: c, label: c }))}
              value={category ? { value: category, label: category } : null}
              onChange={(opt) => setCategory(opt?.value || "")}
              placeholder="Select category"
              isClearable
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm text-gray-600">Amount</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border px-3 py-2 rounded-xl"
              min={0}
              step="0.01"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm text-gray-600">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border px-3 py-2 rounded-xl"
            />
          </div>

          <div className="md:col-span-1">
            <label className="text-sm text-gray-600">Note</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border px-3 py-2 rounded-xl"
              placeholder="optional"
            />
          </div>

          <div className="md:col-span-6">
            <label className="text-sm text-gray-600">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border px-3 py-2 rounded-xl"
              placeholder="Optional details..."
            />
          </div>

          <div className="md:col-span-6 flex justify-end">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl">
              Add Transaction
            </button>
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white shadow rounded-2xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="p-3">Date</th>
              <th className="p-3">Type</th>
              <th className="p-3">Category</th>
              <th className="p-3">Description</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((r) => (
              <tr key={r._id}>
                <td className="p-3">{new Date(r.date).toLocaleDateString()}</td>
                <td className="p-3 capitalize">{r.type}</td>
                <td className="p-3">{r.category}</td>
                <td className="p-3">{r.description || r.note || "-"}</td>
                <td className="p-3 text-right tabular-nums">{currency(r.amount)}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No transactions
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
