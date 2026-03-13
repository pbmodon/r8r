import {
  Triangle,
  AgeToAgeFactors,
  UltimateLoss,
  LossType,
  TriangleDataRow,
  AveragingMethod,
  AveragingWindow,
  AveragingVariant,
  AverageRow,
  LdfSelectionOptions,
  AVERAGING_WINDOWS,
  DEFAULT_LDF_SELECTION,
} from '../models/types';
import {
  simpleAverage,
  volumeWeightedAverage,
  medialAverage,
  cumulativeProductRTL,
} from '../utils/math';

/**
 * Build a loss development triangle from raw data rows.
 * Rows are accident years, columns are development periods.
 */
export function buildTriangle(
  data: TriangleDataRow[],
  lossType: LossType
): Triangle {
  const aySet = new Set<number>();
  const devSet = new Set<number>();
  for (const row of data) {
    aySet.add(row.accident_year);
    devSet.add(row.development_month);
  }

  const accident_years = Array.from(aySet).sort((a, b) => a - b);
  const development_periods = Array.from(devSet).sort((a, b) => a - b);

  const lookup = new Map<string, number>();
  for (const row of data) {
    lookup.set(`${row.accident_year}-${row.development_month}`, row.value);
  }

  const values: (number | null)[][] = accident_years.map((ay) =>
    development_periods.map((dev) => {
      const key = `${ay}-${dev}`;
      return lookup.has(key) ? lookup.get(key)! : null;
    })
  );

  return { accident_years, development_periods, values, loss_type: lossType };
}

// ── Internal: compute one column average given raw factors and triangle values ──

function computeColumnAverage(
  colFactors: number[],
  colNumerators: number[],
  colDenominators: number[],
  method: AveragingMethod
): number | null {
  // Apply window
  const n = colFactors.length;
  const windowSize = method.window === 'all' ? n : method.window;
  const start = Math.max(0, n - windowSize);

  let factors = colFactors.slice(start);
  let numerators = colNumerators.slice(start);
  let denominators = colDenominators.slice(start);

  if (factors.length === 0) return null;

  // Apply hi-lo exclusion (remove highest and lowest)
  if (method.variant === 'hi-lo' && factors.length > 2) {
    // Find indices of min and max
    let minIdx = 0;
    let maxIdx = 0;
    for (let i = 1; i < factors.length; i++) {
      if (factors[i] < factors[minIdx]) minIdx = i;
      if (factors[i] > factors[maxIdx]) maxIdx = i;
    }

    // Remove both (handle case where min and max are same index)
    const exclude = new Set([minIdx, maxIdx]);
    factors = factors.filter((_, i) => !exclude.has(i));
    numerators = numerators.filter((_, i) => !exclude.has(i));
    denominators = denominators.filter((_, i) => !exclude.has(i));

    if (factors.length === 0) return null;
  }

  // Compute average
  if (method.type === 'volume_weighted') {
    return volumeWeightedAverage(numerators, denominators);
  } else {
    return simpleAverage(factors);
  }
}

function averageLabel(method: AveragingMethod): string {
  const windowStr = method.window === 'all' ? 'All' : `${method.window}Q`;
  const typeStr = method.type === 'volume_weighted' ? 'Vol Wtd' : 'Simple';
  const hlStr = method.variant === 'hi-lo' ? ' Hi-Lo' : '';
  return `${windowStr} ${typeStr}${hlStr}`;
}

/**
 * Calculate age-to-age (link ratio) factors from a triangle.
 *
 * Computes all combinations of averaging windows (4Q, 6Q, 8Q, 12Q, 16Q, All),
 * variants (straight, hi-lo), and types (volume_weighted, simple).
 *
 * The `selected` row defaults to the method specified in `options.selection_method`
 * (default: All periods, volume-weighted, straight).
 */
