@echo off
title Build Cyber Beat Hopper Native App (Tauri v2 - NO Electron)
cd /d "%~dp0\.."

echo ============================================================
echo   Cyber Beat Hopper - Build Native Desktop App (Tauri v2)
echo ============================================================
echo.

where cargo >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [LUA Y] Chua tim thay Rust compiler (Cargo) tren he thong.
    echo De build file .exe voi Tauri v2:
    echo 1. Cai dat Rust tai: https://www.rust-lang.org/tools/install
    echo 2. Chay lai tap tin nay.
    echo.
    echo Nhan phim bat ky de thoat...
    pause >nul
    exit /b 1
)

echo [1/2] Dang chuan bi goi CLI Tauri...
call npx --yes @tauri-apps/cli build

if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================================
    echo   BUILD THANH CONG!
    echo   File .exe va installer da duoc tao trong thu muc:
    echo   src-tauri\target\release\
    echo ============================================================
) else (
    echo.
    echo [LOI] Qua trinh build khong thanh cong. Vui long kiem tra log o tren.
)

pause

