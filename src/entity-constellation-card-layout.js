const freeze = (value) => {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
};

const finite = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const positive = (value, fallback = 0) => Math.max(0, finite(value, fallback));
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));

const PROFILE_SCALE_MINIMUM = .75;
const PROFILE_SCALE_MAXIMUM = 2;
const PANEL_SCALE_MINIMUM = .1;
const PANEL_SCALE_MAXIMUM = 1.5;
const IDENTITY_SCALE_MAXIMUM = 1.5;
const LEGACY_EXPRESSION_ART = freeze({ width: 44, height: 44 });
const LEGACY_PUBLIC_CUE_ART = freeze({ width: 64, height: 52 });
const LEGACY_ACTION_ART = freeze({ width: 48, height: 48 });
// The stable public rail deliberately matches each bay to its artwork. The
// face remains square, while calls and notable actions share a wide badge.
const PANEL_EXPRESSION_ART = freeze({ width: 66, height: 66 });
const PANEL_PUBLIC_CUE_ART = freeze({ width: 92, height: 68 });
const PANEL_ACTION_ART = freeze({ width: 92, height: 68 });
const PRIVATE_BUBBLE_ART = freeze({ width: 116, height: 91 });
const INSTRUMENT_SCALE_MINIMUM = .75;
const INSTRUMENT_SCALE_MAXIMUM = 2;
const BASE_SCREEN_SIZE = freeze({
  expanded: { width: 304, height: 203 },
  summary: { width: 314, height: 82 },
  compact: { width: 134, height: 29 }
});

// Screen-space proportions for the selected-animal instrument. These values
// describe compartments, not content. Live health, pregnancy, concern and
// forecast values are intentionally absent so an update cannot move or resize
// any part of the panel during a frame.
export const ENTITY_INSTRUMENT_PANEL_GEOMETRY = freeze({
  width: 384,
  identityHeight: 86,
  healthHeight: 36,
  decisionHeight: 54,
  physiologyHeight: 136,
  expressionBayWidth: 82,
  outwardBayWidth: 104,
  identityMinimumWidth: 128,
  columnGap: 8,
  attachmentGap: 8,
  headerHeight: 22,
  metricRows: 4
});

// Canvas-space geometry for the two cards that expose separate expression and
// outward-cue bays. The stable public rail is authored at two backing pixels
// per screen pixel: 82 square pixels for expression, 128 for identity and 104
// for a wide outward cue. The legacy expanded surface remains available only
// to old reference/profile callers; runtime uses the single stable public rail.
export const ENTITY_CONSTELLATION_CARD_GEOMETRY = freeze({
  expanded: {
    canvas: { width: 384, height: 256 },
    dividers: { left: 104, right: 280, railTop: 166 },
    thoughtCell: { left: 12, right: 188, top: 12, bottom: 158 },
    predictionCell: { left: 196, right: 372, top: 12, bottom: 158 },
    expressionCell: { left: 12, right: 104, top: 166, bottom: 244 },
    outwardCell: { left: 280, right: 372, top: 166, bottom: 244 }
  },
  summary: {
    // Two backing pixels per authored screen pixel keep the compact text and
    // border crisp without changing the rail's 314 × 82 logical footprint.
    canvas: { width: 628, height: 164 },
    dividers: { left: 164, right: 420 },
    expressionCell: { left: 0, right: 164, top: 0, bottom: 164 },
    outwardCell: { left: 420, right: 628, top: 0, bottom: 164 }
  }
});

const screenCell = (cell, geometry, panelCenter, screenSize) => {
  const scaleX = screenSize.width / geometry.canvas.width;
  const scaleY = screenSize.height / geometry.canvas.height;
  const left = panelCenter.x + (cell.left - geometry.canvas.width / 2) * scaleX;
  const right = panelCenter.x + (cell.right - geometry.canvas.width / 2) * scaleX;
  const top = panelCenter.y + (cell.top - geometry.canvas.height / 2) * scaleY;
  const bottom = panelCenter.y + (cell.bottom - geometry.canvas.height / 2) * scaleY;
  return freeze({ left, right, top, bottom, x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top });
};

const fitWithin = (desiredWidth, desiredHeight, cell, paddingPx) => {
  const availableWidth = Math.max(1, cell.width - paddingPx * 2);
  const availableHeight = Math.max(1, cell.height - paddingPx * 2);
  const width = Math.max(1, positive(desiredWidth, 1));
  const height = Math.max(1, positive(desiredHeight, 1));
  const fit = Math.min(1, availableWidth / width, availableHeight / height);
  return freeze({ width: width * fit, height: height * fit, fit });
};

const rectangle = (left, right, top, bottom) => freeze({
  left,
  right,
  top,
  bottom,
  x: (left + right) / 2,
  y: (top + bottom) / 2,
  width: right - left,
  height: bottom - top
});

const fittedSprite = (cell, art, scale, paddingPx) => freeze({
  x: cell.x,
  y: cell.y,
  ...fitWithin(art.width * scale, art.height * scale, cell, paddingPx)
});

