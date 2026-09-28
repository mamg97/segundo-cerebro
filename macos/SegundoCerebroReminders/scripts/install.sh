#!/bin/zsh
set -euo pipefail

script_dir=${0:A:h}
project_dir=${script_dir:h}
start_agent=${1:-}

if [[ -d /Applications/Xcode.app/Contents/Developer ]]; then
  export DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer
fi
swift_bin=$(xcrun --find swift)
"$swift_bin" build --disable-sandbox --package-path "$project_dir" -c release

install_root="$HOME/Library/Application Support/SegundoCerebroReminders"
app_path="$install_root/SegundoCerebroReminders.app"
executable_path="$app_path/Contents/MacOS/SegundoCerebroReminders"
log_dir="$HOME/Library/Logs/SegundoCerebroReminders"
launch_agent="$HOME/Library/LaunchAgents/com.mamg97.segundo-cerebro.reminders.plist"

mkdir -p "$app_path/Contents/MacOS" "$log_dir" "$HOME/Library/LaunchAgents"
cp "$project_dir/.build/release/SegundoCerebroReminders" "$executable_path"
cp "$project_dir/Resources/Info.plist" "$app_path/Contents/Info.plist"
chmod 755 "$executable_path"
codesign --force --deep --sign - "$app_path"

cp "$project_dir/Resources/com.mamg97.segundo-cerebro.reminders.plist" "$launch_agent"
/usr/libexec/PlistBuddy -c "Set :ProgramArguments:0 $executable_path" "$launch_agent"
/usr/libexec/PlistBuddy -c "Set :StandardOutPath $log_dir/agent.log" "$launch_agent"
/usr/libexec/PlistBuddy -c "Set :StandardErrorPath $log_dir/agent.error.log" "$launch_agent"
chmod 600 "$launch_agent"

print 'Agente instalado sin configurar ni iniciar escrituras en Recordatorios.'
print 'Siguiente paso: npm run reminders:configure -- https://URL-PRIVADA'

if [[ "$start_agent" == "--start" ]]; then
  "$script_dir/enable.sh"
fi
