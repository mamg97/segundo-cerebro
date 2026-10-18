// Read-only reconciliation for nutrition views: MenuSemanal may confirm meals
// before a corresponding Registro row exists. Never write or infer consumption.
import { weeklyMenuConsumptionMatchKey } from "./weekly-menu.js";

export function menuConsumedFallbackForDate(registeredDayEntries, preparedMenuRows, date) {
  const existingKeys = new Set(
    (Array.isArray(registeredDayEntries) ? registeredDayEntries : [])
      .filter(row => row?.status === "consumido")
      .map(weeklyMenuConsumptionMatchKey)
      .filter(Boolean)
  );
  return (Array.isArray(preparedMenuRows) ? preparedMenuRows : [])
    .filter(row => row?.date === date && row.status === "consumido")
    .filter(row => {
      const key = weeklyMenuConsumptionMatchKey(row);
      return key && !existingKeys.has(key);
    })
    .map((row, index) => ({
      id: `menu-fallback-${index + 1}`,
      date: row.date,
      moment: row.moment,
      itemId: row.recipeId || row.foodId || null,
      productId: row.foodId || null,
      itemName: row.name,
      quantity: row.quantity,
      unit: row.unit,
      kcal: Number(row.kcal || 0),
      protein: Number(row.protein || 0),
      carbs: Number(row.carbs || 0),
      fat: Number(row.fat || 0),
      status: "consumido",
      source: "menu_consumed_fallback",
      note: row.note || "Consumido en MenuSemanal; pendiente de reconciliar con Registro.",
      updatedAt: row.updatedAt || null
    }));
}
