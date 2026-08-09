const sentence = value => {
  const text = String(value || "").trim();
  return text && /[.!?…]$/.test(text) ? text : text ? `${text}.` : "";
};
const firstSentence = value => String(value || "").match(/[^.!?]+[.!?]+|[^.!?]+$/)?.[0]?.trim() || "";
const stripStop = value => String(value || "").trim().replace(/[.!?…;:,]+$/g, "");
const capitalSentence = value => {
  const text = stripStop(value);
  return sentence(text ? `${text[0].toUpperCase()}${text.slice(1)}` : "");
};
const choose = (values, variant) => {
  const available = values.filter(Boolean);
  return available[Math.abs(Math.floor(Number(variant) || 0)) % available.length] || "";
};
const freezeEntries = entries => Object.freeze(Object.fromEntries(Object.entries(entries).map(([key, value]) => [key, Object.freeze({
  atoms: Object.freeze([...(value.atoms || [])]),
  pulses: Object.freeze((value.pulses || []).map(parts => Object.freeze([...parts]))),
  links: Object.freeze((value.links || []).map(parts => Object.freeze([...parts]))),
  sentences: Object.freeze([...(value.sentences || [])])
})])));

export const CINEMA_THREAD_TEMPOS = Object.freeze({
  flash: Object.freeze({ maximumSentences: 1, maximumWords: 14, initialDelayMs: 120, rateMultiplier: 1.18, maximumHoldSeconds: 6, cuePauseMs: 100, minimumCaptionMs: 650, interruptible: true }),
  urgent: Object.freeze({ maximumSentences: 1, maximumWords: 12, initialDelayMs: 160, rateMultiplier: 1.2, maximumHoldSeconds: 3.4, cuePauseMs: 140, minimumCaptionMs: 520, interruptible: true }),
  active: Object.freeze({ maximumSentences: 1, maximumWords: 22, initialDelayMs: 420, rateMultiplier: 1.07, maximumHoldSeconds: 5.5, cuePauseMs: 240, minimumCaptionMs: 650, interruptible: true }),
  developing: Object.freeze({ maximumSentences: 2, maximumWords: 38, initialDelayMs: 850, rateMultiplier: 1, maximumHoldSeconds: 9, cuePauseMs: 620, minimumCaptionMs: 800, interruptible: false }),
  reflective: Object.freeze({ maximumSentences: 2, maximumWords: 52, initialDelayMs: 1300, rateMultiplier: .96, maximumHoldSeconds: 13, cuePauseMs: 900, minimumCaptionMs: 900, interruptible: false })
});

/**
 * Evidence-safe editorial alternatives. Each semantic state has three useful
 * realisations: an atom, a sequence of caption/speech pulses, and a linked
 * clause. Longer documentary wording remains supplied by the validated scene.
 */
