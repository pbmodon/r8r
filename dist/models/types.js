"use strict";
// ── Database Row Types (mirror Supabase/PostgreSQL schema) ──
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TREND_FIT = exports.DEFAULT_LDF_SELECTION = exports.AVERAGING_WINDOWS = void 0;
/** The standard set of windows available */
exports.AVERAGING_WINDOWS = [4, 6, 8, 12, 16, 'all'];
exports.DEFAULT_LDF_SELECTION = {
    selection_method: { window: 'all', variant: 'straight', type: 'volume_weighted' },
    tail_factor: 1.0,
};
exports.DEFAULT_TREND_FIT = {
    window: 'all',
    variant: 'straight',
};
//# sourceMappingURL=types.js.map