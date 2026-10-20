@echo off
title RPGACE - Intel Server (keep open)
color 0A
cd /d "%USERPROFILE%\RPGACE"
echo.
echo  RPGACE Local Intel Server
echo  Keep this window open while using RPGACE.
echo.
rem VW-0 (Oct 20 2026): get the latest analyser from GitHub before every start,
rem so the laptop never runs an old copy again. If a download fails or a file
rem is broken, the copy already here is kept.
echo  Updating the analyser from GitHub...
set "BASE=https://raw.githubusercontent.com/acesanyabeats-web/RPGACE/main"
call :get local_server/local_server.py local_server.py
call :get local_server/rpgace_intel.py rpgace_intel.py
call :get local_server/intel_common.py intel_common.py
call :get realm_lenses.json realm_lenses.json
for /f "delims=" %%V in ('py -c "import intel_common;print(intel_common.ANALYSER_VERSION)" 2^>NUL') do echo  Analyser version %%V
echo.
py local_server.py
pause
goto :eof

:get
curl -fsSL "%BASE%/%~1" -o "%~2.new" 2>NUL
if errorlevel 1 (
  echo   Could not download %~2 - using the copy already here
  del "%~2.new" 2>NUL
  goto :eof
)
if /i "%~x2"==".py" (
  py -m py_compile "%~2.new" 2>NUL
  if errorlevel 1 (
    echo   Downloaded %~2 is broken - using the copy already here
    del "%~2.new" 2>NUL
    goto :eof
  )
)
move /y "%~2.new" "%~2" >NUL
echo   %~2 up to date
goto :eof
