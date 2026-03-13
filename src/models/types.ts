// ── Database Row Types (mirror Supabase/PostgreSQL schema) ──

export interface LineOfBusiness {
  id: number;
  code: string;
  name: string;
  description: string | null;
}

export interface Claim {
  id: number;
  lob_id: number;
  claim_number: string;
  accident_year: number;
  accident_date: string | null;
  development_month: number;
  paid_loss: number;
  incurred_loss: number;
  case_reserves: number;
  claimant_count: number;
  status: string;
  evaluation_date: string;
  state: string;
  coverage: string;
  policy_limit: number;
  deductible: number;
}

export interface Policy {
  id: number;
  lob_id: number;
  policy_year: number;
  earned_premium: number;
  written_premium: number;
  exposures: number;
  in_force_count: number;
  effective_date: string | null;
  state: string;
  coverage: string;
  policy_limit: number;
  deductible: number;
}

export interface RateChange {
  id: number;
  lob_id: number;
  effective_date: string;
  rate_change_pct: number;
  cumulative_factor: number | null;
  description: string | null;
}

// ── Averaging / Selection Types ──

/** Number of most recent quarters (data points) to include in an average */
export type AveragingWindow = 4 | 6 | 8 | 12 | 16 | 'all';

/** Whether to use straight or high-low (exclude min/max) averaging */
export type AveragingVariant = 'straight' | 'hi-lo';

/** Volume-weighted or simple arithmetic */
export type AveragingType = 'volume_weighted' | 'simple';

/** Fully describes one averaging method */
export interface AveragingMethod {
  window: AveragingWindow;
  variant: AveragingVariant;
  type: AveragingType;
}

/** The standard set of windows available */
export const AVERAGING_WINDOWS: AveragingWindow[] = [4, 6, 8, 12, 16, 'all'];

/** A single computed average row in the factor exhibit */
export interface AverageRow {
  label: string;
  method: AveragingMethod;
  values: (number | null)[];
}

/** User options for LDF selection */
export interface LdfSelectionOptions {
  /** Which averaging method to use for the "selected" row. Default: volume_weighted, all, straight */
  selection_method: AveragingMethod;
  /** Tail factor. Default: 1.0 */
  tail_factor: number;
}

export const DEFAULT_LDF_SELECTION: LdfSelectionOptions = {
  selection_method: { window: 'all', variant: 'straight', type: 'volume_weighted' },
  tail_factor: 1.0,
};

// ── Actuarial Calculation Types ──

export type LossType = 'paid' | 'incurred' | 'paid_severity' | 'incurred_severity' | 'claim_count';

export interface Triangle {
  accident_years: number[];
  development_periods: number[];
  values: (number | null)[][];
  loss_type: LossType;
}

export interface AgeToAgeFactors {
  /** Labels for each factor column, e.g. ["12-24", "24-36", ...] */
  period_labels: string[];
  /** Link ratios by accident year row */
  factors_by_year: (number | null)[][];
  /** All computed average rows */
  averages: AverageRow[];
  /** The selected factors (one per period + tail) */
  selected: number[];
  /** Which method was used for selection */
  selection_method: AveragingMethod;
  /** Cumulative development factors */
  cumulative_to_ultimate: number[];
}

export interface UltimateLoss {
  accident_year: number;
  latest_reported: number;
  development_period: number;
  cdf: number;
  ultimate: number;
}

export interface TrendFactors {
  loss_trend_annual: number;
  premium_trend_annual: number;
  trend_period_years: number;
  loss_trend_factor: number;
  premium_trend_factor: number;
}

/** User options for trend fitting */
export interface TrendFitOptions {
  /** Which window of data points to use for the fit */
  window: AveragingWindow;
  /** Whether to exclude the highest and lowest points before fitting */
  variant: AveragingVariant;
}

export const DEFAULT_TREND_FIT: TrendFitOptions = {
  window: 'all',
  variant: 'straight',
};

/** Result of fitting a trend with a specific method */
export interface TrendFitResult {
  label: string;
  options: TrendFitOptions;
  annual_trend: number;
  r_squared: number;
  /** Regression intercept (on log scale): ln(y) = intercept + slope * x */
  intercept: number;
  /** Regression slope (on log scale) */
  slope: number;
}

export interface OnLevelFactors {
  policy_years: number[];
  on_level_factors: number[];
}

export interface IndicationResult {
  accident_year: number;
  reported_losses: number;
  development_factor: number;
  ultimate_losses: number;
  loss_trend_factor: number;
  trended_ultimate_losses: number;
  earned_premium: number;
  on_level_factor: number;
  on_level_premium: number;
  premium_trend_factor: number;
  trended_on_level_premium: number;
  expected_loss_ratio: number;
  indicated_rate_change: number;
}

export interface IndicationInputs {
  expense_ratio: number;
  target_profit_and_contingency: number;
  loss_trend_annual: number;
  premium_trend_annual: number;
  /** The future point (in years from latest diagonal) to which losses are trended */
  trend_to_year: number;
}

export interface IndicationSummary {
  results: IndicationResult[];
  weighted_indicated_change: number;
  all_year_average_change: number;
  permissible_loss_ratio: number;
}

export interface TriangleDataRow {
  accident_year: number;
  development_month: number;
  value: number;
}
