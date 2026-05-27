@echo off
chcp 65001 >nul
color 0B
title RepBot Pro V2.0.2 - Kurulum Asistani
mode con: cols=90 lines=30

:baslangic
cls
echo ==========================================================================================
echo.
echo    ██████╗ ███████╗██████╗ ██████╗  ██████╗ ████████╗   ██████╗ ██████╗  ██████╗ 
echo    ██╔══██╗██╔════╝██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝   ██╔══██╗██╔══██╗██╔═══██╗
echo    ██████╔╝█████╗  ██████╔╝██████╔╝██║   ██║   ██║      ██████╔╝██████╔╝██║   ██║
echo    ██╔══██╗██╔══╝  ██╔═══╝ ██╔══██╗██║   ██║   ██║      ██╔═══╝ ██╔══██╗██║   ██║
echo    ██║  ██║███████╗██║     ██████╔╝╚██████╔╝   ██║      ██║     ██║  ██║╚██████╔╝
echo    ╚═╝  ╚═╝╚══════╝╚═╝     ╚═════╝  ╚═════╝    ╚═╝      ╚═╝     ╚═╝  ╚═╝ ╚═════╝ 
echo.
echo                       Steam Rep Otomasyonu - Versiyon 2.0.2
echo ==========================================================================================
echo.
echo Sisteme hos geldiniz. Kurulum Asistani, RepBot Pro uzantisini tarayiciniza 
echo entegre etmeniz icin size rehberlik edecektir.
echo.
echo Lutfen kurulum yapmak istediginiz tarayiciyi seciniz:
echo.
echo   [1] Google Chrome
echo   [2] Microsoft Edge
echo   [3] Brave
echo   [4] Opera / Opera GX
echo.
set /p tarayici="Tarayici Seciminiz (1/2/3/4): "

if "%tarayici%"=="1" set "browser=chrome" & set "ext_url=chrome://extensions/"
if "%tarayici%"=="2" set "browser=msedge" & set "ext_url=edge://extensions/"
if "%tarayici%"=="3" set "browser=brave" & set "ext_url=brave://extensions/"
if "%tarayici%"=="4" set "browser=opera" & set "ext_url=opera://extensions/"
if not defined browser goto baslangic

:steam_kontrol
cls
echo ==========================================================================================
echo                          ADIM 1: SISTEM KIMLIK DOGRULAMASI
echo ==========================================================================================
echo.
echo Uzantinin guvenli ve dogru calisabilmesi icin %browser% tarayiciniz uzerinden 
echo Steam (steamcommunity.com) hesabiniza halihazirda giris yapmis olmaniz gerekmektedir.
echo.
echo Su anda Steam hesabiniza giris yapmis durumda misiniz?
echo.
echo   [1] Evet, giris yaptim. (Kuruluma devam et)
echo   [2] Hayir, henüz yapmadim. (Steam giris sayfasini ac)
echo.
set /p steam="Seciminiz (1/2): "

if "%steam%"=="2" (
    echo.
    echo Bilgi: Tarayicinizda Steam giris sayfasi aciliyor...
    echo Lutfen hesabiniza giris yaptiktan sonra bu ekrana donerek asistanin
    echo yonergelerini izlemeye devam ediniz.
    start https://steamcommunity.com/login/home/
    pause
    goto steam_kontrol
)
if not "%steam%"=="1" goto steam_kontrol

cls
echo ==========================================================================================
echo                          ADIM 2: UZANTI ENTEGRASYONU
echo ==========================================================================================
echo.
echo Sistem tarafindan su iki pencere otomatik olarak acilacaktir:
echo   1. %browser% Eklentiler (Extensions) Sayfasi
echo   2. RepBot Pro Kurulum Klasoru (Mavi renk ile isaretlenmis 'dist' klasoru)
echo.
echo LUTFEN ASAGIDAKI ISLEMLERI UYGULAYINIZ:
echo --------------------------------------------------------------------------------------
echo  - (Oneri: Eger tarayiciniz 'Kim kullaniyor?' diye profil secmenizi isterse,
echo    lutfen Steam'e giris yaptiginiz profilinizi seciniz.)
echo  - Tarayici sayfasinin sag ust kosesinde bulunan "Gelistirici Modu" (Developer Mode)
echo    secenegini aktif hale getiriniz.
echo  - Ekranda acilan klasor penceresindeki mavi renkli "dist" klasorunu farenizle tutup,
echo    tarayicida acilan Eklentiler sayfasinin icerisine surukleyip birakiniz.
echo --------------------------------------------------------------------------------------
echo.
echo (Entegrasyon islemi bu kadar. Ardindan bu asistani kapatabilirsiniz.)
echo.
pause

echo.
echo Pencereler hazirlaniyor, lutfen bekleyiniz...
start %browser% "%ext_url%"
timeout /t 2 >nul
explorer /select,"%~dp0dist"

echo.
echo Entegrasyon tamamlanmistir. 
echo Tarayiciniz uzerinde 'Alt + R' kisayolunu kullanarak veya uzantilar 
echo menusunden RepBot ikonuna tiklayarak arayuze ulasabilirsiniz.
pause >nul
