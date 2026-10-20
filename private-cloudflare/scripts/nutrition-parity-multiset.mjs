// Pure, privacy-safe comparison: duplicate rows are counted independently.
// Signatures stay in memory; only aggregate mismatch counts are returned.
export function compareSignatureMultisets(lightRows, fullRows, signature) {
  const count = (rows) => {
    const counts = new Map();
    for (const row of rows) {
      const key = signature(row);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  };
  const light = count(lightRows);
  const full = count(fullRows);
  let lightOnly = 0;
  let fullOnly = 0;
  for (const key of new Set([...light.keys(), ...full.keys()])) {
    const difference = (light.get(key) || 0) - (full.get(key) || 0);
    if (difference > 0) lightOnly += difference;
    if (difference < 0) fullOnly -= difference;
  }
  return { lightOnly, fullOnly };
}
