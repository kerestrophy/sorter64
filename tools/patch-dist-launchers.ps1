$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$dist = Join-Path $root "dist"

if (-not (Test-Path $dist)) {
  New-Item -Path $dist -ItemType Directory | Out-Null
}

$runBatPath = Join-Path $dist "run.bat"
$runCliBatPath = Join-Path $dist "run-cli.bat"

$runBat = @'
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
'@

$runCliBat = @'
@echo off
setlocal EnableExtensions
set ROOT=%~dp0
set JAR=%ROOT%sorter64.jar
if not exist "%JAR%" (
  echo sorter64 jar not found. Run build-jar.bat first.
  exit /b 2
)
java -jar "%JAR%" %*
exit /b %errorlevel%
'@

Set-Content -Path $runBatPath -Value $runBat -Encoding ASCII
Set-Content -Path $runCliBatPath -Value $runCliBat -Encoding ASCII

Write-Host "Patched dist launchers: run.bat, run-cli.bat"
