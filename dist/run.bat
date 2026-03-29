@echo off
setlocal EnableExtensions

set ROOT=%~dp0
set GUI=%ROOT%..\gui\sorter64-gui.ps1
set CLI=%ROOT%run-cli.bat

REM --- GUI path: NO arguments ---
if "%~1"=="" goto GUI

REM --- CLI path ---
call "%CLI%" %*
exit /b %errorlevel%

:GUI
powershell -NoProfile -ExecutionPolicy Bypass -File "%GUI%"
exit /b %errorlevel%
