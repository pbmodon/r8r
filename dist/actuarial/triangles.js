"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildTriangle = buildTriangle;
exports.calculateAgeToAgeFactors = calculateAgeToAgeFactors;
exports.getAverageRow = getAverageRow;
exports.developToUltimate = developToUltimate;
const types_1 = require("../models/types");
const math_1 = require("../utils/math");
/**
 * Build a loss development triangle from raw data rows.
 * Rows are accident years, columns are development periods.
 */
function buildTriangle(data, lossType) {
    const aySet = new Set();
    const devSet = new Set();
    for (const row of data) {
        aySet.add(row.accident_year);
        devSet.add(row.development_month);
    }
    const accident_years = Array.from(aySet).sort((a, b) => a - b);
    const development_periods = Array.from(devSet).sort((a, b) => a - b);
    const lookup = new Map();
    for (const row of data) {
        lookup.set(`${row.accident_year}-${row.development_month}`, row.value);
    }
    const values = accident_years.map((ay) => development_periods.map((dev) => {
        const key = `${ay}-${dev}`;
        return lookup.has(key) ? lookup.get(key) : null;
    }));
    return { accident_years, development_periods, values, loss_type: lossType };
}
// ── Internal: compute one column average given raw factors and triangle values ──
function computeColumnAverage(colFactors, colNumerators, colDenominators, method) {
    // Apply window
    const n = colFactors.length;
    const windowSize = method.window === 'all' ? n : method.window;
    const start = Math.max(0, n - windowSize);
    let factors = colFactors.slice(start);
    let numerators = colNumerators.slice(start);
    let denominators = colDenominators.slice(start);
    if (factors.length === 0)
        return null;
    // Apply hi-lo exclusion (remove highest and lowest)
    if (method.variant === 'hi-lo' && factors.length > 2) {
        // Find indices of min and max
        let minIdx = 0;
        let maxIdx = 0;
        for (let i = 1; i < factors.length; i++) {
            if (factors[i] < factors[minIdx])
                minIdx = i;
            if (factors[i] > factors[maxIdx])
                maxIdx = i;
        }
        // Remove both (handle case where min and max are same index)
        const exclude = new Set([minIdx, maxIdx]);
        factors = factors.filter((_, i) => !exclude.has(i));
        numerators = numerators.filter((_, i) => !exclude.has(i));
        denominators = denominators.filter((_, i) => !exclude.has(i));
        if (factors.length === 0)
            return null;
    }
    // Compute average
    if (method.type === 'volume_weighted') {
        return (0, math_1.volumeWeightedAverage)(numerators, denominators);
    }
    else {
        return (0, math_1.simpleAverage)(factors);
    }
}
function averageLabel(method) {
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
function calculateAgeToAgeFactors(triangle, options = {}) {
    var _a;
    const opts = Object.assign(Object.assign({}, types_1.DEFAULT_LDF_SELECTION), options);
    const { development_periods, values } = triangle;
    const numPeriods = development_periods.length;
    const numYears = values.length;
    // Period labels
    const period_labels = [];
    for (let j = 0; j < numPeriods - 1; j++) {
        period_labels.push(`${development_periods[j]}-${development_periods[j + 1]}`);
    }
    period_labels.push('Tail');
    // Compute link ratios for each AY and each development interval
    const factors_by_year = [];
    for (let i = 0; i < numYears; i++) {
        const row = [];
        for (let j = 0; j < numPeriods - 1; j++) {
            const curr = values[i][j];
            const next = values[i][j + 1];
            if (curr != null && next != null && curr !== 0) {
                row.push(next / curr);
            }
            else {
                row.push(null);
            }
        }
        row.push(null); // tail column
        factors_by_year.push(row);
    }
    // Pre-extract column data for efficiency
    const columnData = [];
    for (let j = 0; j < numPeriods - 1; j++) {
        const factors = [];
        const numerators = [];
        const denominators = [];
        for (let i = 0; i < numYears; i++) {
            const f = factors_by_year[i][j];
            if (f != null) {
                factors.push(f);
                numerators.push(values[i][j + 1]);
                denominators.push(values[i][j]);
            }
        }
        columnData.push({ factors, numerators, denominators });
    }
    // Generate all averaging method combinations
    const variants = ['straight', 'hi-lo'];
    const types = ['volume_weighted', 'simple'];
    const averages = [];
    for (const window of types_1.AVERAGING_WINDOWS) {
        for (const type of types) {
            for (const variant of variants) {
                const method = { window, variant, type };
                const rowValues = [];
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
    const selectedRow = averages.find((a) => a.method.window === selMethod.window &&
        a.method.variant === selMethod.variant &&
        a.method.type === selMethod.type);
    // Build selected factors from the matching row, falling back to all-vol-wtd
    const selected = [];
    for (let j = 0; j < numPeriods - 1; j++) {
        if (selectedRow && selectedRow.values[j] != null) {
            selected.push(selectedRow.values[j]);
        }
        else {
            // Fallback: all vol-wtd straight
            const fallback = averages.find((a) => a.method.window === 'all' &&
                a.method.variant === 'straight' &&
                a.method.type === 'volume_weighted');
            selected.push((_a = fallback === null || fallback === void 0 ? void 0 : fallback.values[j]) !== null && _a !== void 0 ? _a : 1.0);
        }
    }
    selected.push(opts.tail_factor); // tail
    const cumulative_to_ultimate = (0, math_1.cumulativeProductRTL)(selected);
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
function getAverageRow(factors, window, type = 'volume_weighted', variant = 'straight') {
    return factors.averages.find((a) => a.method.window === window &&
        a.method.type === type &&
        a.method.variant === variant);
}
/**
 * Develop losses to ultimate using the latest diagonal and CDFs.
 */
function developToUltimate(triangle, cdfs) {
    const { accident_years, development_periods, values } = triangle;
    const results = [];
    for (let i = 0; i < accident_years.length; i++) {
        let latestValue = null;
        let latestPeriodIdx = -1;
        for (let j = values[i].length - 1; j >= 0; j--) {
            if (values[i][j] != null) {
                latestValue = values[i][j];
                latestPeriodIdx = j;
                break;
            }
        }
        if (latestValue == null)
            continue;
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
//# sourceMappingURL=triangles.js.map