import { createTargetRef } from "./commitment-contracts.js";

const finite = value => Number.isFinite(Number(value));

export function retainResourceTarget({ needId, resourceKind = "resource", incumbent, challenger, tick = 0, minimumReviewTick = -Infinity, incumbentDistance = Infinity, challengerDistance = Infinity, invalid = false, routeUnavailable = false, stalled = false, etaIncreaseRatio = 0, improvementRatio = .7 } = {}) {
  const current = createTargetRef(incumbent, { needId, targetKind: resourceKind, tick }), next = createTargetRef(challenger, { needId, targetKind: resourceKind, tick });
  if (!current) return Object.freeze({ retain: false, selected: next, reason: `no incumbent ${resourceKind} target` });
  if (invalid) return Object.freeze({ retain: false, selected: next, reason: `${resourceKind} target changed because the incumbent became invalid` });
  if (routeUnavailable) return Object.freeze({ retain: false, selected: next, reason: `${resourceKind} target changed because no viable route remained` });
  if (stalled) return Object.freeze({ retain: false, selected: next, reason: `${resourceKind} target changed after prolonged negligible progress` });
  if (Number(etaIncreaseRatio) >= .35) return Object.freeze({ retain: false, selected: next, reason: `${resourceKind} target changed because ETA deteriorated by at least 35%` });
  if (!next || current.targetKey === next.targetKey) return Object.freeze({ retain: true, selected: current, reason: `${resourceKind} target retained; evidence refreshed without changing identity` });
  const materiallyBetter = finite(challengerDistance) && finite(incumbentDistance) && Number(challengerDistance) <= Number(incumbentDistance) * improvementRatio;
  if (tick >= minimumReviewTick && materiallyBetter) return Object.freeze({ retain: false, selected: next, reason: `${resourceKind} target changed because the challenger costs at most ${Math.round(improvementRatio * 100)}% of the incumbent journey` });
  return Object.freeze({ retain: true, selected: current, reason: tick < minimumReviewTick ? `${resourceKind} target retained through the minimum commitment window` : `${resourceKind} target retained; challenger did not meet the switching threshold` });
}
