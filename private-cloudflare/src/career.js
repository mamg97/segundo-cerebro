let cache = { value: null, expiresAt: 0, spreadsheetId: null, spreadsheetIdExpiresAt: 0 };
const SOURCE_TITLE = "SEGUNDO CEREBRO - CARRERA";

export function hasCareerGoogleConfig(env) {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_REFRESH_TOKEN);
}

function table(values = []) {
  if (!values.length) return [];
  const headers = values[0].map((value) => String(value ?? "").trim());
  return values.slice(1)
    .filter((row) => row.some((value) => value !== "" && value !== null && value !== undefined))
    .map((row) => Object.fromEntries(headers.map((header, index) => [header, row?.[index] ?? null])));
}
function numberOrNull(value) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number(String(value).trim().replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function clean(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  return text || null;
}
function profileMap(rows = []) {
  const out = {};
  for (const row of rows) {
    const key = clean(row.key);
    if (!key) continue;
    out[key] = { value: row.value ?? null, status: clean(row.status), source: clean(row.source), updatedAt: clean(row.updated_at) };
  }
  return out;
}
function newest(groups = []) {
  return groups.flat().map((row) => clean(row.updated_at || row.updatedAt)).filter(Boolean).sort().at(-1) || null;
}

export function buildCareerPayload(valueRanges = []) {
  const profileRows = table(valueRanges[0]?.values || []);
  const opportunityRows = table(valueRanges[1]?.values || []);
  const orgRows = table(valueRanges[2]?.values || []);
  const compensationRows = table(valueRanges[3]?.values || []);
  const assetRows = table(valueRanges[4]?.values || []);
  const goalRows = table(valueRanges[5]?.values || []);
  const decisionRows = table(valueRanges[6]?.values || []);
  const profile = profileMap(profileRows);

  const opportunities = opportunityRows.map((row) => ({
    id: clean(row.opportunity_id), organization: clean(row.organization), role: clean(row.role),
    type: clean(row.type), status: clean(row.status) || "unknown", location: clean(row.location),
    priority: clean(row.priority), fitEstimate: clean(row.fit_estimate),
    compensation: { min: numberOrNull(row.comp_min_eur), mid: numberOrNull(row.comp_mid_eur), max: numberOrNull(row.comp_max_eur), status: clean(row.comp_status) },
    nextAction: clean(row.next_action), blocker: clean(row.blocker), url: clean(row.url),
    notes: clean(row.notes), updatedAt: clean(row.updated_at)
  })).filter((item) => item.id);

  const organization = orgRows.map((row) => ({
    id: clean(row.person_id), name: clean(row.name), role: clean(row.role), function: clean(row.function),
    reportsTo: clean(row.reports_to), relationToUser: clean(row.relation_to_user), evidence: clean(row.evidence),
    updatedAt: clean(row.updated_at)
  })).filter((item) => item.id);

  const compensation = compensationRows.map((row) => ({
    id: clean(row.scenario_id), label: clean(row.label), min: numberOrNull(row.fixed_min_eur),
    mid: numberOrNull(row.fixed_mid_eur), max: numberOrNull(row.fixed_max_eur), status: clean(row.status),
    interpretation: clean(row.interpretation), source: clean(row.source), updatedAt: clean(row.updated_at)
  })).filter((item) => item.id);

  const assets = assetRows.map((row) => ({
    id: clean(row.asset_id), type: clean(row.type), label: clean(row.label), status: clean(row.status),
    url: clean(row.url), nextAction: clean(row.next_action), notes: clean(row.notes), updatedAt: clean(row.updated_at)
  })).filter((item) => item.id);

  const goals = goalRows.map((row) => ({
    id: clean(row.goal_id), title: clean(row.title), horizon: clean(row.horizon), status: clean(row.status),
    metric: clean(row.metric), target: clean(row.target), nextAction: clean(row.next_action), updatedAt: clean(row.updated_at)
  })).filter((item) => item.id);

  const decisions = decisionRows.map((row) => ({
    id: clean(row.decision_id), title: clean(row.title), status: clean(row.status), question: clean(row.question),
    options: clean(row.options), currentView: clean(row.current_view), nextAction: clean(row.next_action), updatedAt: clean(row.updated_at)
  })).filter((item) => item.id);

  const active = opportunities.filter((item) => !["closed","rejected","withdrawn"].includes(String(item.status).toLowerCase()));
  const openDecisions = decisions.filter((item) => String(item.status).toLowerCase() === "open");
  const blockedAssets = assets.filter((item) => /blocked|needs_|pending/i.test(String(item.status || "")));

  return {
    profile, opportunities, organization, compensation, assets, goals, decisions,
    summary: {
      currentEmployer: profile.current_employer?.value ?? null,
      currentRole: profile.current_role?.value ?? null,
      location: profile.location?.value ?? null,
      fixedSalary: numberOrNull(profile.current_fixed_salary_eur?.value),
      activeOpportunityCount: active.length,
      openDecisionCount: openDecisions.length,
      blockedAssetCount: blockedAssets.length,
      nextAction: active.find((item) => item.priority === "high" && item.nextAction)?.nextAction
        || active.find((item) => item.nextAction)?.nextAction
        || goals.find((item) => item.status === "active" && item.nextAction)?.nextAction || null,
      updatedAt: newest([profileRows, opportunityRows, orgRows, compensationRows, assetRows, goalRows, decisionRows])
    },
    source: { kind: "private-sheet", name: SOURCE_TITLE, owner: "GESTOR DE CARRERA PROFESIONAL" }
  };
}

async function resolveSpreadsheetId(env, token) {
  if (env.CAREER_SHEET_ID) return String(env.CAREER_SHEET_ID).trim();
  if (cache.spreadsheetId && cache.spreadsheetIdExpiresAt > Date.now()) return cache.spreadsheetId;
  const params = new URLSearchParams({
    q: "name = '" + SOURCE_TITLE + "' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
    fields: "files(id,name,modifiedTime)", orderBy: "modifiedTime desc", pageSize: "10"
  });
  const response = await fetch("https://www.googleapis.com/drive/v3/files?" + params.toString(), { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("GOOGLE_DRIVE_" + response.status);
  const sheet = ((await response.json())?.files || []).find((item) => item?.name === SOURCE_TITLE);
  if (!sheet?.id) throw new Error("CAREER_SHEET_NOT_FOUND");
  cache.spreadsheetId = sheet.id;
  cache.spreadsheetIdExpiresAt = Date.now() + 10 * 60_000;
  return sheet.id;
}

export async function resolveCareerSpreadsheetId(env, getGoogleAccessToken) {
  if (!hasCareerGoogleConfig(env)) throw new Error("CAREER_NOT_CONFIGURED");
  return resolveSpreadsheetId(env, await getGoogleAccessToken(env));
}

export async function fetchCareerSummary(env, getGoogleAccessToken) {
  if (!hasCareerGoogleConfig(env)) return { status: "not-configured", value: null };
  if (cache.value && cache.expiresAt > Date.now()) return { status: "ok-cache", value: cache.value };
  const token = await getGoogleAccessToken(env);
  const spreadsheetId = await resolveSpreadsheetId(env, token);
  const ranges = ["Perfil!A1:E250","Oportunidades!A1:Q500","Organigrama!A1:H500","Compensacion!A1:I500","Activos!A1:H500","Objetivos!A1:H500","Decisiones!A1:H500"];
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("majorDimension", "ROWS");
  params.set("valueRenderOption", "UNFORMATTED_VALUE");
  const endpoint = "https://sheets.googleapis.com/v4/spreadsheets/" + encodeURIComponent(spreadsheetId) + "/values:batchGet?" + params.toString();
  const response = await fetch(endpoint, { headers: { Authorization: "Bearer " + token } });
  if (!response.ok) throw new Error("GOOGLE_SHEETS_" + response.status);
  const value = buildCareerPayload((await response.json()).valueRanges || []);
  cache.value = value;
  cache.expiresAt = Date.now() + 60_000;
  return { status: "ok", value };
}
