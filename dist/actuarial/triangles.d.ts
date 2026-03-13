import { Triangle, AgeToAgeFactors, UltimateLoss, LossType, TriangleDataRow, AveragingWindow, AveragingVariant, AverageRow, LdfSelectionOptions } from '../models/types';
/**
 * Build a loss development triangle from raw data rows.
 * Rows are accident years, columns are development periods.
 */
export declare function buildTriangle(data: TriangleDataRow[], lossType: LossType): Triangle;
/**
 * Calculate age-to-age (link ratio) factors from a triangle.
 *
 * Computes all combinations of averaging windows (4Q, 6Q, 8Q, 12Q, 16Q, All),
 * variants (straight, hi-lo), and types (volume_weighted, simple).
 *
 * The `selected` row defaults to the method specified in `options.selection_method`
 * (default: All periods, volume-weighted, straight).
 */
export declare function calculateAgeToAgeFactors(triangle: Triangle, options?: Partial<LdfSelectionOptions>): AgeToAgeFactors;
/**
 * Convenience: get a specific average row from computed factors.
 */
export declare function getAverageRow(factors: AgeToAgeFactors, window: AveragingWindow, type?: 'volume_weighted' | 'simple', variant?: AveragingVariant): AverageRow | undefined;
/**
 * Develop losses to ultimate using the latest diagonal and CDFs.
 */
export declare function developToUltimate(triangle: Triangle, cdfs: number[]): UltimateLoss[];
