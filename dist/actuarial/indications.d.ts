import { IndicationInputs, IndicationSummary, UltimateLoss, OnLevelFactors, Policy } from '../models/types';
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
export declare function calculateIndications(ultimateLosses: UltimateLoss[], policies: Policy[], onLevelFactors: OnLevelFactors, inputs: IndicationInputs): IndicationSummary;
