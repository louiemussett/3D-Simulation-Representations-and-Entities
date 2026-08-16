const uniqueIds = values => [...new Set((values || []).map(value => String(value || "")).filter(Boolean))];
const escapePattern = value => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const DOMAIN_PATTERNS = Object.freeze({
  physiology: /\b(health|hydration|water|energy|fuel|reserve|fat|glycogen|stomach|hunger|fatigue|endurance|burst|adrenaline|stress|recovery|injur|temperature|pregnan|lactat|nurs)\w*/i,
  perception: /\b(see|sees|sight|hear|hears|sound|smell|smells|scent|detect|notice|perceiv|track)\w*/i,
  memory: /\b(memory|memories|remember\w*|recollect\w*|evidence|learned)\b/i,
  prediction: /\b(predict|forecast|expect|likelihood|probab|uncertain|confidence|estimate)\w*/i,
  social: /\b(leader|mother|father|offspring|young|baby|juvenile|dependent|mate|group|herd|pack)\b/i,
  action: /\b(walk|run|search|graze|feed|drink|rest|hunt|chase|pursu|flee|escape|fight|travel|follow|join|approach)\w*/i
});

function aliasesFor(subject = {}) {
  return [...new Set([subject.id, subject.name, subject.displayName, subject.label]
    .map(value => String(value || "").trim()).filter(value => value.length >= 2))]
    .sort((left, right) => right.length - left.length);
}

function mentionedSubjects(text, subjects) {
  const source = String(text || "");
  return (subjects || []).filter(subject => aliasesFor(subject).some(alias => new RegExp(`(^|[^A-Za-z0-9])${escapePattern(alias)}(?=$|[^A-Za-z0-9])`, "i").test(source)));
}

function narrationDomains(text) {
  return Object.entries(DOMAIN_PATTERNS).filter(([, pattern]) => pattern.test(String(text || ""))).map(([domain]) => domain);
}

function rolePhrase(subject = {}, { groupSize = 0 } = {}) {
  if (subject.isLeader) return "the leader of this group";
  const stage = String(subject.lifeStage || "").toLowerCase();
  if (["dependent", "baby", "infant", "juvenile"].includes(stage)) return groupSize > 1 ? "the young animal in this group" : "this young animal";
  const sex = String(subject.sex || "").toUpperCase();
  if (groupSize > 1 && sex === "F") return "the female in this group";
  if (groupSize > 1 && sex === "M") return "the male in this group";
  return "this individual";
}

function replaceAliases(text, subject, replacement) {
  let result = String(text || "");
  for (const alias of aliasesFor(subject)) result = result.replace(new RegExp(`(^|[^A-Za-z0-9])${escapePattern(alias)}(?=$|[^A-Za-z0-9])`, "gi"), (_, prefix) => `${prefix}${replacement}`);
  return result.replace(/^./, character => character.toUpperCase());
}

/**
 * Creates one presentation contract for words, highlight and panel ownership.
 * It is documentary-only and never reads or mutates an animal's private state.
 */
export function cinemaEntityPresentation({ text = "", subjects = [], licensedSubjectIds = [], groupSize = 0 } = {}) {
  const licensed = new Set(uniqueIds(licensedSubjectIds));
  const candidates = (subjects || []).filter(subject => !licensed.size || licensed.has(String(subject.id)));
  const mentioned = mentionedSubjects(text, candidates);
  const subject = mentioned[0] || null;
  const domains = narrationDomains(text);
  const deepDomains = domains.filter(domain => ["physiology", "perception", "memory", "prediction"].includes(domain));
  const physiologyDetail = /\b(health|hydration|energy|fuel|reserve|fat|glycogen|stomach|fatigue|endurance|burst|adrenaline|stress|recovery|injur|temperature|pregnan|lactat)\w*/i.test(String(text || ""));
  const numericDetail = /\b\d+(?:\.\d+)?\s*(?:%|minutes?|hours?|days?)?\b/i.test(String(text || ""));
  const descriptiveDetail = /\b(very|high|low|critical|severe|depleted|recover|condition|status|capacity|burden|debt)\b/i.test(String(text || ""));

  if (!subject) return Object.freeze({ text: String(text || ""), depth: "ring", subjectId: uniqueIds(licensedSubjectIds)[0] || null, mentionedSubjectIds: Object.freeze([]), domains: Object.freeze(domains), roleWorded: false });

  const detailed = physiologyDetail || ["memory", "prediction"].some(domain => domains.includes(domain)) || numericDetail || descriptiveDetail;
  if (!detailed) {
    if (domains.includes("social")) return Object.freeze({ text: String(text || ""), depth: "condensed", subjectId: String(subject.id), mentionedSubjectIds: Object.freeze([String(subject.id)]), domains: Object.freeze(domains), roleWorded: false });
    const replacement = rolePhrase(subject, { groupSize });
    return Object.freeze({ text: replaceAliases(text, subject, replacement), depth: "ring", subjectId: String(subject.id), mentionedSubjectIds: Object.freeze([String(subject.id)]), domains: Object.freeze(domains), roleWorded: true });
  }

  const depth = deepDomains.length >= 2 || (numericDetail && deepDomains.length >= 1) ? "laboratory" : "full";
  return Object.freeze({ text: String(text || ""), depth, subjectId: String(subject.id), mentionedSubjectIds: Object.freeze([String(subject.id)]), domains: Object.freeze(domains), roleWorded: false });
}

export function cinemaPresentationNeedsInstrument(presentation) {
  return ["full", "laboratory"].includes(presentation?.depth);
}
