@echo off
chcp 65001 >nul
color 0A
title RepBot Pro - Release Olusturucu
echo ===================================================
echo RepBot Pro - Otomatik Release (Sürüm) Olusturucu
echo ===================================================
echo.
echo 1. Proje derleniyor (npm run build)...
call npm run build
echo.

echo 2. Eski release dosyalari temizleniyor...
if exist "RepBot_Release" rmdir /s /q "RepBot_Release"
if exist "RepBot_Pro_Release.zip" del /f /q "RepBot_Pro_Release.zip"

echo 3. Yeni klasor yapisi olusturuluyor...
mkdir "RepBot_Release"
xcopy "dist" "RepBot_Release\dist\" /s /e /y >nul
copy "kurulum.bat" "RepBot_Release\" >nul
copy "README.md" "RepBot_Release\OKUBENI.txt" >nul

echo 4. ZIP dosyasi sikistiriliyor (Lutfen bekleyin)...
powershell -Command "Compress-Archive -Path 'RepBot_Release\*' -DestinationPath 'RepBot_Pro_Release.zip' -Force"

echo 5. Gecici dosyalar temizleniyor...
rmdir /s /q "RepBot_Release"

echo.
echo ===================================================
echo ISLEM TAMAMLANDI! 
echo ===================================================
echo Proje dizininde "RepBot_Pro_Release.zip" dosyasi olusturuldu.
echo GitHub Releases kismine SADECE bu ZIP dosyasini yuklemelisiniz.
echo Kullanicilar bu ZIP'i indirdiginde kaynak kodlarini gormeyecek,
echo sadece kurulum dosyalariyla karsilasacaktir.
echo.
pause
