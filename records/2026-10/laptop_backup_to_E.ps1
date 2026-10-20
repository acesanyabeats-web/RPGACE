# RPGACE Total Systems -> external drive E: (before a factory reset)  - Oct 20 2026
# Run in PowerShell:  powershell -ExecutionPolicy Bypass -File .\laptop_backup_to_E.ps1
# 1) finds everything RPGACE / AI on this laptop and shows sizes
# 2) warns about git work not pushed to GitHub (that would be lost)
# 3) asks before copying, copies with robocopy, then checks file counts + sizes match
$ErrorActionPreference = 'Continue'
$dest = 'E:\RPGACE_backup_' + (Get-Date -Format 'yyyy-MM-dd')
$H = $env:USERPROFILE

# Known places (from RPGACE's own docs)
$cands = @(
  "$H\Downloads\rpgace-vercel-v4",      # RPGACE repo clone
  "$H\RPGACE",                          # Python scripts, local_server.py, .anthropic_key
  "$H\.claude",                         # Claude Code: global skills (omnitrix, aintergration, dummy, debloat), settings, memory
  "$H\.claude-mem",
  "$H\.graphify",                       # graphify global graph
  "$H\.kaggle",                         # Kaggle token
  "$H\.cache\huggingface",              # downloaded AI models (can be very big)
  "$env:APPDATA\Claude",                # Claude desktop app data
  "$env:APPDATA\obsidian"               # Obsidian settings
)
$files = @("$H\.claude.json", "$H\.gitconfig")

# Anything else with these names, 4 folders deep under your user folder and the C:\ root
Write-Host "`nSearching for other RPGACE / OpenMontage / AI folders..." -ForegroundColor Cyan
$names = 'rpgace','openmontage','graphify','obsidian','kaggle','ltx','hunyuan','comfyui','claude'
$found = foreach ($root in @($H, 'C:\')) {
  Get-ChildItem $root -Directory -Recurse -Depth 3 -ErrorAction SilentlyContinue |
    Where-Object { $n = $_.Name.ToLower(); ($names | Where-Object { $n -like "*$_*" }) -and $_.FullName -notmatch '\\(node_modules|\.git|AppData\\Local\\Temp|Windows|Program Files)' }
}
$all = @($cands | Where-Object { Test-Path $_ }) + @($found | ForEach-Object { $_.FullName })
# keep only top-most folders (drop ones inside another listed folder)
$all = $all | Sort-Object -Unique
$all = $all | Where-Object { $p = $_; -not ($all | Where-Object { $_ -ne $p -and $p.StartsWith($_ + '\') }) }

Write-Host "`n=== What will be copied ===" -ForegroundColor Cyan
$total = 0
foreach ($p in $all) {
  $s = (Get-ChildItem $p -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum
  $total += $s
  '{0,10:N1} MB  {1}' -f ($s/1MB), $p
}
foreach ($f in $files) { if (Test-Path $f) { $s=(Get-Item $f -Force).Length; $total += $s; '{0,10:N1} MB  {1}' -f ($s/1MB), $f } }
'{0,10:N1} GB  TOTAL' -f ($total/1GB)

$e = Get-PSDrive E -ErrorAction SilentlyContinue
if (-not $e) { Write-Host "Drive E: not found - plug it in and run again." -ForegroundColor Red; exit 1 }
'{0,10:N1} GB  free on E:' -f ($e.Free/1GB)
if ($e.Free -lt $total * 1.05) { Write-Host "NOT ENOUGH SPACE on E: - free some space or untick big folders (e.g. .cache\huggingface)." -ForegroundColor Red }

Write-Host "`n=== Git work NOT on GitHub (would be lost) ===" -ForegroundColor Cyan
$gitDirs = foreach ($p in $all) { Get-ChildItem $p -Directory -Recurse -Depth 3 -Filter .git -Force -ErrorAction SilentlyContinue | ForEach-Object { $_.Parent.FullName } }
foreach ($g in ($gitDirs | Sort-Object -Unique)) {
  Push-Location $g
  $dirty = git status --porcelain 2>$null
  $ahead = git log --branches --not --remotes --oneline 2>$null
  if ($dirty -or $ahead) { Write-Host "  $g" -ForegroundColor Yellow; if ($dirty) { "    uncommitted files: " + @($dirty).Count }; if ($ahead) { "    commits not pushed: " + @($ahead).Count } }
  else { "  OK (all on GitHub): $g" }
  Pop-Location
}

$ans = Read-Host "`nType YES to copy all of the above to $dest"
if ($ans -ne 'YES') { "Nothing copied."; exit 0 }
New-Item -ItemType Directory -Force $dest | Out-Null
$log = "$dest\_backup_log.txt"
foreach ($p in $all) {
  $target = Join-Path $dest ($p -replace '^[A-Za-z]:\\', '' )
  robocopy $p $target /E /COPY:DAT /DCOPY:T /R:1 /W:1 /XJ /NP /NFL /NDL /LOG+:$log | Out-Null
  if ($LASTEXITCODE -ge 8) { Write-Host "COPY ERRORS in $p - see $log" -ForegroundColor Red }
}
foreach ($f in $files) { if (Test-Path $f) { $t = Join-Path $dest ($f -replace '^[A-Za-z]:\\', ''); New-Item -ItemType Directory -Force (Split-Path $t) | Out-Null; Copy-Item $f $t -Force } }

Write-Host "`n=== Check: source vs E: ===" -ForegroundColor Cyan
$bad = 0
foreach ($p in $all) {
  $target = Join-Path $dest ($p -replace '^[A-Za-z]:\\', '' )
  $a = Get-ChildItem $p -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum
  $b = Get-ChildItem $target -Recurse -File -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum
  $ok = ($a.Count -eq $b.Count) -and ($a.Sum -eq $b.Sum)
  if (-not $ok) { $bad++ }
  '{0}  {1} files / {2:N1} MB  ->  {3} files / {4:N1} MB  {5}' -f ($(if ($ok) {'OK  '} else {'DIFF'})), $a.Count, ($a.Sum/1MB), $b.Count, ($b.Sum/1MB), $p
}
if ($bad -eq 0) { Write-Host "`nALL MATCH - backup complete: $dest" -ForegroundColor Green } else { Write-Host "`n$bad folder(s) differ - do NOT reset yet; send me this output." -ForegroundColor Red }
