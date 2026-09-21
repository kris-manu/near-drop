```bat
@echo off
title NearDrop

echo.
echo ========================================
echo             NearDrop
echo       Local File Sharing
echo ========================================
echo.

cd /d C:\Users\manu\near-drop

echo Starting NearDrop server...
echo.

start "" cmd /c "npm start"

timeout /t 2 /nobreak >nul

echo Opening NearDrop...
start "" http://localhost:3000

echo.
echo NearDrop is running.
echo.
echo Keep this window open while using NearDrop.
echo.

pause
```
