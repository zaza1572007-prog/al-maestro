@echo off
echo =============================================
echo   Al-Maestro DB Migration - npx prisma db push
echo =============================================
cd /d "%~dp0"
npx prisma db push --accept-data-loss
if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS: Database schema synced successfully!
    echo Parent.password and WhatsApp fields are now live.
) else (
    echo.
    echo ERROR: prisma db push failed. Check your DATABASE_URL in .env
)
echo.
pause
