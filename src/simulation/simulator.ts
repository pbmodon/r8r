import { Claim, Policy, RateChange } from '../models/types';
import {
  SimulationConfig,
  SimulationResult,
  SimulationSummary,
  SimulatedClaim,
  DEFAULT_SIMULATION_CONFIG,
} from './types';
import { SeededRandom } from './random';

/**
 * Simulate a complete insurance dataset: policies, claims with development
 * snapshots, and rate change history.
 *
 * Every claim payment and reserve posting is tied to a specific policy.
 * Trends (frequency, severity, premium drift) are independently toggleable
 * via the config.
 */
export function simulate(
  partialConfig: Partial<SimulationConfig> = {}
): SimulationResult {
  const config: SimulationConfig = { ...DEFAULT_SIMULATION_CONFIG, ...partialConfig };
  const rng = new SeededRandom(config.seed ?? Date.now());

  const policies: Policy[] = [];
  const allClaims: SimulatedClaim[] = [];
  const summaryYears: SimulationSummary['years'] = [];

  let policyIdCounter = 1;
  let claimIdCounter = 1;

  // ── Generate policies and raw claims per accident year ──

  for (let yearIdx = 0; yearIdx < config.years; yearIdx++) {
    const ay = config.base_year + yearIdx;
    const yearsFromBase = yearIdx;

    // Policy count with exposure growth + small noise
    const expectedPolicies = config.base_policy_count *
      Math.pow(1 + config.exposure_growth_annual, yearsFromBase);
    const policyCount = Math.round(
      expectedPolicies * (1 + rng.nextGaussian() * 0.01)
    );

    // Average premium per policy with drift
    const avgPremium = config.base_premium_per_policy *
      Math.pow(1 + config.premium_drift_annual, yearsFromBase);

    // Total premium with some variance
    const totalWritten = policyCount * avgPremium * (1 + rng.nextGaussian() * 0.02);
    // Earned slightly less than written (assume ~97% earn ratio in year)
    const totalEarned = totalWritten * (0.96 + rng.next() * 0.03);

    const policy: Policy = {
      id: policyIdCounter++,
      lob_id: config.lob_id,
      policy_year: ay,
      earned_premium: Math.round(totalEarned * 100) / 100,
      written_premium: Math.round(totalWritten * 100) / 100,
      exposures: policyCount,
      in_force_count: policyCount,
      effective_date: `${ay}-01-01`,
    };
    policies.push(policy);

    // Claim frequency with trend + noise
    const expectedFrequency = config.base_frequency *
      Math.pow(1 + config.frequency_trend_annual, yearsFromBase) *
      (1 + rng.nextGaussian() * config.frequency_noise);
    const claimCount = rng.nextPoisson(policyCount * Math.max(0, expectedFrequency));

    // Severity mean with trend
    const severityMean = config.base_severity_mean *
      Math.pow(1 + config.severity_trend_annual, yearsFromBase);

    let yearUltimateLosses = 0;

    for (let c = 0; c < claimCount; c++) {
      const ultimateSeverity = Math.max(100, rng.nextLognormal(severityMean, config.severity_cv));
      const accidentDate = rng.nextDateInYear(ay);

      allClaims.push({
        policy_id: policy.id,
        claim_number: `CLM-${ay}-${String(claimIdCounter++).padStart(6, '0')}`,
        accident_year: ay,
        accident_date: accidentDate,
        ultimate_severity: ultimateSeverity,
      });

      yearUltimateLosses += ultimateSeverity;
    }

    summaryYears.push({
      year: ay,
      policies: policyCount,
      claims: claimCount,
      ultimate_losses: Math.round(yearUltimateLosses),
    });
  }

  // ── Generate claim development snapshots ──

  const claims: Claim[] = [];
  let snapshotId = 1;
  const numDevPeriods = config.paid_development_pattern.length;

  for (const rawClaim of allClaims) {
    const maxDevMonths = (config.evaluation_year - rawClaim.accident_year) * 12;

    for (let devIdx = 0; devIdx < numDevPeriods; devIdx++) {
      const devMonth = (devIdx + 1) * 12;

      // Only generate snapshots up to the evaluation date
      if (devMonth > maxDevMonths) break;

      // Paid development: cumulative proportion with noise
      const basePaidPct = config.paid_development_pattern[devIdx];
      const noisyPaidPct = Math.min(1.0, Math.max(0,
        basePaidPct + rng.nextGaussian() * config.development_noise
      ));

      // Ensure monotonicity: paid can't decrease
      const prevPaidPct = devIdx > 0
        ? config.paid_development_pattern[devIdx - 1]
        : 0;
      const effectivePaidPct = Math.max(prevPaidPct, noisyPaidPct);

      const paidLoss = rawClaim.ultimate_severity * effectivePaidPct;

      // Case reserves: estimate of remaining unpaid, with adequacy factor
      const trueRemaining = rawClaim.ultimate_severity - paidLoss;
      const adequacy = config.case_reserve_adequacy[devIdx] ?? 1.0;
      // Add some per-claim noise to reserve adequacy
      const noisyAdequacy = Math.min(1.5, Math.max(0.3,
        adequacy + rng.nextGaussian() * 0.08
      ));
      const caseReserves = Math.max(0, trueRemaining * noisyAdequacy);

      const incurredLoss = paidLoss + caseReserves;

      // Determine claim status
      let status: string;
      if (effectivePaidPct >= 0.999) {
        status = 'closed';
      } else if (devIdx > 0 && rng.next() < 0.02) {
        status = 'reopened';
      } else {
        status = 'open';
      }

      // Evaluation date: end of the development period from start of AY
      const evalYear = rawClaim.accident_year + Math.floor(devMonth / 12);
      const evalMonth = (devMonth % 12) || 12;
      const evaluationDate = `${evalYear}-${String(evalMonth).padStart(2, '0')}-01`;

      claims.push({
        id: snapshotId++,
        lob_id: config.lob_id,
        claim_number: rawClaim.claim_number,
        accident_year: rawClaim.accident_year,
        accident_date: rawClaim.accident_date,
        development_month: devMonth,
        paid_loss: Math.round(paidLoss * 100) / 100,
        incurred_loss: Math.round(incurredLoss * 100) / 100,
        case_reserves: Math.round(caseReserves * 100) / 100,
        claimant_count: 1,
        status,
        evaluation_date: evaluationDate,
      });
    }
  }

  // ── Rate changes ──

  const rate_history: RateChange[] = config.rate_changes.map((rc, idx) => ({
    id: idx + 1,
    lob_id: config.lob_id,
    effective_date: `${rc.year}-07-01`,
    rate_change_pct: rc.pct,
    cumulative_factor: null,
    description: `Rate change effective ${rc.year}-07-01`,
  }));

  // ── Summary ──

  const summary: SimulationSummary = {
    total_policies: policies.length,
    total_claims: allClaims.length,
    total_claim_snapshots: claims.length,
    years: summaryYears,
  };

  return { claims, policies, rate_history, config, summary };
}

