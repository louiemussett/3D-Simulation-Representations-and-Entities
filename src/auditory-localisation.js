import { acousticProfile } from "./acoustic-profiles.js";

const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const angleDifference = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const round = (value, places = 3) => Number(Number(value).toFixed(places));

/** Estimates the paired-ear cues available to the biological receiver. The
 * propagation field remains authoritative; this adds receiver anatomy only. */
export function binauralEstimate(listener, sourceBearingRadians, receivedSpectrumDb, { speedOfSound = 343 } = {}) {
  const profile = acousticProfile(listener), sensors = profile?.sensors || [];
  const left = sensors.find(sensor => sensor.side === "left"), right = sensors.find(sensor => sensor.side === "right");
  if (!left || !right) return Object.freeze({ available: false, interauralLevelDifferenceDb: 0, interauralTimeDifferenceSeconds: 0, bearingConfidence: 0 });
  // Acoustic bearings use +Z as zero; body orientation uses +X as zero.
  const sourceHeading = Math.PI / 2 - sourceBearingRadians, headHeading = (listener.orientation || 0) + (listener.headYaw || 0);
  const relative = angleDifference(sourceHeading, headHeading), separation = Math.abs(Number(right.localPosition?.[0] || .22) - Number(left.localPosition?.[0] || -.22));
  const directionality = Math.max(.1, Number(profile.localisation?.directionality || 1));
  const leftAim = Number(left.yawDegrees || 0) * Math.PI / 180 + Number(listener.orientingState?.leftEarYaw || 0), rightAim = Number(right.yawDegrees || 0) * Math.PI / 180 + Number(listener.orientingState?.rightEarYaw || 0);
  const leftGain = Math.max(.2, .55 + Math.cos(angleDifference(relative, leftAim)) * .45), rightGain = Math.max(.2, .55 + Math.cos(angleDifference(relative, rightAim)) * .45);
  const interauralLevelDifferenceDb = clamp(Math.sin(relative) * 5.5 * directionality + 6 * Math.log10(rightGain / leftGain), -18, 18);
  const interauralTimeDifferenceSeconds = clamp(Math.sin(relative) * separation / speedOfSound, -.0015, .0015);
  const meanLevel = receivedSpectrumDb?.length ? receivedSpectrumDb.reduce((sum, value) => sum + value, 0) / receivedSpectrumDb.length : 0;
  const leftLevelDb = meanLevel - interauralLevelDifferenceDb / 2, rightLevelDb = meanLevel + interauralLevelDifferenceDb / 2;
  return Object.freeze({ available: true, relativeBearingRadians: round(relative, 6), leftEarYawRadians: round(leftAim, 6), rightEarYawRadians: round(rightAim, 6), leftLevelDb: round(leftLevelDb), rightLevelDb: round(rightLevelDb), interauralLevelDifferenceDb: round(interauralLevelDifferenceDb), interauralTimeDifferenceSeconds: round(interauralTimeDifferenceSeconds, 7), bearingConfidence: round(clamp((Math.abs(interauralLevelDifferenceDb) / 8 + Math.abs(interauralTimeDifferenceSeconds) / .0007) * .5, .08, 1)) });
}
