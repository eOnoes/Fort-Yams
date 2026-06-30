/**
 * Environment variable handling for CLI
 */
export function loadEnv() {
    return {
        baseUrl: process.env.TRIPP_OPENAI_COMPATIBLE_BASE_URL,
        apiKey: process.env.TRIPP_OPENAI_COMPATIBLE_API_KEY,
        model: process.env.TRIPP_MODEL,
        providerName: process.env.TRIPP_PROVIDER_NAME,
        dbPath: process.env.TRIPP_DB_PATH,
    };
}
export function validateRequiredEnv(env) {
    const missing = [];
    if (!env.baseUrl) {
        missing.push('TRIPP_OPENAI_COMPATIBLE_BASE_URL');
    }
    if (!env.apiKey) {
        missing.push('TRIPP_OPENAI_COMPATIBLE_API_KEY');
    }
    if (!env.model) {
        missing.push('TRIPP_MODEL');
    }
    if (missing.length > 0) {
        console.error('\n❌ Missing required environment variables:');
        for (const name of missing) {
            console.error(`   - ${name}`);
        }
        console.error('\nSet these variables or provide CLI flags.');
        console.error('See documentation for details.\n');
        process.exit(1);
    }
}
//# sourceMappingURL=env.js.map