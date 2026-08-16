export function semanticIconLayout({ width = 176, height = 144, hasSubject = true, verb = "SIGNALS" } = {}) {
  if (!hasSubject) return Object.freeze({ subject: null, meaning: { x: width / 2, y: height * .47 }, verb: null, componentSize: Math.min(width, height) * .52, connector: null });
  // Meaning groups can contain a head plus an outer maturity/dependent ring,
  // making their right extent wider than the subject silhouette. Give that
  // side its own larger safe inset instead of centring both on equal margins.
  const subjectX = width * .225, meaningX = width * .73, iconY = height * .355;
  const verbFont = Math.max(11, Math.min(16, 76 / Math.max(4, String(verb).length) * 1.45));
  return Object.freeze({
    subject: Object.freeze({ x: subjectX, y: iconY }),
    meaning: Object.freeze({ x: meaningX, y: iconY }),
    verb: Object.freeze({ x: width / 2, y: height * .79, font: verbFont }),
    componentSize: Math.min(55, width * .315),
    connector: Object.freeze({ x1: subjectX + width * .17, x2: meaningX - width * .17, y: iconY, arrowX: width / 2 })
  });
}
