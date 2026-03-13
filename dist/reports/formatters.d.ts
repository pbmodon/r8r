import { Triangle, AgeToAgeFactors, IndicationSummary, TrendFitResult } from '../models/types';
export declare function formatTriangle(triangle: Triangle): string;
export declare function formatAgeToAgeFactors(factors: AgeToAgeFactors, accidentYears?: number[]): string;
export declare function formatAgeToAgeFactorsCompact(factors: AgeToAgeFactors, accidentYears?: number[], showLabels?: string[]): string;
export declare function formatTrendFits(results: TrendFitResult[], title?: string): string;
export declare function formatIndicationSummary(summary: IndicationSummary): string;