const sideCellResult = ({ mode, expressionCell, outwardCell, expressionScale, publicCueScale, paddingPx, expressionArt = LEGACY_EXPRESSION_ART, publicCueArt = LEGACY_PUBLIC_CUE_ART, actionArt = LEGACY_ACTION_ART }) => freeze({
  mode,
  expression: fittedSprite(expressionCell, expressionArt, expressionScale, paddingPx),
  outward: fittedSprite(outwardCell, publicCueArt, publicCueScale, paddingPx),
  action: fittedSprite(outwardCell, actionArt, publicCueScale, paddingPx),
  expressionCell,
  outwardCell
});

const normalizedProfileScale = (value) => clamp(finite(value, 1), PROFILE_SCALE_MINIMUM, PROFILE_SCALE_MAXIMUM);

const expandedProfile = (scales, paddingPx) => {
  const source = ENTITY_CONSTELLATION_CARD_GEOMETRY.expanded;
  const base = BASE_SCREEN_SIZE.expanded;
  const screenX = base.width / source.canvas.width;
  const screenY = base.height / source.canvas.height;
  const outerWidth = source.expressionCell.left * screenX * scales.panel;
  const centreGap = (source.predictionCell.left - source.thoughtCell.right) * screenX * scales.panel;
  const identityWidth = (source.dividers.right - source.dividers.left) * screenX * Math.max(scales.panel, scales.identity);
  const baseExpressionWidth = (source.expressionCell.right - source.expressionCell.left) * screenX;
  const baseOutwardWidth = (source.outwardCell.right - source.outwardCell.left) * screenX;
  const expressionBayWidth = baseExpressionWidth * Math.max(scales.panel, scales.expression);
  const outwardBayWidth = baseOutwardWidth * Math.max(scales.panel, scales.publicCue);
  const lowerContentWidth = outerWidth * 2 + expressionBayWidth + identityWidth + outwardBayWidth;

  const baseThoughtWidth = (source.thoughtCell.right - source.thoughtCell.left) * screenX;
  const basePredictionWidth = (source.predictionCell.right - source.predictionCell.left) * screenX;
  const thoughtBayWidth = Math.max(baseThoughtWidth * scales.panel, PRIVATE_BUBBLE_ART.width * scales.thought + paddingPx * 2);
  const predictionBayWidth = Math.max(basePredictionWidth * scales.panel, PRIVATE_BUBBLE_ART.width * scales.prediction + paddingPx * 2);
  const upperContentWidth = outerWidth * 2 + thoughtBayWidth + centreGap + predictionBayWidth;
  const width = Math.max(base.width * scales.panel, lowerContentWidth, upperContentWidth);

  const baseRailHeight = (source.canvas.height - source.dividers.railTop) * screenY;
  const railHeight = Math.max(
    baseRailHeight * Math.max(scales.panel, scales.identity),
    LEGACY_EXPRESSION_ART.height * scales.expression + paddingPx * 2,
    LEGACY_PUBLIC_CUE_ART.height * scales.publicCue + paddingPx * 2
  );
  const baseUpperHeight = source.dividers.railTop * screenY;
  const upperHeight = Math.max(
    baseUpperHeight * scales.panel,
    PRIVATE_BUBBLE_ART.height * scales.thought + paddingPx * 2,
    PRIVATE_BUBBLE_ART.height * scales.prediction + paddingPx * 2
  );
  const height = upperHeight + railHeight;

  // The ownership anchor remains at the lower rail's centre. Bubble settings
  // therefore grow the selected card upward without moving its tether or its
  // public identity row.
  const panel = rectangle(-width / 2, width / 2, -railHeight / 2 - upperHeight, railHeight / 2);
  const lowerRail = rectangle(-lowerContentWidth / 2, lowerContentWidth / 2, -railHeight / 2, railHeight / 2);
  const upperRow = rectangle(-upperContentWidth / 2, upperContentWidth / 2, panel.top, lowerRail.top);

  const lowerLeft = -lowerContentWidth / 2 + outerWidth;
  const expressionCell = rectangle(lowerLeft, lowerLeft + expressionBayWidth, lowerRail.top, lowerRail.bottom);
  const outwardRight = lowerContentWidth / 2 - outerWidth;
  const outwardCell = rectangle(outwardRight - outwardBayWidth, outwardRight, lowerRail.top, lowerRail.bottom);

  const upperLeft = -upperContentWidth / 2 + outerWidth;
  const thoughtCell = rectangle(upperLeft, upperLeft + thoughtBayWidth, upperRow.top, upperRow.bottom);
  const predictionRight = upperContentWidth / 2 - outerWidth;
  const predictionCell = rectangle(predictionRight - predictionBayWidth, predictionRight, upperRow.top, upperRow.bottom);
  const sides = sideCellResult({ mode: "expanded", expressionCell, outwardCell, expressionScale: scales.expression, publicCueScale: scales.publicCue, paddingPx });

  return freeze({
    detailLevel: "expanded",
    screenSize: { width, height },
    panelCenter: { x: panel.x, y: panel.y },
    panel,
    upperRow,
    lowerRail,
    thoughtCell,
    predictionCell,
    thought: fittedSprite(thoughtCell, PRIVATE_BUBBLE_ART, scales.thought, paddingPx),
    prediction: fittedSprite(predictionCell, PRIVATE_BUBBLE_ART, scales.prediction, paddingPx),
    sideCells: sides,
    slots: {
      panel: { x: panel.x, y: panel.y },
      thought: { x: thoughtCell.x, y: thoughtCell.y },
      prediction: { x: predictionCell.x, y: predictionCell.y },
      expression: { x: sides.expression.x, y: sides.expression.y },
      outward: { x: sides.outward.x, y: sides.outward.y },
      action: { x: sides.action.x, y: sides.action.y }
    }
  });
};

