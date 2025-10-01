import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import api from "./api";

const currencyFmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl shadow-lg bg-white border border-gray-100 ${className}`}>{children}</div>;
}
function Button({ children, onClick, type = "button", variant = "primary", disabled }) {
  const base = "px-4 py-2 rounded-xl text-sm font-medium transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    ghost: "bg-white border border-gray-300 hover:border-gray-400 text-gray-700",
    soft: "bg-gray-100 hover:bg-gray-200 text-gray-800",
  };
  return (
    <button type={type} className={`${base} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
function ErrorBanner({ message }) {
  if (!message) return null;
  return <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{message}</div>;
}
function SuccessBanner({ message }) {
  if (!message) return null;
  return <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700">{message}</div>;
}

export default function SalePage() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);

  const [customerId, setCustomerId] = useState("");
  const [productId, setProductId] = useState("");
  const [unit, setUnit] = useState("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [paid, setPaid] = useState("");

  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedProduct = useMemo(() => products.find(p => p.value === productId), [products, productId]);
  const selectedCustomer = useMemo(() => customers.find(c => c.value === customerId), [customers, customerId]);

  const total = (Number(qty) || 0) * (Number(price) || 0);
  const due = Math.max(0, total - (Number(paid) || 0));
  const available = selectedProduct?.stock ?? null;

  useEffect(() => {
    (async () => {
      try {
        const [cusRes, prodRes] = await Promise.all([api.get("/api/customers"), api.get("/api/products")]);
        setCustomers(cusRes.data.map(c => ({ value: c._id, label: c.name })));
        setProducts(prodRes.data.map(p => ({
          value: p._id,
          label: `${p.name} (${p.unit})`,
          unit: p.unit,
          unitPrice: p.price,
          stock: p.stock,
        })));
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load customers/products");
      }
    })();
  }, []);

  const onSelectProduct = (opt) => {
    setProductId(opt?.value || "");
    setUnit(opt?.unit || "");
    if (opt?.unitPrice != null) setPrice(opt.unitPrice);
  };

  const validate = () => {
    if (!customerId) return t("supplier").replace("Supplier", "Customer") + " required.";
    if (!productId) return t("product") + " required.";
    if (!qty || Number(qty) <= 0) return t("quantity") + " > 0";
    if (price === "" || Number(price) < 0) return t("price") + " ≥ 0";
    if (Number(paid) < 0) return t("paid") + " ≥ 0";
    if (Number(paid) > total) return t("paid") + " cannot exceed " + t("total").toLowerCase();
    if (available != null && Number(qty) > available) return `Insufficient stock. Available: ${available}`;
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErr(""); setOk("");
    const v = validate();
    if (v) { setErr(v); return; }

    setLoading(true);
    try {
      await api.post("/api/sales", {
        customer: customerId,
        product: productId,
        unit,
        quantity: Number(qty),
        price: Number(price),
        paidAmount: Number(paid) || 0,
      });
      setOk("✅ Sale added successfully");
      setProductId(""); setUnit(""); setQty(""); setPrice(""); setPaid("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to add sale");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 pb-10">
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white p-6 shadow">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <div className="text-sm/5 text-white/80">New Sales</div>
              <h1 className="text-3xl font-bold tracking-tight">
                {selectedCustomer ? `${selectedCustomer.label}` : ""}
              </h1>
            </div>
            {selectedProduct && (
              <div className="text-sm bg-white/15 rounded-xl px-3 py-2">
                <span className="opacity-90">In Stock:</span>{" "}
                <span className="font-semibold">{available ?? "—"}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <Card className="p-5 space-y-4">
        <ErrorBanner message={err} />
        <SuccessBanner message={ok} />

        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-sm text-gray-600">Customer</label>
            <Select
              options={customers}
              value={selectedCustomer || null}
              onChange={(opt) => setCustomerId(opt?.value || "")}
              placeholder="Customer"
              isSearchable
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-600">{t("product")}</label>
            <Select
              options={products}
              value={selectedProduct || null}
              onChange={onSelectProduct}
              placeholder={t("product")}
              isSearchable
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Unit</label>
            <input className="w-full border rounded-xl px-3 py-2" value={unit} onChange={(e)=>setUnit(e.target.value)} placeholder="e.g., kg, pcs" />
          </div>

          <div>
            <label className="text-sm text-gray-600">{t("quantity")}</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2" value={qty} onChange={(e)=>setQty(e.target.value)} min={0} />
          </div>

          <div>
            <label className="text-sm text-gray-600">{t("price")}</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2" value={price} onChange={(e)=>setPrice(e.target.value)} min={0} />
          </div>

          <div>
            <label className="text-sm text-gray-600">{t("paid")}</label>
            <input type="number" className="w-full border rounded-xl px-3 py-2" value={paid} onChange={(e)=>setPaid(e.target.value)} min={0} />
          </div>

          <div className="md:col-span-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-gray-50 border">
                <div className="text-xs text-gray-500">{t("total")}</div>
                <div className="text-lg font-semibold">{currencyFmt.format(total)}</div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border">
                <div className="text-xs text-gray-500">{t("paid")}</div>
                <div className="text-lg font-semibold">{currencyFmt.format(Number(paid) || 0)}</div>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 border">
                <div className="text-xs text-gray-500">{t("due")}</div>
                <div className="text-lg font-semibold">{currencyFmt.format(due)}</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 flex gap-3 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : t("submit")}
            </Button>
            <Button variant="soft" onClick={()=>{ setProductId(""); setUnit(""); setQty(""); setPrice(""); setPaid(""); setErr(""); setOk(""); }}>
              Clear
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
