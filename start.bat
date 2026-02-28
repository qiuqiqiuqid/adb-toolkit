@echo off
cd /d "%~dp0"

set PATH=C:\Program Files\nodejs;%PATH%
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/

echo Installing dependencies...
call npm install

echo Starting ADB Toolbox...
call npm start
