@echo off
title Cyber Beat Hopper - Standalone Game App
cd /d "%~dp0\.."

echo [Cyber Beat Hopper] Dang khoi dong Game App standalone (NO Electron)...

:: Kiem tra Edge/Chrome tren he thong
set EDGE_PATH=""
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" set EDGE_PATH="%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" set EDGE_PATH="%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%LocalAppData%\Microsoft\Edge\Application\msedge.exe" set EDGE_PATH="%LocalAppData%\Microsoft\Edge\Application\msedge.exe"

if %EDGE_PATH%=="" (
    if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set EDGE_PATH="%ProgramFiles%\Google\Chrome\Application\chrome.exe"
    if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set EDGE_PATH="%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
)

:: Thu muc du lieu nguoi dung co dinh (Khong bi xoa boi Disk Cleanup / Restart)
set "APP_DATA_DIR=%LOCALAPPDATA%\CyberBeatHopper\UserData"
if not exist "%APP_DATA_DIR%" mkdir "%APP_DATA_DIR%"

:: Khoi chay server cuc bo sieu nhe
start /b "" node scripts/server.js >nul 2>&1

:: Doi 1 giay de server san sang
timeout /t 1 /nobreak >nul

if not %EDGE_PATH%=="" (
    echo [Cyber Beat Hopper] Dang mo cua so game app voi Edge WebView2/App Mode...
    %EDGE_PATH% --app="http://127.0.0.1:4173" --window-size=1280,720 --user-data-dir="%APP_DATA_DIR%" --disable-features=Translate,InterestFeedContentSuggestions --enable-features=OverlayScrollbar,AudioWorkletRealtimeThread --enable-gpu-rasterization
) else (
    echo [Cyber Beat Hopper] Dang mo bang trinh duyet mac dinh...
    start http://127.0.0.1:4173
)

echo [Cyber Beat Hopper] Da dong game.
exit /b 0
