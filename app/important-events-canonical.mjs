// The private Events sheet is authoritative for the display date when an
// important event has one unique canonical record. The raw agenda is unchanged.
const canonicalTitle = value => String(value || "").normalize("NFD")
  .split("").filter(char => char.charCodeAt(0) < 768 || char.charCodeAt(0) > 879)
  .join("").toLocaleLowerCase("es").trim().replace(/\s+/g," ");

export function canonicalImportantEventDate(events, title) {
  const requested = canonicalTitle(title);
  if (!requested) return null;
  const found = (Array.isArray(events) ? events : []).filter(item =>
    item?.startsAt && item.status !== "CANCELADO" &&
    canonicalTitle(item.title) === requested);
  return found.length === 1 ? found[0] : null;
}
