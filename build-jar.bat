@echo off
setlocal

set ROOT=%~dp0
set DIST=%ROOT%dist
set CLASSES=%DIST%\classes

if not exist "%DIST%" mkdir "%DIST%"
if not exist "%CLASSES%" mkdir "%CLASSES%"

javac -d "%CLASSES%" "%ROOT%tools\Launcher.java"
if errorlevel 1 exit /b 1

jar --create --file "%DIST%\sorter64.jar" --main-class Launcher -C "%CLASSES%" .
if errorlevel 1 exit /b 1

powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT%tools\patch-dist-launchers.ps1"
if errorlevel 1 exit /b 1

echo Built %DIST%\sorter64.jar
echo Wrote %DIST%\run.bat and %DIST%\run-cli.bat
