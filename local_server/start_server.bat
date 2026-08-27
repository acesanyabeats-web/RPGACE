@echo off
title RPGACE — Intel Server (keep open)
color 0A
cd /d "%USERPROFILE%\RPGACE"
echo.
echo  RPGACE Local Intel Server
echo  Keep this window open while using RPGACE.
echo  RPGACE will fetch reports automatically.
echo.
py local_server.py
pause
