// src/pages/OtherTransactionsPage.jsx
import { useState, useEffect } from "react";
import Select from "react-select";
import api from "./api";

const typeOptions = [
  { value: "income", label: "Income" },
  { value: "expense", label: "Expense" },
];

const categoryPresets = {
  income: ["Commission", "Interest", "Misc Revenue"],
  expense: ["Rent", "Utilities", "Office Supplies", "Misc Expense"],
};

export default function OtherTransactionsPage() {
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [note, setNote] = useState("");
  const [rows, setRows] = useState([]);
  const [err, setErr] = useState("");

  const load = async () => {
    try {
      const res = await api.get("/api/other-transactions");
      setRows(res.data);
    } catch (e) {
      setErr("Failed to load transactions");
    }
  };

  useEffect(() => { load(); }, []);

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await api.post("/api/other-transactions", {
        type, category, amount: Number(amount), description, date, note,
      });
      await load();
      setCategory(""); setAmount(""); setDescription(""); setDate(""); setNote("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to add transaction");
    }
  };

  return (
    <div className="max-w-screen-lg mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Other Income & Expenses</h1>

      {err && <div className="bg-rose-100 text-rose-700 p-2 rounded mb-3">{err}</div>}

      <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-sm text-gray-600">Type</label>
          <Select
            options={typeOptions}
            value={typeOptions.find((t) => t.value === type)}
            onChange={(opt) => { setType(opt.value); setCategory(""); }}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">Category</label>
          <Select
            options={categoryPresets[type].map((c) => ({ value: c, label: c }))}
            value={category ? { value: category, label: category } : null}
            onChange={(opt) => setCategory(opt.value)}
            placeholder="Select category"
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">Amount</label>
          <input
            type="number" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            min={0}
          />
        </div>
        <div>
          <label className="text-sm text-gray-600">Date</label>
          <input
            type="date" value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border px-3 py-2 rounded"
          />
        </div>
        <div className="md:col-span-2">
          <label className="text-sm text-gray-600">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border px-3 py-2 rounded"
            placeholder="Optional details..."
          />
        </div>
        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="bg-blue-600 text-white px-5 py-2 rounded-lg">
            Add Transaction
          </button>
        </div>
      </form>

      <div className="bg-white shadow rounded-xl overflow-x-auto">
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
                <td className="p-3">{r.description || "-"}</td>
                <td className="p-3 text-right">{r.amount.toFixed(2)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="p-4 text-center text-gray-500">No transactions</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
