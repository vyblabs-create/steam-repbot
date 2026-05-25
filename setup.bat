@echo off
setlocal EnableDelayedExpansion

:: ============================================================
::  STEAM REPBOT PRO - KURULUM SIHIRBAZI v9
::  GitHub: https://github.com/
:: ============================================================

cls
echo.
echo  ==========================================================
echo   STEAM REPBOT PRO - KURULUM
echo   v9.0
echo  ==========================================================
echo.
echo  Bu sihirbaz sizi yaklasik 60 saniyede bota hazir hale getirir.
echo.
echo  ----------------------------------------------------------
echo.

:: ============================================================
::  ADIM 1: Steam Profil URL'si
:: ============================================================
echo  [1/4]  Steam profil linkinizi girin:
echo.
echo         Ornek 1:  https://steamcommunity.com/id/kullaniciadiniz
echo         Ornek 2:  https://steamcommunity.com/profiles/76561198XXXXXXXXX
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

:: URL'deki bosluklari tamamen sil
set "PROFILE_URL=!PROFILE_URL: =!"
:: Sondaki / varsa temizle
if "!PROFILE_URL:~-1!"=="/" set "PROFILE_URL=!PROFILE_URL:~0,-1!"

:: ============================================================
::  ADIM 2: Profil ID'yi URL'den otomatik cek
:: ============================================================
echo.
echo  [2/4]  Profil ID'niz tespit ediliyor...

set "PROFILE_ID=UNKNOWN"
set "TEMP_URL=!PROFILE_URL!"
set "TEMP_URL=!TEMP_URL:https://steamcommunity.com/id/=!"
set "TEMP_URL=!TEMP_URL:https://steamcommunity.com/profiles/=!"

if not "!TEMP_URL!"=="!PROFILE_URL!" (
    set "PROFILE_ID=!TEMP_URL!"
)

if "!PROFILE_ID!"=="UNKNOWN" (
    echo.
    echo  [UYARI] Profil ID otomatik tespit edilemedi.
    set /p "PROFILE_ID=  > Profil ID'nizi manuel girin: "
)
:: Profil ID'deki olasi bosluklari da sil
set "PROFILE_ID=!PROFILE_ID: =!"

echo.
echo         -  Profil URL  : !PROFILE_URL!
echo         -  Profil ID   : !PROFILE_ID!
echo.

:: ============================================================
::  ADIM 3: 2_config.js icindeki placeholder'lari doldur
:: ============================================================
echo  [3/4]  Ayarlar yapilandiriliyor...

powershell -NoProfile -Command "(Get-Content 'src\2_config.js' -Raw) -replace '__DASHBOARD_URL__', '!PROFILE_URL!' -replace '__PROFILE_ID__', '!PROFILE_ID!' | Set-Content 'src\2_config.js' -Encoding UTF8"

if errorlevel 1 (
    echo.
    echo  [HATA] Ayarlar yazilamadi. Klasor izinlerini kontrol edin.
    pause
    exit /b 1
)

echo         -  Konfigurasyon guncellendi.
echo.

:: ============================================================
::  Derleme (build.bat cagir)
:: ============================================================
call build.bat

if not exist "RepBot.user.js" (
    echo.
    echo  [HATA] RepBot.user.js olusturulamadi.
    pause
    exit /b 1
)

:: ============================================================
::  ADIM 4: Tampermonkey'e Otomatik Yukleme
:: ============================================================
echo  [4/4]  Tarayici tespit ediliyor...
echo.

set "SCRIPT_PATH=%cd%\RepBot.user.js"
set "BROWSER_FOUND=0"

:: Chrome (Oncelik 1)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
    set "BROWSER_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"
    set "BROWSER_NAME=Google Chrome"
    set "BROWSER_FOUND=1"
    goto :open_browser
)

:: Brave (Oncelik 2)
if exist "%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    set "BROWSER_EXE=%LocalAppData%\BraveSoftware\Brave-Browser\Application\brave.exe"
    set "BROWSER_NAME=Brave"
    set "BROWSER_FOUND=1"
    goto :open_browser
)

:: Firefox (Oncelik 3)
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

:: Edge (Son Care - yerel dosyalara izin vermez!)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    set "BROWSER_FOUND=2"
    goto :open_browser
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    set "BROWSER_EXE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
    set "BROWSER_NAME=Microsoft Edge"
    set "BROWSER_FOUND=2"
    goto :open_browser
)

:open_browser
if "!BROWSER_FOUND!"=="1" (
    echo         -  !BROWSER_NAME! bulundu.
    echo.
    echo  Tampermonkey kurulum penceresi aciliyor...
    echo  [Tampermonkey yukluyse] "Yukle" butonuna tiklayin.
    echo.
    start "" "!BROWSER_EXE!" --allow-file-access-from-files "file:///!SCRIPT_PATH:\=/!"
) else if "!BROWSER_FOUND!"=="2" (
    echo         -  Microsoft Edge bulundu (sinirli destek).
    echo.
    echo  [UYARI] Edge yerel dosyalari yuklemeyi engelleyebilir.
    echo  Edge aciliyor, 'Uzanti' uyarisini gorurseniz;
    echo  Tampermonkey eklentisini Edge'e yukleyip tekrar deneyin.
    echo.
    start "" "!BROWSER_EXE!" --allow-file-access-from-files "file:///!SCRIPT_PATH:\=/!"
) else (
    echo.
    echo  [UYARI] Desteklenen tarayici bulunamadi.
    echo  Lutfen 'RepBot.user.js' dosyasini tarayiciniza manuel surukleyin.
    echo.
    explorer .
)

:: ============================================================
::  TAMAMLANDI
:: ============================================================
echo.
echo  ==========================================================
echo   KURULUM BASARIYLA TAMAMLANDI
echo  ==========================================================
echo.
echo   Profil  : !PROFILE_URL!
echo.
echo   Sonraki adimlar:
echo    1. Acilan tarayicida 'Yukle' butonuna tiklayin
echo    2. Steam profilinize gidin (F5 ile sayfayi yenileyin)
echo    3. Sol ustteki REP KONTROL MERKEZI butonuna tiklayin
echo    4. 'Profil Botunu Baslat' ile sistemi calistirin
echo.
echo   Ayarlarinizi degistirmek isterseniz:
echo    - Paneldeki Ayarlar sekmesini kullanin
echo    - Ya da setup.bat'i yeniden calistirin
echo.
echo  ==========================================================
echo.
pause
endlocal