const summaryProfile = (scales, paddingPx, settings = {}) => {
  const source = ENTITY_CONSTELLATION_CARD_GEOMETRY.summary;
  const base = BASE_SCREEN_SIZE.summary;
  const screenX = base.width / source.canvas.width;
  const expressionEnabled = settings.expressionVisible !== false;
  const identityEnabled = settings.identityVisible !== false;
  const outwardEnabled = settings.publicCueVisible !== false;
  // The original authored rail is exactly the sum of its three bays
  // (82 + 128 + 104 = 314 px). Keep that canonical footprint available for
  // direct comparison with the new designs instead of silently padding it.
  const outerWidth = 0;
  const centreWidth = identityEnabled ? (source.dividers.right - source.dividers.left) * screenX * Math.max(scales.panel, scales.identity) : 0;
  const expressionBayWidth = expressionEnabled ? (source.expressionCell.right - source.expressionCell.left) * screenX * Math.max(scales.panel, scales.expression) : 0;
  const outwardBayWidth = outwardEnabled ? (source.outwardCell.right - source.outwardCell.left) * screenX * Math.max(scales.panel, scales.publicCue) : 0;
  const width = Math.max(28, outerWidth * 2 + expressionBayWidth + centreWidth + outwardBayWidth);
  const height = base.height * Math.max(scales.panel, scales.identity, scales.expression, scales.publicCue);
  const panel = rectangle(-width / 2, width / 2, -height / 2, height / 2);
  const expressionCell = rectangle(panel.left + outerWidth, panel.left + outerWidth + expressionBayWidth, panel.top, panel.bottom);
  const outwardCell = rectangle(panel.right - outerWidth - outwardBayWidth, panel.right - outerWidth, panel.top, panel.bottom);
  const sides = sideCellResult({ mode: "summary", expressionCell, outwardCell, expressionScale: scales.expression, publicCueScale: scales.publicCue, paddingPx, expressionArt: PANEL_EXPRESSION_ART, publicCueArt: PANEL_PUBLIC_CUE_ART, actionArt: PANEL_ACTION_ART });
  return freeze({
    detailLevel: "summary",
    screenSize: { width, height },
    panelCenter: { x: 0, y: 0 },
    panel,
    identityCell: rectangle(expressionCell.right, outwardCell.left, panel.top, panel.bottom),
    settings,
    sideCells: sides,
    slots: {
      panel: { x: 0, y: 0 },
      expression: { x: sides.expression.x, y: sides.expression.y },
      outward: { x: sides.outward.x, y: sides.outward.y },
      action: { x: sides.action.x, y: sides.action.y }
    }
  });
};

const singlePanelProfile = (scales, paddingPx, publicPanel, settings = {}) => {
  const gap = Math.max(6, 8 * scales.panel);
  const thoughtEnabled = settings.thoughtAttachmentEnabled !== false;
  const forecastEnabled = settings.forecastAttachmentEnabled !== false;
  const attachmentCount = Number(thoughtEnabled) + Number(forecastEnabled);
  const availableWidth = Math.max(36, publicPanel.panel.width - paddingPx * 2 - (attachmentCount === 2 ? gap : 0));
  const bayWidth = attachmentCount === 2 ? availableWidth / 2 : availableWidth;
  const thoughtWidth = thoughtEnabled ? bayWidth * scales.thought : 0;
  const predictionWidth = forecastEnabled ? bayWidth * scales.prediction : 0;
  const thoughtSize = {
    width: thoughtWidth,
    height: thoughtWidth * PRIVATE_BUBBLE_ART.height / PRIVATE_BUBBLE_ART.width
  };
  const predictionSize = {
    width: predictionWidth,
    height: predictionWidth * PRIVATE_BUBBLE_ART.height / PRIVATE_BUBBLE_ART.width
  };
  const thought = freeze({
    x: thoughtEnabled ? (forecastEnabled ? -gap / 2 - thoughtSize.width / 2 : 0) : 0,
    y: publicPanel.panel.top - gap - thoughtSize.height / 2,
    ...thoughtSize,
    fit: 1
  });
  const prediction = freeze({
    x: forecastEnabled ? (thoughtEnabled ? gap / 2 + predictionSize.width / 2 : 0) : 0,
    y: publicPanel.panel.top - gap - predictionSize.height / 2,
    ...predictionSize,
    fit: 1
  });
  const attachments = [thoughtEnabled ? thought : null, forecastEnabled ? prediction : null].filter(Boolean);
  const privateBounds = attachments.length ? rectangle(
    Math.min(...attachments.map(item => item.x - item.width / 2)),
    Math.max(...attachments.map(item => item.x + item.width / 2)),
    Math.min(...attachments.map(item => item.y - item.height / 2)),
    Math.max(...attachments.map(item => item.y + item.height / 2))
  ) : publicPanel.panel;
  const selectedFootprint = rectangle(
    Math.min(publicPanel.panel.left, privateBounds.left),
    Math.max(publicPanel.panel.right, privateBounds.right),
    Math.min(publicPanel.panel.top, privateBounds.top),
    Math.max(publicPanel.panel.bottom, privateBounds.bottom)
  );
  return freeze({
    ...publicPanel,
    detailLevel: "panel",
    thought,
    prediction,
    privateBounds,
    selectedFootprint,
    slots: {
      ...publicPanel.slots,
      thought: { x: thought.x, y: thought.y },
      prediction: { x: prediction.x, y: prediction.y }
    }
  });
};

