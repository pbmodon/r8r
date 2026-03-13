import { getClient } from './client';
import {
  Claim,
  Policy,
  RateChange,
  LineOfBusiness,
  LossType,
  TriangleDataRow,
} from '../models/types';

export async function getLinesOfBusiness(): Promise<LineOfBusiness[]> {
  const { data, error } = await getClient()
    .from('line_of_business')
    .select('id, code, name, description')
    .order('code');

  if (error) throw new Error(`Failed to fetch lines of business: ${error.message}`);
  return data as LineOfBusiness[];
}

export async function getClaims(
  lobId: number,
  accidentYears?: number[]
): Promise<Claim[]> {
  let query = getClient()
    .from('claims')
    .select('*')
    .eq('lob_id', lobId)
    .order('accident_year')
    .order('development_month');

  if (accidentYears && accidentYears.length > 0) {
    query = query.in('accident_year', accidentYears);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch claims: ${error.message}`);
  return data as Claim[];
}

/**
 * Fetches aggregated triangle data: sum of losses grouped by (accident_year, development_month).
 * This is the shape needed to build a loss development triangle.
 */
export async function getTriangleData(
  lobId: number,
  lossType: LossType
): Promise<TriangleDataRow[]> {
  const lossColumn = lossType === 'paid' ? 'total_paid' : 'total_incurred';

  const { data, error } = await getClient()
    .from('triangle_data')
    .select(`accident_year, development_month, ${lossColumn}`)
    .eq('lob_id', lobId)
    .order('accident_year')
    .order('development_month');

  if (error) throw new Error(`Failed to fetch triangle data: ${error.message}`);

  return (data as Record<string, number>[]).map((row) => ({
    accident_year: row.accident_year,
    development_month: row.development_month,
    value: row[lossColumn],
  }));
}

export async function getPolicies(
  lobId: number,
  policyYears?: number[]
): Promise<Policy[]> {
  let query = getClient()
    .from('policies')
    .select('*')
    .eq('lob_id', lobId)
    .order('policy_year');

  if (policyYears && policyYears.length > 0) {
    query = query.in('policy_year', policyYears);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch policies: ${error.message}`);
  return data as Policy[];
}

export async function getRateHistory(lobId: number): Promise<RateChange[]> {
  const { data, error } = await getClient()
    .from('rate_history')
    .select('*')
    .eq('lob_id', lobId)
    .order('effective_date');

  if (error) throw new Error(`Failed to fetch rate history: ${error.message}`);
  return data as RateChange[];
}
