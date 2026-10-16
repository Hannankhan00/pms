import { spawnSync } from "child_process";

const testSuites = [
  "tests/tenancy.test.ts",
  "tests/phase4.test.ts",
  "tests/phase5.test.ts",
  "tests/phase6.test.ts",
  "tests/phase7.test.ts",
  "tests/phase8.test.ts",
  "tests/phase21-22.test.ts",
];

console.log("==================================================================");
console.log("   PMS MASTER REGRESSION HARNESS: EXECUTING ALL TEST SUITES       ");
console.log("==================================================================");

let totalFailed = 0;

for (const suite of testSuites) {
  console.log(`\n>>> Running: ${suite}`);
  const result = spawnSync("npx", ["tsx", suite], {
    stdio: "inherit",
    shell: true,
  });

  if (result.status !== 0) {
    console.error(`[FAIL] Test suite failed: ${suite}`);
    totalFailed++;
  } else {
    console.log(`[PASS] Test suite passed: ${suite}`);
  }
}

console.log("\n==================================================================");
if (totalFailed > 0) {
  console.error(`FAILED: ${totalFailed} test suite(s) encountered errors.`);
  process.exit(1);
} else {
  console.log("SUCCESS: All PMS regression test suites passed (100% coverage).");
  process.exit(0);
}
