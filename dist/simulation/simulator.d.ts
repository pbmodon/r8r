import { Claim } from '../models/types';
import { SimulationConfig, SimulationResult } from './types';
/**
 * Simulate a complete insurance dataset: policies, claims with development
 * snapshots, and rate change history.
 *
 * Every claim payment and reserve posting is tied to a specific policy.
 * Trends (frequency, severity, premium drift) are independently toggleable
 * via the config.
 */
export declare function simulate(partialConfig?: Partial<SimulationConfig>): SimulationResult;
/**
 * Aggregate simulated claims into triangle data rows.
 * Returns { accident_year, development_month, paid, incurred, claim_count }
 * for building paid, incurred, and severity triangles.
 */
export interface AggregatedTriangleRow {
    accident_year: number;
    development_month: number;
    total_paid: number;
    total_incurred: number;
    claim_count: number;
    avg_paid_severity: number;
    avg_incurred_severity: number;
}
export declare function aggregateForTriangles(claims: Claim[]): AggregatedTriangleRow[];
/**
 * Convert aggregated rows to TriangleDataRow[] for a specific metric.
 */
export type TriangleMetric = 'paid' | 'incurred' | 'paid_severity' | 'incurred_severity' | 'claim_count';
export declare function toTriangleData(aggregated: AggregatedTriangleRow[], metric: TriangleMetric): {
    accident_year: number;
    development_month: number;
    value: number;
}[];
