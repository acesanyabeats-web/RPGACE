@echo off
title RPGACE local server
cd /d "%~dp0"
echo.
echo  RPGACE local server
echo  Code folder: %~dp0
echo  Your data and API key stay in %USERPROFILE%\RPGACE
echo.
where git >nul 2>nul
if errorlevel 1 (
  echo  [!] Git is not installed, so the code was NOT updated.
  echo      Install it once: winget install --id Git.Git -e --source winget
) else (
  echo  Getting the latest code...
  git -C "%~dp0.." pull --ff-only
  if errorlevel 1 echo  [!] Update failed - running the copy you already have.
)
echo.
py -c "import intel_common; print('  Analyser version', intel_common.ANALYSER_VERSION)"
echo.
py local_server.py
pause
