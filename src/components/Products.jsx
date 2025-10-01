// src/pages/ProductPage.jsx
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import ResponsiveTableCards from "../components/ResponsiveTableCards";

const API = "http://localhost:5000";

// Simple guard for MongoDB ObjectId (24 hex chars)
const isValidObjectId = (v) => /^[0-9a-fA-F]{24}$/.test(String(v || ""));

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}
function Button({ children, className = "", variant = "primary", ...rest }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-[.98] disabled:opacity-50";
  const map = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700",
    soft: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
  };
  return (
    <button className={`${base} ${map[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export default function ProductPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({ name: "", category: "", unit: "", price: "" });
  const [newCat, setNewCat] = useState("");

  // ui meta
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingCat, setAddingCat] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");

  const withAuth = (cfg = {}) => {
    const token = localStorage.getItem("token");
    return { ...cfg, headers: { ...(cfg.headers || {}), Authorization: token ? `Bearer ${token}` : "" } };
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const [p, c] = await Promise.all([
          axios.get(`${API}/api/products`, withAuth()),
          axios.get(`${API}/api/categories`, withAuth()),
        ]);
        setProducts(Array.isArray(p.data) ? p.data : []);
        setCategories(Array.isArray(c.data) ? c.data : []);
      } catch (e) {
        setErr(e?.response?.data?.message || e?.message || "Failed to load products/categories");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const categoryError = useMemo(() => {
    // allow empty (no category), but if provided it must be a 24-hex ObjectId
    if (!form.category) return "";
    return isValidObjectId(form.category) ? "" : "Please choose a valid category.";
  }, [form.category]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");

    // client-side validation
    if (!form.name.trim()) return setErr("Product name is required.");
    if (form.category && !isValidObjectId(form.category)) {
      return setErr("Invalid category. Please pick one from the dropdown.");
    }
    if (form.price !== "" && Number(form.price) < 0) {
      return setErr("Price cannot be negative.");
    }

    const payload = {
      name: form.name.trim(),
      unit: form.unit.trim(),
      price: Number(form.price || 0),
      category: form.category || null, // only ObjectId or null
    };

    setSaving(true);
    try {
      await axios.post(`${API}/api/products`, payload, withAuth());
      // refresh products only (categories stay the same)
      const { data } = await axios.get(`${API}/api/products`, withAuth());
      setProducts(Array.isArray(data) ? data : []);
      setForm({ name: "", category: "", unit: "", price: "" });
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to add product");
    } finally {
      setSaving(false);
    }
  };

  const addCategory = async () => {
    const name = newCat.trim();
    if (!name) return;
    setAddingCat(true);
    setErr("");
    try {
      // Create new category
      const created = await axios.post(`${API}/api/categories`, { name }, withAuth());
      // Re-fetch categories to have a clean list with ids
      const { data } = await axios.get(`${API}/api/categories`, withAuth());
      setCategories(Array.isArray(data) ? data : []);
      setNewCat("");

      // Auto-select the newly created category by its _id
      const createdId = created?.data?._id;
      if (isValidObjectId(createdId)) {
        setForm((f) => ({ ...f, category: createdId }));
      }
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to add category");
    } finally {
      setAddingCat(false);
    }
  };

  const handleDelete = async (id) => {
    setErr("");
    try {
      await axios.delete(`${API}/api/products/${id}`, withAuth());
      setProducts((ps) => ps.filter((p) => p._id !== id));
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || "Failed to delete product");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      const name = String(p.name || "").toLowerCase();
      const unit = String(p.unit || "").toLowerCase();
      const cats = String(p.category?.name || p.category || "").toLowerCase();
      return name.includes(q) || unit.includes(q) || cats.includes(q);
    });
  }, [search, products]);

  // Desktop table columns
  const columns = [
    { header: "Name" },
    { header: "Category" },
    { header: "Unit" },
    { header: "Price", className: "text-right" },
    { header: "Action", className: "w-28 text-center" },
  ];

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 p-5 text-white shadow">
          <div className="text-sm/5 text-white/80">Catalog</div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Products</h2>
        </div>
      </div>

      {/* Error */}
      {err && (
        <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
          {err}
        </div>
      )}

      {/* Add Product */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6 border rounded-2xl p-4 bg-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            placeholder="Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="border p-2 rounded-xl"
            required
          />
          <input
            type="text"
            placeholder="Unit (e.g. kg, pcs)"
            value={form.unit}
            onChange={(e) => setForm({ ...form, unit: e.target.value })}
            className="border p-2 rounded-xl"
          />
          <select
            className={`border p-2 rounded-xl ${categoryError ? "border-rose-400" : ""}`}
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">— Category —</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            step="0.01"
            placeholder="Default Price (optional)"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            className="border p-2 rounded-xl"
          />
        </div>

        {categoryError && <div className="text-xs text-rose-600">{categoryError}</div>}

        {/* Quick add category */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            placeholder="New category name"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="border p-2 rounded-xl flex-1"
          />
          <Button
            type="button"
            onClick={addCategory}
            disabled={addingCat || !newCat.trim()}
            variant="soft"
          >
            {addingCat ? "Adding…" : "+ Add Category"}
          </Button>
        </div>

        <Button
          className="w-full sm:w-auto"
          disabled={saving || (!!form.category && !isValidObjectId(form.category))}
        >
          {saving ? "Saving…" : "Add Product"}
        </Button>
      </form>

      {/* Filters */}
      <Card className="p-4 mb-4">
        <label className="text-xs text-gray-500 block mb-1">Search</label>
        <input
          className="w-full border rounded-xl px-3 py-2"
          placeholder="Search by name / unit / category"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Card>

      {/* Product List: cards on mobile, table on desktop */}
      <Card className="p-3">
        <ResponsiveTableCards
          items={loading ? [] : filtered}
          columns={columns}
          minTableWidth={800}
          renderRow={(p) => (
            <tr key={p._id}>
              <td className="px-3 py-2">{p.name}</td>
              <td className="px-3 py-2">{p.category?.name || ""}</td>
              <td className="px-3 py-2">{p.unit}</td>
              <td className="px-3 py-2 text-right">{Number(p.price || 0).toFixed(2)}</td>
              <td className="px-3 py-2">
                <div className="flex justify-center">
                  <Button
                    variant="danger"
                    onClick={() => handleDelete(p._id)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          )}
          renderCard={(p) => (
            <div key={p._id} className="rounded-xl border p-3 bg-white space-y-1">
              <div className="flex items-center justify-between">
                <div className="font-medium">{p.name}</div>
                <div className="text-sm text-gray-500">{p.category?.name || ""}</div>
              </div>
              <div className="text-sm text-gray-600">{p.unit}</div>
              <div className="flex items-center justify-between pt-1">
                <div className="text-sm text-gray-500">Price</div>
                <div className="font-semibold tabular-nums">{Number(p.price || 0).toFixed(2)}</div>
              </div>
              <div className="pt-2">
                <Button
                  variant="danger"
                  className="w-full"
                  onClick={() => handleDelete(p._id)}
                >
                  Delete
                </Button>
              </div>
            </div>
          )}
        />

        {/* States */}
        {loading && <div className="p-6 text-center text-gray-500">Loading…</div>}
        {!loading && filtered.length === 0 && (
          <div className="p-6 text-center text-gray-500">No products yet.</div>
        )}
      </Card>
    </div>
  );
}
