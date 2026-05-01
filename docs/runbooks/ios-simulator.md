# iOS Simulator Runbook

Use this runbook to install and launch the production React + Capacitor mobile apps in Apple Simulator.

## Apps

- Subscriber app: `@washed/subscriber-app`, bundle id `app.washed.subscriber`
- Worker app: `@washed/worker-app`, bundle id `app.washed.worker`

The operator console is web-only and is covered by `pnpm ui:smoke`.

## Prerequisites

- Xcode is installed and selected with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
- The iOS simulator runtime is installed. If `xcrun simctl list runtimes` is empty, run `xcodebuild -downloadPlatform iOS`.
- At least one iPhone simulator is booted in Simulator.app.

The current mobile apps use the checked-in demo frontend data source, so they open without the local API. Backend-backed payment, push, and assignment flows still need the API when those integrations replace demo data.

## First-Time Native Project Setup

The native projects are checked in. If they ever need to be recreated:

```sh
pnpm --filter @washed/subscriber-app ios:add
pnpm --filter @washed/worker-app ios:add
```

## Launch Subscriber

```sh
open -a Simulator
pnpm ios:sim:subscriber
```

The script builds the React app, syncs Capacitor assets, builds the Xcode simulator target with signing disabled, terminates any already-running copy, installs the `.app` bundle on the booted simulator, and launches `app.washed.subscriber`.

## Launch Worker

```sh
open -a Simulator
pnpm ios:sim:worker
```

This follows the same path and launches `app.washed.worker`.

## Refresh Both Apps

After frontend edits, run both native shells through the same build/sync/install/launch path on separate iPhone simulators:

```sh
open -a Simulator
pnpm ios:sim:all
```

This boots two available iPhone simulators if needed, installs subscriber on the first, installs worker on the second, and launches both. If only one iPhone simulator exists, create another device in Xcode's Devices and Simulators window first.

## Manual Fallback

If the script fails, run the exact steps by hand for the target app:

```sh
pnpm --filter @washed/subscriber-app ios:sync
xcodebuild \
  -project packages/subscriber-app/ios/App/App.xcodeproj \
  -scheme App \
  -configuration Debug \
  -sdk iphonesimulator \
  -derivedDataPath packages/subscriber-app/ios/DerivedData \
  CODE_SIGNING_ALLOWED=NO \
  build
xcrun simctl install booted packages/subscriber-app/ios/DerivedData/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch booted app.washed.subscriber
```

Replace `subscriber-app` with `worker-app` and `app.washed.subscriber` with `app.washed.worker` for the worker app.
