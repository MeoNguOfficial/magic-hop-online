@echo off
title Build Cyber Beat Hopper - PC Standalone App
cd /d "%~dp0\.."

echo ========================================================
echo  Cyber Beat Hopper - PC Standalone App Builder (No Electron)
echo ========================================================
echo.

:: 1. Chuan bi tai nguyen Web www/
echo [1/3] Dang dong goi tai nguyen web vao www/ ...
call node scripts/prepare-www.js
if %errorlevel% neq 0 (
    echo [LOI] Khong the chuan bi thu muc www!
    pause
    exit /b %errorlevel%
)

:: 2. Bien dich trinh khoi chay C# CyberBeatHopper.exe
echo [2/3] Dang bien dich CyberBeatHopper.exe bang C# Compiler ...
if not exist "dist-pc" mkdir "dist-pc"
"C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /target:winexe /win32icon:"src-pc\app.ico" /optimize+ /out:"dist-pc\CyberBeatHopper.exe" "src-pc\Program.cs"
if %errorlevel% neq 0 (
    echo [LOI] Bien dich CyberBeatHopper.exe that bai!
    pause
    exit /b %errorlevel%
)

:: 3. Dong bo tai nguyen vao dist-pc/www/
echo [3/3] Dang dong bo dist-pc\www\ ...
if not exist "dist-pc\www" mkdir "dist-pc\www"
xcopy /e /i /y "www\*" "dist-pc\www\" >nul

echo.
echo ========================================================
echo  BUILD PC APP THANH CONG!
echo  Thu muc xuat ban: dist-pc\
echo  File chay: dist-pc\CyberBeatHopper.exe
echo ========================================================
pause
exit /b 0

