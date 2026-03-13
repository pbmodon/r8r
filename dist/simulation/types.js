"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SIMULATION_CONFIG = void 0;
exports.DEFAULT_SIMULATION_CONFIG = {
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
    case_reserve_adequacy: [0.60, 0.72, 0.82, 0.90, 0.95, 0.98, 0.99, 1.00],
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
//# sourceMappingURL=types.js.map