export function calculateAgeToAgeFactors(
  triangle: Triangle,
  options: Partial<LdfSelectionOptions> = {}
): AgeToAgeFactors {
  const opts: LdfSelectionOptions = { ...DEFAULT_LDF_SELECTION, ...options };
  const { development_periods, values } = triangle;
  const numPeriods = development_periods.length;
  const numYears = values.length;

  // Period labels
  const period_labels: string[] = [];
  for (let j = 0; j < numPeriods - 1; j++) {
    period_labels.push(`${development_periods[j]}-${development_periods[j + 1]}`);
  }
  period_labels.push('Tail');

  // Compute link ratios for each AY and each development interval
  const factors_by_year: (number | null)[][] = [];
  for (let i = 0; i < numYears; i++) {
    const row: (number | null)[] = [];
    for (let j = 0; j < numPeriods - 1; j++) {
      const curr = values[i][j];
      const next = values[i][j + 1];
      if (curr != null && next != null && curr !== 0) {
        row.push(next / curr);
      } else {
        row.push(null);
      }
    }
    row.push(null); // tail column
    factors_by_year.push(row);
  }

  // Pre-extract column data for efficiency
  const columnData: {
    factors: number[];
    numerators: number[];
    denominators: number[];
  }[] = [];

  for (let j = 0; j < numPeriods - 1; j++) {
    const factors: number[] = [];
    const numerators: number[] = [];
    const denominators: number[] = [];

    for (let i = 0; i < numYears; i++) {
      const f = factors_by_year[i][j];
      if (f != null) {
        factors.push(f);
        numerators.push(values[i][j + 1]!);
        denominators.push(values[i][j]!);
      }
    }
    columnData.push({ factors, numerators, denominators });
  }

  // Generate all averaging method combinations
  const variants: AveragingVariant[] = ['straight', 'hi-lo'];
  const types: ('volume_weighted' | 'simple')[] = ['volume_weighted', 'simple'];

  const averages: AverageRow[] = [];

  for (const window of AVERAGING_WINDOWS) {
    for (const type of types) {
      for (const variant of variants) {
        const method: AveragingMethod = { window, variant, type };
        const rowValues: (number | null)[] = [];

        for (let j = 0; j < numPeriods - 1; j++) {
          const { factors, numerators, denominators } = columnData[j];
          rowValues.push(computeColumnAverage(factors, numerators, denominators, method));
        }
        rowValues.push(null); // tail column

        averages.push({
          label: averageLabel(method),
          method,
          values: rowValues,
        });
      }
    }
  }

  // Find the selected method's average row
  const selMethod = opts.selection_method;
  const selectedRow = averages.find(
    (a) =>
      a.method.window === selMethod.window &&
      a.method.variant === selMethod.variant &&
      a.method.type === selMethod.type
  );

  // Build selected factors from the matching row, falling back to all-vol-wtd
  const selected: number[] = [];
  for (let j = 0; j < numPeriods - 1; j++) {
    if (selectedRow && selectedRow.values[j] != null) {
      selected.push(selectedRow.values[j]!);
    } else {
      // Fallback: all vol-wtd straight
      const fallback = averages.find(
        (a) =>
          a.method.window === 'all' &&
          a.method.variant === 'straight' &&
          a.method.type === 'volume_weighted'
      );
      selected.push(fallback?.values[j] ?? 1.0);
    }
  }
  selected.push(opts.tail_factor); // tail

  const cumulative_to_ultimate = cumulativeProductRTL(selected);

  return {
    period_labels,
    factors_by_year,
    averages,
    selected,
    selection_method: selMethod,
    cumulative_to_ultimate,
  };
}

/**
 * Convenience: get a specific average row from computed factors.
 */
export function getAverageRow(
  factors: AgeToAgeFactors,
  window: AveragingWindow,
  type: 'volume_weighted' | 'simple' = 'volume_weighted',
  variant: AveragingVariant = 'straight'
): AverageRow | undefined {
  return factors.averages.find(
    (a) =>
      a.method.window === window &&
      a.method.type === type &&
      a.method.variant === variant
  );
}

/**
 * Develop losses to ultimate using the latest diagonal and CDFs.
 */
export function developToUltimate(
  triangle: Triangle,
  cdfs: number[]
): UltimateLoss[] {
  const { accident_years, development_periods, values } = triangle;
  const results: UltimateLoss[] = [];

  for (let i = 0; i < accident_years.length; i++) {
    let latestValue: number | null = null;
    let latestPeriodIdx = -1;

    for (let j = values[i].length - 1; j >= 0; j--) {
      if (values[i][j] != null) {
        latestValue = values[i][j]!;
        latestPeriodIdx = j;
        break;
      }
    }

    if (latestValue == null) continue;

    const cdf = cdfs[latestPeriodIdx];

    results.push({
      accident_year: accident_years[i],
      latest_reported: latestValue,
      development_period: development_periods[latestPeriodIdx],
      cdf,
      ultimate: latestValue * cdf,
    });
  }

  return results;
}
