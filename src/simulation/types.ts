import { Claim, Policy, RateChange } from '../models/types';

/** Configuration for the data simulator. All trend rates are annual. */
export interface SimulationConfig {
  /** Random seed for reproducibility (default: Date.now()) */
  seed?: number;

  /** Number of accident years to simulate */
  years: number;
  /** First accident year (e.g. 2015) */
  base_year: number;
  /** Current evaluation date — controls how far development extends */
  evaluation_year: number;

  lob_id: number;
  lob_code: string;

  // ── Policy / Exposure ──

  /** Number of policies in the base year */
  base_policy_count: number;
  /** Average written premium per policy in the base year */
  base_premium_per_policy: number;
  /** Annual growth in policy count (e.g. 0.03 = 3%) */
  exposure_growth_annual: number;
  /** Annual drift in average premium (rate adequacy erosion or increase, e.g. 0.02 = 2%) */
  premium_drift_annual: number;

  // ── Frequency ──

  /** Claim frequency per policy in the base year */
  base_frequency: number;
  /** Annual frequency trend (e.g. 0.01 = 1% more claims/year) */
  frequency_trend_annual: number;

  // ── Severity ──

  /** Mean claim severity in the base year (lognormal location derived from this) */
  base_severity_mean: number;
  /** CV of severity distribution (coefficient of variation, e.g. 1.5) */
  severity_cv: number;
  /** Annual severity trend (e.g. 0.04 = 4% inflation/year) */
  severity_trend_annual: number;

  // ── Development Pattern ──

  /**
   * Cumulative proportion of ultimate paid at each 12-month development age.
   * E.g. [0.30, 0.60, 0.80, 0.90, 0.95, 0.98, 1.00]
   * means 30% paid by month 12, 60% by month 24, etc.
   * Length determines the number of development periods.
   */
  paid_development_pattern: number[];

  /**
   * Case reserve adequacy at each development age.
   * Ratio of case reserve to true remaining unpaid.
   * E.g. [0.65, 0.75, 0.85, 0.92, 0.96, 0.99, 1.00]
   * Lower values = more IBNR (case reserves understate true remaining).
   */
  case_reserve_adequacy: number[];

  // ── Rate Changes ──

  /**
   * Historical rate changes. Each { year, pct } means a rate change
   * of `pct` effective July 1 of that year.
   */
  rate_changes: { year: number; pct: number }[];

  // ── Segmentation ──

  states: StateConfig[];
  coverages: CoverageConfig[];
  limits: LimitConfig[];
  deductibles: DeductibleConfig[];

  // ── Noise ──

  /** Standard deviation of random noise applied to development proportions (default 0.03) */
  development_noise: number;
  /** Standard deviation of random noise on frequency per year (default 0.02) */
  frequency_noise: number;
}

export interface StateConfig {
  code: string;
  weight: number;
  frequency_multiplier: number;
  severity_multiplier: number;
}

export interface CoverageConfig {
  code: string;
  name: string;
  weight: number;
  frequency_multiplier: number;
  severity_multiplier: number;
}

export interface LimitConfig {
  limit: number;
  ilf: number;
  weight: number;
}

export interface DeductibleConfig {
  deductible: number;
  factor: number;
  weight: number;
}

/** Complete simulation output ready for analysis */
export interface SimulationResult {
  claims: Claim[];
  /** Raw simulated claims with ground-up severity (before development snapshots) */
  raw_claims: SimulatedClaim[];
  policies: Policy[];
  rate_history: RateChange[];
  config: SimulationConfig;
  /** Summary stats for validation */
  summary: SimulationSummary;
}

export interface SimulationSummary {
  total_policies: number;
  total_claims: number;
  total_claim_snapshots: number;
  years: { year: number; policies: number; claims: number; ultimate_losses: number; earned_premium: number }[];
}

/** Intermediate: one simulated claim before development snapshots are generated */
export interface SimulatedClaim {
  policy_id: number;
  claim_number: string;
  accident_year: number;
  accident_date: string;
  ultimate_severity: number;
  /** Pre-cap, pre-deductible severity for ILF analysis */
  ground_up_severity: number;
  state: string;
  coverage: string;
  policy_limit: number;
  deductible: number;
}

export const DEFAULT_SIMULATION_CONFIG: SimulationConfig = {
  seed: 42,
  years: 10,
  base_year: 2015,
  evaluation_year: 2025,
  lob_id: 1,
  lob_code: 'HO',

  base_policy_count: 10000,
  base_premium_per_policy: 1200,
  exposure_growth_annual: 0.03,
  premium_drift_annual: 0.02,

  base_frequency: 0.08,
  frequency_trend_annual: 0.01,

  base_severity_mean: 15000,
  severity_cv: 1.5,
  severity_trend_annual: 0.04,

  paid_development_pattern: [0.25, 0.55, 0.75, 0.87, 0.93, 0.97, 0.99, 1.00],
  case_reserve_adequacy:    [0.60, 0.72, 0.82, 0.90, 0.95, 0.98, 0.99, 1.00],

  states: [
    { code: 'CA', weight: 0.30, frequency_multiplier: 1.10, severity_multiplier: 1.15 },
    { code: 'TX', weight: 0.25, frequency_multiplier: 0.95, severity_multiplier: 0.90 },
    { code: 'FL', weight: 0.20, frequency_multiplier: 1.20, severity_multiplier: 1.10 },
    { code: 'NY', weight: 0.15, frequency_multiplier: 1.05, severity_multiplier: 1.20 },
    { code: 'IL', weight: 0.10, frequency_multiplier: 0.90, severity_multiplier: 0.85 },
  ],
  coverages: [
    { code: 'BI', name: 'Bodily Injury', weight: 0.30, frequency_multiplier: 1.0, severity_multiplier: 1.3 },
    { code: 'PD', name: 'Property Damage', weight: 0.25, frequency_multiplier: 1.1, severity_multiplier: 0.7 },
    { code: 'COMP', name: 'Comprehensive', weight: 0.20, frequency_multiplier: 0.7, severity_multiplier: 0.4 },
    { code: 'COLL', name: 'Collision', weight: 0.25, frequency_multiplier: 1.3, severity_multiplier: 0.6 },
  ],
  limits: [
    { limit: 100000, ilf: 1.000, weight: 0.30 },
    { limit: 300000, ilf: 1.350, weight: 0.35 },
    { limit: 500000, ilf: 1.550, weight: 0.20 },
    { limit: 1000000, ilf: 1.850, weight: 0.15 },
  ],
  deductibles: [
    { deductible: 250, factor: 1.10, weight: 0.15 },
    { deductible: 500, factor: 1.00, weight: 0.40 },
    { deductible: 1000, factor: 0.85, weight: 0.30 },
    { deductible: 2500, factor: 0.65, weight: 0.15 },
  ],

  rate_changes: [
    { year: 2016, pct: 0.03 },
    { year: 2017, pct: 0.04 },
    { year: 2018, pct: -0.01 },
    { year: 2019, pct: 0.05 },
    { year: 2020, pct: 0.02 },
    { year: 2021, pct: 0.06 },
    { year: 2022, pct: 0.08 },
    { year: 2023, pct: 0.07 },
    { year: 2024, pct: 0.05 },
  ],

  development_noise: 0.03,
  frequency_noise: 0.02,
};
