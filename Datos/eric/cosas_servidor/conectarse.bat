@echo off
title Iniciando sesión como Rebeca...

REM Esperar red disponible
:esperar_red
ping -n 2 192.168.0.3 >nul
if errorlevel 1 (
    echo 🔄 Esperando conexión con el servidor...
    timeout /t 2 >nul
    goto esperar_red
)

REM Ejecutar el RDP
start "" mstsc "%~dp0conectarse.rdp"
