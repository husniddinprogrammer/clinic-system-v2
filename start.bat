@echo off
chcp 65001 >nul
title Klinika Boshqaruvi Tizimi

echo ========================================
echo   Klinika Boshqaruvi Tizimi
echo ========================================
echo.

REM PostgreSQL ni tekshirish va ishga tushirish
echo [1/2] PostgreSQL tekshirilmoqda...
"C:\Program Files\PostgreSQL\16\bin\pg_isready.exe" -h localhost -p 5432 >nul 2>&1
if %errorlevel% neq 0 (
    echo     PostgreSQL ishga tushirilmoqda...
    start "PostgreSQL" /min "C:\Program Files\PostgreSQL\16\bin\postgres.exe" -D "C:\Program Files\PostgreSQL\16\data" -h localhost
    timeout /t 3 /nobreak >nul
) else (
    echo     PostgreSQL allaqachon ishlamoqda.
)

REM Next.js ni ishga tushirish
echo [2/2] Next.js server ishga tushirilmoqda...
echo.
echo Brauzerda oching: http://localhost:3000
echo Login: admin / admin123
echo.
echo To'xtatish uchun Ctrl+C bosing.
echo ----------------------------------------

npm run start
