# memory-guard.ps1
# OrangeAdmin memory guardian: scan esbuild/node processes every N seconds.
# If private memory >= 2GB -> warn; >= 4GB -> auto kill (prevents the esbuild
# 0.21.5 leak that once ate 80GB pagefile and froze the whole machine).
#
# Usage (run from orange-admin root):
#   powershell -ExecutionPolicy Bypass -File scripts\memory-guard.ps1
# Optional params:
#   -ThresholdWarnMB  warn threshold in MB (default 2048)
#   -ThresholdKillMB  auto-kill threshold in MB (default 4096)
#   -IntervalSec      scan interval in seconds (default 60)
#   -ProjectRoot      project root (default: orange-admin root = parent of scripts)

[CmdletBinding()]
param(
  [int]$ThresholdWarnMB = 2048,
  [int]$ThresholdKillMB = 4096,
  [int]$IntervalSec = 60,
  [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot)
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$projectPathPattern = [regex]::Escape($ProjectRoot)
$cmdPattern = "($projectPathPattern|node_modules\\esbuild|node_modules\\vite)"

Write-Host "=== OrangeAdmin Memory Guard ===" -ForegroundColor Cyan
Write-Host "Project root : $ProjectRoot"
Write-Host "Warn  >= $ThresholdWarnMB MB"
Write-Host "Kill  >= $ThresholdKillMB MB"
Write-Host "Interval   : $IntervalSec s"
Write-Host "Stop: kill this process from Task Manager." -ForegroundColor Yellow
Write-Host ""

while ($true) {
  try {
    $procs = Get-CimInstance Win32_Process -Filter "Name in ('node.exe','esbuild.exe')" -ErrorAction SilentlyContinue |
      Where-Object { $_.CommandLine -and $_.CommandLine -match $cmdPattern }

    foreach ($p in $procs) {
      $memMB = [math]::Round($p.WorkingSetSize / 1MB, 1)

      if ($memMB -ge $ThresholdKillMB) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [KILL] PID $($p.ProcessId) ($($p.Name)) used $memMB MB, over kill threshold, terminating..." -ForegroundColor Red
        try {
          Stop-Process -Id $p.ProcessId -Force -ErrorAction Stop
          Write-Host "  -> killed PID $($p.ProcessId)" -ForegroundColor Red
        } catch {
          Write-Host "  -> kill failed: $_" -ForegroundColor Red
        }
      } elseif ($memMB -ge $ThresholdWarnMB) {
        Write-Host "[$(Get-Date -Format 'HH:mm:ss')] [WARN] PID $($p.ProcessId) ($($p.Name)) used $memMB MB, over warn threshold" -ForegroundColor Yellow
      }
    }
  } catch {
    Write-Host "[$(Get-Date -Format 'HH:mm:ss')] scan error: $_" -ForegroundColor Red
  }

  Start-Sleep -Seconds $IntervalSec
}
