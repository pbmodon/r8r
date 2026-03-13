"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClient = getClient;
exports.resetClient = resetClient;
const supabase_js_1 = require("@supabase/supabase-js");
let client = null;
function getClient() {
    if (!client) {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_KEY;
        if (!url || !key) {
            throw new Error('Missing SUPABASE_URL or SUPABASE_KEY environment variables. ' +
                'Set these to connect to your Supabase project.');
        }
        client = (0, supabase_js_1.createClient)(url, key);
    }
    return client;
}
/** Reset the client (useful for testing). */
function resetClient() {
    client = null;
}
//# sourceMappingURL=client.js.map