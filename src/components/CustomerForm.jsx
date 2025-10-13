import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "./api";

function Button({ children, onClick, type="button", variant="primary", disabled }) {
  const base = "px-4 py-2 rounded-xl text-sm font-medium transition active:scale-[.98] disabled:opacity-50";
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    soft: "bg-gray-100 hover:bg-gray-200 text-gray-800",
  };
  return <button type={type} className={`${base} ${styles[variant] || styles.primary}`} onClick={onClick} disabled={disabled}>{children}</button>;
}

export default function CustomerForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ name: "", phone: "", address: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      try {
        const { data } = await api.get(`/api/customers/${id}`);
        setForm({ name: data.name || "", phone: data.phone || "", address: data.address || "" });
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load customer");
      }
    })();
  }, [id, isEdit]);

  const onChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setErr("");
    try {
      if (isEdit) {
        await api.put(`/api/customers/${id}`, form);
      } else {
        await api.post(`/api/customers`, form);
      }
      navigate("/customers"); // redirect back to list
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-6 bg-white rounded-2xl shadow border">
      <h1 className="text-2xl font-bold mb-4">{isEdit ? "Edit Customer" : "Add Customer"}</h1>
      {err && <div className="p-3 mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{err}</div>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block mb-1 font-medium">Name</label>
          <input name="name" value={form.name} onChange={onChange} required className="w-full border rounded-xl px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Phone</label>
          <input name="phone" value={form.phone} onChange={onChange} className="w-full border rounded-xl px-3 py-2" />
        </div>
        <div>
          <label className="block mb-1 font-medium">Address</label>
          <input name="address" value={form.address} onChange={onChange} className="w-full border rounded-xl px-3 py-2" />
        </div>

        <div className="flex gap-2">
          <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save"}</Button>
          <Button variant="soft" onClick={() => navigate("/customers")}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