const authoredPublicProfile = (variant, scales, paddingPx, settings) => {
  const identity = settings.identityVisible !== false;
  const expression = settings.expressionVisible !== false;
  const outward = settings.publicCueVisible !== false;
  let width = 314, height = 82, expressionCell, outwardCell, identityCell;
  if (variant === "identity-mast") {
    // The minimum design is deliberately identity-only. Unsupported modules
    // remain enabled in settings so switching designs never loses a choice.
    width = 40; height = 92;
    expressionCell = rectangle(-20, -20, -46, -46);
    identityCell = rectangle(-20, 20, -46, 46);
    outwardCell = rectangle(20, 20, 46, 46);
  } else if (variant === "status-mast") {
    width = 62; height = (expression ? 50 : 0) + (identity ? 54 : 0) + (outward ? 46 : 0);
    height = Math.max(54, height);
    let cursor = -height / 2;
    expressionCell = rectangle(-width / 2, width / 2, cursor, cursor += expression ? 50 : 0);
    identityCell = rectangle(-width / 2, width / 2, cursor, cursor += identity ? 54 : 0);
    outwardCell = rectangle(-width / 2, width / 2, cursor, height / 2);
  } else if (variant === "capsule") {
    const expressionWidth = expression ? 44 : 0, outwardWidth = outward ? 68 : 0, identityWidth = identity ? 108 : 0;
    width = Math.max(42, expressionWidth + identityWidth + outwardWidth); height = 44;
    expressionCell = rectangle(-width / 2, -width / 2 + expressionWidth, -22, 22);
    identityCell = rectangle(expressionCell.right, expressionCell.right + identityWidth, -22, 22);
    outwardCell = rectangle(identityCell.right, width / 2, -22, 22);
  } else {
    return null;
  }
  const panel = rectangle(-width / 2, width / 2, -height / 2, height / 2);
  const safeExpressionCell = expressionCell.width > 0 ? expressionCell : rectangle(panel.left, panel.left, panel.top, panel.top);
  const safeOutwardCell = outwardCell.width > 0 && outwardCell.height > 0 ? outwardCell : rectangle(panel.right, panel.right, panel.bottom, panel.bottom);
  const sides = sideCellResult({ mode: variant, expressionCell: safeExpressionCell, outwardCell: safeOutwardCell, expressionScale: scales.expression, publicCueScale: scales.publicCue, paddingPx, expressionArt: PANEL_EXPRESSION_ART, publicCueArt: PANEL_PUBLIC_CUE_ART, actionArt: PANEL_ACTION_ART });
  return freeze({
    variant,
    detailLevel: variant,
    screenSize: { width, height },
    panelCenter: { x: 0, y: 0 }, panel, identityCell,
    sideCells: sides, settings,
    slots: { panel: { x: 0, y: 0 }, identity: { x: identityCell.x, y: identityCell.y }, expression: { x: sides.expression.x, y: sides.expression.y }, outward: { x: sides.outward.x, y: sides.outward.y }, action: { x: sides.action.x, y: sides.action.y } }
  });
};

const metricCellLayout = (cell, paddingPx, headerHeight, rowCount) => {
  if (!cell) return null;
  const left = cell.left + paddingPx;
  const right = cell.right - paddingPx;
  const top = cell.top + paddingPx;
  const bottom = cell.bottom - paddingPx;
  const headerBottom = Math.min(bottom, top + headerHeight);
  const header = rectangle(left, right, top, headerBottom);
  const rows = [];
  const available = Math.max(0, bottom - headerBottom);
  const rowHeight = rowCount > 0 ? available / rowCount : 0;
  for (let index = 0; index < rowCount; index += 1) {
    const rowTop = headerBottom + rowHeight * index;
    rows.push(rectangle(left, right, rowTop, index === rowCount - 1 ? bottom : rowTop + rowHeight));
  }
  return freeze({ header, rows, content: rectangle(left, right, top, bottom) });
};

