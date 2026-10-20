// AV-075: operational descriptions only, not predictions or model outputs.
export const LAB_GLOSSARY=Object.freeze([
  {
    "id": "state_based",
    "label": "Violencia estatal",
    "variants": [
      "violencia estatal",
      "muertes estatales",
      "violencia organizada estatal"
    ],
    "short": "Violencia organizada en la que un Estado participa como parte del conflicto armado, según el indicador UCDP utilizado.",
    "detail": "Son muertes relacionadas con combates de conflictos con participación estatal, agregadas por país y año. No significa cualquier violencia de un gobierno ni predice ataques concretos."
  },
  {
    "id": "threshold25",
    "label": "Umbral de 25 muertes",
    "variants": [
      "25 o más muertes",
      "25 muertes",
      "umbral de 25",
      "≥25 muertes"
    ],
    "short": "Corte operativo de la clasificación anual binaria.",
    "detail": "Alcanzar 25 muertes estatales anuales sitúa al país en la categoría alta. No implica inicio confirmado de una nueva guerra."
  },
  {
    "id": "bridge",
    "label": "Puente no observado",
    "variants": [
      "puente no observado",
      "puente sin observar",
      "año puente"
    ],
    "short": "Año intermedio posterior al último dato permitido.",
    "detail": "Se integra en el árbol, pero su desenlace no fue conocido ni usado como dato disponible en el origen."
  },
  {
    "id": "revised",
    "label": "Fuente histórica revisada",
    "variants": [
      "fuente histórica revisada",
      "fuente revisada",
      "datos históricos revisados",
      "edición revisada"
    ],
    "short": "Edición cuyos registros pudieron corregirse después de los hechos.",
    "detail": "Un backtest con una versión revisada no acredita que sus datos fueran conocidos en la fecha histórica original."
  },
  {
    "id": "backtest",
    "label": "Backtest exploratorio",
    "variants": [
      "backtest exploratorio",
      "backtests",
      "backtest"
    ],
    "short": "Evaluación del modelo usando períodos históricos ya observados.",
    "detail": "Detecta errores y permite comparar con referencias. Sin control temporal no demuestra pronósticos emitidos entonces."
  },
  {
    "id": "markov",
    "label": "Markov global",
    "variants": [
      "markov global",
      "modelo de markov",
      "markov"
    ],
    "short": "Modelo de transición entre estados basado en frecuencias históricas.",
    "detail": "Es una referencia estadística, no una explicación causal ni una predicción de reuniones políticas."
  },
  {
    "id": "persistence",
    "label": "Persistencia",
    "variants": [
      "persistencia"
    ],
    "short": "Estado 11: dos años consecutivos por encima del umbral.",
    "detail": "No garantiza continuidad de una misma guerra; clasifica un indicador país-año."
  },
  {
    "id": "entry",
    "label": "Entrada",
    "variants": [
      "entrada en el episodio",
      "estado de entrada"
    ],
    "short": "Estado 01: pasa de debajo del umbral a 25 muertes o más.",
    "detail": "No debe interpretarse necesariamente como aparición de una guerra nueva."
  },
  {
    "id": "exit",
    "label": "Salida",
    "variants": [
      "salida del episodio",
      "estado de salida"
    ],
    "short": "Estado 10: desciende bajo el umbral tras un año superior.",
    "detail": "No implica que una guerra haya terminado."
  },
  {
    "id": "nodes",
    "label": "Nodos",
    "variants": [
      "nodos",
      "nodo"
    ],
    "short": "Probabilidad de cada estado en cada año del árbol.",
    "detail": "Los cuatro estados suman una masa probabilística igual a uno; no son países ni conflictos diferentes."
  },
  {
    "id": "flows",
    "label": "Flujos",
    "variants": [
      "flujo agregado",
      "flujos entre estados",
      "flujos"
    ],
    "short": "Probabilidad que transita de un estado a otro.",
    "detail": "No es la trayectoria particular de un país, una persona o una guerra."
  },
  {
    "id": "observed",
    "label": "Trayectoria observada",
    "variants": [
      "trayectoria observada",
      "recorrido observado",
      "realidad posterior"
    ],
    "short": "Secuencia de hechos registrada posteriormente.",
    "detail": "Solo se superpone para contrastar. No puede alimentar una predicción cuyo origen es anterior."
  },
  {
    "id": "horizon",
    "label": "Horizonte",
    "variants": [
      "horizonte",
      "horizontes"
    ],
    "short": "Número de períodos de avance hacia el desenlace.",
    "detail": "Un horizonte mayor acumula transiciones, pero no incorpora datos futuros al origen."
  },
  {
    "id": "cohort",
    "label": "Cohorte",
    "variants": [
      "cohorte",
      "cohortes"
    ],
    "short": "Conjunto de países, períodos y casos definido para evaluar.",
    "detail": "Cambiar el universo altera las comparaciones entre modelos."
  },
  {
    "id": "calibration",
    "label": "Calibración",
    "variants": [
      "calibración",
      "calibrado"
    ],
    "short": "Correspondencia entre probabilidades estimadas y frecuencias observadas.",
    "detail": "Si se anuncia muchas veces un 20 %, debería ocurrir aproximadamente en una quinta parte de casos comparables."
  },
  {
    "id": "brier",
    "label": "Brier Score",
    "variants": [
      "brier score",
      "brier"
    ],
    "short": "Error cuadrático medio de probabilidades contra resultados.",
    "detail": "Cuanto más bajo mejor; requiere comparación con baselines fuertes sobre la misma muestra."
  },
  {
    "id": "logloss",
    "label": "Log loss",
    "variants": [
      "log loss",
      "log-loss"
    ],
    "short": "Error que penaliza especialmente la certeza equivocada.",
    "detail": "Menor es mejor; complementa a Brier sin sustituirlo."
  },
  {
    "id": "skill",
    "label": "Skill",
    "variants": [
      "skill frente a markov",
      "skill / markov",
      "skill / frecuencia",
      "brier skill",
      "skill"
    ],
    "short": "Mejora relativa de error frente a un modelo de referencia.",
    "detail": "Debe especificarse el comparador y la muestra; negativo significa peor que la referencia."
  },
  {
    "id": "ece",
    "label": "ECE",
    "variants": [
      "ece"
    ],
    "short": "Estimación agrupada del error de calibración.",
    "detail": "Depende de la cantidad de observaciones y de cómo se dividen los grupos."
  },
  {
    "id": "ap",
    "label": "PR-AUC / AP",
    "variants": [
      "pr-auc",
      "average precision"
    ],
    "short": "Medida de clasificación especialmente útil para eventos escasos.",
    "detail": "Resume precisión y recuperación; compárala en una cohorte idéntica."
  },
  {
    "id": "confidence",
    "label": "Intervalo de incertidumbre",
    "variants": [
      "intervalo de confianza",
      "ic 95%",
      "intervalos de incertidumbre"
    ],
    "short": "Rango estimado bajo ciertos supuestos de muestreo.",
    "detail": "No indica que 95 % de países acertarán; la dependencia geopolítica limita su interpretación."
  },
  {
    "id": "bootstrap",
    "label": "Bootstrap",
    "variants": [
      "bootstrap",
      "remuestreo"
    ],
    "short": "Recalcular una métrica usando muestras reconstituidas.",
    "detail": "El remuestreo de países no reproduce necesariamente dependencia regional ni evolución temporal."
  },
  {
    "id": "prospective",
    "label": "Prospectivo",
    "variants": [
      "prospectivo",
      "prospectiva",
      "validación prospectiva"
    ],
    "short": "Pronóstico fijado antes de conocer su resultado.",
    "detail": "Exige emisión verificable, datos disponibles entonces, versión congelada y posterior evaluación."
  },
  {
    "id": "shadow",
    "label": "Shadow",
    "variants": [
      "shadow_no_emitido",
      "modo sombra",
      "shadow"
    ],
    "short": "Trabajo de investigación sin predicción prospectiva emitida.",
    "detail": "El estudio 2027 permanece en estado sombra hasta superar sellos y publicación reales."
  },
  {
    "id": "asof",
    "label": "As-of",
    "variants": [
      "as-of",
      "disponibilidad temporal"
    ],
    "short": "Acreditación de qué datos existían en una fecha concreta.",
    "detail": "Observar ahora el SHA de un archivo no demuestra que contuviera esos mismos datos años atrás."
  },
  {
    "id": "canonical",
    "label": "Datos canónicos",
    "variants": [
      "datos canónicos",
      "fuente canónica",
      "registro canónico"
    ],
    "short": "Fuente autorizada para trazabilidad y estado del proyecto.",
    "detail": "Evita discrepancias entre copias; no equivale a validar científicamente los resultados."
  },
  {
    "id": "hypothesis",
    "label": "Hipótesis",
    "variants": [
      "hipótesis"
    ],
    "short": "Proposición que se puede contrastar o refutar.",
    "detail": "Requiere prueba empírica; la plausibilidad narrativa no es evidencia por sí sola."
  },
  {
    "id": "micromacro",
    "label": "Micro-macro",
    "variants": [
      "micro-macro"
    ],
    "short": "Relación entre decisiones individuales y fenómenos colectivos.",
    "detail": "Una simulación ayuda a formular mecanismos, pero necesita contrastación real."
  },
  {
    "id": "replay",
    "label": "Replay explicable",
    "variants": [
      "replay explicable",
      "explainable replay"
    ],
    "short": "Reconstrucción visual trazable de un experimento.",
    "detail": "Una reproducción de hechos anteriores no acredita que el desenlace se hubiera pronosticado."
  },
  {
    "id": "storyboard",
    "label": "Storyboard",
    "variants": [
      "storyboard"
    ],
    "short": "Secuencia planificada de escenas para una explicación audiovisual.",
    "detail": "Es material pedagógico, no una emisión ni prueba estadística."
  },
  {
    "id": "evidence",
    "label": "Evidencia retrospectiva",
    "variants": [
      "evidencia retrospectiva"
    ],
    "short": "Resultados calculados sobre períodos ya conocidos.",
    "detail": "Puede orientar hipótesis, pero no prueba capacidad de predicción futura."
  }
]);
export const glossaryById=Object.freeze(Object.fromEntries(LAB_GLOSSARY.map(item=>[item.id,item])));
export const glossaryIds=Object.freeze(LAB_GLOSSARY.map(item=>item.id));
const candidates=LAB_GLOSSARY.flatMap(item=>item.variants.map(phrase=>({id:item.id,phrase}))).sort((a,b)=>b.phrase.length-a.phrase.length||a.id.localeCompare(b.id));
const escapeRegex=s=>s.replace(/[-/\\^$*+?.()|[\]{}]/g,'\\$&');
const pattern=new RegExp('(?<![\\p{L}\\p{N}])('+candidates.map(c=>escapeRegex(c.phrase)).join('|')+')(?![\\p{L}\\p{N}])','giu');
const ids=new Map(candidates.map(c=>[c.phrase.toLocaleLowerCase('es'),c.id]));
export function glossaryMatches(text,limit=6){
 if(typeof text!=='string'||!Number.isInteger(limit)||limit<=0)return [];
 pattern.lastIndex=0;
 const out=[];
 for(const match of text.matchAll(pattern)){
   const id=ids.get(match[0].toLocaleLowerCase('es'));
   if(id){out.push({start:match.index,end:match.index+match[0].length,id,label:match[0]});if(out.length>=limit)break;}
 }
 return out;
}
