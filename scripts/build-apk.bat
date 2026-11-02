@echo off
title Build Cyber Beat Hopper - Android APK
cd /d "%~dp0\.."

echo ========================================================
echo  Cyber Beat Hopper - One-Click Android APK Builder
echo ========================================================
echo.

:: 1. Chuan bi tai nguyen Web www/
echo [1/4] Dang dong goi tai nguyen web vao www/ ...
call node scripts/prepare-www.js
if %errorlevel% neq 0 (
    echo [LOI] Khong the chuan bi thu muc www!
    pause
    exit /b %errorlevel%
)

:: 2. Dong bo tai nguyen vao Android assets
echo [2/4] Dang dong bo tai nguyen vao Android assets ...
xcopy /e /i /y "www\*" "android\app\src\main\assets\public\" >nul

:: 3. Thiet lap moi truong SDK & JDK
echo [3/4] Dang thiet lap Android SDK va JDK ...
set "JAVA_HOME=C:\Users\meong\.gradle\jdks\eclipse_adoptium-21-amd64-windows.2"
set "ANDROID_HOME=D:\Android\Sdk"

:: 4. Bien dich bang Gradle
echo [4/4] Dang bien dich APK (Gradle assembleDebug) ...
cd android
call .\gradlew.bat assembleDebug
if %errorlevel% neq 0 (
    echo.
    echo [LOI] Bien dich APK that bai!
    cd ..
    pause
    exit /b %errorlevel%
)
cd ..

:: 5. Sao chep APK ra thu muc dist-apk
if not exist "dist-apk" mkdir "dist-apk"
copy /y "android\app\build\outputs\apk\debug\app-debug.apk" "dist-apk\CyberBeatHopper.apk" >nul

echo.
echo ========================================================
echo  BUILD APK THANH CONG!
echo  Duong dan file: dist-apk\CyberBeatHopper.apk
echo ========================================================
echo.
echo Ban co the keo tha file nay vao LDPlayer 14 de test ngay!
pause
exit /b 0

