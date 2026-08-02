export const DEFAULT_FRAME_TICK_BUDGET_MS = 7;

export function shouldRefreshPresentation(now, lastRefresh, maxHz = 10) {
  const interval = 1000 / Math.max(1, maxHz);
  return !Number.isFinite(lastRefresh) || now - lastRefresh >= interval;
}

export function runBudgetedTicks(accumulator, runTick, {
  budgetMs = DEFAULT_FRAME_TICK_BUDGET_MS,
  clock = () => performance.now(),
} = {}) {
  let remaining = Math.max(0, accumulator);
  let completed = 0;
  if (remaining < 1) return { accumulator: remaining, completed };

  const started = clock();
  do {
    runTick();
    remaining -= 1;
    completed += 1;
  } while (remaining >= 1 && clock() - started < budgetMs);

  return { accumulator: remaining, completed };
}
