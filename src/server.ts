import express from 'express';
import path from 'path';
import { simulate, aggregateForTriangles, toTriangleData, TriangleMetric, SegmentFilter } from './simulation/simulator';
import { buildTriangle, calculateAgeToAgeFactors, developToUltimate } from './actuarial/triangles';
import { calculateOnLevelFactors, fitAllTrends } from './actuarial/trends';
import { calculateIndications } from './actuarial/indications';
import { SimulationConfig, DEFAULT_SIMULATION_CONFIG } from './simulation/types';
import { LdfSelectionOptions, AveragingMethod, IndicationInputs } from './models/types';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── POST /api/analyze ──
// Accepts simulation config overrides + analysis options, returns everything.

app.post('/api/analyze', (req, res) => {
  try {
    const body = req.body || {};

    // Merge simulation config
    const simConfig: Partial<SimulationConfig> = {
      seed: body.seed ?? 42,
      years: body.years ?? DEFAULT_SIMULATION_CONFIG.years,
      base_year: body.base_year ?? DEFAULT_SIMULATION_CONFIG.base_year,
      evaluation_year: body.evaluation_year ?? DEFAULT_SIMULATION_CONFIG.evaluation_year,
      base_policy_count: body.base_policy_count ?? DEFAULT_SIMULATION_CONFIG.base_policy_count,
      base_premium_per_policy: body.base_premium_per_policy ?? DEFAULT_SIMULATION_CONFIG.base_premium_per_policy,
      exposure_growth_annual: body.exposure_growth_annual ?? DEFAULT_SIMULATION_CONFIG.exposure_growth_annual,
      premium_drift_annual: body.premium_drift_annual ?? DEFAULT_SIMULATION_CONFIG.premium_drift_annual,
      base_frequency: body.base_frequency ?? DEFAULT_SIMULATION_CONFIG.base_frequency,
      frequency_trend_annual: body.frequency_trend_annual ?? DEFAULT_SIMULATION_CONFIG.frequency_trend_annual,
      base_severity_mean: body.base_severity_mean ?? DEFAULT_SIMULATION_CONFIG.base_severity_mean,
      severity_cv: body.severity_cv ?? DEFAULT_SIMULATION_CONFIG.severity_cv,
      severity_trend_annual: body.severity_trend_annual ?? DEFAULT_SIMULATION_CONFIG.severity_trend_annual,
    };

    // LDF selection
    const ldfMethod: AveragingMethod = body.ldf_method ?? {
      window: 'all', variant: 'straight', type: 'volume_weighted',
    };
    const ldfOptions: Partial<LdfSelectionOptions> = {
      selection_method: ldfMethod,
      tail_factor: body.tail_factor ?? 1.0,
    };

    // Indication inputs
    const indicationInputs: IndicationInputs = {
      expense_ratio: body.expense_ratio ?? 0.30,
      target_profit_and_contingency: body.target_profit ?? 0.05,
      loss_trend_annual: body.indication_loss_trend ?? (simConfig.severity_trend_annual! + simConfig.frequency_trend_annual!),
      premium_trend_annual: body.indication_premium_trend ?? 0.0,
      trend_to_year: body.trend_to_year ?? 1.5,
    };

    // Segment filter
    const segmentFilter: SegmentFilter = body.segment_filter || {};

    // 1. Simulate
    const simResult = simulate(simConfig);

    // 2. Aggregate
    const aggregated = aggregateForTriangles(simResult.claims, segmentFilter);

    // 3. Build all triangles + factors
    const metrics: TriangleMetric[] = ['paid', 'incurred', 'paid_severity', 'incurred_severity'];
    const triangles: Record<string, any> = {};

    for (const metric of metrics) {
      const data = toTriangleData(aggregated, metric);
      const tri = buildTriangle(data, metric);
      const factors = calculateAgeToAgeFactors(tri, ldfOptions);
      triangles[metric] = {
        triangle: tri,
        factors: {
          period_labels: factors.period_labels,
          factors_by_year: factors.factors_by_year,
          averages: factors.averages.map(a => ({
            label: a.label,
            method: a.method,
            values: a.values,
          })),
          selected: factors.selected,
          selection_method: factors.selection_method,
          cumulative_to_ultimate: factors.cumulative_to_ultimate,
        },
      };
    }

    // 4. Develop to ultimate (paid basis for indications)
    const paidTri = triangles['paid'].triangle;
    const paidCdfs = triangles['paid'].factors.cumulative_to_ultimate;
    const ultimates = developToUltimate(paidTri, paidCdfs);

    // 5. On-level factors
    const policyYears = simResult.policies.map(p => p.policy_year);
    const onLevel = calculateOnLevelFactors(simResult.rate_history, policyYears);

    // 6. Indications
    const indication = calculateIndications(
      ultimates, simResult.policies, onLevel, indicationInputs
    );

    // 7. Trend fits + raw data for charting
    const annualUltimates = simResult.summary.years.map(y => ({
      year: y.year, value: y.ultimate_losses,
    }));
    const severityByYear = simResult.summary.years.map(y => ({
      year: y.year, value: y.claims > 0 ? y.ultimate_losses / y.claims : 0,
    }));
    const freqByYear = simResult.summary.years.map(y => ({
      year: y.year, value: y.claims / y.policies,
    }));

    const premiumPerPolicy = simResult.summary.years.map(y => ({
      year: y.year, value: y.policies > 0 ? y.earned_premium / y.policies : 0,
    }));

    const trendFits = {
      loss: fitAllTrends(annualUltimates),
      severity: fitAllTrends(severityByYear),
      frequency: fitAllTrends(freqByYear),
      premium: fitAllTrends(premiumPerPolicy),
    };

    // Raw data points for chart rendering
    const trendData = {
      loss: annualUltimates,
      severity: severityByYear,
      frequency: freqByYear,
      premium: premiumPerPolicy,
    };

    // 8. Empirical ILF and Deductible analysis from ground-up severities
    let rawClaims = simResult.raw_claims;
    // Apply segment filter to raw claims for ILF/IDF analysis
    if (segmentFilter.state) rawClaims = rawClaims.filter(c => c.state === segmentFilter.state);
    if (segmentFilter.coverage) rawClaims = rawClaims.filter(c => c.coverage === segmentFilter.coverage);
    const limitLevels = simResult.config.limits.map(l => l.limit).sort((a, b) => a - b);
    const baseLimit = limitLevels[0];
    const deductibleLevels = simResult.config.deductibles.map(d => d.deductible).sort((a, b) => a - b);

    // Compute expected limited losses at each limit level
    const limitedLosses: Record<number, number> = {};
    for (const limit of limitLevels) {
      let totalLimited = 0;
      for (const c of rawClaims) {
        totalLimited += Math.min(c.ground_up_severity, limit);
      }
      limitedLosses[limit] = totalLimited / rawClaims.length; // avg limited severity
    }
    const baseLimitedLoss = limitedLosses[baseLimit];
    const empiricalIlfs = limitLevels.map(limit => {
      const cfg = simResult.config.limits.find(l => l.limit === limit);
      const empirical = baseLimitedLoss > 0 ? limitedLosses[limit] / baseLimitedLoss : 1.0;
      const current = cfg?.ilf ?? 1.0;
      return {
        limit,
        expected_limited_loss: limitedLosses[limit],
        ilf: empirical,
        current_ilf: current,
        indicated_change: current > 0 ? (empirical / current) - 1 : 0,
        claim_count: rawClaims.filter(c => c.policy_limit === limit).length,
        weight: cfg?.weight ?? 0,
      };
    });

    // Compute empirical deductible relativities
    // For each deductible level, compute avg net loss (ground-up minus deductible, floored at 0)
    const baseDed = deductibleLevels.find(d => {
      const cfg = simResult.config.deductibles.find(dc => dc.deductible === d);
      return cfg && cfg.factor === 1.0;
    }) || deductibleLevels[0];
    const dedLosses: Record<number, number> = {};
    for (const ded of deductibleLevels) {
      let totalNet = 0;
      for (const c of rawClaims) {
        totalNet += Math.max(0, c.ground_up_severity - ded);
      }
      dedLosses[ded] = totalNet / rawClaims.length;
    }
    const baseDedLoss = dedLosses[baseDed];
    const empiricalDeds = deductibleLevels.map(ded => {
      const cfg = simResult.config.deductibles.find(d => d.deductible === ded);
      const empirical = baseDedLoss > 0 ? dedLosses[ded] / baseDedLoss : 1.0;
      const current = cfg?.factor ?? 1.0;
      return {
        deductible: ded,
        expected_net_loss: dedLosses[ded],
        factor: empirical,
        current_factor: current,
        indicated_change: current > 0 ? (empirical / current) - 1 : 0,
        claim_count: rawClaims.filter(c => c.deductible === ded).length,
        weight: cfg?.weight ?? 0,
      };
    });

    res.json({
      simulation: {
        config: simResult.config,
        summary: simResult.summary,
        policies: simResult.policies,
        rate_history: simResult.rate_history,
      },
      triangles,
      ultimates,
      on_level: onLevel,
      indication,
      trend_fits: trendFits,
      trend_data: trendData,
      indication_inputs: indicationInputs,
      ldf_method: ldfMethod,
      ilf_analysis: {
        base_limit: baseLimit,
        base_deductible: baseDed,
        ilfs: empiricalIlfs,
        deductible_relativities: empiricalDeds,
        total_claims: rawClaims.length,
      },
      segments: {
        states: simResult.config.states.map(s => s.code),
        coverages: simResult.config.coverages.map(c => ({ code: c.code, name: c.name })),
        limits: simResult.config.limits.map(l => l.limit),
        deductibles: simResult.config.deductibles.map(d => d.deductible),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`r8r actuarial analysis server running at http://localhost:${PORT}`);
});
