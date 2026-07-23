@echo off
title TingTing - App Quan Ly Chi Tieu Nhom
color 0A
echo ========================================================
echo               DANG KHOI CHAY TINGTING APP               
echo ========================================================
echo.

:: 1. Chuyen den thu muc Backend va khoi chay Server
echo [1/3] Dang khoi chay Backend Server (Port 3000)...
start "TingTing Backend (Port 3000)" cmd /k "cd /d d:\ADMIN\TingTing && npm run dev"

:: 2. Chuyen den thu muc Frontend va khoi chay Vite Dev Server
echo [2/3] Dang khoi chay Frontend Server (Port 5173)...
start "TingTing Frontend (Port 5173)" cmd /k "cd /d d:\ADMIN\TingTing\FE && npm run dev"

:: 3. Cho server khoi dong & Mo Trinh Duyet
echo [3/3] Dang dang ky khoi dong & mo trinh duyet web...
timeout /t 3 /nobreak >nul
start http://localhost:5173

echo.
echo ========================================================
echo   TingTing da duoc khoi chay thanh cong!
echo   - Backend API: http://localhost:3000
echo   - Frontend UI:  http://localhost:5173
echo ========================================================
echo.
pause
