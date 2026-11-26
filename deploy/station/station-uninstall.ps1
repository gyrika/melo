# Run by the uninstaller (as administrator, hidden). The shop's data stays in
# C:\ProgramData\MeloPOS (sales, staff, settings): delete that folder by hand to remove it too.
$ErrorActionPreference = 'Continue'
foreach ($name in @('Melo POS', 'Melo POS update', 'Melo POS update now', 'Melo POS nightly')) {
  Stop-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue
  Unregister-ScheduledTask -TaskName $name -Confirm:$false -ErrorAction SilentlyContinue
}
Get-Process -Name node -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "$PSScriptRoot*" } | Stop-Process -Force
Remove-NetFirewallRule -DisplayName 'Melo POS' -ErrorAction SilentlyContinue
& powercfg.exe /change monitor-timeout-ac 10
& powercfg.exe /change standby-timeout-ac 30