const instrumentProfile = (scales, paddingPx, publicPanel, settings, style = "full-instrument") => {
  const geometry = ENTITY_INSTRUMENT_PANEL_GEOMETRY;
  const panelScale = scales.panel;
  const physiologyEnabled = settings.metabolicVisible || settings.performanceVisible;
  const desiredExpressionWidth = settings.expressionVisible ? PANEL_EXPRESSION_ART.width * scales.expression + paddingPx * 2 : 0;
  const desiredOutwardWidth = settings.publicCueVisible ? PANEL_PUBLIC_CUE_ART.width * scales.publicCue + paddingPx * 2 : 0;
  const expressionBayWidth = settings.expressionVisible ? Math.max(geometry.expressionBayWidth * panelScale, desiredExpressionWidth) : 0;
  const outwardBayWidth = settings.publicCueVisible ? Math.max(geometry.outwardBayWidth * panelScale, desiredOutwardWidth) : 0;
  const identityMinimumWidth = settings.identityVisible ? geometry.identityMinimumWidth * Math.max(panelScale, scales.identity) : 0;
  const typographyWidthScale = physiologyEnabled ? Math.max(1, settings.physiologyTextScale) : 1;
  const authoredWidth = style === "context-ribbon" ? 310 : style === "vital-strip" ? 320 : geometry.width;
  const width = Math.max(
    authoredWidth * panelScale * typographyWidthScale,
    publicPanel.screenSize.width,
    paddingPx * 4 + expressionBayWidth + identityMinimumWidth + outwardBayWidth
  );

  const compactIdentityHeight = style === "context-ribbon" ? 48 : style === "vital-strip" ? 44 : geometry.identityHeight;
  const compactInstrumentIdentity = style === "context-ribbon" || style === "vital-strip";
  const identityHeight = compactInstrumentIdentity
    ? compactIdentityHeight * panelScale
    : Math.max(publicPanel.screenSize.height, compactIdentityHeight * panelScale);
  const authoredHealthHeight = style === "vital-strip" ? 28 : geometry.healthHeight;
  const healthHeight = settings.healthVisible ? authoredHealthHeight * panelScale * settings.healthScale : 0;
  const decisionVisible = settings.immediateConcernVisible || settings.forecastEffectVisible;
  const authoredDecisionHeight = style === "context-ribbon" ? 26 : geometry.decisionHeight;
  const decisionHeight = decisionVisible ? authoredDecisionHeight * panelScale * settings.physiologyTextScale : 0;
  const physiologyHeight = physiologyEnabled
    ? geometry.physiologyHeight * panelScale * Math.max(settings.physiologyScale, settings.physiologyTextScale)
    : 0;
  const height = identityHeight + healthHeight + decisionHeight + physiologyHeight;
  const panel = rectangle(-width / 2, width / 2, -height / 2, height / 2);

  let cursor = panel.top;
  const identityBand = rectangle(panel.left, panel.right, cursor, cursor += identityHeight);
  const healthBand = settings.healthVisible ? rectangle(panel.left, panel.right, cursor, cursor += healthHeight) : null;
  const decisionBand = decisionVisible ? rectangle(panel.left, panel.right, cursor, cursor += decisionHeight) : null;
  const physiologyBand = physiologyEnabled ? rectangle(panel.left, panel.right, cursor, cursor += physiologyHeight) : null;

  const identityInset = Math.max(paddingPx, 8 * panelScale);
  const expressionCell = rectangle(
    identityBand.left + identityInset,
    identityBand.left + identityInset + expressionBayWidth,
    identityBand.top,
    identityBand.bottom
  );
  const outwardCell = rectangle(
    identityBand.right - identityInset - outwardBayWidth,
    identityBand.right - identityInset,
    identityBand.top,
    identityBand.bottom
  );
  const identityCell = rectangle(expressionCell.right, outwardCell.left, identityBand.top, identityBand.bottom);
  const identityPrimaryRow = rectangle(identityCell.left, identityCell.right, identityCell.top, identityCell.top + identityCell.height * .58);
  const identitySecondaryRow = rectangle(identityCell.left, identityCell.right, identityPrimaryRow.bottom, identityCell.bottom);
  const sides = sideCellResult({
    mode: "instrument",
    expressionCell,
    outwardCell,
    expressionScale: scales.expression,
    publicCueScale: scales.publicCue,
    paddingPx,
    expressionArt: PANEL_EXPRESSION_ART,
    publicCueArt: PANEL_PUBLIC_CUE_ART,
    actionArt: PANEL_ACTION_ART
  });

  let health = null;
  if (healthBand) {
    const inset = Math.max(paddingPx, 8 * panelScale);
    const content = rectangle(healthBand.left + inset, healthBand.right - inset, healthBand.top, healthBand.bottom);
    const labelWidth = Math.min(content.width * .24, 76 * panelScale * settings.physiologyTextScale);
    const stateWidth = Math.min(content.width * .3, 104 * panelScale * settings.physiologyTextScale);
    health = freeze({
      content,
      label: rectangle(content.left, content.left + labelWidth, content.top, content.bottom),
      meter: rectangle(content.left + labelWidth, content.right - stateWidth, content.top, content.bottom),
      state: rectangle(content.right - stateWidth, content.right, content.top, content.bottom)
    });
  }

  let decision = null;
  if (decisionBand) {
    const inset = Math.max(paddingPx, 8 * panelScale);
    const content = rectangle(decisionBand.left + inset, decisionBand.right - inset, decisionBand.top, decisionBand.bottom);
    const middle = settings.immediateConcernVisible && settings.forecastEffectVisible ? content.top + content.height / 2 : content.bottom;
    decision = freeze({
      content,
      immediate: settings.immediateConcernVisible ? rectangle(content.left, content.right, content.top, middle) : null,
      forecastEffect: settings.forecastEffectVisible ? rectangle(content.left, content.right, settings.immediateConcernVisible ? middle : content.top, content.bottom) : null
    });
  }

  let metabolicCell = null;
  let performanceCell = null;
  if (physiologyBand) {
    const inset = Math.max(paddingPx, 8 * panelScale);
    const columnGap = geometry.columnGap * panelScale;
    const left = physiologyBand.left + inset;
    const right = physiologyBand.right - inset;
    if (settings.metabolicVisible && settings.performanceVisible) {
      const middle = (left + right) / 2;
      metabolicCell = rectangle(left, middle - columnGap / 2, physiologyBand.top, physiologyBand.bottom);
      performanceCell = rectangle(middle + columnGap / 2, right, physiologyBand.top, physiologyBand.bottom);
    } else if (settings.metabolicVisible) {
      metabolicCell = rectangle(left, right, physiologyBand.top, physiologyBand.bottom);
    } else {
      performanceCell = rectangle(left, right, physiologyBand.top, physiologyBand.bottom);
    }
  }
  const headerHeight = geometry.headerHeight * panelScale * settings.physiologyTextScale;
  const metabolic = metricCellLayout(metabolicCell, paddingPx, headerHeight, geometry.metricRows);
  const performance = metricCellLayout(performanceCell, paddingPx, headerHeight, geometry.metricRows);

  // The two clouds live in transparent attachment bays owned by this root.
  // Each bay is just under half the panel width, so the pair reads as one
  // integrated header at every whole-panel scale. Artwork keeps its authored
  // aspect ratio and is capped by the bay rather than escaping the root.
  const attachmentGap = geometry.attachmentGap * panelScale;
  const attachmentInset = Math.max(paddingPx, 4 * panelScale);
  const attachmentCount = Number(settings.thoughtAttachmentEnabled) + Number(settings.forecastAttachmentEnabled);
  const attachmentBayWidth = Math.max(0, (width - attachmentInset * 2 - (attachmentCount === 2 ? attachmentGap : 0)) / Math.max(1, attachmentCount));
  const bubbleSize = (enabled, scale) => {
    if (!enabled) return { width: 0, height: 0 };
    // The bay—not the old source bitmap—is authoritative. One cloud spans
    // the panel; a pair receives two near-half-width bays. The optional bubble
    // scale is relative to that authored allocation and may deliberately grow
    // beyond it for readability at marker-sized panel scales.
    const width = attachmentBayWidth * scale;
    return { width, height: width * PRIVATE_BUBBLE_ART.height / PRIVATE_BUBBLE_ART.width };
  };
  const thoughtSize = bubbleSize(settings.thoughtAttachmentEnabled, scales.thought);
  const predictionSize = bubbleSize(settings.forecastAttachmentEnabled, scales.prediction);
  const attachmentWidth = thoughtSize.width + predictionSize.width + (attachmentCount === 2 ? attachmentGap : 0);
  const attachmentLeft = -attachmentWidth / 2;
  const attachmentBottom = panel.top - attachmentGap;
  const thought = freeze({
    x: settings.thoughtAttachmentEnabled ? attachmentLeft + thoughtSize.width / 2 : 0,
    y: settings.thoughtAttachmentEnabled ? attachmentBottom - thoughtSize.height / 2 : panel.top,
    ...thoughtSize,
    fit: 1
  });
  const prediction = freeze({
    x: settings.forecastAttachmentEnabled ? attachmentLeft + thoughtSize.width + (settings.thoughtAttachmentEnabled ? attachmentGap : 0) + predictionSize.width / 2 : 0,
    y: settings.forecastAttachmentEnabled ? attachmentBottom - predictionSize.height / 2 : panel.top,
    ...predictionSize,
    fit: 1
  });
  const attachmentTop = attachmentCount
    ? Math.min(
      settings.thoughtAttachmentEnabled ? thought.y - thought.height / 2 : panel.top,
      settings.forecastAttachmentEnabled ? prediction.y - prediction.height / 2 : panel.top
    )
    : panel.top;
  const attachmentBounds = rectangle(attachmentLeft, attachmentLeft + attachmentWidth, attachmentTop, attachmentCount ? attachmentBottom : panel.top);
  const selectedFootprint = rectangle(
    Math.min(panel.left, attachmentBounds.left),
    Math.max(panel.right, attachmentBounds.right),
    attachmentBounds.top,
    panel.bottom
  );
  const thoughtTarget = freeze({ x: panel.left + panel.width * .32, y: panel.top });
  const predictionTarget = freeze({ x: panel.left + panel.width * .68, y: panel.top });

  return freeze({
    variant: style,
    detailLevel: "instrument",
    screenSize: { width, height },
    panelCenter: { x: 0, y: 0 },
    panel,
    root: panel,
    publicRail: identityBand,
    identityBand,
    identityCell,
    identityPrimaryRow,
    identitySecondaryRow,
    healthBand,
    health,
    decisionBand,
    decision,
    physiologyBand,
    metabolicCell,
    performanceCell,
    metabolic,
    performance,
    sideCells: sides,
    thought,
    prediction,
    attachmentBounds,
    attachmentTargets: { thought: thoughtTarget, prediction: predictionTarget },
    selectedFootprint,
    settings,
    visibleSections: {
      health: settings.healthVisible,
      decision: decisionVisible,
      immediateConcern: settings.immediateConcernVisible,
      forecastEffect: settings.forecastEffectVisible,
      metabolic: settings.metabolicVisible,
      performance: settings.performanceVisible
    },
    slots: {
      panel: { x: panel.x, y: panel.y },
      identity: { x: identityCell.x, y: identityCell.y },
      expression: { x: sides.expression.x, y: sides.expression.y },
      outward: { x: sides.outward.x, y: sides.outward.y },
      action: { x: sides.action.x, y: sides.action.y },
      health: health ? { x: healthBand.x, y: healthBand.y } : null,
      decision: decision ? { x: decisionBand.x, y: decisionBand.y } : null,
      metabolic: metabolic ? { x: metabolicCell.x, y: metabolicCell.y } : null,
      performance: performance ? { x: performanceCell.x, y: performanceCell.y } : null,
      thought: { x: thought.x, y: thought.y },
      prediction: { x: prediction.x, y: prediction.y }
    }
  });
};

