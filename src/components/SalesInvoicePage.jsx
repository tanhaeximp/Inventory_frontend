// src/pages/SalesInvoicePage.jsx
import { useEffect, useState } from "react";
import Select from "react-select";
import { useTranslation } from "react-i18next";
import api from "./api";
import LineItemCard from "../components/LineItemCard";

/* ---------------- helpers ---------------- */
const currencyFmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT" });
const currency = (n) => currencyFmt.format(Number(n || 0));

const emptyRow = {
  productKey: "",     // normalized product-name key (NOT an _id)
  label: "",          // display label (name only)
  unit: "",
  unitOptions: [],    // available unit list for this name
  quantity: "",
  price: "",
  amount: 0,
  category: "",       // category _id
  categoryLabel: "",
};

const selectPortalProps = {
  menuPortalTarget: typeof document !== "undefined" ? document.body : null,
  menuPosition: "fixed",
  styles: { menuPortal: (base) => ({ ...base, zIndex: 9999 }) },
  menuShouldScrollIntoView: false,
};

/**
 * Build "common" options grouped by product NAME.
 * - Each option contains all variants (ids) for that name, with their units & prices (and optional stock).
 * - UI shows just the name; the unit selector chooses the variant.
 */
function buildCommonProductOptions(raw = []) {
  const byName = new Map(); // key: normalizedName -> { key, label, units:Set, variants:[{id,unit,price,stock}] }
  for (const p of raw) {
    const name = String(p.name || "").trim();
    const key = name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, { key, label: name, units: new Set(), variants: [] });
    }
    const rec = byName.get(key);
    const units = Array.isArray(p.units) && p.units.length ? p.units : (p.unit ? [p.unit] : [""]);
    const basePrice = p.price ?? "";
    const stock = p.stock ?? null;

    for (const u of units) {
      rec.units.add(u || "");
      rec.variants.push({
        id: String(p._id),
        unit: u || "",
        price: basePrice,
        stock,
      });
    }
  }

  return Array.from(byName.values()).map((rec) => ({
    key: rec.key,
    label: rec.label,
    units: Array.from(rec.units),
    variants: rec.variants,
  }));
}

/** Find price for a (productKey + unit) from commonOptions */
function findVariantPrice(commonOptions, key, unit) {
  const rec = commonOptions.find((o) => o.key === key);
  if (!rec) return "";
  const v = rec.variants.find((vv) => vv.unit === (unit || ""));
  return v?.price ?? "";
}

/** Find stock (if available) for a (productKey + unit) */
function findVariantStock(commonOptions, key, unit) {
  const rec = commonOptions.find((o) => o.key === key);
  if (!rec) return null;
  const v = rec.variants.find((vv) => vv.unit === (unit || ""));
  return v?.stock ?? null;
}

/** Resolve product _id for a (productKey + unit) from commonOptions */
function resolveProductId(commonOptions, key, unit) {
  const rec = commonOptions.find((o) => o.key === key);
  if (!rec) return null;
  const v = rec.variants.find((vv) => vv.unit === (unit || "")) || rec.variants[0];
  return v?.id || null;
}

