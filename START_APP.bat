@echo off
TITLE Transworld Courier Billing System
COLOR 0B
echo.
echo ===================================================
echo     TRANSWORLD COURIER BILLING SYSTEM
echo ===================================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/ to run this app.
    pause
    exit /b
)

:: Check if dependencies are installed, if not, install them
if not exist node_modules (
    echo [INFO] First-time setup: Installing required components...
    echo (This may take a minute, please wait...)
    call npm install --no-audit --no-fund
    if %errorlevel% neq 0 (
        echo [ERROR] Installation failed. Check your internet connection.
        pause
        exit /b
    )
    echo [SUCCESS] Setup complete!
)

echo [INFO] Starting the application...
echo [INFO] Your browser will open automatically in a moment.
echo.
echo (Do not close this window while using the app)
echo.

:: Start the app and open browser automatically
call npm run dev -- --open

pause
