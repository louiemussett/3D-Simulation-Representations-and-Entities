export const SCIENTIFIC_EVIDENCE_SCHEMA = 1;
export const EVIDENCE_GRADES = Object.freeze(["measured-exact-species", "observed-exact-species", "inferred-exact-species", "close-species-proxy", "genus-proxy", "family-proxy", "composite-model", "unknown"]);

export function scientificDatum({ value = null, units = "dimensionless", range = null, evidenceGrade = "unknown", confidence = 0, sourceIds = [], extractionMethod = "not-recorded", proxyTaxon = null, limitations = [] } = {}) {
  return Object.freeze({ schemaVersion: SCIENTIFIC_EVIDENCE_SCHEMA, value, units, range: range ? Object.freeze([...range]) : null, evidenceGrade, confidence: Math.max(0, Math.min(1, Number(confidence) || 0)), sourceIds: Object.freeze([...sourceIds]), extractionMethod, proxyTaxon, limitations: Object.freeze([...limitations]) });
}

export const HUMAN_PERCEPTION_REFERENCE = Object.freeze({
  id: "human-reference", simulated: false,
  temporalResolution: scientificDatum({ value: 39.2, units: "Hz", range: [34.1, 44.3], evidenceGrade: "measured-exact-species", confidence: .82, sourceIds: ["pmc-8537539", "doi-10.1007-s00421-025-05935-7"], extractionMethod: "published-summary", limitations: ["Critical flicker fusion varies with luminance, contrast, retinal location, stimulus size, method and age."] }),
  binocularOverlap: scientificDatum({ value: 120, units: "degrees", range: [110, 130], evidenceGrade: "composite-model", confidence: .55, sourceIds: [], limitations: ["Scientific comparison aid only; not a simulated animal default."] }),
  externalEarMobility: scientificDatum({ value: 0, units: "radians", range: [0, 0], evidenceGrade: "observed-exact-species", confidence: .95, sourceIds: [], extractionMethod: "comparative-anatomy" }),
  pupilResponse: scientificDatum({ value: "light-and-arousal-dependent", units: "categorical", evidenceGrade: "observed-exact-species", confidence: .9, sourceIds: [], extractionMethod: "comparative-reference" })
});

export function validateScientificDatum(datum, path = "datum") {
  const errors = [];
  if (!datum || typeof datum !== "object") return [`${path}: missing scientific datum`];
  if (!datum.units) errors.push(`${path}: missing units`);
  if (!EVIDENCE_GRADES.includes(datum.evidenceGrade)) errors.push(`${path}: invalid evidence grade`);
  if (!(Number(datum.confidence) >= 0 && Number(datum.confidence) <= 1)) errors.push(`${path}: confidence outside 0..1`);
  if (!Array.isArray(datum.sourceIds)) errors.push(`${path}: sourceIds must be an array`);
  if (["measured-exact-species", "observed-exact-species"].includes(datum.evidenceGrade) && !datum.sourceIds.length) errors.push(`${path}: exact evidence requires a source ID`);
  return errors;
}

export function evidenceReadiness(records = []) {
  const flattened = records.filter(Boolean), errors = flattened.flatMap((record, index) => validateScientificDatum(record, `records[${index}]`));
  const exact = flattened.filter(record => ["measured-exact-species", "observed-exact-species", "inferred-exact-species"].includes(record.evidenceGrade)).length;
  const sourced = flattened.filter(record => record.sourceIds?.length).length;
  return Object.freeze({ complete: flattened.length > 0 && !errors.length && exact === flattened.length && sourced === flattened.length, parameterCount: flattened.length, exactCount: exact, sourcedCount: sourced, gaps: Object.freeze(errors) });
}
