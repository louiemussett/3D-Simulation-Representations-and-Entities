const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export function advanceSurfaceNestCare(nest = {}, elapsedDays = 0, attendantIds = []) {
  if (nest.status !== "incubating") return nest;
  const elapsed = Math.max(0, Number(elapsedDays) || 0), attended = attendantIds.length > 0;
  const next = { ...nest, guardedBy: [...attendantIds] };
  if (attended) next.unattendedDays = 0;
  else {
    next.unattendedDays = Math.max(0, Number(nest.unattendedDays) || 0) + elapsed;
    if (["attended", "brooded", "communal"].includes(nest.careMode)) {
      const viability = Number.isFinite(Number(nest.viability)) ? Number(nest.viability) : 1;
      next.viability = clamp(viability - elapsed * .01, 0, 1);
    }
  }
  if (nest.careMode === "obligate" && next.unattendedDays >= 7) next.status = "failed";
  return next;
}

export function surfaceNestHatchCount(nest = {}) {
  if (nest.status !== "incubating") return 0;
  const viability = Number.isFinite(Number(nest.viability)) ? Number(nest.viability) : 1;
  return Math.max(0, Math.floor((Number(nest.count) || 0) * clamp(viability, 0, 1)));
}
