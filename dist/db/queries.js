"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLinesOfBusiness = getLinesOfBusiness;
exports.getClaims = getClaims;
exports.getTriangleData = getTriangleData;
exports.getPolicies = getPolicies;
exports.getRateHistory = getRateHistory;
const client_1 = require("./client");
function getLinesOfBusiness() {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield (0, client_1.getClient)()
            .from('line_of_business')
            .select('id, code, name, description')
            .order('code');
        if (error)
            throw new Error(`Failed to fetch lines of business: ${error.message}`);
        return data;
    });
}
function getClaims(lobId, accidentYears) {
    return __awaiter(this, void 0, void 0, function* () {
        let query = (0, client_1.getClient)()
            .from('claims')
            .select('*')
            .eq('lob_id', lobId)
            .order('accident_year')
            .order('development_month');
        if (accidentYears && accidentYears.length > 0) {
            query = query.in('accident_year', accidentYears);
        }
        const { data, error } = yield query;
        if (error)
            throw new Error(`Failed to fetch claims: ${error.message}`);
        return data;
    });
}
/**
 * Fetches aggregated triangle data: sum of losses grouped by (accident_year, development_month).
 * This is the shape needed to build a loss development triangle.
 */
function getTriangleData(lobId, lossType) {
    return __awaiter(this, void 0, void 0, function* () {
        const lossColumn = lossType === 'paid' ? 'total_paid' : 'total_incurred';
        const { data, error } = yield (0, client_1.getClient)()
            .from('triangle_data')
            .select(`accident_year, development_month, ${lossColumn}`)
            .eq('lob_id', lobId)
            .order('accident_year')
            .order('development_month');
        if (error)
            throw new Error(`Failed to fetch triangle data: ${error.message}`);
        return data.map((row) => ({
            accident_year: row.accident_year,
            development_month: row.development_month,
            value: row[lossColumn],
        }));
    });
}
function getPolicies(lobId, policyYears) {
    return __awaiter(this, void 0, void 0, function* () {
        let query = (0, client_1.getClient)()
            .from('policies')
            .select('*')
            .eq('lob_id', lobId)
            .order('policy_year');
        if (policyYears && policyYears.length > 0) {
            query = query.in('policy_year', policyYears);
        }
        const { data, error } = yield query;
        if (error)
            throw new Error(`Failed to fetch policies: ${error.message}`);
        return data;
    });
}
function getRateHistory(lobId) {
    return __awaiter(this, void 0, void 0, function* () {
        const { data, error } = yield (0, client_1.getClient)()
            .from('rate_history')
            .select('*')
            .eq('lob_id', lobId)
            .order('effective_date');
        if (error)
            throw new Error(`Failed to fetch rate history: ${error.message}`);
        return data;
    });
}
//# sourceMappingURL=queries.js.map