/**
 * Shared math helpers for actuarial calculations.
 */
export declare function simpleAverage(values: number[]): number | null;
/**
 * Volume-weighted average: sum(numerators) / sum(denominators).
 * Standard actuarial weighting for age-to-age factors.
 */
export declare function volumeWeightedAverage(numerators: number[], denominators: number[]): number | null;
/**
 * Medial average: average excluding the highest and lowest values.
 * Common in actuarial factor selection.
 */
export declare function medialAverage(values: number[]): number | null;
/**
 * Geometric mean of an array of values.
 */
export declare function geometricMean(values: number[]): number | null;
/**
 * Right-to-left cumulative product.
 * Given [f1, f2, f3], returns [f1*f2*f3, f2*f3, f3].
 * This is how cumulative development factors (CDFs) are computed.
 */
export declare function cumulativeProductRTL(factors: number[]): number[];
/**
 * Exponential regression on (x, y) pairs.
 * Fits ln(y) = a + b*x via OLS and returns { a, b, annualTrend: e^b - 1 }.
 */
export declare function exponentialRegression(xs: number[], ys: number[]): {
    intercept: number;
    slope: number;
    annualTrend: number;
};
export declare function roundTo(value: number, decimals: number): number;
