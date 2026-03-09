#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

const ROOT = path.join(__dirname, '..');

const COMMANDS = {
  all: { desc: 'Run all tests (Jest + Playwright)', run: ['jest', 'e2e'] },
  jest: { desc: 'Run Jest unit/integration tests', cmd: 'jest' },
  e2e: { desc: 'Run Playwright E2E tests', cmd: 'playwright' },
  'e2e:headed': { desc: 'Run E2E tests with visible browser', cmd: 'playwright', args: ['--headed'] },
};

// Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const HIDE_CURSOR = '\x1b[?25l';
const SHOW_CURSOR = '\x1b[?25h';

// Strip ANSI escape codes
function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function showHelp() {
  console.log(`
Usage: node bin/test.js <command> [file] [options]

Commands:
  all          Run all tests (Jest + Playwright)
  jest         Run Jest unit/integration tests
  e2e          Run Playwright E2E tests
  e2e:headed   Run E2E tests with visible browser

Examples:
  node bin/test.js all
  node bin/test.js jest
  node bin/test.js jest tests/unit/auth.test.js
  node bin/test.js e2e tests/e2e/auth.spec.js
  node bin/test.js e2e:headed
`);
}

function progressBar(current, total, passed, failed, width = 30) {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(width * pct);
  const empty = width - filled;
  const bar = GREEN + '█'.repeat(filled) + RESET + DIM + '░'.repeat(empty) + RESET;

  let status = `${current}/${total}`;
  if (passed > 0) status = `${GREEN}${passed}${RESET}`;
  if (failed > 0) status += ` ${RED}${failed}✗${RESET}`;

  return `[${bar}] ${status}`;
}

function clearLine() {
  process.stdout.write('\r\x1b[K');
}

function runJest(extraArgs = []) {
  return new Promise((resolve) => {
    const jestBin = path.join(ROOT, 'node_modules', '.bin', 'jest');

    let passed = 0;
    let failed = 0;
    let total = 366; // Default estimate
    const failures = [];
    const startTime = Date.now();
    let currentFailFile = null;

    process.stdout.write(HIDE_CURSOR);
    process.stdout.write(`${DIM}Jest${RESET} ${progressBar(0, total, 0, 0)}`);

    // Run Jest without --json to get real-time output
    const args = ['-c', 'tests/jest.config.js', ...extraArgs];
    const proc = spawn(jestBin, args, {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let buffer = '';

    // Jest outputs to stderr, not stdout
    proc.stderr.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line

      for (const rawLine of lines) {
        const line = stripAnsi(rawLine);

        // Track current file for failure context
        if (line.match(/^FAIL\s+/)) {
          currentFailFile = line.replace(/^FAIL\s+/, '').replace(/\s*\([\d.]+\s*s\)\s*$/, '').trim();
        } else if (line.match(/^PASS\s+/)) {
          currentFailFile = null;
        }

        // Count individual passed tests: "  ✓ test name (5 ms)"
        if (line.match(/^\s+[✓✔]/)) {
          passed++;
          clearLine();
          process.stdout.write(`${DIM}Jest${RESET} ${progressBar(passed + failed, total, passed, failed)}`);
        }
        // Count individual failed tests: "  ✕ test name (5 ms)"
        else if (line.match(/^\s+[✕×✗]/)) {
          failed++;
          const testName = line.replace(/^\s+[✕×✗]\s*/, '').replace(/\s*\(\d+\s*m?s\)\s*$/, '').trim();
          if (testName && currentFailFile) {
            failures.push({
              suite: currentFailFile,
              test: testName,
              message: '',
            });
          }
          clearLine();
          process.stdout.write(`${DIM}Jest${RESET} ${progressBar(passed + failed, total, passed, failed)}`);
        }
        // Update total from final summary: "Tests:  366 passed, 368 total"
        else if (line.match(/^Tests:/)) {
          const totalMatch = line.match(/(\d+) total/);
          if (totalMatch) total = parseInt(totalMatch[1], 10);
        }
        // Capture failure message
        else if (failures.length > 0 && !failures[failures.length - 1].message) {
          if (line.includes('Expected') || line.includes('Received') || line.includes('Error:')) {
            failures[failures.length - 1].message = line.trim().slice(0, 300);
          }
        }
      }
    });

    proc.stdout.on('data', () => {
      // Jest outputs to stderr, stdout is usually empty
    });

    proc.on('close', () => {
      clearLine();
      process.stdout.write(SHOW_CURSOR);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      resolve({
        passed,
        failed,
        total: passed + failed || total,
        failures,
        time: elapsed,
      });
    });
  });
}

