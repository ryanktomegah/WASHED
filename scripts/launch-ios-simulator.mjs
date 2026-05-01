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
const appNames = appName === 'all' ? ['subscriber', 'worker'] : [appName];

if (appName !== 'subscriber' && appName !== 'worker' && appName !== 'all') {
  console.error('Usage: node scripts/launch-ios-simulator.mjs <subscriber|worker|all>');
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: 'inherit' });

  if (result.status !== 0 && options.allowFailure !== true) {
    process.exit(result.status ?? 1);
  }

  return result;
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

function findDevice(udid) {
  return listDevices(['available']).find((device) => device.udid === udid);
}

function waitUntilBooted(device) {
  const deadline = Date.now() + 120_000;

  while (Date.now() < deadline) {
    const currentDevice = findDevice(device.udid);

    if (currentDevice?.state === 'Booted') {
      return { ...currentDevice, state: 'Booted' };
    }

    run('xcrun', ['simctl', 'bootstatus', device.udid], { allowFailure: true });
    run('sleep', ['1'], { allowFailure: true });
  }

  console.error(`Timed out waiting for ${device.name} (${device.udid}) to boot.`);
  process.exit(1);
}

function availableIphones() {
  return listDevices(['available']).filter(
    (device) => device.name.startsWith('iPhone') && device.isAvailable !== false,
  );
}

function selectDevicesForApps(names) {
  const bootedIphones = listDevices(['booted']).filter(
    (device) => device.state === 'Booted' && device.name.startsWith('iPhone'),
  );
  const available = availableIphones();

  if (available.length < names.length) {
    console.error(
      `Need ${names.length} available iPhone simulators for ${names.join(' + ')}, found ${available.length}. Install or create another iPhone simulator in Xcode.`,
    );
    process.exit(1);
  }

  const selected = [...bootedIphones];

  for (const device of available) {
    if (selected.length >= names.length) {
      break;
    }

    if (selected.every((selectedDevice) => selectedDevice.udid !== device.udid)) {
      selected.push(device);
    }
  }

  if (selected.length < names.length) {
    console.error(
      `Need ${names.length} iPhone simulators for ${names.join(' + ')}, found ${selected.length}.`,
    );
    process.exit(1);
  }

  run('open', ['-a', 'Simulator']);

  return selected.slice(0, names.length).map((device) => {
    if (device.state === 'Booted') {
      return device;
    }

    console.log(`Booting ${device.name} (${device.udid})...`);
    run('xcrun', ['simctl', 'boot', device.udid]);
    return waitUntilBooted(device);
  });
}

const selectedDevices = selectDevicesForApps(appNames);

function launchApp(name, device) {
  const app = appConfigs[name];
  const projectPath = join(app.projectDir, 'ios/App/App.xcodeproj');
  const derivedDataPath = join(app.projectDir, 'ios/DerivedData');
  const appBundlePath = join(derivedDataPath, 'Build/Products/Debug-iphonesimulator/App.app');

  if (!existsSync(projectPath)) {
    console.error(`Missing ${projectPath}. Run: pnpm --filter ${app.packageName} ios:add`);
    process.exit(1);
  }

  console.log(`Building ${app.packageName} web assets and syncing Capacitor...`);
  run('pnpm', ['--filter', app.packageName, 'ios:sync']);

  console.log(`Building ${name} iOS simulator wrapper...`);
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

  console.log(`Stopping any running ${app.appId} instance...`);
  run('xcrun', ['simctl', 'terminate', device.udid, app.appId], { allowFailure: true });

  console.log(`Installing ${appBundlePath} on ${device.name} (${device.udid})...`);
  run('xcrun', ['simctl', 'install', device.udid, appBundlePath]);

  console.log(`Launching ${app.appId}...`);
  run('xcrun', ['simctl', 'launch', device.udid, app.appId]);
}

for (const [index, name] of appNames.entries()) {
  const device = selectedDevices[index];

  if (device === undefined) {
    console.error(`No simulator selected for ${name}.`);
    process.exit(1);
  }

  launchApp(name, device);
}