/**
 * Resolves every ownership-card size and semantic slot from saved display
 * settings only. Runtime thought/prediction visibility is deliberately absent:
 * a forecast appearing or expiring can never resize the selected card.
 */
export function entityConstellationCardProfile({
  style = "classic-rail",
  panelScale = 1,
  identityScale = 1,
  expressionScale = 1,
  publicCueScale = 1,
  thoughtScale = 1,
  predictionScale = 1,
  healthScale = 1,
  physiologyScale = 1,
  physiologyTextScale = 1,
  healthVisible = true,
  decisionContextVisible = true,
  immediateConcernVisible = decisionContextVisible,
  forecastEffectVisible = decisionContextVisible,
  metabolicVisible = true,
  performanceVisible = true,
  thoughtAttachmentEnabled = true,
  forecastAttachmentEnabled = true,
  identityVisible = true,
  expressionVisible = true,
  publicCueVisible = true,
  paddingPx = 3
} = {}) {
  const scales = freeze({
    panel: clamp(finite(panelScale, 1), PANEL_SCALE_MINIMUM, PANEL_SCALE_MAXIMUM),
    identity: clamp(finite(identityScale, 1), PROFILE_SCALE_MINIMUM, IDENTITY_SCALE_MAXIMUM),
    expression: normalizedProfileScale(expressionScale),
    publicCue: normalizedProfileScale(publicCueScale),
    thought: clamp(finite(thoughtScale, 1), .5, 1.5),
    prediction: clamp(finite(predictionScale, 1), .5, 1.5)
  });
  const instrumentSettings = freeze({
    healthScale: clamp(finite(healthScale, 1), INSTRUMENT_SCALE_MINIMUM, INSTRUMENT_SCALE_MAXIMUM),
    physiologyScale: clamp(finite(physiologyScale, 1), INSTRUMENT_SCALE_MINIMUM, INSTRUMENT_SCALE_MAXIMUM),
    physiologyTextScale: clamp(finite(physiologyTextScale, 1), INSTRUMENT_SCALE_MINIMUM, INSTRUMENT_SCALE_MAXIMUM),
    healthVisible: healthVisible !== false,
    decisionVisible: decisionContextVisible !== false,
    immediateConcernVisible: immediateConcernVisible !== false,
    forecastEffectVisible: forecastEffectVisible !== false,
    metabolicVisible: metabolicVisible !== false,
    performanceVisible: performanceVisible !== false,
    identityVisible: identityVisible !== false,
    expressionVisible: expressionVisible !== false,
    publicCueVisible: publicCueVisible !== false,
    thoughtAttachmentEnabled: thoughtAttachmentEnabled !== false,
    forecastAttachmentEnabled: forecastAttachmentEnabled !== false
  });
  const publicSettings = freeze({ identityVisible: identityVisible !== false, expressionVisible: expressionVisible !== false, publicCueVisible: publicCueVisible !== false, thoughtAttachmentEnabled: thoughtAttachmentEnabled !== false, forecastAttachmentEnabled: forecastAttachmentEnabled !== false });
  const padding = clamp(positive(paddingPx, 3), 0, 24);
  const expanded = expandedProfile(scales, padding);
  const summary = summaryProfile(scales, padding, publicSettings);
  const styledPublic = authoredPublicProfile(style, scales, padding, publicSettings) || freeze({ ...summary, variant: "classic-rail", settings: publicSettings });
  const panel = singlePanelProfile(scales, padding, styledPublic, publicSettings);
  const instrument = instrumentProfile(scales, padding, panel, instrumentSettings, style);
  const compactWidth = BASE_SCREEN_SIZE.compact.width * scales.panel;
  const compactHeight = BASE_SCREEN_SIZE.compact.height * scales.panel;
  const compact = freeze({
    detailLevel: "compact",
    screenSize: { width: compactWidth, height: compactHeight },
    panelCenter: { x: 0, y: 0 },
    panel: rectangle(-compactWidth / 2, compactWidth / 2, -compactHeight / 2, compactHeight / 2),
    slots: { panel: { x: 0, y: 0 } }
  });
  const settingsKey = [
    instrumentSettings.healthScale,
    instrumentSettings.physiologyScale,
    instrumentSettings.physiologyTextScale,
    instrumentSettings.healthVisible ? 1 : 0,
    instrumentSettings.decisionVisible ? 1 : 0,
    instrumentSettings.immediateConcernVisible ? 1 : 0,
    instrumentSettings.forecastEffectVisible ? 1 : 0,
    instrumentSettings.metabolicVisible ? 1 : 0,
    instrumentSettings.performanceVisible ? 1 : 0,
    instrumentSettings.thoughtAttachmentEnabled ? 1 : 0,
    instrumentSettings.forecastAttachmentEnabled ? 1 : 0,
    instrumentSettings.identityVisible ? 1 : 0,
    instrumentSettings.expressionVisible ? 1 : 0,
    instrumentSettings.publicCueVisible ? 1 : 0
  ];
  return freeze({
    key: [style, scales.panel, scales.identity, scales.expression, scales.publicCue, scales.thought, scales.prediction, padding, ...settingsKey].map((value) => typeof value === "number" ? value.toFixed(3) : value).join(":"),
    scales,
    instrumentSettings,
    paddingPx: padding,
    panel,
    instrument,
    expanded,
    summary,
    compact
  });
}

