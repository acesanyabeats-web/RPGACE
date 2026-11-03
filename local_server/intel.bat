@echo off
title RPGACE - Content Intelligence
color 0A
cd /d "%~dp0"
if exist "E:\RPGACE\" (set "RPGACE_HOME=E:\RPGACE") else (set "RPGACE_HOME=%USERPROFILE%\RPGACE")
echo.
echo  RPGACE Content Intelligence
echo  Paste a URL to analyse any video.
echo  Type 'watchlist' to see your saved videos.
echo.
py rpgace_intel.py %*
pause
