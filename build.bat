@echo off
chcp 65001 >nul 2>&1
setlocal

set "OUTPUT=RepBot.user.js"
set "SRC_DIR=src"

echo.
echo  =============================================
echo   RepBot - Modul Birlestirici
echo  =============================================
echo.

if exist "%OUTPUT%" del "%OUTPUT%"

for %%F in (%SRC_DIR%\1_header.js %SRC_DIR%\2_config.js %SRC_DIR%\3_utils.js %SRC_DIR%\4_ui.js %SRC_DIR%\5_engine.js %SRC_DIR%\6_workers.js %SRC_DIR%\7_main.js) do (
    echo   + %%F ekleniyor...
    type "%%F" >> "%OUTPUT%"
    echo. >> "%OUTPUT%"
)

echo.
echo  [OK] Derleme tamamlandi: %OUTPUT%
echo.
endlocal