/**
 * Converts the backing canvas' real compartment geometry into screen-space
 * centres and bounded semantic sprite sizes. This deliberately derives from
 * the card's rendered size, so typography/icon settings cannot leave the face
 * or call sprite aligned to an obsolete fixed slot.
 */
export function entityConstellationSideCells({
  detailLevel = "summary",
  panelCenter = { x: 0, y: 0 },
  screenSize = {},
  iconScale = 1,
  expressionScale = null,
  publicCueScale = null,
  paddingPx = 3
} = {}) {
  const mode = detailLevel === "expanded" ? "expanded" : "summary";
  const geometry = ENTITY_CONSTELLATION_CARD_GEOMETRY[mode];
  const center = { x: finite(panelCenter?.x), y: finite(panelCenter?.y) };
  const size = {
    width: Math.max(1, positive(screenSize?.width, geometry.canvas.width)),
    height: Math.max(1, positive(screenSize?.height, geometry.canvas.height))
  };
  const sharedScale = Math.max(.1, positive(iconScale, 1));
  const resolvedExpressionScale = expressionScale == null ? sharedScale : Math.max(.1, positive(expressionScale, sharedScale));
  const resolvedPublicCueScale = publicCueScale == null ? sharedScale : Math.max(.1, positive(publicCueScale, sharedScale));
  const padding = Math.max(0, positive(paddingPx, 3));
  const expressionCell = screenCell(geometry.expressionCell, geometry, center, size);
  const outwardCell = screenCell(geometry.outwardCell, geometry, center, size);
  const panelMode = mode === "summary";
  return sideCellResult({
    mode,
    expressionCell,
    outwardCell,
    expressionScale: resolvedExpressionScale,
    publicCueScale: resolvedPublicCueScale,
    paddingPx: padding,
    expressionArt: panelMode ? PANEL_EXPRESSION_ART : LEGACY_EXPRESSION_ART,
    publicCueArt: panelMode ? PANEL_PUBLIC_CUE_ART : LEGACY_PUBLIC_CUE_ART,
    actionArt: panelMode ? PANEL_ACTION_ART : LEGACY_ACTION_ART
  });
}
