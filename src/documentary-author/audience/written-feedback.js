const RULES = Object.freeze([
  { tag: "CAMERA_TOO_DISTANT", positive: [/too far(?: away)?/i, /zoom in/i, /cannot see (?:the )?(?:animal|subject)/i, /can.t see (?:the )?(?:animal|subject)/i], negative: [/not too far/i] },
  { tag: "CAMERA_TOO_CLOSE", positive: [/too close/i, /zoom out/i], negative: [/not too close/i] },
  { tag: "CAMERA_LOOP", positive: [/camera loop/i, /keeps? circling/i, /going around again/i, /orbit(?:ing)? again/i], negative: [/not (?:looping|circling)/i] },
  { tag: "NARRATION_REPEATED", positive: [/same (?:sentence|thing|information)/i, /already said/i, /repeat(?:ing|ed|s)? (?:itself|the same)/i], negative: [/not repeat/i] },
  { tag: "FOLLOW_ENTITY", positive: [/follow this (?:one|animal|entity)/i, /stay with this (?:one|animal|entity)/i, /keep following/i], negative: [/do not follow/i, /don.t follow/i] },
  { tag: "MORE_TOPIC:WEATHER", positive: [/more weather/i, /show (?:the )?rain/i, /focus on climate/i], negative: [/less weather/i] },
  { tag: "MORE_TOPIC:WATER", positive: [/more water/i, /show (?:the )?(?:river|runoff|hydrology)/i], negative: [/less water/i] },
  { tag: "MORE_TOPIC:PERCEPTION", positive: [/more perception/i, /more sens(?:e|es|ory)/i, /show what .* (?:see|hear|smell)/i], negative: [/less perception/i] },
  { tag: "MORE_CHARACTER_FOCUS", positive: [/more (?:animals|characters|individuals)/i, /focus on (?:animals|entities)/i], negative: [/less (?:animals|characters)/i] },
  { tag: "MORE_WORLD_CONTEXT", positive: [/more (?:world|nature|landscape|ecosystem)/i, /focus on (?:terrain|plants|climate)/i], negative: [/less (?:world|landscape)/i] },
  { tag: "TOO_MUCH_NARRATION", positive: [/too much (?:talking|narration|speech)/i, /talks? too much/i], negative: [/not enough narration/i] },
  { tag: "NOT_ENOUGH_EXPLANATION", positive: [/not enough (?:detail|explanation)/i, /explain more/i], negative: [/too much explanation/i] }
]);

export function parseWrittenAudienceFeedback(text = "") {
  const source = String(text).slice(0, 2000), proposed = [];
  for (const rule of RULES) { if (rule.negative.some(pattern => pattern.test(source))) continue; if (rule.positive.some(pattern => pattern.test(source))) proposed.push(rule.tag); }
  return Object.freeze({ parserVersion: 1, text: source, proposedTags: Object.freeze([...new Set(proposed)]), requiresConfirmation: proposed.length > 0, learningApplied: false });
}

export function confirmWrittenAudienceFeedback(parsed, confirmedTags = []) {
  const allowed = new Set(parsed.proposedTags || []), confirmed = [...new Set(confirmedTags)].filter(tag => allowed.has(tag)); return Object.freeze({ ...parsed, confirmedTags: Object.freeze(confirmed), learningApplied: confirmed.length > 0 });
}
