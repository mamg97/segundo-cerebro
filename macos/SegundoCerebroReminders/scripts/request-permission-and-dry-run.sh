#!/bin/zsh
set -euo pipefail

executable="$HOME/Library/Application Support/SegundoCerebroReminders/SegundoCerebroReminders.app/Contents/MacOS/SegundoCerebroReminders"
if [[ ! -x "$executable" ]]; then
  print -u2 'El agente no está instalado. Ejecuta primero scripts/install.sh.'
  exit 2
fi

"$executable" sync --dry-run
