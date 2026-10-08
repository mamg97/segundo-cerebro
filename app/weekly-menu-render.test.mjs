import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("./app.js", import.meta.url), "utf8");
const start = app.indexOf("function renderMenuPanel(data)");
const end = app.indexOf("function hideHomeWeeklyMenu()", start);
assert.ok(start >= 0 && end > start, "renderMenuPanel must exist");
const menuPanel = app.slice(start, end);

assert.match(app, /function renderWeeklyMenuMealGroup\(items\)/);
assert.match(menuPanel, /const mealGroups = groupWeeklyMenuItemsByMoment\(day\.items\)/);
assert.match(menuPanel, /renderWeeklyMenuMealGroup\(group\.items\)/);
assert.doesNotMatch(menuPanel, /day\.items\.map\(\(item\) => renderWeeklyMenuMeal\(item\)\)/);
assert.match(menuPanel, /mealGroups\.length} toma/);
assert.match(app, /nutritionStatus === "pending-confirmation"/);
assert.match(app, /no se inventan macros/);

// A row may legitimately reference both a complete recipe and a canonical
// pantry product; both independent destinations must remain accessible.
assert.match(app, /const pantryAction = foodId && item\?\.pantrySyncStatus === "linked"/);
assert.match(app, /data-menu-recipe-open/);
assert.match(app, /data-menu-product-open/);
assert.match(app, /return \x60[\s\S]*\+ pantryAction/);
