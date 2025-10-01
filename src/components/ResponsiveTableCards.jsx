// src/components/ResponsiveTableCards.jsx
export default function ResponsiveTableCards({
  items,
  columns,               // [{ header: string, className?: string }]
  renderRow,             // (item, idx) => <tr>...</tr>
  renderCard,            // (item, idx) => <div>...</div>
  addButton = null,      // optional: <Button onClick={...}>+ Add</Button>
  minTableWidth = 800,   // ensures no cramped table on small screens
}) {
  return (
    <>
      {/* Mobile cards */}
      <div className="sm:hidden space-y-3">
        {items.map(renderCard)}
        {addButton ? <div className="pt-2">{addButton}</div> : null}
      </div>

      {/* Desktop table */}
      <div className="hidden sm:block overflow-x-auto scroll-soft">
        <table className={`w-full text-sm min-w-[${minTableWidth}px]`}>
          <thead className="bg-gray-50">
            <tr className="text-left text-gray-600">
              {columns.map((c, i) => (
                <th key={i} className={`px-3 py-2 ${c.className || ""}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map(renderRow)}
          </tbody>
        </table>
        {addButton ? <div className="p-3">{addButton}</div> : null}
      </div>
    </>
  );
}
