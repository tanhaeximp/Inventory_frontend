// src/pages/LedgerPages.jsx
import { useEffect, useMemo, useState } from "react";
import Select from "react-select";
import api from "./api";

/* ---------- helpers ---------- */
const currencyFmt = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "BDT",
  maximumFractionDigits: 2,
});
const numFmt = (n) =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n ?? 0);

function toCSV(rows) {
  if (!rows?.length) return "";
  const headers = Object.keys(rows[0]);
  const esc = (v) => {
    if (v == null) return "";
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
  return headers.join(",") + "\n" + body;
}
function downloadCSV(filename, rows) {
  const csv = toCSV(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------- UI atoms ---------- */
function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl shadow-lg bg-white border border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
function Button({ children, onClick, variant = "primary", disabled }) {
  const base =
    "px-4 py-2 rounded-xl text-sm font-medium transition active:scale-[.98] disabled:opacity-50 disabled:cursor-not-allowed";
  const styles = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-sm",
    ghost: "bg-white border border-gray-300 hover:border-gray-400 text-gray-700",
    soft: "bg-gray-100 hover:bg-gray-200 text-gray-800",
  };
  return (
    <button className={`${base} ${styles[variant]}`} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
function Stat({ label, value }) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
      <div className="text-xs uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}
function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
      {message}
    </div>
  );
}
function Spinner({ label }) {
  return (
    <div className="flex items-center gap-3 text-gray-600">
      <div
        className="w-5 h-5 border-2 border-gray-300 rounded-full animate-spin"
        style={{ borderTopColor: "#374151" }}
      />
      <span>{label || "Loading..."}</span>
    </div>
  );
}
function Empty({ title = "No data", hint }) {
  return (
    <div className="text-center py-10 text-gray-500">
      <div className="text-lg font-medium">{title}</div>
      {hint && <div className="text-sm mt-1">{hint}</div>}
    </div>
  );
}

/* ---------- Ledger table ---------- */
function LedgerTable({ transactions }) {
  if (!transactions?.length) {
    return <Empty title="No transactions in this period." hint="Try changing the date range." />;
  }
  const totals = useMemo(() => {
    let dr = 0,
      cr = 0;
    for (const t of transactions) {
      dr += t.debit || 0;
      cr += t.credit || 0;
    }
    return { dr, cr };
  }, [transactions]);

  return (
    <div className="overflow-hidden border border-gray-200 rounded-2xl">
      <div className="overflow-x-auto max-h-[65vh]">
        <table className="min-w-[900px] w-full text-sm">
          <thead className="sticky top-0 bg-white shadow-sm">
            <tr className="text-left text-gray-600">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3 text-right">Debit</th>
              <th className="px-4 py-3 text-right">Credit</th>
              <th className="px-4 py-3 text-right">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {transactions.map((t) => (
              <tr key={t._id} className="hover:bg-gray-50/70">
                <td className="px-4 py-3 whitespace-nowrap">
                  {new Date(t.date).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">{t.type}</td>
                <td className="px-4 py-3 text-gray-600">{t.description}</td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {currencyFmt.format(t.debit || 0)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {currencyFmt.format(t.credit || 0)}
                </td>
                <td className="px-4 py-3 text-right font-medium tabular-nums">
                  {currencyFmt.format(t.balance || 0)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 text-gray-700">
              <td className="px-4 py-3" colSpan={3}>
                Totals
              </td>
              <td className="px-4 py-3 text-right font-semibold">
                {currencyFmt.format(totals.dr)}
              </td>
              <td className="px-4 py-3 text-right font-semibold">
                {currencyFmt.format(totals.cr)}
              </td>
              <td className="px-4 py-3 text-right"></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

/* ---------- PRINT HELPERS: Popup first, then inline fallback (for Chrome popup block) ---------- */

function buildPrintableHTML({ company, title, partyName, from, to, opening, closing, transactions }) {
  const fmt = (n) => currencyFmt.format(n || 0);
  const rangeText =
    (from ? new Date(from).toLocaleDateString() : "—") +
    " → " +
    (to ? new Date(to).toLocaleDateString() : "—");

  const rows = (transactions || [])
    .map(
      (t) => `
      <tr>
        <td>${new Date(t.date).toLocaleDateString()}</td>
        <td>${t.type}</td>
        <td>${t.description || ""}</td>
        <td class="num">${fmt(t.debit || 0)}</td>
        <td class="num">${fmt(t.credit || 0)}</td>
        <td class="num">${fmt(t.balance || 0)}</td>
      </tr>`
    )
    .join("");

  const totalDr = (transactions || []).reduce((s, t) => s + (t.debit || 0), 0);
  const totalCr = (transactions || []).reduce((s, t) => s + (t.credit || 0), 0);

  return `
    <div class="print-root">
      <header class="print-header">
        ${company.logo ? `<img src="${company.logo}" alt="Logo" />` : ""}
        <div class="brand">
          <div class="name">${company.name || ""}</div>
          <div class="sub">Ledger Report</div>
        </div>
      </header>

      <h2>${partyName || "-"}</h2>
      <div class="muted">Date Range: ${rangeText}</div>

      <div class="stats">
        <div class="stat"><div class="label">Opening</div><div class="val">${fmt(opening)}</div></div>
        <div class="stat"><div class="label">Transactions</div><div class="val">${(transactions || []).length}</div></div>
        <div class="stat"><div class="label">Closing</div><div class="val">${fmt(closing)}</div></div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th>Date</th><th>Type</th><th>Description</th>
            <th class="num">Debit</th><th class="num">Credit</th><th class="num">Balance</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td colspan="3">Totals</td>
            <td class="num">${fmt(totalDr)}</td>
            <td class="num">${fmt(totalCr)}</td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

const PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; margin: 24px; color: #0f172a; }
  .print-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
  .print-header img { height: 42px; width: auto; }
  .brand { display: flex; flex-direction: column; }
  .brand .name { font-size: 18px; font-weight: 700; margin: 0; }
  .brand .sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  h2 { margin: 12px 0 4px; font-size: 18px; }
  .muted { color: #555; font-size: 13px; margin-bottom: 16px; }
  .stats { display: flex; gap: 16px; margin: 16px 0; }
  .stat { padding: 10px 12px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb; }
  .label { font-size: 11px; color: #555; text-transform: uppercase; }
  .val { font-weight: 700; margin-top: 4px; }
  .print-table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .print-table thead th { text-align: left; padding: 8px; border-bottom: 1px solid #ccc; background: #f3f4f6; }
  .print-table td { padding: 8px; border-bottom: 1px solid #eee; }
  .num { text-align: right; }
  .print-table tfoot td { background: #f3f4f6; font-weight: 700; }
  @media print { @page { margin: 14mm; } }
`;

function tryPopupPrint(payload) {
  // returns true if popup route worked, false if blocked
  const htmlBody = buildPrintableHTML(payload);
  const docHTML = `
<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${payload.title} — ${payload.partyName || "-"}</title>
<style>${PRINT_STYLES}</style>
</head>
<body>
${htmlBody}
</body>
</html>
  `.trim();

  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=650");
  if (!w) return false; // blocked

  w.document.open();
  w.document.write(docHTML);
  w.document.close();
  w.onload = () => {
    try {
      w.focus();
      w.print();
      w.close();
    } catch {
      setTimeout(() => {
        try { w.focus(); w.print(); w.close(); } catch {}
      }, 300);
    }
  };
  return true;
}

function inlinePrintFallback(payload) {
  // Injects a print-only container into this page, prints, then cleans up
  const htmlBody = buildPrintableHTML(payload);

  const portal = document.createElement("div");
  portal.id = "__print_portal__";
  portal.innerHTML = htmlBody;

  const style = document.createElement("style");
  style.id = "__print_portal_styles__";
  style.innerHTML = `
    ${PRINT_STYLES}
    /* hide the app; show only the portal during print */
    @media print {
      body > *:not(#__print_portal__) { display: none !important; }
      #__print_portal__ { display: block !important; }
    }
  `;

  // Ensure portal is hidden on screen (we only want it for print)
  portal.style.display = "none";

  document.body.appendChild(portal);
  document.head.appendChild(style);

  const cleanup = () => {
    try {
      portal.remove();
      style.remove();
      window.removeEventListener("afterprint", cleanup);
    } catch {}
  };

  window.addEventListener("afterprint", cleanup);
  // Some browsers (older Chrome) need a tiny delay before print
  setTimeout(() => window.print(), 0);
}

function printLedgerWithFallback({ company, title, partyName, from, to, opening, closing, transactions }) {
  const payload = { company, title, partyName, from, to, opening, closing, transactions };
  const ok = tryPopupPrint(payload);
  if (!ok) {
    // Popup blocked -> inline fallback
    inlinePrintFallback(payload);
  }
}

/* ---------- Ledger shell ---------- */
function LedgerView({ baseTitle, partyLabel, partyPath, ledgerPath, currencyLabel }) {
  const [parties, setParties] = useState([]);
  const [partyId, setPartyId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // live header: show selected name immediately (even before fetch)
  const selectedOption = parties.find((p) => p.value === partyId);
  const partyName = data?.party?.name || selectedOption?.label || "";
  const displayTitle = partyName ? `${partyName}` : baseTitle;

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(partyPath);
        setParties(res.data.map((p) => ({ value: p._id, label: p.name })));
      } catch (e) {
        setErr(e?.response?.data?.message || "Failed to load list.");
      }
    })();
  }, [partyPath]);

  const onView = async () => {
    if (!partyId) {
      setErr(`Please select a ${partyLabel.toLowerCase()}.`);
      return;
    }
    setErr("");
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const res = await api.get(`${ledgerPath}/${partyId}?${params.toString()}`);
      setData(res.data);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load ledger.");
      setData({ party: null, openingBalance: 0, transactions: [], closingBalance: 0 });
    } finally {
      setLoading(false);
    }
  };

  const onExport = () => {
    if (!data?.transactions?.length) return;
    const rows = data.transactions.map((t) => ({
      Date: new Date(t.date).toLocaleDateString(),
      Type: t.type,
      Description: t.description,
      Debit: t.debit || 0,
      Credit: t.credit || 0,
      Balance: t.balance || 0,
    }));
    const safeName = (partyName || "ledger").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-");
    const range =
      (from ? new Date(from).toISOString().slice(0, 10) : "any") +
      "_to_" +
      (to ? new Date(to).toISOString().slice(0, 10) : "any");
    downloadCSV(`${safeName}-${range}.csv`, rows);
  };

  const onPrint = () => {
    // Customize your brand here
    printLedgerWithFallback({
      company: { name: "Your Company Name", logo: "/logo.png" }, // <-- replace with your real logo/name
      title: baseTitle,
      partyName,
      from,
      to,
      opening: data?.openingBalance ?? 0,
      closing: data?.closingBalance ?? 0,
      transactions: data?.transactions ?? [],
    });
  };

  return (
    <div className="max-w-screen-2xl mx-auto px-4 md:px-6 lg:px-8 pb-10">
      {/* header gradient */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl text-white p-6 shadow">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <div className="text-sm/5 text-white/80">{partyLabel} Ledger</div>
              <h1 className="text-3xl font-bold tracking-tight">{displayTitle}</h1>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Select
                options={parties}
                value={selectedOption || null}
                onChange={(opt) => setPartyId(opt?.value || "")}
                placeholder={`Select ${partyLabel}`}
                isSearchable
                className="min-w-[240px] text-black"
              />
              <input
                type="date"
                className="bg-white/95 text-black rounded-xl px-3 py-2"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
              <input
                type="date"
                className="bg-white/95 text-black rounded-xl px-3 py-2"
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* actions + stats */}
      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          <div className="flex-1">
            <ErrorBanner message={err} />
          </div>
          <div className="flex items-center gap-2 md:justify-end">
            <Button variant="ghost" onClick={onExport} disabled={!data?.transactions?.length}>
              Export CSV
            </Button>
            <Button variant="ghost" onClick={onPrint} disabled={!data?.transactions}>
              Print
            </Button>
            <Button onClick={onView} disabled={!partyId || loading}>
              {loading ? "Loading..." : "View"}
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <Stat
            label={`Opening ${currencyLabel}`}
            value={currencyFmt.format(data?.openingBalance ?? 0)}
          />
          <Stat label="Transactions" value={numFmt(data?.transactions?.length ?? 0)} />
          <Stat
            label={`Closing ${currencyLabel}`}
            value={currencyFmt.format(data?.closingBalance ?? 0)}
          />
        </div>
      </Card>

      {/* table / content */}
      <Card className="p-4">
        {loading ? (
          <div className="py-10 flex justify-center">
            <Spinner label="Fetching ledger…" />
          </div>
        ) : (
          <LedgerTable transactions={data?.transactions || []} />
        )}
      </Card>
    </div>
  );
}

/* ---------- exported pages ---------- */
export function CustomerLedgerPage() {
  return (
    <LedgerView
      baseTitle="Customer Ledger"
      partyLabel="Customer"
      partyPath="/api/customers"
      ledgerPath="/api/ledger/customers"
      currencyLabel="Receivable"
    />
  );
}
export function SupplierLedgerPage() {
  return (
    <LedgerView
      baseTitle="Supplier Ledger"
      partyLabel="Supplier"
      partyPath="/api/suppliers"
      ledgerPath="/api/ledger/suppliers"
      currencyLabel="Payable"
    />
  );
}
