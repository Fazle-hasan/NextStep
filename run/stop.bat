@echo off
rem Stops the NextStep dev server and the local Supabase stack
rem Double-click this file, or run it from any folder. It always works from the project root.
cd /d "%~dp0.."
node run/run.mjs stop
pause
