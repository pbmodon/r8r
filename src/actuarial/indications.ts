import {
  IndicationResult,
  IndicationInputs,
  IndicationSummary,
  UltimateLoss,
  OnLevelFactors,
  Policy,
} from '../models/types';
import { compoundTrendFactor } from './trends';
import { roundTo } from '../utils/math';

/**
 * Calculate actuarial rate level indications using the loss ratio method.
 *
 * For each accident year:
 *   1. Develop reported losses to ultimate (already done — pass in UltimateLoss[])
 *   2. Trend ultimate losses to the future cost level
 *   3. Bring earned premium to current rate level (on-level)
 *   4. Optionally trend premium
 *   5. Compute permissible loss ratio = 1 - expense_ratio - profit_load
 *   6. Indicated rate change = (actual LR / permissible LR) - 1
 */
export function calculateIndications(
  ultimateLosses: UltimateLoss[],
  policies: Policy[],
  onLevelFactors: OnLevelFactors,
  inputs: IndicationInputs
): IndicationSummary {
  const {
    expense_ratio,
    target_profit_and_contingency,
    loss_trend_annual,
    premium_trend_annual,
    trend_to_year,
  } = inputs;

  const permissibleLR = 1 - expense_ratio - target_profit_and_contingency;

  // Build lookup maps
  const premiumByYear = new Map<number, number>();
  for (const p of policies) {
    premiumByYear.set(p.policy_year, (premiumByYear.get(p.policy_year) ?? 0) + p.earned_premium);
  }

  const olFactorByYear = new Map<number, number>();
  for (let i = 0; i < onLevelFactors.policy_years.length; i++) {
    olFactorByYear.set(onLevelFactors.policy_years[i], onLevelFactors.on_level_factors[i]);
  }

  const results: IndicationResult[] = [];

  // Determine the latest accident year to compute trend periods
  const latestAY = Math.max(...ultimateLosses.map((u) => u.accident_year));

  for (const ult of ultimateLosses) {
    const ay = ult.accident_year;

    // Trend period: from midpoint of accident year to the future target
    // Convention: midpoint of AY is July 1 of that year = ay + 0.5
    // Trend to: midpoint of future effective period = latestAY + trend_to_year + 0.5
    const trendYears = (latestAY + trend_to_year) - ay;

    const lossTrendFactor = compoundTrendFactor(loss_trend_annual, trendYears);
    const premTrendFactor = compoundTrendFactor(premium_trend_annual, trendYears);

    const earnedPremium = premiumByYear.get(ay) ?? 0;
    const onLevelFactor = olFactorByYear.get(ay) ?? 1.0;
    const onLevelPremium = earnedPremium * onLevelFactor;
    const trendedOnLevelPremium = onLevelPremium * premTrendFactor;

    const trendedUltimateLosses = ult.ultimate * lossTrendFactor;

    const expectedLR = trendedOnLevelPremium > 0
      ? trendedUltimateLosses / trendedOnLevelPremium
      : 0;

    const indicatedRateChange = permissibleLR > 0
      ? (expectedLR / permissibleLR) - 1
      : 0;

    results.push({
      accident_year: ay,
      reported_losses: roundTo(ult.latest_reported, 0),
      development_factor: roundTo(ult.cdf, 4),
      ultimate_losses: roundTo(ult.ultimate, 0),
      loss_trend_factor: roundTo(lossTrendFactor, 4),
      trended_ultimate_losses: roundTo(trendedUltimateLosses, 0),
      earned_premium: roundTo(earnedPremium, 0),
      on_level_factor: roundTo(onLevelFactor, 4),
      on_level_premium: roundTo(onLevelPremium, 0),
      premium_trend_factor: roundTo(premTrendFactor, 4),
      trended_on_level_premium: roundTo(trendedOnLevelPremium, 0),
      expected_loss_ratio: roundTo(expectedLR, 4),
      indicated_rate_change: roundTo(indicatedRateChange, 4),
    });
  }

  // Weighted average indicated change (weighted by trended on-level premium)
  let weightedSum = 0;
  let weightTotal = 0;
  for (const r of results) {
    weightedSum += r.indicated_rate_change * r.trended_on_level_premium;
    weightTotal += r.trended_on_level_premium;
  }
  const weighted_indicated_change = weightTotal > 0
    ? roundTo(weightedSum / weightTotal, 4)
    : 0;

  // Simple average
  const all_year_average_change = results.length > 0
    ? roundTo(
        results.reduce((s, r) => s + r.indicated_rate_change, 0) / results.length,
        4
      )
    : 0;

  return {
    results,
    weighted_indicated_change,
    all_year_average_change,
    permissible_loss_ratio: roundTo(permissibleLR, 4),
  };
}
