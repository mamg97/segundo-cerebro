import { handleRequest } from "./server.mjs";

function safeResult(value) {
  if (!value || typeof value !== "object") return value;
  const copy = { ...value };
  delete copy.download_link;
  delete copy.openaiFileIdRefs;
  return copy;
}

const raw = String(process.env.OBJECTS_SEED_JOBS || "").trim();
if (!raw) {
  console.info("[objects-seed]", { stage: "skipped", reason: "OBJECTS_SEED_JOBS_EMPTY" });
  process.exit(0);
}

let jobs;
try {
  jobs = JSON.parse(raw);
} catch {
  console.error("[objects-seed]", { stage: "invalid_config" });
  process.exit(1);
}
if (!Array.isArray(jobs) || jobs.length < 1 || jobs.length > 8) {
  console.error("[objects-seed]", { stage: "invalid_jobs" });
  process.exit(1);
}

let failed = false;
for (let index = 0; index < jobs.length; index += 1) {
  const job = jobs[index];
  const objetoId = String(job?.objeto_id || "");
  console.info("[objects-seed]", { stage: "start", index: index + 1, objetoId });
  const request = new Request("http://seed.local/ingest-object-image", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + String(process.env.CHATGPT_ACTION_API_KEY || ""),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(job)
  });
  const response = await handleRequest(request, process.env);
  let body = null;
  try { body = await response.json(); } catch {}
  console.info("[objects-seed]", {
    stage: response.ok ? "done" : "failed",
    index: index + 1,
    objetoId,
    status: response.status,
    result: safeResult(body)
  });
  if (!response.ok) {
    failed = true;
    break;
  }
}

if (failed) process.exit(1);
