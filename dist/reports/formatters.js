"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTriangle = formatTriangle;
exports.formatAgeToAgeFactors = formatAgeToAgeFactors;
exports.formatAgeToAgeFactorsCompact = formatAgeToAgeFactorsCompact;
exports.formatTrendFits = formatTrendFits;
exports.formatIndicationSummary = formatIndicationSummary;
// ── Formatting Helpers ──
function pad(str, width, align = 'right') {
    if (align === 'left')
        return str.padEnd(width);
    return str.padStart(width);
}
function fmtNum(val, decimals = 0) {
    if (val == null)
        return '';
    return val.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
}
function fmtPct(val) {
    return (val * 100).toFixed(1) + '%';
}
function separator(width) {
    return '─'.repeat(width);
}
// ── Triangle Formatter ──
function formatTriangle(triangle) {
    const { accident_years, development_periods, values, loss_type } = triangle;
    const colWidth = 14;
    const labelWidth = 6;
    const lines = [];
    lines.push(`Loss Development Triangle (${loss_type})`);
    lines.push('');
    const header = pad('AY', labelWidth, 'left') +
        development_periods.map((d) => pad(String(d), colWidth)).join('');
    lines.push(header);
    lines.push(separator(header.length));
    for (let i = 0; i < accident_years.length; i++) {
        const row = pad(String(accident_years[i]), labelWidth, 'left') +
            values[i].map((v) => pad(fmtNum(v), colWidth)).join('');
        lines.push(row);
    }
    return lines.join('\n');
}
// ── Age-to-Age Factors Formatter ──
function formatAgeToAgeFactors(factors, accidentYears) {
    const colWidth = 12;
    const labelWidth = 20;
    const lines = [];
    lines.push('Age-to-Age Development Factors');
    lines.push('');
    // Header
    const header = pad('', labelWidth, 'left') +
        factors.period_labels.map((l) => pad(l, colWidth)).join('');
    lines.push(header);
    lines.push(separator(header.length));
    // Factor rows by accident year
    for (let i = 0; i < factors.factors_by_year.length; i++) {
        const yearLabel = accidentYears && i < accidentYears.length
            ? String(accidentYears[i])
            : String(i);
        const row = pad(yearLabel, labelWidth, 'left') +
            factors.factors_by_year[i]
                .map((f) => pad(f != null ? fmtNum(f, 4) : '', colWidth))
                .join('');
        lines.push(row);
    }
    lines.push(separator(header.length));
    // All average rows
    for (const avg of factors.averages) {
        const row = pad(avg.label, labelWidth, 'left') +
            avg.values.map((v) => pad(v != null ? fmtNum(v, 4) : '', colWidth)).join('');
        lines.push(row);
    }
    lines.push(separator(header.length));
    // Selected and CDF
    const selLabel = `Selected*`;
    lines.push(pad(selLabel, labelWidth, 'left') +
        factors.selected.map((f) => pad(fmtNum(f, 4), colWidth)).join(''));
    lines.push(pad('CDF', labelWidth, 'left') +
        factors.cumulative_to_ultimate.map((f) => pad(fmtNum(f, 4), colWidth)).join(''));
    // Footnote
    const { selection_method: m } = factors;
    const windowStr = m.window === 'all' ? 'All' : `${m.window}Q`;
    const typeStr = m.type === 'volume_weighted' ? 'Volume Weighted' : 'Simple';
    const hlStr = m.variant === 'hi-lo' ? ', Hi-Lo' : '';
    lines.push('');
    lines.push(`* Selected method: ${windowStr} ${typeStr}${hlStr}`);
    return lines.join('\n');
}
// ── Compact Factor Display (user-chosen subset of averages) ──
function formatAgeToAgeFactorsCompact(factors, accidentYears, showLabels) {
    const colWidth = 12;
    const labelWidth = 20;
    const lines = [];
    lines.push('Age-to-Age Development Factors');
    lines.push('');
    const header = pad('', labelWidth, 'left') +
        factors.period_labels.map((l) => pad(l, colWidth)).join('');
    lines.push(header);
    lines.push(separator(header.length));
    // Factor rows by accident year
    for (let i = 0; i < factors.factors_by_year.length; i++) {
        const yearLabel = accidentYears && i < accidentYears.length
            ? String(accidentYears[i])
            : String(i);
        const row = pad(yearLabel, labelWidth, 'left') +
            factors.factors_by_year[i]
                .map((f) => pad(f != null ? fmtNum(f, 4) : '', colWidth))
                .join('');
        lines.push(row);
    }
    lines.push(separator(header.length));
    // Filter to requested average labels (or show a default set)
    const defaultLabels = [
        'All Vol Wtd', 'All Simple', 'All Vol Wtd Hi-Lo', 'All Simple Hi-Lo',
        '4Q Vol Wtd', '4Q Simple', '8Q Vol Wtd', '8Q Simple',
    ];
    const labelsToShow = showLabels !== null && showLabels !== void 0 ? showLabels : defaultLabels;
    for (const avg of factors.averages) {
        if (labelsToShow.includes(avg.label)) {
            const row = pad(avg.label, labelWidth, 'left') +
                avg.values.map((v) => pad(v != null ? fmtNum(v, 4) : '', colWidth)).join('');
            lines.push(row);
        }
    }
    lines.push(separator(header.length));
    lines.push(pad('Selected*', labelWidth, 'left') +
        factors.selected.map((f) => pad(fmtNum(f, 4), colWidth)).join(''));
    lines.push(pad('CDF', labelWidth, 'left') +
        factors.cumulative_to_ultimate.map((f) => pad(fmtNum(f, 4), colWidth)).join(''));
    return lines.join('\n');
}
// ── Trend Fit Results Formatter ──
function formatTrendFits(results, title = 'Trend Fits') {
    const lines = [];
    lines.push(title);
    lines.push('');
    lines.push(pad('Method', 16, 'left') +
        pad('Annual Trend', 14) +
        pad('R²', 10));
    lines.push(separator(40));
    for (const r of results) {
        lines.push(pad(r.label, 16, 'left') +
            pad(fmtPct(r.annual_trend), 14) +
            pad(r.r_squared.toFixed(4), 10));
    }
    return lines.join('\n');
}
// ── Indication Summary Formatter ──
function formatIndicationSummary(summary) {
    const lines = [];
    lines.push('Rate Level Indication Summary');
    lines.push('');
    const cols = [
        { label: 'AY', width: 6 },
        { label: 'Reported', width: 14 },
        { label: 'LDF', width: 8 },
        { label: 'Ultimate', width: 14 },
        { label: 'Trend Fct', width: 10 },
        { label: 'Trnd Ult', width: 14 },
        { label: 'Earned Prem', width: 14 },
        { label: 'OL Fct', width: 8 },
        { label: 'OL Prem', width: 14 },
        { label: 'Loss Ratio', width: 10 },
        { label: 'Ind Chg', width: 10 },
    ];
    const header = cols.map((c) => pad(c.label, c.width)).join(' ');
    lines.push(header);
    lines.push(separator(header.length));
    for (const r of summary.results) {
        const row = [
            pad(String(r.accident_year), 6),
            pad(fmtNum(r.reported_losses), 14),
            pad(fmtNum(r.development_factor, 4), 8),
            pad(fmtNum(r.ultimate_losses), 14),
            pad(fmtNum(r.loss_trend_factor, 4), 10),
            pad(fmtNum(r.trended_ultimate_losses), 14),
            pad(fmtNum(r.earned_premium), 14),
            pad(fmtNum(r.on_level_factor, 4), 8),
            pad(fmtNum(r.on_level_premium), 14),
            pad(fmtPct(r.expected_loss_ratio), 10),
            pad(fmtPct(r.indicated_rate_change), 10),
        ].join(' ');
        lines.push(row);
    }
    lines.push(separator(header.length));
    lines.push('');
    lines.push(`Permissible Loss Ratio:       ${fmtPct(summary.permissible_loss_ratio)}`);
    lines.push(`Weighted Avg Indicated Change: ${fmtPct(summary.weighted_indicated_change)}`);
    lines.push(`All-Year Average Change:       ${fmtPct(summary.all_year_average_change)}`);
    return lines.join('\n');
}
//# sourceMappingURL=formatters.js.map