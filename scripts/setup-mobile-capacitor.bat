@echo off
title Setup Cyber Beat Hopper Mobile (Android & iOS via Capacitor)
cd /d "%~dp0\.."

echo ============================================================
echo   Cyber Beat Hopper - Setup Mobile Apps (Capacitor)
echo   Ho tro xuat: Android (APK/AAB) va iOS (IPA/Xcode)
echo ============================================================
echo.

echo [1/3] Dang cai dat cac thu vien Capacitor core va mobile plugins...
call npm install --save-dev @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios @capacitor/status-bar @capacitor/screen-orientation @capacitor/haptics @capacitor/app

if %ERRORLEVEL% neq 0 (
    echo [LOI] Khong the cai dat cac goi npm Capacitor. Vui long kiem tra ket noi mang.
    pause
    exit /b 1
)

echo.
echo [2/3] Dang khoi tao platform Android...
call npx cap add android

echo.
echo [3/3] Dang khoi tao platform iOS...
call npx cap add ios

echo.
echo ============================================================
echo   DONG BO DU LIEU WEB VAO PROJECT MOBILE...
echo ============================================================
call npx cap sync

echo.
echo ============================================================
echo   HOAN TAT KHOI TAO MOBILE APP!
echo ============================================================
echo   1. De mo Android Studio va build APK/AAB:
echo      chay lenh: npm run cap:open:android
echo.
echo   2. De mo Xcode va build iOS IPA (tren macOS):
echo      chay lenh: npm run cap:open:ios
echo.
echo   3. Sau moi lan sua code game, dong bo lai bang:
echo      npm run cap:sync
echo ============================================================
pause

