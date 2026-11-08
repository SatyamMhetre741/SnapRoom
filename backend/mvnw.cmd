@echo off
set CURRENT_DIR=%~dp0
"%CURRENT_DIR%SnapRoom\SnapRoom\mvnw.cmd" -f "%CURRENT_DIR%SnapRoom\SnapRoom\pom.xml" %*

