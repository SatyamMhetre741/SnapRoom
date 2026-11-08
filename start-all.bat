@echo off
echo Starting all SnapRoom services...
powershell -ExecutionPolicy Bypass -File "%~dp0scripts\start-all.ps1"
pause

