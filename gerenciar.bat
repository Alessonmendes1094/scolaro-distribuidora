@echo off
setlocal enabledelayedexpansion
chcp 65001 >nul
title Scolaro Distribuidora - Gerenciador
cd /d "%~dp0"

:MENU
cls
echo ============================================
echo   SCOLARO DISTRIBUIDORA - GERENCIADOR
echo ============================================
echo.
echo   1. Instalar (dependencias + banco de dados)
echo   2. Iniciar aplicacao
echo   3. Parar aplicacao
echo   4. Reiniciar aplicacao
echo   5. Sair
echo.
set /p opcao="Escolha uma opcao: "

if "%opcao%"=="1" goto INSTALAR
if "%opcao%"=="2" goto INICIAR
if "%opcao%"=="3" goto PARAR
if "%opcao%"=="4" goto REINICIAR
if "%opcao%"=="5" goto FIM

echo Opcao invalida.
pause
goto MENU

:INSTALAR
cls
echo ============================================
echo   INSTALANDO DEPENDENCIAS
echo ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
    echo [ERRO] Node.js nao encontrado. Instale em https://nodejs.org antes de continuar.
    pause
    goto MENU
)

if not exist "backend\.env" (
    echo Criando backend\.env a partir do .env.example...
    copy "backend\.env.example" "backend\.env" >nul
    echo.
    echo [ATENCAO] Edite o arquivo backend\.env e ajuste a DATABASE_URL
    echo           para apontar para o seu PostgreSQL antes de continuar.
    echo.
    pause
)

if not exist "frontend\.env" (
    echo Criando frontend\.env a partir do .env.example...
    copy "frontend\.env.example" "frontend\.env" >nul
)

echo.
echo -- Instalando dependencias do backend --
cd backend
call npm install
if errorlevel 1 (
    echo [ERRO] Falha ao instalar dependencias do backend.
    cd /d "%~dp0"
    pause
    goto MENU
)

echo.
echo -- Gerando client Prisma --
call npx prisma generate

echo.
echo -- Rodando migrations no banco de dados --
call npx prisma migrate deploy
if errorlevel 1 (
    echo [ERRO] Falha ao rodar migrations. Verifique se o PostgreSQL esta
    echo        rodando e se a DATABASE_URL em backend\.env esta correta.
    cd /d "%~dp0"
    pause
    goto MENU
)

echo.
echo -- Rodando seed (usuario admin) --
call npm run seed

cd /d "%~dp0"

echo.
echo -- Instalando dependencias do frontend --
cd frontend
call npm install
cd /d "%~dp0"

echo.
echo ============================================
echo   INSTALACAO CONCLUIDA COM SUCESSO
echo ============================================
pause
goto MENU

:INICIAR
cls
echo ============================================
echo   INICIANDO APLICACAO
echo ============================================
echo.

tasklist /FI "WINDOWTITLE eq ScolaroBackend*" 2>nul | find "cmd.exe" >nul
if not errorlevel 1 (
    echo Backend ja esta em execucao.
) else (
    echo Iniciando backend na porta 3333...
    start "ScolaroBackend" cmd /k "cd /d "%~dp0backend" && npm start"
)

timeout /t 2 >nul

tasklist /FI "WINDOWTITLE eq ScolaroFrontend*" 2>nul | find "cmd.exe" >nul
if not errorlevel 1 (
    echo Frontend ja esta em execucao.
) else (
    echo Iniciando frontend na porta 5173...
    start "ScolaroFrontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"
)

echo.
echo Aplicacao iniciada:
echo   Backend:  http://localhost:3333
echo   Frontend: http://localhost:5173
echo.
pause
goto MENU

:PARAR
cls
echo ============================================
echo   PARANDO APLICACAO
echo ============================================
echo.

taskkill /FI "WINDOWTITLE eq ScolaroBackend*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq ScolaroFrontend*" /T /F >nul 2>nul

echo Aplicacao parada.
echo.
pause
goto MENU

:REINICIAR
cls
echo ============================================
echo   REINICIANDO APLICACAO
echo ============================================
echo.

taskkill /FI "WINDOWTITLE eq ScolaroBackend*" /T /F >nul 2>nul
taskkill /FI "WINDOWTITLE eq ScolaroFrontend*" /T /F >nul 2>nul

timeout /t 2 >nul

echo Iniciando backend na porta 3333...
start "ScolaroBackend" cmd /k "cd /d "%~dp0backend" && npm start"

timeout /t 2 >nul

echo Iniciando frontend na porta 5173...
start "ScolaroFrontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo Aplicacao reiniciada.
echo.
pause
goto MENU

:FIM
endlocal
exit /b 0
