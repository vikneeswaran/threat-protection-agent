@echo off
setlocal

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall-kuamini-windows.ps1"
exit /b %ERRORLEVEL%