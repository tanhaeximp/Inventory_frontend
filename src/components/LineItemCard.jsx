// src/components/LineItemCard.jsx
export default function LineItemCard({
  index,
  productSelect,
  categorySelect,
  unitSelectOrInput,
  quantityInput,
  priceInput,
  amountLabel,
  onRemove,
  t,
}) {
  return (
    <div className="rounded-xl border p-3 space-y-3 bg-white">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-700">{t("product")}</div>
        <button type="button" onClick={onRemove} className="text-rose-600 text-sm hover:underline">
          {t("remove") || "Remove"}
        </button>
      </div>

      {productSelect}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-gray-500">{t("category")}</div>
          {categorySelect}
        </div>
        <div>
          <div className="text-xs text-gray-500">{t("unit")}</div>
          {unitSelectOrInput}
        </div>
        <div>
          <div className="text-xs text-gray-500">{t("qty")}</div>
          {quantityInput}
        </div>
        <div>
          <div className="text-xs text-gray-500">{t("rate")}</div>
          {priceInput}
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="text-sm text-gray-600">{t("amount")}</div>
        <div className="text-base font-semibold tabular-nums">{amountLabel}</div>
      </div>
    </div>
  );
}
