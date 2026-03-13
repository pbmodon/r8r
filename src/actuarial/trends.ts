import {
  TrendFactors,
  OnLevelFactors,
  RateChange,
  TrendFitOptions,
  TrendFitResult,
  AveragingWindow,
  AveragingVariant,
  AVERAGING_WINDOWS,
  DEFAULT_TREND_FIT,
} from '../models/types';
import { exponentialRegression } from '../utils/math';

/**
 * Fit an exponential trend to annual data with windowing and hi-lo options.
 */
export function fitTrend(
  data: { year: number; value: number }[],
  options: TrendFitOptions = DEFAULT_TREND_FIT
): TrendFitResult {
  if (data.length < 2) {
    return {
      label: trendFitLabel(options),
      options,
      annual_trend: 0,
      r_squared: 0,
    };
  }

  // Sort by year
  const sorted = [...data].sort((a, b) => a.year - b.year);

  // Apply window (most recent N points)
  const windowSize = options.window === 'all' ? sorted.length : options.window;
  let windowed = sorted.slice(Math.max(0, sorted.length - windowSize));

  // Apply hi-lo exclusion (remove points with highest and lowest values)
  if (options.variant === 'hi-lo' && windowed.length > 2) {
    let minIdx = 0;
    let maxIdx = 0;
    for (let i = 1; i < windowed.length; i++) {
      if (windowed[i].value < windowed[minIdx].value) minIdx = i;
      if (windowed[i].value > windowed[maxIdx].value) maxIdx = i;
    }
    const exclude = new Set([minIdx, maxIdx]);
    windowed = windowed.filter((_, i) => !exclude.has(i));
  }

  if (windowed.length < 2) {
    return {
      label: trendFitLabel(options),
      options,
      annual_trend: 0,
      r_squared: 0,
    };
  }

  const xs = windowed.map((d) => d.year);
  const ys = windowed.map((d) => d.value);
  const regression = exponentialRegression(xs, ys);

  // Compute R² on log-transformed values
  const logYs = ys.map((y) => Math.log(y));
  const predicted = xs.map((x) => regression.intercept + regression.slope * x);
  const meanLogY = logYs.reduce((a, b) => a + b, 0) / logYs.length;
  const ssRes = logYs.reduce((acc, y, i) => acc + (y - predicted[i]) ** 2, 0);
  const ssTot = logYs.reduce((acc, y) => acc + (y - meanLogY) ** 2, 0);
  const r_squared = ssTot > 0 ? 1 - ssRes / ssTot : 0;

  return {
    label: trendFitLabel(options),
    options,
    annual_trend: regression.annualTrend,
    r_squared,
  };
}

/**
 * Compute all trend fit combinations for the standard windows.
 */
export function fitAllTrends(
  data: { year: number; value: number }[]
): TrendFitResult[] {
  const results: TrendFitResult[] = [];
  const variants: AveragingVariant[] = ['straight', 'hi-lo'];

  for (const window of AVERAGING_WINDOWS) {
    for (const variant of variants) {
      results.push(fitTrend(data, { window, variant }));
    }
  }

  return results;
}

/** Legacy convenience: fit with all data, straight. */
export function fitLossTrend(
  data: { year: number; value: number }[]
): number {
  return fitTrend(data, DEFAULT_TREND_FIT).annual_trend;
}

function trendFitLabel(options: TrendFitOptions): string {
  const windowStr = options.window === 'all' ? 'All' : `${options.window}Q`;
  const hlStr = options.variant === 'hi-lo' ? ' Hi-Lo' : '';
  return `${windowStr}${hlStr}`;
}

/**
 * Compute the compound trend factor: (1 + annualRate)^years.
 */
export function compoundTrendFactor(annualRate: number, years: number): number {
  return Math.pow(1 + annualRate, years);
}

/**
 * Bundle trend parameters into a TrendFactors object.
 */
export function computeTrendFactors(
  lossTrendAnnual: number,
  premiumTrendAnnual: number,
  trendPeriodYears: number
): TrendFactors {
  return {
    loss_trend_annual: lossTrendAnnual,
    premium_trend_annual: premiumTrendAnnual,
    trend_period_years: trendPeriodYears,
    loss_trend_factor: compoundTrendFactor(lossTrendAnnual, trendPeriodYears),
    premium_trend_factor: compoundTrendFactor(premiumTrendAnnual, trendPeriodYears),
  };
}

/**
 * Calculate on-level factors to bring historical premium to current rate level.
 *
 * Uses a simplified parallelogram method:
 * 1. Build a cumulative rate level index from rate change history.
 * 2. For each policy year, determine the average rate level in effect.
 * 3. On-level factor = current_rate_level / avg_rate_level_for_year.
 */
export function calculateOnLevelFactors(
  rateHistory: RateChange[],
  policyYears: number[]
): OnLevelFactors {
  if (rateHistory.length === 0) {
    return {
      policy_years: policyYears,
      on_level_factors: policyYears.map(() => 1.0),
    };
  }

  const sorted = [...rateHistory].sort(
    (a, b) => new Date(a.effective_date).getTime() - new Date(b.effective_date).getTime()
  );

  interface RateLevel {
    date: Date;
    cumulativeLevel: number;
  }

  const levels: RateLevel[] = [];
  let cumLevel = 1.0;

  const firstDate = new Date(sorted[0].effective_date);
  levels.push({ date: new Date(firstDate.getTime() - 1), cumulativeLevel: cumLevel });

  for (const change of sorted) {
    cumLevel *= 1 + change.rate_change_pct;
    levels.push({ date: new Date(change.effective_date), cumulativeLevel: cumLevel });
  }

  const currentLevel = cumLevel;

  const on_level_factors: number[] = policyYears.map((year) => {
    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year + 1}-01-01`);
    const yearMs = yearEnd.getTime() - yearStart.getTime();

    let weightedSum = 0;

    for (let k = 0; k < levels.length; k++) {
      const periodStart = levels[k].date;
      const periodEnd = k < levels.length - 1 ? levels[k + 1].date : yearEnd;
      const level = levels[k].cumulativeLevel;

      const overlapStart = new Date(Math.max(periodStart.getTime(), yearStart.getTime()));
      const overlapEnd = new Date(Math.min(periodEnd.getTime(), yearEnd.getTime()));

      if (overlapStart < overlapEnd) {
        const weight = (overlapEnd.getTime() - overlapStart.getTime()) / yearMs;
        weightedSum += level * weight;
      }
    }

    if (weightedSum === 0) return 1.0;
    return currentLevel / weightedSum;
  });

  return { policy_years: policyYears, on_level_factors };
}
