// ── r8r: Actuarial Analysis Engine ──
// Loss development triangles, trend factors, and rate level indications

// Public API exports
export { getClient, resetClient } from './db/client';
export {
  getLinesOfBusiness,
  getClaims,
  getTriangleData,
  getPolicies,
  getRateHistory,
} from './db/queries';

export {
  buildTriangle,
  calculateAgeToAgeFactors,
  getAverageRow,
  developToUltimate,
} from './actuarial/triangles';

export {
  fitLossTrend,
  fitTrend,
  fitAllTrends,
  compoundTrendFactor,
  computeTrendFactors,
  calculateOnLevelFactors,
} from './actuarial/trends';

export { calculateIndications } from './actuarial/indications';

export {
  formatTriangle,
  formatAgeToAgeFactors,
  formatAgeToAgeFactorsCompact,
  formatIndicationSummary,
  formatTrendFits,
} from './reports/formatters';

export {
  simulate,
  aggregateForTriangles,
  toTriangleData,
} from './simulation/simulator';
export type {
  AggregatedTriangleRow,
  TriangleMetric,
} from './simulation/simulator';

export {
  DEFAULT_SIMULATION_CONFIG,
} from './simulation/types';
export type {
  SimulationConfig,
  SimulationResult,
  SimulationSummary,
} from './simulation/types';

export { SeededRandom } from './simulation/random';

export * from './models/types';

