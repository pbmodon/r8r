/**
 * Shared math helpers for actuarial calculations.
 */

export function simpleAverage(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Volume-weighted average: sum(numerators) / sum(denominators).
 * Standard actuarial weighting for age-to-age factors.
 */
export function volumeWeightedAverage(
  numerators: number[],
  denominators: number[]
): number | null {
  if (numerators.length === 0 || numerators.length !== denominators.length) return null;
  const sumNum = numerators.reduce((a, b) => a + b, 0);
  const sumDen = denominators.reduce((a, b) => a + b, 0);
  if (sumDen === 0) return null;
  return sumNum / sumDen;
}

/**
 * Medial average: average excluding the highest and lowest values.
 * Common in actuarial factor selection.
 */
export function medialAverage(values: number[]): number | null {
  if (values.length <= 2) return simpleAverage(values);
  const sorted = [...values].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  return simpleAverage(trimmed);
}

/**
 * Geometric mean of an array of values.
 */
export function geometricMean(values: number[]): number | null {
  if (values.length === 0) return null;
  const product = values.reduce((a, b) => a * b, 1);
  return Math.pow(product, 1 / values.length);
}

/**
 * Right-to-left cumulative product.
 * Given [f1, f2, f3], returns [f1*f2*f3, f2*f3, f3].
 * This is how cumulative development factors (CDFs) are computed.
 */
export function cumulativeProductRTL(factors: number[]): number[] {
  const result = new Array<number>(factors.length);
  let product = 1;
  for (let i = factors.length - 1; i >= 0; i--) {
    product *= factors[i];
    result[i] = product;
  }
  return result;
}

/**
 * Exponential regression on (x, y) pairs.
 * Fits ln(y) = a + b*x via OLS and returns { a, b, annualTrend: e^b - 1 }.
 */
export function exponentialRegression(
  xs: number[],
  ys: number[]
): { intercept: number; slope: number; annualTrend: number } {
  const n = xs.length;
  if (n < 2) {
    return { intercept: 0, slope: 0, annualTrend: 0 };
  }

  const logYs = ys.map((y) => Math.log(y));
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumLogY = logYs.reduce((a, b) => a + b, 0);
  const sumXLogY = xs.reduce((acc, x, i) => acc + x * logYs[i], 0);
  const sumX2 = xs.reduce((acc, x) => acc + x * x, 0);

  const slope = (n * sumXLogY - sumX * sumLogY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumLogY - slope * sumX) / n;

  return {
    intercept,
    slope,
    annualTrend: Math.exp(slope) - 1,
  };
}

export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}
