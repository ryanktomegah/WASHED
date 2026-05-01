#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const appConfigs = {
  subscriber: {
    appId: 'app.washed.subscriber',
    packageName: '@washed/subscriber-app',
    projectDir: 'packages/subscriber-app',
  },
  worker: {
    appId: 'app.washed.worker',
    packageName: '@washed/worker-app',
    projectDir: 'packages/worker-app',
  },
};

const appName = process.argv[2];

if (appName !== 'subscriber' && appName !== 'worker') {
  console.error('Usage: node scripts/launch-ios-simulator.mjs <subscriber|worker>');
  process.exit(1);
}

const app = appConfigs[appName];
const projectPath = join(app.projectDir, 'ios/App/App.xcodeproj');
const derivedDataPath = join(app.projectDir, 'ios/DerivedData');
const appBundlePath = join(derivedDataPath, 'Build/Products/Debug-iphonesimulator/App.app');

function run(command, args) {
  const result = spawnSync(command, args, { stdio: 'inherit' });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function read(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
}

function listDevices(args) {
  const devicesByRuntime = JSON.parse(
    read('xcrun', ['simctl', 'list', 'devices', ...args, '-j']),
  ).devices;

  return Object.values(devicesByRuntime).flat();
}

if (!existsSync(projectPath)) {
  console.error(`Missing ${projectPath}. Run: pnpm --filter ${app.packageName} ios:add`);
  process.exit(1);
}

console.log(`Building ${app.packageName} web assets and syncing Capacitor...`);
run('pnpm', ['--filter', app.packageName, 'ios:sync']);

console.log(`Building ${appName} iOS simulator wrapper...`);
run('xcodebuild', [
  '-project',
  projectPath,
  '-scheme',
  'App',
  '-configuration',
  'Debug',
  '-sdk',
  'iphonesimulator',
  '-derivedDataPath',
  derivedDataPath,
  'CODE_SIGNING_ALLOWED=NO',
  'build',
]);

let booted = listDevices(['booted']).find((device) => device.state === 'Booted');

if (booted === undefined) {
  const fallback = listDevices(['available']).find(
    (device) => device.name.startsWith('iPhone') && device.isAvailable !== false,
  );

  if (fallback === undefined) {
    console.error('No available iPhone simulator found. Install an iOS simulator runtime first.');
    process.exit(1);
  }

  console.log(`No booted simulator found. Booting ${fallback.name} (${fallback.udid})...`);
  run('open', ['-a', 'Simulator']);
  run('xcrun', ['simctl', 'boot', fallback.udid]);
  run('xcrun', ['simctl', 'bootstatus', fallback.udid, '-b']);
  booted = fallback;
}

if (booted === undefined) {
  console.error(
    'No booted simulator found. Open Simulator, boot an iPhone, and rerun this script.',
  );
  process.exit(1);
}

console.log(`Installing ${appBundlePath} on ${booted.name} (${booted.udid})...`);
run('xcrun', ['simctl', 'install', booted.udid, appBundlePath]);

console.log(`Launching ${app.appId}...`);
run('xcrun', ['simctl', 'launch', booted.udid, app.appId]);