// ── Demo: run with `node dist/index.js` ──
if (require.main === module) {
  const { simulate, aggregateForTriangles, toTriangleData } = require('./simulation/simulator');
  const { buildTriangle, calculateAgeToAgeFactors, developToUltimate } = require('./actuarial/triangles');
  const { calculateOnLevelFactors, fitAllTrends } = require('./actuarial/trends');
  const { calculateIndications } = require('./actuarial/indications');
  const {
    formatTriangle,
    formatAgeToAgeFactorsCompact,
    formatIndicationSummary,
    formatTrendFits,
  } = require('./reports/formatters');

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  r8r — Actuarial Analysis Demo (Simulated Homeowners Data)');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  // ── 1. Simulate 10 years of data ──

  console.log('Simulating 10 years of policy and claim data...');
  const result = simulate({
    seed: 42,
    years: 10,
    base_year: 2015,
    evaluation_year: 2025,
    base_policy_count: 10000,
    base_premium_per_policy: 1200,
    exposure_growth_annual: 0.03,
    premium_drift_annual: 0.02,
    base_frequency: 0.08,
    frequency_trend_annual: 0.01,
    base_severity_mean: 15000,
    severity_cv: 1.5,
    severity_trend_annual: 0.04,
  });

  console.log('');
  console.log('Simulation Summary:');
  console.log(`  Total policies:        ${result.summary.total_policies}`);
  console.log(`  Total claims:          ${result.summary.total_claims}`);
  console.log(`  Total claim snapshots:  ${result.summary.total_claim_snapshots}`);
  console.log('');
  console.log('  Year  Policies  Claims  Ultimate Losses');
  console.log('  ────  ────────  ──────  ──────────────');
  for (const y of result.summary.years) {
    console.log(
      `  ${y.year}  ${String(y.policies).padStart(8)}  ${String(y.claims).padStart(6)}  ${y.ultimate_losses.toLocaleString().padStart(14)}`
    );
  }
  console.log('');

  // ── 2. Aggregate into triangle data ──

  const aggregated = aggregateForTriangles(result.claims);

  // ── 3. Paid Loss Triangle ──

  const paidData = toTriangleData(aggregated, 'paid');
  const paidTriangle = buildTriangle(paidData, 'paid');
  console.log(formatTriangle(paidTriangle));
  console.log('');

  const paidFactors = calculateAgeToAgeFactors(paidTriangle);
  console.log(formatAgeToAgeFactorsCompact(paidFactors, paidTriangle.accident_years, [
    'All Vol Wtd', 'All Simple', 'All Vol Wtd Hi-Lo',
    '4Q Vol Wtd', '4Q Simple', '8Q Vol Wtd',
  ]));
  console.log('');

  // ── 4. Incurred Loss Triangle ──

  const incData = toTriangleData(aggregated, 'incurred');
  const incTriangle = buildTriangle(incData, 'incurred');
  console.log(formatTriangle(incTriangle));
  console.log('');

  const incFactors = calculateAgeToAgeFactors(incTriangle);
  console.log(formatAgeToAgeFactorsCompact(incFactors, incTriangle.accident_years, [
    'All Vol Wtd', 'All Simple', 'All Vol Wtd Hi-Lo',
    '4Q Vol Wtd', '4Q Simple', '8Q Vol Wtd',
  ]));
  console.log('');

  // ── 5. Paid Severity Triangle ──

  const paidSevData = toTriangleData(aggregated, 'paid_severity');
  const paidSevTriangle = buildTriangle(paidSevData, 'paid_severity');
  console.log(formatTriangle(paidSevTriangle));
  console.log('');

  const paidSevFactors = calculateAgeToAgeFactors(paidSevTriangle);
  console.log(formatAgeToAgeFactorsCompact(paidSevFactors, paidSevTriangle.accident_years, [
    'All Vol Wtd', 'All Simple', '4Q Vol Wtd', '8Q Vol Wtd',
  ]));
  console.log('');

  // ── 6. Incurred Severity Triangle ──

  const incSevData = toTriangleData(aggregated, 'incurred_severity');
  const incSevTriangle = buildTriangle(incSevData, 'incurred_severity');
  console.log(formatTriangle(incSevTriangle));
  console.log('');

  const incSevFactors = calculateAgeToAgeFactors(incSevTriangle);
  console.log(formatAgeToAgeFactorsCompact(incSevFactors, incSevTriangle.accident_years, [
    'All Vol Wtd', 'All Simple', '4Q Vol Wtd', '8Q Vol Wtd',
  ]));
  console.log('');

  // ── 7. Trend fits on ultimate losses ──

  const annualUltimates = result.summary.years.map((y: any) => ({
    year: y.year,
    value: y.ultimate_losses,
  }));
  const trendFits = fitAllTrends(annualUltimates);
  console.log(formatTrendFits(trendFits, 'Loss Trend Fits (Ultimate Losses)'));
  console.log('');

  // Severity trend: ultimate losses / claim count
  const severityByYear = result.summary.years.map((y: any) => ({
    year: y.year,
    value: y.claims > 0 ? y.ultimate_losses / y.claims : 0,
  }));
  const sevTrendFits = fitAllTrends(severityByYear);
  console.log(formatTrendFits(sevTrendFits, 'Severity Trend Fits (Ultimate / Claim Count)'));
  console.log('');

  // Frequency trend: claims / policies
  const freqByYear = result.summary.years.map((y: any) => ({
    year: y.year,
    value: y.claims / y.policies,
  }));
  const freqTrendFits = fitAllTrends(freqByYear);
  console.log(formatTrendFits(freqTrendFits, 'Frequency Trend Fits (Claims / Policies)'));
  console.log('');

  // ── 8. On-level factors & indications (using paid triangle) ──

  const policyYears = result.policies.map((p: any) => p.policy_year);
  const onLevel = calculateOnLevelFactors(result.rate_history, policyYears);
  console.log('On-Level Factors:');
  for (let i = 0; i < onLevel.policy_years.length; i++) {
    console.log(`  PY ${onLevel.policy_years[i]}: ${onLevel.on_level_factors[i].toFixed(4)}`);
  }
  console.log('');

  const paidUltimates = developToUltimate(paidTriangle, paidFactors.cumulative_to_ultimate);
  const indication = calculateIndications(
    paidUltimates,
    result.policies,
    onLevel,
    {
      expense_ratio: 0.30,
      target_profit_and_contingency: 0.05,
      loss_trend_annual: 0.04,
      premium_trend_annual: 0.0,
      trend_to_year: 1.5,
    }
  );

  console.log(formatIndicationSummary(indication));
}
