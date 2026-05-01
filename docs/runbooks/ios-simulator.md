# iOS Simulator Runbook

Use this runbook to install and launch the subscriber app in Apple Simulator through the native Capacitor wrapper.

## Prerequisites

- Xcode is installed and selected with `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`.
- The iOS simulator runtime is installed. If `xcrun simctl list runtimes` is empty, run `xcodebuild -downloadPlatform iOS`.
- The core API is running locally on `http://127.0.0.1:3000`.

## First-Time Setup

```sh
pnpm install
pnpm --filter @washed/subscriber-app ios:add
```

This creates `packages/subscriber-app/ios`, the native Xcode project used by Simulator.

## Sync Web Assets

```sh
pnpm --filter @washed/subscriber-app ios:sync
```

Run this after changing files in `packages/subscriber-app/src`. The command rebuilds the React app and copies it into the native project.

## Launch In Simulator

```sh
open -a Simulator
pnpm --filter @washed/subscriber-app ios:run
```

The simulator app talks to the local API at `127.0.0.1:3000`. If the API is not running, the app opens but account, booking, billing, and privacy actions will fail.
