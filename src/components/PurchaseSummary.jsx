// src/pages/PurchaseSummary.jsx
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import api from "./api";

const moneyFmt = new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT" });
const currency = (n) => moneyFmt.format(Number(n || 0));

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl shadow-lg bg-white border border-gray-100 ${className}`}>{children}</div>;
}
function Chip({ children }) {
  return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 border">{children}</span>;
}
function Button({ children, onClick, type = "button", variant = "primary", disabled, className = "", title }) {
  const base = "px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition active:scale-[.98] disabled:opacity-50";
  const styles = {
    primary: "bg-green-600 hover:bg-green-700 text-white shadow-sm",
    ghost: "bg-white border border-gray-300 hover:border-gray-400 text-gray-700",
    soft: "bg-gray-100 hover:bg-gray-200 text-gray-800",
  };
  return (
    <button type={type} className={`${base} ${styles[variant]} ${className}`} onClick={onClick} disabled={disabled} title={title}>
      {children}
    </button>
  );
}

/* ------------ PRINT HELPERS ------------ */
async function fetchInvoiceFull(id) {
  const { data } = await api.get(`/api/invoices/purchases/${id}`);
  return data;
}
function printInvoice(inv, company = { name: "Your Company Name", logo: `${window.location.origin}/logo.png` }) {
  if (!inv) return;
  const rows = (inv.items || [])
    .map(
      (it) => `
      <tr>
        <td>${it.product?.name || it.productName || ""}</td>
        <td>${it.category?.name || it.categoryName || "-"}</td>
        <td>${it.unit || ""}</td>
        <td class="num">${Number(it.quantity || 0)}</td>
        <td class="num">${Number(it.price || 0).toFixed(2)}</td>
        <td class="num">${(Number(it.quantity || 0) * Number(it.price || 0)).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
<title>Purchase ${inv.invoiceNo || ""}</title>
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
  ${company.logo ? `<img src="${company.logo}" alt="Logo"/>` : ""}
  <div class="brand"><div class="name">${company.name || ""}</div><div class="muted">Purchase Invoice</div></div>
</header>

<h1>Invoice #${inv.invoiceNo || ""}</h1>
<div class="muted">${new Date(inv.date || inv.createdAt || Date.now()).toLocaleString()}</div>
<div style="margin-top:8px">
  <div><strong>Supplier:</strong> ${inv.supplier?.name || ""}</div>
  <div class="muted">${inv.supplier?.phone || ""} ${inv.supplier?.address ? " | " + inv.supplier.address : ""}</div>
</div>

<table>
  <thead><tr>
    <th>Product</th><th>Category</th><th>Unit</th><th class="num">Qty</th><th class="num">Rate</th><th class="num">Amount</th>
  </tr></thead>
  <tbody>${rows}</tbody>
</table>

<div class="totals">
  <table>
    <tr><td>Subtotal</td><td class="num">${Number(inv.subTotal || 0).toFixed(2)}</td></tr>
    <tr><td>Discount</td><td class="num">${Number(inv.discount || 0).toFixed(2)}</td></tr>
    <tr><td><strong>Grand Total</strong></td><td class="num"><strong>${Number(inv.grandTotal || 0).toFixed(2)}</strong></td></tr>
    <tr><td>Paid</td><td class="num">${Number(inv.paid || 0).toFixed(2)}</td></tr>
    <tr><td><strong>Due</strong></td><td class="num"><strong>${Number(inv.due || 0).toFixed(2)}</strong></td></tr>
  </table>
</div>
</body></html>`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  doc.open(); doc.write(html); doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 800);
  }, 350);
}

/* ---------------- PAGE ----------------- */
export default function PurchaseSummary() {
  const [suppliers, setSuppliers] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [supplierId, setSupplierId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [search, setSearch] = useState("");

  // NEW: category filter + resolver
  const [categoryName, setCategoryName] = useState("");
  const [observedCategories, setObservedCategories] = useState([]);
  const [categoriesMap, setCategoriesMap] = useState({}); // { [id]: name }

  // pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    (async () => {
      try {
        const [sup, cats] = await Promise.all([
          api.get("/api/suppliers"),
          api.get("/api/categories"),
        ]);
        setSuppliers(sup.data.map((s) => ({ value: s._id, label: s.name })));
        const cmap = {};
        (cats.data || []).forEach((c) => (cmap[c._id] = c.name));
        setCategoriesMap(cmap);
      } catch {/* non-blocking */}
    })();
  }, []);

  const resolveCategoryName = (item) => {
    // try populated object → id lookup → prefilled field → fallback
    return (
      item?.category?.name ||
      (item?.category && categoriesMap[item.category]) ||
      item?.categoryName ||
      "Uncategorized"
    );
  };

  const fetchData = async () => {
    setLoading(true);
    setErr("");
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (supplierId) params.set("supplier", supplierId);

      const { data } = await api.get(`/api/invoices/purchases${params.toString() ? `?${params.toString()}` : ""}`);

      const list = Array.isArray(data?.rows) ? data.rows : (Array.isArray(data) ? data : []);
      const obs = new Set();

      const mapped = list.map((d) => {
        const perCat = {};
        (d.items || []).forEach((i) => {
          const cat = resolveCategoryName(i);
          obs.add(cat);
          const qty = Number(i.quantity || 0);
          const amount = qty * Number(i.price || 0);
          if (!perCat[cat]) perCat[cat] = { qty: 0, amount: 0 };
          perCat[cat].qty += qty;
          perCat[cat].amount += amount;
        });

        return {
          id: d._id,
          invoiceNo: d.invoiceNo,
          date: d.date || d.createdAt,
          party: d.supplier?.name || "",
          subTotal: d.subTotal,
          discount: d.discount,
          grandTotal: d.grandTotal,
          paid: d.paid,
          due: d.due,
          items: d.items?.length || 0,
          categories: Object.keys(perCat),
          perCategory: perCat,
        };
      });

      setRows(mapped);
      setObservedCategories(Array.from(obs).sort().map((c) => ({ value: c, label: c })));
      setPage(1);
    } catch (e) {
      console.error("Load purchases failed:", e);
      setErr(e?.response?.data?.message || e?.message || "Failed to load purchase summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, []);

  const baseFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesText =
        !q ||
        String(r.invoiceNo || "").toLowerCase().includes(q) ||
        String(r.party || "").toLowerCase().includes(q) ||
        (r.categories || []).some((c) => c.toLowerCase().includes(q));
      const matchesCategory = !categoryName || !!r.perCategory?.[categoryName];
      return matchesText && matchesCategory;
    });
  }, [rows, search, categoryName]);

  const totals = useMemo(
    () =>
      baseFiltered.reduce(
        (acc, r) => {
          acc.count += 1;
          acc.sub += Number(r.subTotal || 0);
          acc.disc += Number(r.discount || 0);
          acc.grand += Number(r.grandTotal || 0);
          acc.paid += Number(r.paid || 0);
          acc.due += Number(r.due || 0);
          return acc;
        },
        { count: 0, sub: 0, disc: 0, grand: 0, paid: 0, due: 0 }
      ),
    [baseFiltered]
  );

  const categoryTotals = useMemo(() => {
    const agg = {};
    baseFiltered.forEach((inv) => {
      Object.entries(inv.perCategory || {}).forEach(([cat, v]) => {
        if (!agg[cat]) agg[cat] = { qty: 0, amount: 0 };
        agg[cat].qty += Number(v.qty || 0);
        agg[cat].amount += Number(v.amount || 0);
      });
    });
    return Object.entries(agg)
      .map(([cat, v]) => ({ cat, qty: v.qty, amount: v.amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [baseFiltered]);

  // pagination
  const pageSizeCalc = pageSize;
  const totalPages = Math.max(1, Math.ceil(baseFiltered.length / pageSizeCalc));
  const current = baseFiltered.slice((page - 1) * pageSizeCalc, page * pageSizeCalc);

  const exportCSV = () => {
    const header = ["Invoice No","Date","Supplier","Categories","Items","Subtotal","Discount","Grand Total","Paid","Due"];
    const rowsCsv = [
      header,
      ...baseFiltered.map((r) => [
        r.invoiceNo,
        new Date(r.date).toLocaleString(),
        r.party,
        (r.categories || []).join(" | "),
        r.items,
        r.subTotal,
        r.discount,
        r.grandTotal,
        r.paid,
        r.due,
      ]),
    ];
    const csv = rowsCsv.map((r) => r.map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "purchase-summary.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSupplierId("");
    setFrom("");
    setTo("");
    setSearch("");
    setCategoryName("");
    setPage(1);
    fetchData();
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 pb-10">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 rounded-2xl text-white p-6 shadow">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <div className="text-sm/5 text-white/80">Reports</div>
              <h1 className="text-3xl font-bold tracking-tight">Purchase Summary</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={exportCSV} title="Download CSV">Export CSV</Button>
              <Button variant="soft" onClick={fetchData} disabled={loading}>{loading ? "Loading..." : "Refresh"}</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-4">
        {/* 1 row on mobile, 2 on md, 12-column grid on lg to prevent overlap */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
          {/* Supplier / Customer */}
          <div className="lg:col-span-3 min-w-0">
            <label className="text-xs text-gray-500 block mb-1">Supplier</label>
            <Select
              inputId="party-select"
              options={suppliers}
              value={suppliers.find((s) => s.value === supplierId) || null}
              onChange={(opt) => setSupplierId(opt?.value || "")}
              placeholder="All suppliers"
              isClearable
              isSearchable
              styles={{ container: (base) => ({ ...base, width: "100%" }) }}
            />
          </div>

          {/* From */}
          <div className="lg:col-span-2 min-w-0">
            <label htmlFor="from-date" className="text-xs text-gray-500 block mb-1">From</label>
            <input
              id="from-date"
              type="date"
              className="w-full border rounded-xl px-3 py-2 min-w-[170px]"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
            />
          </div>

          {/* To */}
          <div className="lg:col-span-2 min-w-0">
            <label htmlFor="to-date" className="text-xs text-gray-500 block mb-1">To</label>
            <input
              id="to-date"
              type="date"
              className="w-full border rounded-xl px-3 py-2 min-w-[170px]"
              value={to}
              onChange={(e) => setTo(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="lg:col-span-3 min-w-0">
            <label className="text-xs text-gray-500 block mb-1">Category</label>
            <Select
              inputId="category-select"
              options={[{ value: "", label: "All categories" }, ...observedCategories]}
              value={[{ value: "", label: "All categories" }, ...observedCategories].find((o) => o.value === categoryName) || null}
              onChange={(opt) => { setCategoryName(opt?.value || ""); setPage(1); }}
              placeholder="All categories"
              isSearchable
              styles={{ container: (base) => ({ ...base, width: "100%" }) }}
            />
          </div>

          {/* Apply button (kept narrow) */}
          <div className="lg:col-span-1 min-w-0">
            <Button
              variant="primary"
              onClick={fetchData}
              disabled={loading}
              className="w-full whitespace-nowrap"
            >
              {loading ? "Loading..." : "Apply"}
            </Button>
          </div>

          {/* Search + Clear */}
          <div className="lg:col-span-4 min-w-0">
            <label htmlFor="search-input" className="text-xs text-gray-500 block mb-1">Search</label>
            <div className="flex gap-2 items-stretch min-w-0">
              <input
                id="search-input"
                placeholder="Search invoice/supplier/category"
                className="w-full min-w-0 border rounded-xl px-3 py-2"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <Button variant="soft" onClick={clearFilters} className="whitespace-nowrap">Clear</Button>
            </div>
          </div>
        </div>
      </Card>


      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-3">
        <Card className="p-4"><div className="text-xs text-gray-500">Invoices</div><div className="text-2xl font-semibold">{totals.count}</div></Card>
        <Card className="p-4"><div className="text-xs text-gray-500">Subtotal</div><div className="text-2xl font-semibold">{currency(totals.sub)}</div></Card>
        <Card className="p-4"><div className="text-xs text-gray-500">Discount</div><div className="text-2xl font-semibold">{currency(totals.disc)}</div></Card>
        <Card className="p-4"><div className="text-xs text-gray-500">Grand Total</div><div className="text-2xl font-semibold">{currency(totals.grand)}</div></Card>
        <Card className="p-4"><div className="text-xs text-gray-500">Due</div><div className="text-2xl font-semibold">{currency(totals.due)}</div></Card>
      </div>

      {/* Category breakdown */}
      {categoryTotals.length > 0 && (
        <Card className="p-4 mb-4">
          <div className="text-sm font-semibold mb-2">Category Breakdown (current filters)</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="text-left text-gray-600">
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2 text-right">Quantity</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categoryTotals.map((r) => (
                  <tr key={r.cat}>
                    <td className="px-3 py-2">{r.cat}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{r.qty}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{currency(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 sticky top-0">
              <tr className="text-left text-gray-600">
                <th className="px-3 py-2">Invoice</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Supplier</th>
                <th className="px-3 py-2">Categories</th>
                <th className="px-3 py-2 text-right">Items</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 text-right">Discount</th>
                <th className="px-3 py-2 text-right">Grand</th>
                <th className="px-3 py-2 text-right">Paid</th>
                <th className="px-3 py-2 text-right">Due</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {current.map((r) => (
                <tr key={r.id}>
                  <td className="px-3 py-2 font-medium">
                    {r.invoiceNo}
                    <div className="text-xs text-gray-500">{r.id}</div>
                  </td>
                  <td className="px-3 py-2">{new Date(r.date).toLocaleString()}</td>
                  <td className="px-3 py-2">{r.party}</td>
                  <td className="px-3 py-2">
                    {(r.categories || []).length ? (
                      <div className="flex flex-wrap gap-1">
                        {r.categories.map((c) => <Chip key={c}>{c}</Chip>)}
                      </div>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-right"><Chip>{r.items}</Chip></td>
                  <td className="px-3 py-2 text-right tabular-nums">{currency(r.subTotal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{currency(r.discount)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{currency(r.grandTotal)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{currency(r.paid)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{currency(r.due)}</td>
                  <td className="px-3 py-2 text-right">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        try {
                          const inv = await fetchInvoiceFull(r.id);
                          printInvoice(inv);
                        } catch (e) {
                          console.error("Print failed: ", e);
                          alert("Failed to load invoice for printing.");
                        }
                      }}
                      title="Print invoice"
                    >
                      Print
                    </Button>
                  </td>
                </tr>
              ))}
              {!loading && current.length === 0 && (
                <tr><td colSpan={11} className="px-3 py-10 text-center text-gray-500">No results</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loading && baseFiltered.length > pageSize && (
          <div className="flex items-center justify-between p-3 border-t">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, baseFiltered.length)}
              </span>{" "}
              of <span className="font-medium">{baseFiltered.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="soft" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
                Prev
              </Button>
              <span className="text-sm text-gray-700">
                Page <span className="font-semibold">{page}</span> / {totalPages}
              </span>
              <Button
                variant="soft"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {err && <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700" role="alert">{err}</div>}
    </div>
  );
}
