/**
 * CLI output formatting
 */
export function printEvent(event) {
    switch (event.type) {
        case 'message':
            process.stdout.write(event.content);
            break;
        case 'tool_request':
            console.log(`\n🔧 Tool request: ${event.tool}`);
            if (event.requiresApproval) {
                console.log('   ⏳ Awaiting approval...');
            }
            break;
        case 'tool_result':
            if (event.status === 'ok') {
                console.log(`   ✅ Tool ${event.tool} completed`);
            }
            else {
                console.log(`   ❌ Tool ${event.tool} failed`);
            }
            break;
        case 'error':
            console.error(`\n❌ Error: ${event.message}`);
            if (event.recoverable) {
                console.log('   (recoverable)');
            }
            break;
    }
}
export function printRunComplete(status, reportPath) {
    console.log('\n\n' + '─'.repeat(60));
    console.log(`Status: ${status}`);
    if (reportPath) {
        console.log(`Report: ${reportPath}`);
    }
    console.log('─'.repeat(60) + '\n');
}
export function printError(message) {
    console.error(`\n❌ ${message}\n`);
}
export function printWarning(message) {
    console.warn(`\n⚠️  ${message}\n`);
}
//# sourceMappingURL=output.js.map