#!/bin/zsh
set -euo pipefail

label='com.mamg97.segundo-cerebro.reminders'
plist="$HOME/Library/LaunchAgents/$label.plist"
domain="gui/$(id -u)"

if [[ ! -f "$plist" ]]; then
  print -u2 'Falta el LaunchAgent. Ejecuta primero scripts/install.sh.'
  exit 2
fi

launchctl bootout "$domain/$label" >/dev/null 2>&1 || true
launchctl bootstrap "$domain" "$plist"
launchctl enable "$domain/$label"
launchctl kickstart -k "$domain/$label"
print 'Agente activado. Se iniciará con la sesión y se reiniciará si falla.'
