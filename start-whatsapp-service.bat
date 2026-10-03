@echo off
chcp 65001 > nul
title Al Maestro WhatsApp Service - Mr. Ahmed Rady Kahla

echo ======================================================
echo    Al Maestro Platform - WhatsApp Service
echo ======================================================
echo.
echo Starting WhatsApp Service & Secure Tunnel...
echo Keep this window open during your tutoring sessions.
echo.

npm run whatsapp:service

pause
