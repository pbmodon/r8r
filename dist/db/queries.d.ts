import { Claim, Policy, RateChange, LineOfBusiness, LossType, TriangleDataRow } from '../models/types';
export declare function getLinesOfBusiness(): Promise<LineOfBusiness[]>;
export declare function getClaims(lobId: number, accidentYears?: number[]): Promise<Claim[]>;
/**
 * Fetches aggregated triangle data: sum of losses grouped by (accident_year, development_month).
 * This is the shape needed to build a loss development triangle.
 */
export declare function getTriangleData(lobId: number, lossType: LossType): Promise<TriangleDataRow[]>;
export declare function getPolicies(lobId: number, policyYears?: number[]): Promise<Policy[]>;
export declare function getRateHistory(lobId: number): Promise<RateChange[]>;
