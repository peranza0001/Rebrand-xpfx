export function safePercent(numerator: number, denominator: number, fallback = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return fallback;
  }

  const value = (numerator / denominator) * 100;
  return Number.isFinite(value) ? value : fallback;
}
