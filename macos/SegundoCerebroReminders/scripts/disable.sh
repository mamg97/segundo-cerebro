#!/bin/zsh
set -euo pipefail

label='com.mamg97.segundo-cerebro.reminders'
domain="gui/$(id -u)"
launchctl bootout "$domain/$label" >/dev/null 2>&1 || true
launchctl disable "$domain/$label" >/dev/null 2>&1 || true
print 'Agente detenido. La configuración y Keychain se conservan.'