/**
 * Aggregate simulated claims into triangle data rows.
 * Returns { accident_year, development_month, paid, incurred, claim_count }
 * for building paid, incurred, and severity triangles.
 */
export interface AggregatedTriangleRow {
  accident_year: number;
  development_month: number;
  total_paid: number;
  total_incurred: number;
  claim_count: number;
  avg_paid_severity: number;
  avg_incurred_severity: number;
}

export function aggregateForTriangles(claims: Claim[]): AggregatedTriangleRow[] {
  const key = (ay: number, dev: number) => `${ay}-${dev}`;
  const buckets = new Map<string, {
    ay: number;
    dev: number;
    paid: number;
    incurred: number;
    count: number;
  }>();

  for (const c of claims) {
    const k = key(c.accident_year, c.development_month);
    let bucket = buckets.get(k);
    if (!bucket) {
      bucket = { ay: c.accident_year, dev: c.development_month, paid: 0, incurred: 0, count: 0 };
      buckets.set(k, bucket);
    }
    bucket.paid += c.paid_loss;
    bucket.incurred += c.incurred_loss;
    bucket.count += c.claimant_count;
  }

  const rows: AggregatedTriangleRow[] = [];
  for (const b of buckets.values()) {
    rows.push({
      accident_year: b.ay,
      development_month: b.dev,
      total_paid: Math.round(b.paid * 100) / 100,
      total_incurred: Math.round(b.incurred * 100) / 100,
      claim_count: b.count,
      avg_paid_severity: b.count > 0 ? Math.round(b.paid / b.count * 100) / 100 : 0,
      avg_incurred_severity: b.count > 0 ? Math.round(b.incurred / b.count * 100) / 100 : 0,
    });
  }

  rows.sort((a, b) => a.accident_year - b.accident_year || a.development_month - b.development_month);
  return rows;
}

/**
 * Convert aggregated rows to TriangleDataRow[] for a specific metric.
 */
export type TriangleMetric =
  | 'paid'
  | 'incurred'
  | 'paid_severity'
  | 'incurred_severity'
  | 'claim_count';

export function toTriangleData(
  aggregated: AggregatedTriangleRow[],
  metric: TriangleMetric
): { accident_year: number; development_month: number; value: number }[] {
  return aggregated.map((r) => ({
    accident_year: r.accident_year,
    development_month: r.development_month,
    value:
      metric === 'paid' ? r.total_paid :
      metric === 'incurred' ? r.total_incurred :
      metric === 'paid_severity' ? r.avg_paid_severity :
      metric === 'incurred_severity' ? r.avg_incurred_severity :
      r.claim_count,
  }));
}
