@echo off
rem filepath: c:\Users\nawaz\NextStep\run\run.bat
setlocal
cd /d "%~dp0.."

where node >nul 2>&1
if errorlevel 1 goto node_missing

node run\run.mjs hosted
set "exit_code=%errorlevel%"
pause
exit /b %exit_code%

:node_missing
echo ERROR: Node.js was not found in PATH.
echo Install Node.js from https://nodejs.org/
pause
exit /b 1