/** Print invoice in hidden iframe */
function printInvoice({ company, invoice, t }) {
  const rows = (invoice.items || [])
    .map((it) => {
      const qty = Number(it.quantity || 0);
      const price = Number(it.price || 0);
      const amount = (qty * price).toFixed(2);
      return `
    <tr>
      <td>${it.productName || it.product?.name || ""}</td>
      <td>${it.categoryName || it.category?.name || ""}</td>
      <td>${it.unit || ""}</td>
      <td class="num">${qty}</td>
      <td class="num">${price.toFixed(2)}</td>
      <td class="num">${amount}</td>
    </tr>`;
    })
    .join("");

  const sub = Number(invoice.subTotal || 0).toFixed(2);
  const disc = Number(invoice.discount || 0).toFixed(2);
  const grand = Number(invoice.grandTotal || 0).toFixed(2);
  const paid = Number(invoice.paid || 0).toFixed(2);
  const due = Number(invoice.due || 0).toFixed(2);
  const when = new Date(invoice.date || invoice.createdAt || Date.now()).toLocaleString();

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>${t("salesInvoice")} ${invoice.invoiceNo || ""}</title>
<style>
  *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;margin:24px;color:#0f172a}
  header{display:flex;align-items:center;gap:12px;margin-bottom:12px}
  header img{height:42px}
  .brand .name{font-weight:700}
  .muted{color:#64748b;font-size:12px}
  h1{margin:6px 0 2px;font-size:18px}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
  th,td{padding:8px;border-bottom:1px solid #eee}
  th{background:#f3f4f6;text-align:left}
  .num{text-align:right}
  .totals{margin-top:12px;display:flex;justify-content:flex-end}
  .totals table{width:auto}
  @media print{@page{margin:14mm}}
</style></head><body>
<header>
  ${company.logo ? `<img src="${company.logo}" alt="Logo" />` : ""}
  <div class="brand"><div class="name">${company.name || ""}</div><div class="muted">${t("salesInvoice")}</div></div>
</header>
<h1>${t("invoice")} #${invoice.invoiceNo || ""}</h1>
<div class="muted">${when}</div>
<table>
  <thead><tr>
    <th>${t("product")}</th><th>${t("category")}</th><th>${t("unit")}</th>
    <th class="num">${t("qty")}</th><th class="num">${t("rate")}</th><th class="num">${t("amount")}</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>
<div class="totals">
  <table>
    <tr><td>${t("subtotal")}</td><td class="num">${sub}</td></tr>
    <tr><td>${t("discount")}</td><td class="num">${disc}</td></tr>
    <tr><td><strong>${t("grandTotal")}</strong></td><td class="num"><strong>${grand}</strong></td></tr>
    <tr><td>${t("paid")}</td><td class="num">${paid}</td></tr>
    <tr><td><strong>${t("due")}</strong></td><td class="num"><strong>${due}</strong></td></tr>
  </table>
</div>
</body></html>`;

  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, { position: "fixed", right: 0, bottom: 0, width: 0, height: 0, border: 0 });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  doc.open(); doc.write(html); doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 800);
  }, 350);
}

/* ---------------- page ---------------- */
export default function SalesInvoicePage() {
  const { t } = useTranslation();

  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [productCommon, setProductCommon] = useState([]); // [{key,label,units[],variants[{id,unit,price,stock}]}]

  const [customerId, setCustomerId] = useState("");
  const [rows, setRows] = useState([{ ...emptyRow }]);
  const [discount, setDiscount] = useState("");
  const [paid, setPaid] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const subTotal = rows.reduce((s, r) => s + (Number(r.quantity || 0) * Number(r.price || 0)), 0);
  const grandTotal = Math.max(0, subTotal - (Number(discount) || 0));
  const due = Math.max(0, grandTotal - (Number(paid) || 0));

  /* load customers, products, categories */
  useEffect(() => {
    (async () => {
      try {
        const [cus, prod, cats] = await Promise.all([
          api.get("/api/customers"),
          api.get("/api/products"),
          api.get("/api/categories"),
        ]);
        setCustomers(cus.data.map((c) => ({ value: c._id, label: c.name })));
        setProductCommon(buildCommonProductOptions(prod.data)); // group by name (common)
        setCategories(cats.data.map((c) => ({ value: c._id, label: c.name })));
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load customers/products/categories");
      }
    })();
  }, []);

  /* row handlers */
  const onChangeRowProduct = (idx, opt) => {
    setRows((rs) => {
      const copy = [...rs];
      const rec = productCommon.find((o) => o.key === opt?.value);
      const unitOptions = rec ? rec.units : [];
      const defaultUnit = unitOptions[0] || "";
      copy[idx] = {
        ...copy[idx],
        productKey: opt?.value || "",
        label: opt?.label || "",
        unit: defaultUnit,
        unitOptions,
        price: rec ? findVariantPrice(productCommon, opt?.value, defaultUnit) : "",
      };
      return copy;
    });
  };

  const onChangeRowCategory = (idx, opt) => {
    setRows((rs) => {
      const copy = [...rs];
      copy[idx] = { ...copy[idx], category: opt?.value || "", categoryLabel: opt?.label || "" };
      return copy;
    });
  };

  const onChangeRowUnit = (idx, opt) => {
    setRows((rs) => {
      const copy = [...rs];
      const row = copy[idx];
      const newUnit = opt?.value || "";
      const newPrice = row.productKey ? findVariantPrice(productCommon, row.productKey, newUnit) : row.price;
      copy[idx] = { ...row, unit: newUnit, price: newPrice };
      return copy;
    });
  };

  const onChangeCell = (idx, key, val) => {
    setRows((rs) => {
      const copy = [...rs];
      copy[idx] = { ...copy[idx], [key]: val };
      return copy;
    });
  };

  const addRow = () => setRows((rs) => [...rs, { ...emptyRow }]);
  const removeRow = (idx) => setRows((rs) => (rs.length === 1 ? rs : rs.filter((_, i) => i !== idx)));

  /* validation */
  const validate = () => {
    if (!customerId) return t("selectCustomer") || "Select customer.";
    for (const r of rows) {
      if (!r.productKey) return "Each row must have a product.";
      if (!r.unit) return "Each row must have a unit.";
      if (!r.quantity || Number(r.quantity) <= 0) return "Quantity must be > 0.";
      if (Number(r.price) < 0) return "Price must be ≥ 0.";
      // Resolve concrete product id to validate selection
      const pid = resolveProductId(productCommon, r.productKey, r.unit);
      if (!pid) return `Cannot resolve product id for "${r.label}" (${r.unit}).`;

      // Optional stock guard (if present on variant)
      const stk = findVariantStock(productCommon, r.productKey, r.unit);
      if (stk != null && Number(r.quantity) > Number(stk)) {
        return `Insufficient stock for ${r.label} (${r.unit}). Available: ${stk}`;
      }
    }
    if (Number(paid) < 0) return "Paid must be ≥ 0.";
    if ((Number(paid) || 0) > grandTotal) return "Paid cannot exceed total.";
    return "";
  };

  /* submit */
  const onSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    const v = validate();
    if (v) { setErr(v); return; }
    setLoading(true);
    try {
      // Convert (name + unit) to concrete product _id
      const items = rows.map((r) => {
        const productId = resolveProductId(productCommon, r.productKey, r.unit);
        return {
          product: productId,
          category: r.category || null,
          categoryName: r.categoryLabel || "",
          unit: r.unit,
          quantity: Number(r.quantity),
          price: Number(r.price),
        };
      });

      const payload = {
        customer: customerId,
        items,
        discount: Number(discount || 0),
        paid: Number(paid || 0),
        note,
      };

      const res = await api.post("/api/invoices/sales", payload);

      // Enrich for printing (map id → common label)
      const invoice = {
        ...res.data,
        items: (res.data.items || []).map((it) => {
          const id =
            typeof it.product === "object" && it.product?._id ? it.product._id : String(it.product);
          const rec = productCommon.find((o) => o.variants.some((v) => v.id === id));
          const catName =
            it.categoryName ||
            rows.find((r) => resolveProductId(productCommon, r.productKey, r.unit) === id)?.categoryLabel ||
            "";
          return {
            ...it,
            productName: rec ? rec.label : it.product?.name || id,
            categoryName: catName,
            price: Number(it.price || 0),
            quantity: Number(it.quantity || 0),
          };
        }),
      };

      printInvoice({
        company: { name: "Your Company Name", logo: `${window.location.origin}/logo.png` },
        invoice,
        t,
      });

      // Reset form
      setCustomerId("");
      setRows([{ ...emptyRow }]);
      setDiscount("");
      setPaid("");
      setNote("");
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- render ---------------- */
  return (
    <div className="max-w-screen-2xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 pb-10">
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white p-6 shadow">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <div className="text-sm/5 text-white/80">{t("Sales Invoice") || "Sales Invoice"}</div>
              <h1 className="text-3xl font-bold tracking-tight">
                {customerId ? ` ${customers.find((c) => c.value === customerId)?.label || ""}` : ""}
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl shadow-lg bg-white border border-gray-100 p-5 space-y-4">
        {err && <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">{err}</div>}

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Customer + Note */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-600">{t("Customer") || "Customer"}</label>
              <Select
                {...selectPortalProps}
                options={customers}
                value={customers.find((c) => c.value === customerId) || null}
                onChange={(opt) => setCustomerId(opt?.value || "")}
                placeholder={t("Select Customer") || "Select customer"}
                isSearchable
              />
            </div>
            <div>
              <label className="text-sm text-gray-600">{t("Note Optional") || "Note (optional)"}</label>
              <input className="w-full border rounded-xl px-3 py-2" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>

          {/* --- Mobile cards (<sm) --- */}
          <div className="space-y-3 sm:hidden">
            {rows.map((r, idx) => {
              const amount = (Number(r.quantity) || 0) * (Number(r.price) || 0);

              const productSelect = (
                <Select
                  {...selectPortalProps}
                  options={productCommon.map((o) => ({ value: o.key, label: o.label }))}
                  value={r.productKey ? { value: r.productKey, label: r.label } : null}
                  onChange={(opt) => onChangeRowProduct(idx, opt)}
                  placeholder={t("product") || "Select product"}
                  isSearchable
                />
              );
              const categorySelect = (
                <Select
                  {...selectPortalProps}
                  options={categories}
                  value={r.category ? categories.find((c) => c.value === r.category) : null}
                  onChange={(opt) => onChangeRowCategory(idx, opt)}
                  placeholder={t("category") || "Select category"}
                  isSearchable
                  isClearable
                />
              );
              const unitSelectOrInput =
                Array.isArray(r.unitOptions) && r.unitOptions.length > 1 ? (
                  <Select
                    {...selectPortalProps}
                    options={r.unitOptions.map((u) => ({ value: u, label: u }))}
                    value={r.unit ? { value: r.unit, label: r.unit } : null}
                    onChange={(opt) => onChangeRowUnit(idx, opt)}
                    placeholder={t("unit") || "Select unit"}
                    isSearchable
                  />
                ) : (
                  <input className="w-full border rounded-xl px-2 py-2" value={r.unit || ""} readOnly placeholder={t("unit") || "unit"} />
                );

              return (
                <LineItemCard
                  key={`li-${idx}`}
                  index={idx}
                  productSelect={productSelect}
                  categorySelect={categorySelect}
                  unitSelectOrInput={unitSelectOrInput}
                  quantityInput={
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2 text-right"
                      value={r.quantity}
                      min={0}
                      onChange={(e) => onChangeCell(idx, "quantity", e.target.value)}
                    />
                  }
                  priceInput={
                    <input
                      type="number"
                      className="w-full border rounded-xl px-3 py-2 text-right"
                      value={r.price}
                      min={0}
                      onChange={(e) => onChangeCell(idx, "price", e.target.value)}
                    />
                  }
                  amountLabel={currency(amount || 0)}
                  onRemove={() => removeRow(idx)}
                  t={t}
                />
              );
            })}
            <div className="pt-2">
              <button type="button" className="px-4 py-2 rounded-xl text-sm bg-gray-100 hover:bg-gray-200" onClick={addRow}>
                + {t("addItem") || "Add Item"}
              </button>
            </div>
          </div>

          {/* --- Desktop table (≥sm) --- */}
          <div className="hidden sm:block overflow-x-auto scroll-soft">
            <table className="w-full text-sm min-w-[800px]">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2">{t("product") || "Product"}</th>
                  <th className="px-3 py-2">{t("category") || "Category"}</th>
                  <th className="px-3 py-2">{t("unit") || "Unit"}</th>
                  <th className="px-3 py-2 text-right">{t("qty") || "Qty"}</th>
                  <th className="px-3 py-2 text-right">{t("rate") || "Rate"}</th>
                  <th className="px-3 py-2 text-right">{t("amount") || "Amount"}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r, idx) => {
                  const amount = (Number(r.quantity) || 0) * (Number(r.price) || 0);
                  return (
                    <tr key={`row-${idx}`} className="align-top">
                      <td className="px-3 py-2 min-w-[220px]">
                        <Select
                          {...selectPortalProps}
                          options={productCommon.map((o) => ({ value: o.key, label: o.label }))}
                          value={r.productKey ? { value: r.productKey, label: r.label } : null}
                          onChange={(opt) => onChangeRowProduct(idx, opt)}
                          placeholder={t("product") || "Select product"}
                          isSearchable
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[200px]">
                        <Select
                          {...selectPortalProps}
                          options={categories}
                          value={r.category ? categories.find((c) => c.value === r.category) : null}
                          onChange={(opt) => onChangeRowCategory(idx, opt)}
                          placeholder={t("category") || "Select category"}
                          isSearchable
                          isClearable
                        />
                      </td>
                      <td className="px-3 py-2 min-w-[140px]">
                        {Array.isArray(r.unitOptions) && r.unitOptions.length > 1 ? (
                          <Select
                            {...selectPortalProps}
                            options={r.unitOptions.map((u) => ({ value: u, label: u }))}
                            value={r.unit ? { value: r.unit, label: r.unit } : null}
                            onChange={(opt) => onChangeRowUnit(idx, opt)}
                            placeholder={t("unit") || "Select unit"}
                            isSearchable
                          />
                        ) : (
                          <input className="w-full border rounded-xl px-2 py-1" value={r.unit || ""} readOnly placeholder={t("unit") || "unit"} />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="w-full border rounded-xl px-2 py-1 text-right"
                          value={r.quantity}
                          min={0}
                          onChange={(e) => onChangeCell(idx, "quantity", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          className="w-full border rounded-xl px-2 py-1 text-right"
                          value={r.price}
                          min={0}
                          onChange={(e) => onChangeCell(idx, "price", e.target.value)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">{currency(amount || 0)}</td>
                      <td className="px-3 py-2">
                        <button type="button" className="text-rose-600 hover:underline" onClick={() => removeRow(idx)}>
                          {t("remove") || "Remove"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="p-3">
              <button type="button" className="px-4 py-2 rounded-xl text-sm bg-gray-100 hover:bg-gray-200" onClick={addRow}>
                + {t("addItem") || "Add Item"}
              </button>
            </div>
          </div>

          {/* Totals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-gray-50 border">
              <div className="text-xs text-gray-500">{t("subtotal") || "Subtotal"}</div>
              <div className="text-lg font-semibold">{currency(subTotal)}</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border">
              <label className="text-xs text-gray-500">{t("discount") || "Discount"}</label>
              <input type="number" className="w-full border rounded-xl px-3 py-2 mt-1" value={discount} min={0} onChange={(e) => setDiscount(e.target.value)} />
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border">
              <div className="text-xs text-gray-500">{t("grandTotal") || "Grand Total"}</div>
              <div className="text-lg font-semibold">{currency(grandTotal)}</div>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border">
              <label className="text-xs text-gray-500">{t("paid") || "Paid"}</label>
              <input type="number" className="w-full border rounded-xl px-3 py-2 mt-1" value={paid} min={0} onChange={(e) => setPaid(e.target.value)} />
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border">
              <div className="text-xs text-gray-500">{t("due") || "Due"}</div>
              <div className="text-lg font-semibold">{currency(due)}</div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="px-4 py-2 rounded-xl text-sm bg-blue-600 hover:bg-blue-700 text-white">
              {loading ? (t("saving") || "Saving...") : (t("Save") || "Save & Print")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
