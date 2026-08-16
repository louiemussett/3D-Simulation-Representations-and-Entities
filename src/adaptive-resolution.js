const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

export class AdaptiveResolutionController {
  constructor({ minimumScale = .5, downStep = .1, upStep = .05, overloadFrames = 45, recoveryFrames = 240, downCooldownMs = 2200, upCooldownMs = 6000 } = {}) {
    this.minimumScale = minimumScale; this.downStep = downStep; this.upStep = upStep; this.overloadFrames = overloadFrames; this.recoveryFrames = recoveryFrames; this.downCooldownMs = downCooldownMs; this.upCooldownMs = upCooldownMs; this.reset(1);
  }
  reset(ceiling = 1, minimum = this.minimumScale) { this.minimumScale = Math.max(.25, Number(minimum) || .5); this.scale = Math.max(this.minimumScale, Number(ceiling) || 1); this.ceiling = this.scale; this.averageFrameMs = 0; this.samples = 0; this.overloadCount = 0; this.recoveryCount = 0; this.lastChangeAt = -Infinity; return this.scale; }
  observe(frameMs, now, { ceiling = this.ceiling, minimum = this.minimumScale, targetFps = 60, enabled = true } = {}) {
    this.minimumScale = Math.max(.25, Number(minimum) || .5); this.ceiling = Math.max(this.minimumScale, Number(ceiling) || 1);
    if (!enabled) { const changed = this.scale !== this.ceiling; this.scale = this.ceiling; this.overloadCount = this.recoveryCount = 0; return changed ? this.scale : null; }
    const boundedScale = clamp(this.scale, this.minimumScale, this.ceiling);
    if (boundedScale !== this.scale) { this.scale = boundedScale; this.overloadCount = this.recoveryCount = 0; return this.scale; }
    if (!Number.isFinite(frameMs) || frameMs <= 0 || frameMs > 250) return null;
    if (this.scale > this.ceiling) this.scale = this.ceiling;
    this.averageFrameMs = this.samples ? this.averageFrameMs * .92 + frameMs * .08 : frameMs; this.samples += 1;
    if (this.samples < 30) return null;
    const targetMs = 1000 / Math.max(20, Number(targetFps) || 60), overloaded = this.averageFrameMs > targetMs * 1.16, hasHeadroom = this.averageFrameMs < targetMs * .84;
    this.overloadCount = overloaded ? this.overloadCount + 1 : Math.max(0, this.overloadCount - 2); this.recoveryCount = hasHeadroom ? this.recoveryCount + 1 : 0;
    if (this.overloadCount >= this.overloadFrames && now - this.lastChangeAt >= this.downCooldownMs && this.scale > this.minimumScale) { this.scale = clamp(Math.round((this.scale - this.downStep) * 20) / 20, this.minimumScale, this.ceiling); this.overloadCount = this.recoveryCount = 0; this.lastChangeAt = now; return this.scale; }
    if (this.recoveryCount >= this.recoveryFrames && now - this.lastChangeAt >= this.upCooldownMs && this.scale < this.ceiling) { this.scale = clamp(Math.round((this.scale + this.upStep) * 20) / 20, this.minimumScale, this.ceiling); this.overloadCount = this.recoveryCount = 0; this.lastChangeAt = now; return this.scale; }
    return null;
  }
}
