@echo off
color 0B
title RepBot Pro V3 - Otomatik Kurulum Sihirbazi
mode con: cols=85 lines=28

:baslangic
cls
echo =====================================================================================
echo.
echo    ██████╗ ███████╗██████╗ ██████╗  ██████╗ ████████╗   ██████╗ ██████╗  ██████╗ 
echo    ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝   ██╔══██╗██╔══██╗██╔═══██╗
echo    ██████╔╝█████╗  ██████╔╝██████╔╝██║   ██║   ██║      ██████╔╝██████╔╝██║   ██║
echo    ██╔══██╗██╔══╝  ██╔═══╝ ██╔══██╗██║   ██║   ██║      ██╔═══╝ ██╔══██╗██║   ██║
echo    ██║  ██║███████╗██║     ██████╔╝╚██████╔╝   ██║      ██║     ██║  ██║╚██████╔╝
echo    ╚═╝  ╚═╝╚══════╝╚═╝     ╚═════╝  ╚═════╝    ╚═╝      ╚═╝     ╚═╝  ╚═╝ ╚═════╝ 
echo.
echo                      Steam Takas Otomasyonu - Versiyon 3.0
echo =====================================================================================
echo.
echo Merhaba! RepBot Pro kurulum sihirbazina hos geldin.
echo Sana kurulumda adim adim yardimci olacagim.
echo.
echo Lutfen eklentiyi kurmak istediginiz tarayiciyi secin:
echo [1] Google Chrome
echo [2] Microsoft Edge
echo [3] Brave
echo [4] Opera
echo.
set /p tarayici="Seciminiz (1/2/3/4): "

if "%tarayici%"=="1" set "browser=chrome" & set "ext_url=chrome://extensions/"
if "%tarayici%"=="2" set "browser=msedge" & set "ext_url=edge://extensions/"
if "%tarayici%"=="3" set "browser=brave" & set "ext_url=brave://extensions/"
if "%tarayici%"=="4" set "browser=opera" & set "ext_url=opera://extensions/"
if not defined browser goto baslangic

:steam_kontrol
cls
echo =====================================================================================
echo.
echo %browser% tarayicinizda Steam (steamcommunity.com) uzerinde 
echo oturum actiginizdan emin olun. 
echo.
echo Eger oturumunuz acik degilse eklenti calisirken kimliginizi algilayamaz.
echo.
set /p steam="Steam'e giris yaptiniz mi? (E / H): "

if /i "%steam%"=="H" (
    echo.
    echo Lutfen once tarayicidan Steam'e giris yapin, ardindan bu ekrana donup devam edin.
    start https://steamcommunity.com/login/home/
    pause
    goto steam_kontrol
)

cls
echo =====================================================================================
echo                      SON ADIM: SURUKLE VE BIRAK
echo =====================================================================================
echo.
echo Simdi sihirbaz otomatik olarak su iki pencereyi acacak:
echo 1. %browser% Eklentiler Sayfasi
echo 2. Kurulum Klasoru (Mavi ile secili olan "dist" klasoru)
echo.
echo YAPMANIZ GEREKENLER:
echo --------------------
echo Adim 1: Tarayicida sag ustten "Gelistirici Modu" (Developer Mode) acin.
echo Adim 2: Acilan mavi secili [dist] klasorunu farenizle tutup, 
echo         tarayicinin icine SURUKLEYIN ve BIRAKIN!
echo.
echo (Kurulum bu kadar! Sonrasinda bu siyah pencereyi kapatabilirsiniz.)
echo.
pause

echo.
echo Pencereler aciliyor, lutfen bekleyin...
start %browser% "%ext_url%"
timeout /t 2 >nul
explorer /select,"%~dp0dist"

echo.
echo Tebrikler! Eklenti tarayiciya eklendi.
echo Tarayicida Alt + R tuslarina basarak RepBot'u acabilirsiniz.
pause >nul