export const CINEMA_THREAD_PHRASE_LIBRARY = Object.freeze({
  predation: freezeEntries({
    evidence: { atoms: ["Scent.", "A trail.", "Prey sign."], pulses: [["Scent found.", "A trail begins."], ["Prey sign.", "The hunt begins."]], links: [["Scent confirmed", "the hunt begins"], ["A trail emerges", "the hunter follows"]], sentences: ["The hunter has found a prey trail.", "Fresh evidence has opened a hunt."] },
    approach: { atoms: ["Closing.", "Approach.", "Moving in."], pulses: [["Trail confirmed.", "Closing in."], ["Prey located.", "The gap narrows."]], links: [["The trail holds", "the hunter closes in"], ["Prey located", "the distance is closing"]], sentences: ["The hunter is closing on its prey.", "The approach has begun."] },
    pursuit: { atoms: ["Pursuit.", "The chase.", "Running."], pulses: [["Prey moving.", "Pursuit."], ["The chase begins.", "Distance closing."]], links: [["The prey is moving", "the chase is on"], ["The pursuit begins", "the camera follows"]], sentences: ["The chase is on.", "The pursuit is under way."] },
    contact: { atoms: ["Contact.", "A strike.", "Impact."], pulses: [["Contact.", "The outcome turns now."], ["The hunter reaches it.", "Impact."]], links: [["The hunter has reached its prey", "the encounter turns on contact"], ["Contact is made", "the outcome changes now"]], sentences: ["The hunter has reached its prey.", "Contact changes the encounter."] },
    "prey-response": { atoms: ["Has it noticed?", "Prey response?"], pulses: [["Danger nearby.", "Has it noticed?"], ["The camera turns.", "Watch the prey."]], links: [["Danger is approaching", "the camera checks the prey"], ["The hunter has evidence", "the prey's response remains the question"]], sentences: ["Now the camera checks the prey.", "Has the prey detected the danger?"] },
    "nearby-participant": { atoms: ["Another hunter.", "A possible joiner."], pulses: [["Another hunter nearby.", "Commitment uncertain."]], links: [["Another hunter is nearby", "participation still needs evidence"]], sentences: ["Another hunter is close to the encounter."] },
    "distance-overview": { atoms: ["The gap.", "One wider view."], pulses: [["Hunter and prey.", "One frame."]], links: [["Hunter and prey share the frame", "the gap becomes clear"]], sentences: ["The hunt is shown in one wider frame."] },
    "prey-condition": { atoms: ["Can it escape?", "Escape reserves."], pulses: [["The prey's reserves.", "Can it run?"]], links: [["The camera checks the prey's reserves", "escape now depends on capacity"]], sentences: ["The camera checks the prey's capacity to escape."] },
    "hunter-condition": { atoms: ["Can it continue?", "Pursuit reserves."], pulses: [["The hunter's reserves.", "Can it continue?"]], links: [["The camera checks the hunter's reserves", "pursuit has a physical cost"]], sentences: ["The camera checks the hunter's capacity to continue."] }
  }),
  reproduction: freezeEntries({
    courtship: { atoms: ["Courtship.", "An approach."], pulses: [["Courtship begins.", "Response pending."]], links: [["Courtship has begun", "the partner's response matters"]], sentences: ["A courtship interaction has begun."] },
    accepted: { atoms: ["Accepted.", "Courtship accepted."], pulses: [["An approach.", "Accepted."]], links: [["The approach is accepted", "the pair remains together"]], sentences: ["The courtship has been accepted."] },
    rejected: { atoms: ["Rejected.", "Courtship rejected."], pulses: [["An approach.", "Rejected."]], links: [["The approach is rejected", "the interaction changes"]], sentences: ["The courtship has been rejected."] },
    mating: { atoms: ["Mating.", "The pair mates."], pulses: [["The pair meets.", "Mating begins."]], links: [["The pair has come together", "mating begins"]], sentences: ["The pair has begun mating."] },
    "mating-complete": { atoms: ["Mating complete."], pulses: [["The exchange ends.", "The pair separates."]], links: [["Mating is complete", "the thread can follow what changes next"]], sentences: ["The mating interaction is complete."] }
  }),
  pregnancy: freezeEntries({
    labour: { atoms: ["Labour.", "Birth begins."], pulses: [["Labour begins.", "Condition matters now."]], links: [["Labour has begun", "the mother's condition matters now"]], sentences: ["Labour has begun."] },
    "early pregnancy": { atoms: ["Early pregnancy."], links: [["Pregnancy is established", "development is still early"]], sentences: ["This pregnancy is in its early stage."] },
    "mid pregnancy": { atoms: ["Mid-pregnancy."], links: [["Gestation is progressing", "the physical investment is growing"]], sentences: ["Gestation has reached its middle stage."] },
    "late pregnancy": { atoms: ["Late pregnancy."], links: [["Gestation is advanced", "labour is not assumed until it begins"]], sentences: ["This pregnancy is now advanced."] }
  }),
  caregiving: freezeEntries({
    nursing: { atoms: ["Nursing.", "The young feeds."], pulses: [["The young returns.", "Nursing."]], links: [["The young is nursing", "care and intake meet here"]], sentences: ["The young is nursing."] },
    reunion: { atoms: ["Reunion.", "Returning."], pulses: [["Separated.", "Returning now."]], links: [["The family is closing the separation", "a reunion is under way"]], sentences: ["The family is trying to reunite."] },
    protection: { atoms: ["Protection.", "Guarding."], pulses: [["Danger nearby.", "The caregiver guards."]], links: [["Danger has changed the exchange", "care becomes protection"]], sentences: ["Care has become protection."] },
    care: { atoms: ["Family care."], links: [["The dependent relationship persists", "the camera follows its next exchange"]], sentences: ["The family remains linked through care."] }
  }),
  feeding: freezeEntries({
    preference: { atoms: ["Preferred food.", "A selective meal."], pulses: [["Food found.", "Preference matters."], ["A possible meal.", "Not equal nourishment."]], links: [["Food is available", "species preference changes its value"], ["The animal begins to feed", "this food suits its registered diet"]], sentences: ["This food matches the species' registered preference.", "The feeding choice reflects a species-specific diet."] },
    "carcass-provenance": { atoms: ["Carrion identified.", "A particular carcass."], pulses: [["A carcass remains.", "Its source matters."], ["Carrion found.", "Preference now matters."]], links: [["The carcass retains its source species", "consumers value it differently"], ["The remains are edible", "but not equally preferred by every scavenger"]], sentences: ["The carcass's source species changes its value to this consumer.", "This carrion is evaluated by provenance as well as freshness."] },
    "tree-browsing": { atoms: ["Browsing.", "Foliage taken."], pulses: [["Reachable leaves.", "Browsing begins."], ["Foliage depleted.", "The trunk remains."]], links: [["The animal takes reachable foliage", "the living trunk remains"], ["Browsing removes the leaves", "regrowth will take time"]], sentences: ["The animal is browsing reachable tree foliage.", "The tree is losing foliage without being removed."] },
    "foliage-recovery": { atoms: ["Leaves return.", "Foliage recovers."], pulses: [["Time passes.", "Leaves return."]], links: [["Bounded regrowth is complete", "the tree can support browsing again"]], sentences: ["The browsed tree has recovered its foliage."] }
  }),
  spatial: freezeEntries({
    "home-range": { atoms: ["A familiar range."], pulses: [["Repeated use.", "No exclusive claim."]], links: [["This ground is used repeatedly", "it is not an established territory"]], sentences: ["This is a familiar home range, not a defended territory."] },
    "territory-establishing": { atoms: ["A claim forms.", "Occupancy holds."], pulses: [["Repeated presence.", "A claim strengthens."]], links: [["Local occupancy remains stable", "a territorial claim is forming"]], sentences: ["Stable occupancy is establishing a defended claim."] },
    "territory-established": { atoms: ["Territory established.", "A defended claim."], pulses: [["The claim holds.", "This ground is defended."]], links: [["The claim is established", "intrusion now carries social pressure"]], sentences: ["An established territory now shapes this encounter."] },
    "territory-dispute": { atoms: ["Disputed ground.", "Claims overlap."], pulses: [["Two claims.", "One overlap."], ["Territories overlap.", "Conflict is possible."]], links: [["Two established claims overlap", "a dispute is now active"], ["The boundary is disputed", "combat is not inevitable"]], sentences: ["Two established territories now overlap in dispute.", "This overlap creates territorial pressure without guaranteeing a fight."] },
    relocation: { atoms: ["The old claim resets."], pulses: [["The owner relocates.", "Establishment restarts."]], links: [["The owner has relocated", "the former local claim no longer follows it"]], sentences: ["Relocation has reset the local territorial claim."] }
  })
});

