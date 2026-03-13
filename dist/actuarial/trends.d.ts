import { TrendFactors, OnLevelFactors, RateChange, TrendFitOptions, TrendFitResult } from '../models/types';
/**
 * Fit an exponential trend to annual data with windowing and hi-lo options.
 */
export declare function fitTrend(data: {
    year: number;
    value: number;
}[], options?: TrendFitOptions): TrendFitResult;
/**
 * Compute all trend fit combinations for the standard windows.
 */
export declare function fitAllTrends(data: {
    year: number;
    value: number;
}[]): TrendFitResult[];
/** Legacy convenience: fit with all data, straight. */
export declare function fitLossTrend(data: {
    year: number;
    value: number;
}[]): number;
/**
 * Compute the compound trend factor: (1 + annualRate)^years.
 */
export declare function compoundTrendFactor(annualRate: number, years: number): number;
/**
 * Bundle trend parameters into a TrendFactors object.
 */
export declare function computeTrendFactors(lossTrendAnnual: number, premiumTrendAnnual: number, trendPeriodYears: number): TrendFactors;
/**
 * Calculate on-level factors to bring historical premium to current rate level.
 *
 * Uses a simplified parallelogram method:
 * 1. Build a cumulative rate level index from rate change history.
 * 2. For each policy year, determine the average rate level in effect.
 * 3. On-level factor = current_rate_level / avg_rate_level_for_year.
 */
export declare function calculateOnLevelFactors(rateHistory: RateChange[], policyYears: number[]): OnLevelFactors;
