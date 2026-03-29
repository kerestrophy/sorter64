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
