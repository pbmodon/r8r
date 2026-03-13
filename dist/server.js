"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const simulator_1 = require("./simulation/simulator");
const triangles_1 = require("./actuarial/triangles");
const trends_1 = require("./actuarial/trends");
const indications_1 = require("./actuarial/indications");
const types_1 = require("./simulation/types");
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.static(path_1.default.join(__dirname, '..', 'public')));
// ── POST /api/analyze ──
// Accepts simulation config overrides + analysis options, returns everything.
app.post('/api/analyze', (req, res) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v;
    try {
        const body = req.body || {};
        // Merge simulation config
        const simConfig = {
            seed: (_a = body.seed) !== null && _a !== void 0 ? _a : 42,
            years: (_b = body.years) !== null && _b !== void 0 ? _b : types_1.DEFAULT_SIMULATION_CONFIG.years,
            base_year: (_c = body.base_year) !== null && _c !== void 0 ? _c : types_1.DEFAULT_SIMULATION_CONFIG.base_year,
            evaluation_year: (_d = body.evaluation_year) !== null && _d !== void 0 ? _d : types_1.DEFAULT_SIMULATION_CONFIG.evaluation_year,
            base_policy_count: (_e = body.base_policy_count) !== null && _e !== void 0 ? _e : types_1.DEFAULT_SIMULATION_CONFIG.base_policy_count,
            base_premium_per_policy: (_f = body.base_premium_per_policy) !== null && _f !== void 0 ? _f : types_1.DEFAULT_SIMULATION_CONFIG.base_premium_per_policy,
            exposure_growth_annual: (_g = body.exposure_growth_annual) !== null && _g !== void 0 ? _g : types_1.DEFAULT_SIMULATION_CONFIG.exposure_growth_annual,
            premium_drift_annual: (_h = body.premium_drift_annual) !== null && _h !== void 0 ? _h : types_1.DEFAULT_SIMULATION_CONFIG.premium_drift_annual,
            base_frequency: (_j = body.base_frequency) !== null && _j !== void 0 ? _j : types_1.DEFAULT_SIMULATION_CONFIG.base_frequency,
            frequency_trend_annual: (_k = body.frequency_trend_annual) !== null && _k !== void 0 ? _k : types_1.DEFAULT_SIMULATION_CONFIG.frequency_trend_annual,
            base_severity_mean: (_l = body.base_severity_mean) !== null && _l !== void 0 ? _l : types_1.DEFAULT_SIMULATION_CONFIG.base_severity_mean,
            severity_cv: (_m = body.severity_cv) !== null && _m !== void 0 ? _m : types_1.DEFAULT_SIMULATION_CONFIG.severity_cv,
            severity_trend_annual: (_o = body.severity_trend_annual) !== null && _o !== void 0 ? _o : types_1.DEFAULT_SIMULATION_CONFIG.severity_trend_annual,
        };
        // LDF selection
        const ldfMethod = (_p = body.ldf_method) !== null && _p !== void 0 ? _p : {
            window: 'all', variant: 'straight', type: 'volume_weighted',
        };
        const ldfOptions = {
            selection_method: ldfMethod,
            tail_factor: (_q = body.tail_factor) !== null && _q !== void 0 ? _q : 1.0,
        };
        // Indication inputs
        const indicationInputs = {
            expense_ratio: (_r = body.expense_ratio) !== null && _r !== void 0 ? _r : 0.30,
            target_profit_and_contingency: (_s = body.target_profit) !== null && _s !== void 0 ? _s : 0.05,
            loss_trend_annual: (_t = body.indication_loss_trend) !== null && _t !== void 0 ? _t : (simConfig.severity_trend_annual + simConfig.frequency_trend_annual),
            premium_trend_annual: (_u = body.indication_premium_trend) !== null && _u !== void 0 ? _u : 0.0,
            trend_to_year: (_v = body.trend_to_year) !== null && _v !== void 0 ? _v : 1.5,
        };
        // 1. Simulate
        const simResult = (0, simulator_1.simulate)(simConfig);
        // 2. Aggregate
        const aggregated = (0, simulator_1.aggregateForTriangles)(simResult.claims);
        // 3. Build all triangles + factors
        const metrics = ['paid', 'incurred', 'paid_severity', 'incurred_severity'];
        const triangles = {};
        for (const metric of metrics) {
            const data = (0, simulator_1.toTriangleData)(aggregated, metric);
            const tri = (0, triangles_1.buildTriangle)(data, metric);
            const factors = (0, triangles_1.calculateAgeToAgeFactors)(tri, ldfOptions);
            triangles[metric] = {
                triangle: tri,
                factors: {
                    period_labels: factors.period_labels,
                    factors_by_year: factors.factors_by_year,
                    averages: factors.averages.map(a => ({
                        label: a.label,
                        method: a.method,
                        values: a.values,
                    })),
                    selected: factors.selected,
                    selection_method: factors.selection_method,
                    cumulative_to_ultimate: factors.cumulative_to_ultimate,
                },
            };
        }
        // 4. Develop to ultimate (paid basis for indications)
        const paidTri = triangles['paid'].triangle;
        const paidCdfs = triangles['paid'].factors.cumulative_to_ultimate;
        const ultimates = (0, triangles_1.developToUltimate)(paidTri, paidCdfs);
        // 5. On-level factors
        const policyYears = simResult.policies.map(p => p.policy_year);
        const onLevel = (0, trends_1.calculateOnLevelFactors)(simResult.rate_history, policyYears);
        // 6. Indications
        const indication = (0, indications_1.calculateIndications)(ultimates, simResult.policies, onLevel, indicationInputs);
        // 7. Trend fits
        const annualUltimates = simResult.summary.years.map(y => ({
            year: y.year, value: y.ultimate_losses,
        }));
        const severityByYear = simResult.summary.years.map(y => ({
            year: y.year, value: y.claims > 0 ? y.ultimate_losses / y.claims : 0,
        }));
        const freqByYear = simResult.summary.years.map(y => ({
            year: y.year, value: y.claims / y.policies,
        }));
        const trendFits = {
            loss: (0, trends_1.fitAllTrends)(annualUltimates),
            severity: (0, trends_1.fitAllTrends)(severityByYear),
            frequency: (0, trends_1.fitAllTrends)(freqByYear),
        };
        res.json({
            simulation: {
                config: simResult.config,
                summary: simResult.summary,
                policies: simResult.policies,
                rate_history: simResult.rate_history,
            },
            triangles,
            ultimates,
            on_level: onLevel,
            indication,
            trend_fits: trendFits,
            indication_inputs: indicationInputs,
            ldf_method: ldfMethod,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`r8r actuarial analysis server running at http://localhost:${PORT}`);
});
//# sourceMappingURL=server.js.map