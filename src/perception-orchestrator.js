/** Classifies already-generated observations into bounded receiver channels.
 * Source detection and biological interpretation remain outside this adapter. */
export function classifySensoryContacts({ animal, contacts, attention, tick, noticesSound, evidenceRef }) {
  const sensoryBuffer = [], sight = [], heardEvents = [], receivedSignals = [], mapReveals = [];
  for (const contact of contacts) {
    if (contact.channel === "hearing" && !contact.acoustic && !noticesSound(animal.speciesId, contact.confidence, attention.focusTicks)) continue;
    const ref = evidenceRef(contact, tick);
    sensoryBuffer.push(ref);
    if (ref.channel === "sight") sight.push(ref);
    if (ref.channel === "hearing" && !ref.signalKind) heardEvents.push(ref);
    if (ref.signalKind || ref.channel === "visual-signal") receivedSignals.push(ref);
    if (contact.explicitMapReveal === true) mapReveals.push(ref);
  }
  return Object.freeze({ sensoryBuffer, sight, heardEvents, receivedSignals, mapReveals });
}

