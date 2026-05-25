@echo off
chcp 65001 >nul 2>&1
setlocal EnableDelayedExpansion

:: ============================================================
::  STEAM REPBOT PRO - KURULUM SİHİRBAZI v9
::  GitHub: https://github.com/
:: ============================================================

cls
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║          🎯  STEAM REPBOT PRO  -  KURULUM               ║
echo  ║                          v9.0                           ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
echo  Bu sihirbaz sizi yaklaşık 60 saniyede bota hazır hale getirir.
echo  Herhangi bir adımı atlamak için ENTER'a basabilirsiniz.
echo.
echo  ──────────────────────────────────────────────────────────
echo.

:: ============================================================
::  ADIM 1: Steam Profil URL'si
:: ============================================================
echo  [1/4]  Steam profil linkinizi girin:
echo.
echo         Örnek 1:  https://steamcommunity.com/id/kullaniciadiniz
echo         Örnek 2:  https://steamcommunity.com/profiles/76561198XXXXXXXXX
echo.
set /p "PROFILE_URL=  > Profil URL: "

if "!PROFILE_URL!"=="" (
    echo.
    echo  [HATA] Profil URL'si bos birakilamaz.
    echo         Lutfen setup.bat'i yeniden calistirin.
    echo.
    pause
    exit /b 1
)

:: Sondaki / varsa temizle
if "!PROFILE_URL:~-1!"=="/" set "PROFILE_URL=!PROFILE_URL:~0,-1!"

:: ============================================================
::  ADIM 2: Profil ID'yi URL'den otomatik çek (PowerShell)
:: ============================================================
echo.
echo  [2/4]  Profil ID'niz tespit ediliyor...

for /f "delims=" %%I in ('powershell -NoProfile -Command ^
    "$url = '!PROFILE_URL!'; ^
     if ($url -match '/id/([^/?]+)') { $matches[1] } ^
     elseif ($url -match '/profiles/([^/?]+)') { $matches[1] } ^
     else { 'UNKNOWN' }"') do set "PROFILE_ID=%%I"

if "!PROFILE_ID!"=="UNKNOWN" (
    echo.
    echo  [UYARI] Profil ID otomatik tespit edilemedi.
    set /p "PROFILE_ID=  > Profil ID'nizi manuel girin: "
)

echo.
echo         ✔  Profil URL  : !PROFILE_URL!
echo         ✔  Profil ID   : !PROFILE_ID!
echo.

:: ============================================================
::  ADIM 3: 2_config.js içindeki placeholder'ları doldur
:: ============================================================
echo  [3/4]  Ayarlar yapılandırılıyor...

powershell -NoProfile -Command ^
    "(Get-Content 'src\2_config.js' -Raw) ^
     -replace '__DASHBOARD_URL__', '!PROFILE_URL!' ^
     -replace '__PROFILE_ID__',    '!PROFILE_ID!' ^
     | Set-Content 'src\2_config.js' -Encoding UTF8"

if errorlevel 1 (
    echo.
    echo  [HATA] Ayarlar yazilamadi. Klasor izinlerini kontrol edin.
    pause
    exit /b 1
)

echo         ✔  Konfigürasyon güncellendi.
echo.

:: ============================================================
::  Derleme (build.bat çağır)
:: ============================================================
call build.bat

if not exist "RepBot.user.js" (
    echo.
    echo  [HATA] RepBot.user.js olusturulamadi.
    pause
    exit /b 1
)

:: ============================================================
::  ADIM 4: Tampermonkey'e Otomatik Yükleme
:: ============================================================
echo  [4/4]  Tarayıcı tespit ediliyor...
echo.

set "SCRIPT_PATH=%cd%\RepBot.user.js"
set "BROWSER_FOUND=0"

:: Chrome
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome"
    set "BROWSER_FOUND=1"
    goto :open_browser
)

:: Edge
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    set "BROWSER_FOUND=1"
    goto :open_browser
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    set "BROWSER_FOUND=1"
    goto :open_browser
)

:: Firefox
if exist "%ProgramFiles%\Mozilla Firefox\firefox.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Mozilla Firefox\firefox.exe"
    set "BROWSER_NAME=Mozilla Firefox"
    set "BROWSER_FOUND=1"
    goto :open_browser
)
if exist "%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe"
    set "BROWSER_NAME=Mozilla Firefox"
    set "BROWSER_FOUND=1"
    goto :open_browser
)

:: Brave
if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BROWSER_EXE=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"
    set "BROWSER_NAME=Brave"
    set "BROWSER_FOUND=1"
    goto :open_browser
)

:open_browser
if "!BROWSER_FOUND!"=="1" (
    echo         ✔  !BROWSER_NAME! bulundu.
    echo.
    echo  Tampermonkey kurulum penceresi açılıyor...
    echo  [Tampermonkey yüklüyse] "Yükle" butonuna tıklayın.
    echo.
    start "" "!BROWSER_EXE!" "file:///!SCRIPT_PATH:\=/!"
) else (
    echo.
    echo  [UYARI] Desteklenen tarayıcı bulunamadı.
    echo  Lütfen 'RepBot.user.js' dosyasını tarayıcınıza manuel sürükleyin.
    echo.
    explorer .
)

:: ============================================================
::  TAMAMLANDI
:: ============================================================
echo.
echo  ╔══════════════════════════════════════════════════════════╗
echo  ║                                                          ║
echo  ║   ✅  KURULUM BAŞARIYLA TAMAMLANDI                      ║
echo  ║                                                          ║
echo  ║   Profil  : !PROFILE_URL!
echo  ║                                                          ║
echo  ║   Sonraki adımlar:                                       ║
echo  ║    1. Açılan tarayıcıda 'Yükle' butonuna tıklayın       ║
echo  ║    2. Steam profilinize gidin (F5 ile sayfayı yenile)   ║
echo  ║    3. Sol üstteki 🎯 butona tıklayın                    ║
echo  ║    4. 'Profil Botunu Başlat' ile sistemi çalıştırın     ║
echo  ║                                                          ║
echo  ║   Ayarlarınızı değiştirmek isterseniz:                  ║
echo  ║    - Paneldeki ⚙️ Ayarlar sekmesini kullanın            ║
echo  ║    - Ya da setup.bat'ı yeniden çalıştırın               ║
echo  ║                                                          ║
echo  ╚══════════════════════════════════════════════════════════╝
echo.
pause
endlocal