function runPlaywright(extraArgs = []) {
  return new Promise((resolve) => {
    const playwrightBin = path.join(ROOT, 'node_modules', '.bin', 'playwright');
    const isHeaded = extraArgs.includes('--headed');

    if (isHeaded) {
      const args = ['test', '-c', 'tests/playwright.config.js', ...extraArgs];
      const proc = spawn(playwrightBin, args, {
        stdio: 'inherit',
        cwd: ROOT,
        env: { ...process.env, NODE_ENV: 'test' },
      });
      proc.on('close', (code) => {
        resolve({ passed: 0, failed: code || 0, total: 0, failures: [], time: '0', headed: true });
      });
      return;
    }

    let current = 0;
    let passed = 0;
    let failed = 0;
    let total = 20; // Default estimate
    const failures = [];
    const startTime = Date.now();

    process.stdout.write(HIDE_CURSOR);
    process.stdout.write(`${DIM}Playwright${RESET} ${progressBar(0, total, 0, 0)}`);

    // Use line reporter for real-time progress
    const args = ['test', '-c', 'tests/playwright.config.js', '--reporter=line', ...extraArgs];

    const proc = spawn(playwrightBin, args, {
      cwd: ROOT,
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let buffer = '';
    proc.stdout.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer

      for (const rawLine of lines) {
        const line = stripAnsi(rawLine);

        // Match: "Running 20 tests using 1 worker"
        const runningMatch = line.match(/Running (\d+) tests/);
        if (runningMatch) {
          total = parseInt(runningMatch[1], 10);
        }

        // Match: "[1/20] [chromium] › tests/e2e/auth.spec.js:8:3 › ..."
        const progressMatch = line.match(/\[(\d+)\/(\d+)\]/);
        if (progressMatch) {
          current = parseInt(progressMatch[1], 10);
          total = parseInt(progressMatch[2], 10);
        }

        // Match final summary: "  20 passed (22.7s)" or "  18 passed, 2 failed (22.7s)"
        const summaryMatch = line.match(/(\d+) passed/);
        if (summaryMatch && !line.includes('›')) {
          passed = parseInt(summaryMatch[1], 10);
        }
        const failedMatch = line.match(/(\d+) failed/);
        if (failedMatch && !line.includes('›')) {
          failed = parseInt(failedMatch[1], 10);
          // Extract failure info
          const testMatch = line.match(/› (.+?) › (.+)/);
          if (testMatch) {
            failures.push({
              suite: testMatch[1],
              test: testMatch[2],
              message: '',
            });
          }
        }

        clearLine();
        process.stdout.write(`${DIM}Playwright${RESET} ${progressBar(current, total, current, 0)}`);
      }
    });

    proc.stderr.on('data', (data) => {
      // Capture error messages for failures
      const text = data.toString();
      if (failures.length > 0 && !failures[failures.length - 1].message) {
        failures[failures.length - 1].message = text.slice(0, 300);
      }
    });

    proc.on('close', () => {
      clearLine();
      process.stdout.write(SHOW_CURSOR);

      // Process any remaining buffer content
      if (buffer.trim()) {
        const line = stripAnsi(buffer);
        const summaryMatch = line.match(/(\d+) passed/);
        if (summaryMatch && !line.includes('›')) {
          passed = parseInt(summaryMatch[1], 10);
        }
        const failedMatch = line.match(/(\d+) failed/);
        if (failedMatch && !line.includes('›')) {
          failed = parseInt(failedMatch[1], 10);
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      // If we didn't get final counts from summary, use current progress
      if (passed === 0 && failed === 0) {
        passed = current;
      }
      resolve({ passed, failed, total, failures, time: elapsed });
    });
  });
}

function printSummary(label, result) {
  if (result.headed) return;

  const icon = result.failed > 0 ? `${RED}✗${RESET}` : `${GREEN}✓${RESET}`;
  const passStr = `${GREEN}${result.passed} passed${RESET}`;
  const failStr = result.failed > 0 ? `, ${RED}${result.failed} failed${RESET}` : '';
  const timeStr = `${DIM}(${result.time}s)${RESET}`;

  console.log(`${icon} ${BOLD}${label}${RESET}: ${passStr}${failStr} ${timeStr}`);
}

function printFailures(failures) {
  if (failures.length === 0) return;

  console.log(`\n${RED}${BOLD}Failed Tests:${RESET}\n`);

  for (const f of failures) {
    console.log(`  ${RED}✗${RESET} ${DIM}${f.suite}${RESET}`);
    console.log(`    ${f.test}`);
    if (f.message) {
      const lines = f.message.split('\n').slice(0, 5).map(l => `      ${DIM}${l}${RESET}`).join('\n');
      console.log(lines);
    }
    console.log();
  }
}

async function main() {
  const [command, ...rest] = process.argv.slice(2);

  if (!command || command === 'help' || command === '--help' || command === '-h') {
    showHelp();
    process.exit(0);
  }

  const config = COMMANDS[command];
  if (!config) {
    console.error(`Unknown command: ${command}\n`);
    showHelp();
    process.exit(1);
  }

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    process.stdout.write(SHOW_CURSOR);
    console.log('\n\nInterrupted.');
    process.exit(1);
  });

  console.log();

  let totalPassed = 0;
  let totalFailed = 0;
  let allFailures = [];

  if (config.run) {
    for (const sub of config.run) {
      const subConfig = COMMANDS[sub];
      const result = subConfig.cmd === 'jest'
        ? await runJest([...(subConfig.args || []), ...rest])
        : await runPlaywright([...(subConfig.args || []), ...rest]);

      printSummary(sub === 'jest' ? 'Jest' : 'Playwright', result);
      totalPassed += result.passed;
      totalFailed += result.failed;
      allFailures = allFailures.concat(result.failures);
    }
  } else {
    const args = [...(config.args || []), ...rest];
    const result = config.cmd === 'jest'
      ? await runJest(args)
      : await runPlaywright(args);

    printSummary(config.cmd === 'jest' ? 'Jest' : 'Playwright', result);
    totalPassed = result.passed;
    totalFailed = result.failed;
    allFailures = result.failures;
  }

  printFailures(allFailures);

  if (config.run) {
    console.log(`${DIM}─────────────────────────────${RESET}`);
    const finalIcon = totalFailed > 0 ? `${RED}✗${RESET}` : `${GREEN}✓${RESET}`;
    console.log(`${finalIcon} ${BOLD}Total${RESET}: ${GREEN}${totalPassed} passed${RESET}${totalFailed > 0 ? `, ${RED}${totalFailed} failed${RESET}` : ''}`);
  }

  console.log();
  process.exit(totalFailed > 0 ? 1 : 0);
}

main();
