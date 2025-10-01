// src/components/StockReport.jsx
import { useEffect, useMemo, useState } from "react";
import api from "./api";
import ResponsiveTableCards from "./ResponsiveTableCards"; // cards-on-mobile / table-on-desktop

const BDT = new Intl.NumberFormat(undefined, { style: "currency", currency: "BDT" });

function Card({ children, className = "" }) {
  return <div className={`rounded-2xl bg-white border border-gray-100 shadow-sm ${className}`}>{children}</div>;
}
function Button({ children, className = "", variant = "primary", ...rest }) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium transition active:scale-[.98] disabled:opacity-50";
  const map = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    soft: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    ghost: "bg-white border border-gray-300 text-gray-800 hover:bg-gray-50",
  };
  return (
    <button className={`${base} ${map[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export default function StockReport() {
  // row shape:
  // {_id, name, categoryName, unit, stock, avgCost, totalValue}
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // filters/sort/paging
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState({ key: "name", dir: "asc" });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      try {
        // 1) primary summary
        const { data } = await api.get("/api/stock/summary");
        const list = Array.isArray(data?.rows) ? data.rows : [];

        // Try to detect category field variants coming from backend:
        // categoryName, category?.name, category, catName, etc.
        const normalizeCategory = (r) =>
          r.categoryName ||
          r.category?.name ||
          (typeof r.category === "string" ? r.category : "") ||
          r.catName ||
          "";

        let mapped = list.map((r) => ({
          _id: r.productId || r._id || r.id,
          name: r.name,
          categoryName: normalizeCategory(r),
          unit: r.unit,
          stock: Number(r.stock || 0),
          avgCost: Number(r.avgCost || 0),
          totalValue: Number(r.totalValue || 0),
        }));

        // 2) If any category missing, enrich from /api/products (one time)
        const needCategory = mapped.some((r) => !r.categoryName);
        if (needCategory) {
          try {
            const prodRes = await api.get("/api/products");
            const arr = Array.isArray(prodRes?.data) ? prodRes.data : [];
            // map productId → category name
            const catMap = new Map(
              arr.map((p) => [
                String(p._id),
                p.category?.name || (typeof p.category === "string" ? p.category : "") || "",
              ])
            );
            mapped = mapped.map((r) => ({
              ...r,
              categoryName: r.categoryName || catMap.get(String(r._id)) || "",
            }));
          } catch {
            // if product fetch fails, continue gracefully with blank categories
          }
        }

        setRows(mapped);
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load stock report");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const data = q
      ? rows.filter((r) => {
          const name = String(r.name || "").toLowerCase();
          const unit = String(r.unit || "").toLowerCase();
          const cat = String(r.categoryName || "").toLowerCase();
          const id = String(r._id || "").toLowerCase();
          return name.includes(q) || unit.includes(q) || cat.includes(q) || id.includes(q);
        })
      : rows;

    const sorted = [...data].sort((a, b) => {
      const { key, dir } = sortBy;
      const va = a[key] ?? "";
      const vb = b[key] ?? "";
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rows, search, sortBy]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = filtered.slice((page - 1) * pageSize, page * pageSize);

  const summary = useMemo(() => {
    const sku = rows.length;
    const qty = rows.reduce((s, r) => s + (Number(r.stock) || 0), 0);
    const value = rows.reduce((s, r) => s + (Number(r.totalValue) || 0), 0);
    return { sku, qty, value };
  }, [rows]);

  // ===== CSV / Print with category =====
  const exportCSV = () => {
    const header = ["Name", "Category", "Unit", "Avg Cost (FIFO)", "Stock", "Total Value (FIFO)"];
    const lines = filtered.map((r) =>
      [r.name, r.categoryName || "", r.unit || "", (r.avgCost || 0).toFixed(2), r.stock ?? 0, (r.totalValue || 0).toFixed(2)]
        .map((x) => `"${String(x).replace(/"/g, '""')}"`)
        .join(",")
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "stock-report-fifo.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const buildPrintHtml = (
    company = {
      name: "Your Company Name",
      logo: `${window.location.origin}/logo.png`,
    }
  ) => {
    const rowsHtml = filtered
      .map(
        (r) => `
        <tr>
          <td>${r.name || ""}</td>
          <td>${r.categoryName || ""}</td>
          <td>${r.unit || ""}</td>
          <td class="num">${(r.avgCost || 0).toFixed(2)}</td>
          <td class="num">${r.stock ?? 0}</td>
          <td class="num">${(r.totalValue || 0).toFixed(2)}</td>
        </tr>`
      )
      .join("");

    return `<!doctype html>
<html><head><meta charset="utf-8" />
<title>Stock Report (FIFO)</title>
<style>
  body{font-family:Arial,Helvetica,sans-serif;margin:20px;color:#0f172a}
  header{display:flex;align-items:center;gap:12px;margin-bottom:8px}
  header img{height:42px}
  .brand .name{font-weight:700}
  .muted{color:#64748b;font-size:12px}
  table{width:100%;border-collapse:collapse;margin-top:12px;font-size:13px}
  th,td{padding:8px;border-bottom:1px solid #eee}
  th{background:#f3f4f6;text-align:left}
  .num{text-align:right}
  @media print{@page{margin:14mm}}
</style></head>
<body>
<header>
  ${company.logo ? `<img src="${company.logo}" alt="Logo" />` : ""}
  <div class="brand">
    <div class="name">${company.name || ""}</div>
    <div class="muted">Inventory Stock Report (FIFO) — ${new Date().toLocaleString()}</div>
  </div>
</header>
<table>
  <thead><tr>
    <th>Name</th>
    <th>Category</th>
    <th>Unit</th>
    <th class="num">Avg Cost (FIFO)</th>
    <th class="num">Stock</th>
    <th class="num">Total Value (FIFO)</th>
  </tr></thead>
  <tbody>${rowsHtml}</tbody>
</table>
<script>
  window.addEventListener('load', function(){
    setTimeout(function(){ window.focus(); window.print(); }, 120);
  });
</script>
</body></html>`;
  };

  const printTable = () => {
    const html = buildPrintHtml({
      name: "Your Company Name",
      logo: `${window.location.origin}/logo.png`,
    });

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "-9999px";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      return;
    }
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => setTimeout(() => document.body.removeChild(iframe), 400);
    if (doc.readyState === "complete") cleanup();
    else iframe.onload = cleanup;
  };

  // Desktop columns (now includes Category)
  const columns = [
    { header: "Product" },
    { header: "Category" },
    { header: "Unit" },
    { header: "Avg Cost (FIFO)", className: "text-right" },
    { header: "Stock", className: "text-right" },
    { header: "Total Value (FIFO)", className: "text-right" },
  ];

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 pb-10">
      {/* Header */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex-1">
              <div className="text-sm/5 text-white/80">Reports</div>
              <h1 className="text-3xl font-bold tracking-tight">Stock Report</h1>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={exportCSV} className="bg-white/10 border-white/20 text-white">
                Export CSV
              </Button>
              <Button variant="ghost" onClick={printTable} className="bg-white/10 border-white/20 text-white">
                Print
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Filters / Sort */}
      <Card className="p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 block mb-1">Search</label>
            <input
              className="w-full border rounded-xl px-3 py-2"
              placeholder="Search by product / category / unit / id"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 block mb-1">Sort by</label>
            <select
              className="w-full border rounded-xl px-3 py-2"
              value={sortBy.key}
              onChange={(e) => setSortBy((s) => ({ ...s, key: e.target.value }))}
            >
              <option value="name">Name</option>
              <option value="categoryName">Category</option>
              <option value="unit">Unit</option>
              <option value="avgCost">Avg Cost</option>
              <option value="stock">Stock</option>
              <option value="totalValue">Total Value</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              variant="soft"
              onClick={() => setSortBy((s) => ({ ...s, dir: s.dir === "asc" ? "desc" : "asc" }))}
              title="Toggle sort direction"
            >
              {sortBy.dir === "asc" ? "Asc ▲" : "Desc ▼"}
            </Button>
            <Button
              variant="soft"
              onClick={() => {
                setSearch("");
                setSortBy({ key: "name", dir: "asc" });
                setPage(1);
              }}
            >
              Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card className="p-5">
          <div className="text-xs text-gray-500">Total SKUs</div>
          <div className="text-2xl font-semibold">{summary.sku}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-gray-500">Total Quantity</div>
          <div className="text-2xl font-semibold tabular-nums">{summary.qty}</div>
        </Card>
        <Card className="p-5">
          <div className="text-xs text-gray-500">Total Inventory Value (FIFO)</div>
          <div className="text-2xl font-semibold tabular-nums">{BDT.format(summary.value)}</div>
        </Card>
      </div>

      {/* Responsive list (cards/table) */}
      <Card className="overflow-hidden p-0">
        <div className="p-3">
          <ResponsiveTableCards
            items={loading || err ? [] : current}
            columns={columns}
            minTableWidth={1040}
            renderRow={(r) => (
              <tr key={r._id}>
                <td className="px-3 py-2">
                  <div className="font-medium">{r.name}</div>
                </td>
                <td className="px-3 py-2">{r.categoryName || ""}</td>
                <td className="px-3 py-2">{r.unit || "-"}</td>
                <td className="px-3 py-2 text-right tabular-nums">{BDT.format(r.avgCost || 0)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.stock ?? 0}</td>
                <td className="px-3 py-2 text-right font-medium tabular-nums">
                  {BDT.format(r.totalValue || 0)}
                </td>
              </tr>
            )}
            renderCard={(r) => (
              <div key={r._id} className="rounded-xl border p-3 bg-white space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.name}</div>
                  <div className="text-sm text-gray-500">{r.categoryName || ""}</div>
                </div>
                <div className="text-sm text-gray-600">{r.unit || "-"}</div>
                <div className="grid grid-cols-3 gap-2 pt-2">
                  <div>
                    <div className="text-xs text-gray-500">Avg Cost</div>
                    <div className="font-semibold tabular-nums">{BDT.format(r.avgCost || 0)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Stock</div>
                    <div className="font-semibold tabular-nums">{r.stock ?? 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Value</div>
                    <div className="font-semibold tabular-nums">{BDT.format(r.totalValue || 0)}</div>
                  </div>
                </div>
              </div>
            )}
          />

          {/* states */}
          {loading && <div className="p-6 text-center text-gray-500">Loading…</div>}
          {!loading && err && <div className="p-6 text-center text-rose-600">{err}</div>}
          {!loading && !err && current.length === 0 && (
            <div className="p-6 text-center text-gray-500">No products found.</div>
          )}
        </div>

        {/* Pagination */}
        {!loading && !err && filtered.length > pageSize && (
          <div className="flex items-center justify-between p-3 border-t">
            <div className="text-sm text-gray-600">
              Showing{" "}
              <span className="font-medium">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)}
              </span>{" "}
              of <span className="font-medium">{filtered.length}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="soft"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Prev
              </Button>
              <span className="text-sm text-gray-700">
                Page <span className="font-semibold">{page}</span> / {totalPages}
              </span>
              <Button
                variant="soft"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
