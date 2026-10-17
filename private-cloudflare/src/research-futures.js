import {parseFutureCatalogs, parseFutureMetrics, buildFutures} from './research-futures-engine.mjs';
import {buildComputationTrace} from './research-futures-trace.mjs';

export function researchFuturesResponse(experiments, searchParams) {
  const id = searchParams.get('catalog'), country = searchParams.get('country'), model = searchParams.get('model');
  if (!id || id.length > 160 || !/^\d{1,7}$/.test(country || '') || !/^[a-z_]{1,32}$/.test(model || '')) return {status: 400, body: {ok: false, code: 'INVALID_FUTURES_SELECTION'}};
  const catalogs = parseFutureCatalogs(experiments), catalog = catalogs.accepted.find(c => c.id === id);
  if (!catalog) return {status: 422, body: {ok: false, code: 'FUTURES_SOURCE_NOT_VALIDATED'}};
  try {
    const result = buildFutures(catalog, country, model);
    const metrics = parseFutureMetrics(experiments).accepted.filter(m => m.runId === catalog.runId && m.protocolSha256 === catalog.protocolSha256);
    return {status: 200, body: {ok: true, result, metrics, trace: buildComputationTrace(catalog, result)}};
  } catch {
    return {status: 422, body: {ok: false, code: 'FUTURES_CALCULATION_REJECTED'}};
  }
}