export function cinemaThreadTempo(scene = {}) {
  const kind = scene.interactionKind, phase = scene.interactionPhase, stage = scene.chainStage;
  if (kind === "predation" && ["evidence", "approach", "pursuit", "contact"].includes(phase) && !stage?.includes("condition")) return "flash";
  if (kind === "pregnancy" && phase === "labour") return stage === "maternal-condition" ? "active" : "urgent";
  if (kind === "reproduction") return ["mating", "accepted", "rejected"].includes(phase) ? "active" : "developing";
  if (kind === "caregiving") return ["nursing", "reunion", "protection"].includes(phase) ? "active" : "developing";
  if (kind === "feeding") return ["tree-browsing", "carcass-provenance"].includes(phase) ? "active" : "developing";
  if (kind === "spatial") return phase === "territory-dispute" ? "active" : "developing";
  if (kind === "pregnancy") return stage === "reproductive-outlook" ? "reflective" : "developing";
  return "developing";
}

function phraseEntry(scene) {
  const family = CINEMA_THREAD_PHRASE_LIBRARY[scene.interactionKind];
  return family?.[scene.chainStage] || family?.[scene.interactionPhase] || null;
}

/** Joins independently valid short observations without inventing a new claim. */
export function composeCinemaThreadFragments(parts = [], { mode = "pulse", maximumParts = 2 } = {}) {
  const clean = parts.map(part => stripStop(part)).filter(Boolean).slice(0, Math.max(1, maximumParts));
  if (!clean.length) return { text: "", segments: [] };
  if (mode === "linked") return { text: sentence(clean.join("; ")), segments: [sentence(clean.join("; "))] };
  const segments = clean.map(capitalSentence);
  return { text: segments.join(" "), segments };
}

