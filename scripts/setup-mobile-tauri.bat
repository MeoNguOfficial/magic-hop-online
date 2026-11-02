@echo off
title Setup Cyber Beat Hopper Mobile (Android & iOS via Tauri v2)
cd /d "%~dp0\.."

echo ============================================================
echo   Cyber Beat Hopper - Setup Mobile Apps (Tauri v2)
echo ============================================================
echo.

where cargo >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LUA Y] Chua tim thay Rust (Cargo) tren may.
    echo Vui long cai dat Rust tai: https://www.rust-lang.org/tools/install
    pause
    exit /b 1
)

echo [1/2] Dang khoi tao Tauri Android project...
call npx @tauri-apps/cli android init

echo.
echo [2/2] De khoi tao iOS (chi thuc hien duoc tren macOS):
echo   npx @tauri-apps/cli ios init
echo.
echo ============================================================
echo   HOAN TAT!
echo   De chay tren thiet bi Android ket noi:
echo   npm run tauri:android:dev
echo ============================================================
pause

