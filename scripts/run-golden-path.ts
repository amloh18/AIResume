import { executeGoldenPathProductionSuite } from '../src/tests/automation-reliability/goldenPathProductionRunner';

async function main() {
  console.log('===============================================================');
  console.log('  BuildAIResume Auto-Apply Golden Path & Failure Recovery Suite');
  console.log('===============================================================');

  const report = await executeGoldenPathProductionSuite();

  for (const test of report.tests) {
    const icon = test.passed ? '🟢 PASS' : '🔴 FAIL';
    console.log(`\n[${icon}] ${test.testId}: ${test.testName}`);
    for (const log of test.logs) {
      console.log(`   - ${log.step}: ${log.details}`);
    }
  }

  console.log('\n===============================================================');
  console.log(`Summary: ${report.passedTests}/${report.totalTests} Tests Passed (${Math.round((report.passedTests / report.totalTests) * 100)}%)`);
  console.log('===============================================================');

  if (report.failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main();