function realiseEntry(entry, tempo, variant) {
  if (!entry) return { text: "", segments: [], realisation: "none" };
  const index = Math.abs(Math.floor(Number(variant) || 0));
  if (tempo === "flash") {
    const text = sentence(choose(entry.sentences.length ? entry.sentences : entry.atoms, index));
    return { text, segments: text ? [text] : [], realisation: "single" };
  }
  if (["urgent", "active"].includes(tempo) && entry.links.length && index % 2) return { ...composeCinemaThreadFragments(choose(entry.links, index), { mode: "linked", maximumParts: 2 }), realisation: "linked" };
  const text = sentence(choose(entry.sentences.length ? entry.sentences : entry.atoms, index));
  return { text, segments: text ? [text] : [], realisation: "single" };
}

/** Returns evidence-safe wording and timing for one connected Cinema beat. */
export function cinemaThreadNarration(scene = {}, fallback = "", { variant = 0, contractBound = false } = {}) {
  if (!scene.chainId) return null;
  const tempo = cinemaThreadTempo(scene), policy = CINEMA_THREAD_TEMPOS[tempo];
  // A V3/V2 presentation contract has already bounded the allowed claims. Its
  // realised text may be shortened, but must not be replaced by an attractive
  // phrase whose claim was not licensed by that contract.
  if (contractBound) {
    const text = firstSentence(fallback), segments = text ? [sentence(text)] : [];
    return { tempo, text: segments[0] || "", segments, realisation: "contract", ...policy };
  }
  const realised = realiseEntry(phraseEntry(scene), tempo, variant);
  const fallbackText = tempo === "reflective" ? fallback : firstSentence(fallback) || sentence(scene.title) || firstSentence(scene.detail);
  const text = realised.text || fallbackText;
  return { tempo, text, segments: realised.segments.length ? realised.segments : text ? [sentence(text)] : [], realisation: realised.realisation === "none" ? "fallback" : realised.realisation, ...policy };
}

export function cinemaThreadChanged(previous = {}, current = null) {
  if (!previous.chainId) return { changed: false, urgent: false, reason: null };
  if (!current) {
    const tempo = cinemaThreadTempo(previous);
    return { changed: true, urgent: previous.interactionKind === "predation" || ["flash", "urgent"].includes(tempo), reason: "thread-resolved" };
  }
  const changed = previous.chainSignature !== current.signature;
  const tempo = cinemaThreadTempo({ interactionKind: current.kind, interactionPhase: current.phase, chainStage: current.scenes?.[0]?.chainStage });
  const decisive = current.kind === "predation" ? ["contact", "resolution", "consequence"].includes(current.phase) : ["urgent", "flash"].includes(tempo);
  return { changed, urgent: changed && decisive, reason: changed ? `thread-${current.phase}-changed` : null };
}
