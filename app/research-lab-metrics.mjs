export const isResearchScore = row => Boolean(row) && row.status !== 'CATALOGO_RETROSPECTIVO' && row.metric !== 'contexto' && row.modelVersion !== 'ged-context-v1';
