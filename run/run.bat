@echo off
rem Runs NextStep on http://localhost:3000 using the hosted Supabase project in .env.local
rem Double-click this file, or run it from any folder. It always works from the project root.
cd /d "%~dp0.."
node run/run.mjs hosted
pause
