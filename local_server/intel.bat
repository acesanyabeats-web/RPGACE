@echo off
title RPGACE — Content Intelligence
color 0A
cd /d "%USERPROFILE%\RPGACE"
echo.
echo  RPGACE Content Intelligence
echo  Paste a URL to analyse any video.
echo  Type 'watchlist' to see your saved videos.
echo.
py rpgace_intel.py %*
pause
