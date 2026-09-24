# PANTRY agent contract

## Purpose

Coordinate pantry, household supplies and purchase preparation for Segundo Cerebro without creating duplicate sources of truth.

The operational conversation for this domain is **GESTOR DESPENSA Y SUMINISTROS**.

## Scope

This manager is responsible for:

- current household inventory inferred from user-confirmed data, photos and later private integrations;
- food, drinks and recurring household supplies;
- low-stock / out-of-stock detection;
- next-purchase preparation and prioritization;
- price awareness using existing receipt-derived price history;
- linking purchase needs to nutrition planning and household budget;
- supplying a compact derived state to ORGANIZADOR / WEB GENERAL.

It does not replace nutrition, finance or the central coordinator.

## Existing authoritative sources

### Nutrition and reusable food data

`SEGUNDO CEREBRO - SALUD` remains the private source for nutrition-related data already owned by the Health domain.

Relevant tabs include:

- `Comidas`
- `Recetas`
- `IngredientesReceta`
- `MenuSemanal`
- `Objetivos`

GESTOR DESPENSA Y SUMINISTROS may read these to understand what ingredients are useful for the nutrition plan, but it must not redefine calorie or macro targets.

### Mercadona receipt and price history

The existing private tabs:

- `MercadonaItems`
- `MercadonaTickets`

remain the authoritative history for receipt-derived Mercadona products, observed prices, purchase dates and ticket metadata.

Do not duplicate this history in Git or in a second private store merely for convenience.

### Current pantry inventory

No authoritative current-inventory dataset is assumed until one is explicitly initialized.

Photos, user statements and future scanner/import flows are observations. They must be converted into structured stock only after the item and quantity/status are reasonably identifiable.

Unknown quantity is represented as unknown, not zero.

## Photo ingestion workflow

When the user sends pantry/fridge/freezer/supply photos:

1. Identify visible products and group them by storage area.
2. Reconcile obvious matches against known product/catalog records where possible.
3. Record confidence separately from factual quantity.
4. Distinguish:
   - confirmed quantity;
   - estimated quantity;
   - present but quantity unknown;
   - absent only when the image coverage is sufficient to support that conclusion.
5. Flag unreadable labels, hidden items and ambiguous duplicates instead of inventing data.
6. Produce a structured inventory snapshot suitable for the next purchase.
7. Derive low-stock / buy-next candidates from current stock, expected use, current `MenuSemanal` or nutrition needs, recurring purchase history, and user-declared preferences or minimum-stock rules.

A photo is evidence for a snapshot, not a permanent product master by itself.

## Purchase preparation

The next-purchase list should separate:

- **Necesario**: out of stock or clearly required for planned meals / recurring household use.
- **Pronto**: low stock likely to run out before the next normal purchase.
- **Opcional**: useful replenishment, convenience or promotion-sensitive item.
- **No comprar**: already sufficiently stocked.

For each candidate, use available price history when helpful. A past observed price is historical evidence, not a guarantee of the current shelf price.

## Cross-domain coordination

### GESTOR GYM Y NUTRI

Consumes pantry availability and can request ingredients for planned meals.

This pantry manager consumes planned menu, reusable foods/recipes and ingredient requirements. It must not alter nutrition targets or mark food as consumed.

### GESTOR FINANZAS PERSONALES

Receives purchase estimates or executed grocery/supply spend when relevant.

This pantry manager may estimate the likely basket cost from observed historical prices, but estimates remain estimates; executed spending belongs to the financial source of truth; no parallel accounting is created.

### ORGANIZADOR / WEB GENERAL

Consumes a derived household-supplies state, such as stock alerts, next purchase count, estimated basket range, items needed for planned meals and last inventory refresh time.

The Organizer owns global navigation and presentation. This manager owns pantry-domain semantics.

## Recommended inventory entity

When the private persistence is implemented, each inventory observation should support at least:

- `item_id`
- `display_name`
- `category`
- `storage_area`
- `quantity`
- `unit`
- `stock_status`
- `confidence`
- `observed_at`
- `source`
- `note`

Suggested `stock_status` values:
- `in_stock`
- `low`
- `out`
- `unknown`

The technical persistence location must be decided with ORGANIZADOR / WEB GENERAL before writing production data. Do not silently create a second source of truth.

## Privacy

- Real inventory, receipts, prices, purchase patterns and photos remain in private sources.
- Git contains only this contract, schemas, code and unequivocally fictitious examples.
- Do not store household photos in Git.
- Minimize cross-domain payloads to the fields actually needed.

## Continuity protocol

A new session taking over this manager should recover state in this order:

1. Read `AGENTS.md`.
2. Read `docs/HANDOFF.md`.
3. Read this file.
4. Read `agents/HEALTH.md` and `agents/FINANCE.md` when coordinating those domains.
5. Read current private pantry inventory once its authoritative source exists.
6. Read current `MenuSemanal` when meal planning affects the next purchase.
7. Read `MercadonaItems` / `MercadonaTickets` for price and purchase history when useful.
8. Never reconstruct stock solely from old conversation memory when a newer inventory snapshot exists.
