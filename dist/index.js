"use strict";
// ── r8r: Actuarial Analysis Engine ──
// Loss development triangles, trend factors, and rate level indications
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SeededRandom = exports.DEFAULT_SIMULATION_CONFIG = exports.toTriangleData = exports.aggregateForTriangles = exports.simulate = exports.formatTrendFits = exports.formatIndicationSummary = exports.formatAgeToAgeFactorsCompact = exports.formatAgeToAgeFactors = exports.formatTriangle = exports.calculateIndications = exports.calculateOnLevelFactors = exports.computeTrendFactors = exports.compoundTrendFactor = exports.fitAllTrends = exports.fitTrend = exports.fitLossTrend = exports.developToUltimate = exports.getAverageRow = exports.calculateAgeToAgeFactors = exports.buildTriangle = exports.getRateHistory = exports.getPolicies = exports.getTriangleData = exports.getClaims = exports.getLinesOfBusiness = exports.resetClient = exports.getClient = void 0;
// Public API exports
var client_1 = require("./db/client");
Object.defineProperty(exports, "getClient", { enumerable: true, get: function () { return client_1.getClient; } });
Object.defineProperty(exports, "resetClient", { enumerable: true, get: function () { return client_1.resetClient; } });
var queries_1 = require("./db/queries");
Object.defineProperty(exports, "getLinesOfBusiness", { enumerable: true, get: function () { return queries_1.getLinesOfBusiness; } });
Object.defineProperty(exports, "getClaims", { enumerable: true, get: function () { return queries_1.getClaims; } });
Object.defineProperty(exports, "getTriangleData", { enumerable: true, get: function () { return queries_1.getTriangleData; } });
Object.defineProperty(exports, "getPolicies", { enumerable: true, get: function () { return queries_1.getPolicies; } });
Object.defineProperty(exports, "getRateHistory", { enumerable: true, get: function () { return queries_1.getRateHistory; } });
var triangles_1 = require("./actuarial/triangles");
Object.defineProperty(exports, "buildTriangle", { enumerable: true, get: function () { return triangles_1.buildTriangle; } });
Object.defineProperty(exports, "calculateAgeToAgeFactors", { enumerable: true, get: function () { return triangles_1.calculateAgeToAgeFactors; } });
Object.defineProperty(exports, "getAverageRow", { enumerable: true, get: function () { return triangles_1.getAverageRow; } });
Object.defineProperty(exports, "developToUltimate", { enumerable: true, get: function () { return triangles_1.developToUltimate; } });
var trends_1 = require("./actuarial/trends");
Object.defineProperty(exports, "fitLossTrend", { enumerable: true, get: function () { return trends_1.fitLossTrend; } });
Object.defineProperty(exports, "fitTrend", { enumerable: true, get: function () { return trends_1.fitTrend; } });
Object.defineProperty(exports, "fitAllTrends", { enumerable: true, get: function () { return trends_1.fitAllTrends; } });
Object.defineProperty(exports, "compoundTrendFactor", { enumerable: true, get: function () { return trends_1.compoundTrendFactor; } });
Object.defineProperty(exports, "computeTrendFactors", { enumerable: true, get: function () { return trends_1.computeTrendFactors; } });
Object.defineProperty(exports, "calculateOnLevelFactors", { enumerable: true, get: function () { return trends_1.calculateOnLevelFactors; } });
var indications_1 = require("./actuarial/indications");
Object.defineProperty(exports, "calculateIndications", { enumerable: true, get: function () { return indications_1.calculateIndications; } });
var formatters_1 = require("./reports/formatters");
Object.defineProperty(exports, "formatTriangle", { enumerable: true, get: function () { return formatters_1.formatTriangle; } });
Object.defineProperty(exports, "formatAgeToAgeFactors", { enumerable: true, get: function () { return formatters_1.formatAgeToAgeFactors; } });
Object.defineProperty(exports, "formatAgeToAgeFactorsCompact", { enumerable: true, get: function () { return formatters_1.formatAgeToAgeFactorsCompact; } });
Object.defineProperty(exports, "formatIndicationSummary", { enumerable: true, get: function () { return formatters_1.formatIndicationSummary; } });
Object.defineProperty(exports, "formatTrendFits", { enumerable: true, get: function () { return formatters_1.formatTrendFits; } });
var simulator_1 = require("./simulation/simulator");
Object.defineProperty(exports, "simulate", { enumerable: true, get: function () { return simulator_1.simulate; } });
Object.defineProperty(exports, "aggregateForTriangles", { enumerable: true, get: function () { return simulator_1.aggregateForTriangles; } });
Object.defineProperty(exports, "toTriangleData", { enumerable: true, get: function () { return simulator_1.toTriangleData; } });
var types_1 = require("./simulation/types");
Object.defineProperty(exports, "DEFAULT_SIMULATION_CONFIG", { enumerable: true, get: function () { return types_1.DEFAULT_SIMULATION_CONFIG; } });
var random_1 = require("./simulation/random");
Object.defineProperty(exports, "SeededRandom", { enumerable: true, get: function () { return random_1.SeededRandom; } });
__exportStar(require("./models/types"), exports);
// ── Demo: run with `node dist/index.js` ──
if (require.main === module) {
    const { simulate, aggregateForTriangles, toTriangleData } = require('./simulation/simulator');
    const { buildTriangle, calculateAgeToAgeFactors, developToUltimate } = require('./actuarial/triangles');
    const { calculateOnLevelFactors, fitAllTrends } = require('./actuarial/trends');
    const { calculateIndications } = require('./actuarial/indications');
    const { formatTriangle, formatAgeToAgeFactorsCompact, formatIndicationSummary, formatTrendFits, } = require('./reports/formatters');
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
        console.log(`  ${y.year}  ${String(y.policies).padStart(8)}  ${String(y.claims).padStart(6)}  ${y.ultimate_losses.toLocaleString().padStart(14)}`);
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
    const annualUltimates = result.summary.years.map((y) => ({
        year: y.year,
        value: y.ultimate_losses,
    }));
    const trendFits = fitAllTrends(annualUltimates);
    console.log(formatTrendFits(trendFits, 'Loss Trend Fits (Ultimate Losses)'));
    console.log('');
    // Severity trend: ultimate losses / claim count
    const severityByYear = result.summary.years.map((y) => ({
        year: y.year,
        value: y.claims > 0 ? y.ultimate_losses / y.claims : 0,
    }));
    const sevTrendFits = fitAllTrends(severityByYear);
    console.log(formatTrendFits(sevTrendFits, 'Severity Trend Fits (Ultimate / Claim Count)'));
    console.log('');
    // Frequency trend: claims / policies
    const freqByYear = result.summary.years.map((y) => ({
        year: y.year,
        value: y.claims / y.policies,
    }));
    const freqTrendFits = fitAllTrends(freqByYear);
    console.log(formatTrendFits(freqTrendFits, 'Frequency Trend Fits (Claims / Policies)'));
    console.log('');
    // ── 8. On-level factors & indications (using paid triangle) ──
    const policyYears = result.policies.map((p) => p.policy_year);
    const onLevel = calculateOnLevelFactors(result.rate_history, policyYears);
    console.log('On-Level Factors:');
    for (let i = 0; i < onLevel.policy_years.length; i++) {
        console.log(`  PY ${onLevel.policy_years[i]}: ${onLevel.on_level_factors[i].toFixed(4)}`);
    }
    console.log('');
    const paidUltimates = developToUltimate(paidTriangle, paidFactors.cumulative_to_ultimate);
    const indication = calculateIndications(paidUltimates, result.policies, onLevel, {
        expense_ratio: 0.30,
        target_profit_and_contingency: 0.05,
        loss_trend_annual: 0.04,
        premium_trend_annual: 0.0,
        trend_to_year: 1.5,
    });
    console.log(formatIndicationSummary(indication));
}
//# sourceMappingURL=index.js.map