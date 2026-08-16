const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, Number(value) || 0));
const rank = (members, score) => members.filter(member => member.alive).slice().sort((a, b) => score(b) - score(a) || String(a.id).localeCompare(String(b.id)));
const perceived = (animal, type) => (animal.sensoryBuffer || []).filter(contact => contact.type === type && contact.targetId);

export function assignContextualGroupRoles(members = [], { goal = "travelling", tick = 0 } = {}) {
  if (!members.length) return Object.freeze([]);
  const wolfPack = members[0].speciesId === "ridge-hunter-updated", deerGroup = members[0].speciesId === "valley-grazer-updated";
  for (const member of members) member.groupRoleState = { schemaVersion: 1, tick, goal, primary: member.lifeStage === "dependent" ? "dependent" : "member", secondary: [], reason: "ordinary group participation", confidence: .5 };
  const assign = (animal, role, reason, confidence = .7, primary = true) => {
    if (!animal) return;
    if (primary && ["member", "dependent"].includes(animal.groupRoleState.primary)) animal.groupRoleState.primary = role;
    else if (!animal.groupRoleState.secondary.includes(role)) animal.groupRoleState.secondary.push(role);
    animal.groupRoleState.reason = reason; animal.groupRoleState.confidence = clamp(confidence);
  };
  const adults = members.filter(member => !["dependent", "juvenile"].includes(member.lifeStage));
  const leader = members.find(member => member.id === member.groupLeaderId);
  assign(leader, "movement-initiator", "retained contextual group leadership", .8);
  const routeHolder = rank(adults, member => goal === "water" ? member.waterSkill || 0 : goal === "foraging" ? member.foodSkill || 0 : (member.waterSkill || 0) + (member.foodSkill || 0))[0];
  assign(routeHolder, "route-holder", `strongest retained knowledge for ${goal}`, .72, false);
  if (deerGroup) {
    const alarmSource = rank(adults, member => perceived(member, "predator").reduce((best, contact) => Math.max(best, contact.confidence || 0), 0))[0];
    if (alarmSource && perceived(alarmSource, "predator").length) assign(alarmSource, "alarm-source", "directly perceived predator evidence", .9);
    const sentinel = rank(adults.filter(member => member.id !== alarmSource?.id), member => (member.stationaryTicks || 0) * .08 + (100 - (member.fatigue || 0)) / 100 + (member.careAffinity || 0))[0];
    assign(sentinel, "sentinel", "well-conditioned adult available for vigilance", .68);
    for (const mother of adults.filter(member => (member.offspringIds || []).some(id => members.some(candidate => candidate.id === id && candidate.alive)))) assign(mother, "maternal-protector", "living dependent is present in the group", .92);
    const rearMonitor = rank(adults, member => perceived(member, "predator").length + (member.memoryPersistence || 0))[0];
    if (goal === "protection") assign(rearMonitor, "rear-monitor", "maintains observer-owned predator evidence during escape", .76, false);
  }
  if (wolfPack) {
    const evaluator = rank(adults, member => perceived(member, "animal").length + perceived(member, "prey").length + (member.scentSkill || 0))[0];
    assign(evaluator, "prey-evaluator", "strongest current prey evidence and scent skill", .78);
    const pursuers = rank(adults.filter(member => member.id !== evaluator?.id), member => (100 - (member.fatigue || 0)) / 100 + (member.sprintEnergy || 0) / 100 + (member.aggression || 0));
    if (["hunting", "carcass hunt"].includes(goal)) {
      assign(pursuers[0], "primary-pursuer", "best current pursuit capacity", .8);
      assign(pursuers[1], "left-pressure", "positionally available pursuit support", .65);
      assign(pursuers[2], "right-pressure", "positionally available pursuit support", .65);
    }
    const guardian = rank(adults, member => (member.careAffinity || 0) + ((member.offspringIds || []).length ? .5 : 0))[0];
    if (members.some(member => member.lifeStage === "dependent")) assign(guardian, "pup-guardian", "dependants remain with the pack", .82, false);
  }
  return Object.freeze(members.map(member => Object.freeze({ animalId: member.id, ...member.groupRoleState, secondary: Object.freeze([...member.groupRoleState.secondary]) })));
}
