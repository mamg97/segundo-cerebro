#!/bin/sh
set -eu
root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
build=$(mktemp -d)
trap 'rm -rf "$build"' EXIT HUP INT TERM
xcrun swiftc -swift-version 5 -parse-as-library \
  "$root/SegundoCerebroHealthBridge/SyncCoordinator.swift" \
  "$root/Tests/SyncCoordinatorTests.swift" -o "$build/sync-tests"
"$build/sync-tests"
