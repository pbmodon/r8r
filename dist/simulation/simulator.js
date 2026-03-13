"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulate = simulate;
exports.aggregateForTriangles = aggregateForTriangles;
exports.toTriangleData = toTriangleData;
const types_1 = require("./types");
const random_1 = require("./random");
/**
 * Simulate a complete insurance dataset: policies, claims with development
 * snapshots, and rate change history.
 *
 * Every claim payment and reserve posting is tied to a specific policy.
 * Trends (frequency, severity, premium drift) are independently toggleable
 * via the config.
 */
function simulate(partialConfig = {}) {
    var _a, _b;
    const config = Object.assign(Object.assign({}, types_1.DEFAULT_SIMULATION_CONFIG), partialConfig);
    const rng = new random_1.SeededRandom((_a = config.seed) !== null && _a !== void 0 ? _a : Date.now());
    const policies = [];
    const allClaims = [];
    const summaryYears = [];
    let policyIdCounter = 1;
    let claimIdCounter = 1;
    // ── Generate policies and raw claims per accident year ──
    for (let yearIdx = 0; yearIdx < config.years; yearIdx++) {
        const ay = config.base_year + yearIdx;
        const yearsFromBase = yearIdx;
        // Policy count with exposure growth + small noise
        const expectedPolicies = config.base_policy_count *
            Math.pow(1 + config.exposure_growth_annual, yearsFromBase);
        const policyCount = Math.round(expectedPolicies * (1 + rng.nextGaussian() * 0.01));
        // Average premium per policy with drift
        const avgPremium = config.base_premium_per_policy *
            Math.pow(1 + config.premium_drift_annual, yearsFromBase);
        // Total premium with some variance
        const totalWritten = policyCount * avgPremium * (1 + rng.nextGaussian() * 0.02);
        // Earned slightly less than written (assume ~97% earn ratio in year)
        const totalEarned = totalWritten * (0.96 + rng.next() * 0.03);
        const policy = {
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
    const claims = [];
    let snapshotId = 1;
    const numDevPeriods = config.paid_development_pattern.length;
    for (const rawClaim of allClaims) {
        const maxDevMonths = (config.evaluation_year - rawClaim.accident_year) * 12;
        for (let devIdx = 0; devIdx < numDevPeriods; devIdx++) {
            const devMonth = (devIdx + 1) * 12;
            // Only generate snapshots up to the evaluation date
            if (devMonth > maxDevMonths)
                break;
            // Paid development: cumulative proportion with noise
            const basePaidPct = config.paid_development_pattern[devIdx];
            const noisyPaidPct = Math.min(1.0, Math.max(0, basePaidPct + rng.nextGaussian() * config.development_noise));
            // Ensure monotonicity: paid can't decrease
            const prevPaidPct = devIdx > 0
                ? config.paid_development_pattern[devIdx - 1]
                : 0;
            const effectivePaidPct = Math.max(prevPaidPct, noisyPaidPct);
            const paidLoss = rawClaim.ultimate_severity * effectivePaidPct;
            // Case reserves: estimate of remaining unpaid, with adequacy factor
            const trueRemaining = rawClaim.ultimate_severity - paidLoss;
            const adequacy = (_b = config.case_reserve_adequacy[devIdx]) !== null && _b !== void 0 ? _b : 1.0;
            // Add some per-claim noise to reserve adequacy
            const noisyAdequacy = Math.min(1.5, Math.max(0.3, adequacy + rng.nextGaussian() * 0.08));
            const caseReserves = Math.max(0, trueRemaining * noisyAdequacy);
            const incurredLoss = paidLoss + caseReserves;
            // Determine claim status
            let status;
            if (effectivePaidPct >= 0.999) {
                status = 'closed';
            }
            else if (devIdx > 0 && rng.next() < 0.02) {
                status = 'reopened';
            }
            else {
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
    const rate_history = config.rate_changes.map((rc, idx) => ({
        id: idx + 1,
        lob_id: config.lob_id,
        effective_date: `${rc.year}-07-01`,
        rate_change_pct: rc.pct,
        cumulative_factor: null,
        description: `Rate change effective ${rc.year}-07-01`,
    }));
    // ── Summary ──
    const summary = {
        total_policies: policies.length,
        total_claims: allClaims.length,
        total_claim_snapshots: claims.length,
        years: summaryYears,
    };
    return { claims, policies, rate_history, config, summary };
}
function aggregateForTriangles(claims) {
    const key = (ay, dev) => `${ay}-${dev}`;
    const buckets = new Map();
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
    const rows = [];
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
function toTriangleData(aggregated, metric) {
    return aggregated.map((r) => ({
        accident_year: r.accident_year,
        development_month: r.development_month,
        value: metric === 'paid' ? r.total_paid :
            metric === 'incurred' ? r.total_incurred :
                metric === 'paid_severity' ? r.avg_paid_severity :
                    metric === 'incurred_severity' ? r.avg_incurred_severity :
                        r.claim_count,
    }));
}
//# sourceMappingURL=simulator.js.map