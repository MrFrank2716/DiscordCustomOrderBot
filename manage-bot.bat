@echo off
title Discord Order Bot Manager

:menu
cls
echo ========================================
echo    Discord Order Bot Manager
echo ========================================
echo.
echo 1. Start Bot (PM2)
echo 2. Stop Bot
echo 3. Restart Bot
echo 4. View Bot Status
echo 5. View Bot Logs
echo 6. Start Bot (Simple - closes when terminal closes)
echo 7. Install Dependencies
echo 8. Deploy Commands
echo 9. Exit
echo.
set /p choice="Enter your choice (1-9): "

if "%choice%"=="1" goto start_pm2
if "%choice%"=="2" goto stop_bot
if "%choice%"=="3" goto restart_bot
if "%choice%"=="4" goto status_bot
if "%choice%"=="5" goto logs_bot
if "%choice%"=="6" goto start_simple
if "%choice%"=="7" goto install_deps
if "%choice%"=="8" goto deploy_commands
if "%choice%"=="9" goto exit
goto menu

:start_pm2
echo Starting bot with PM2 (persistent)...
npm run pm2:start
echo.
echo Bot started! It will continue running even after closing this window.
echo Use option 4 to check status or option 5 to view logs.
pause
goto menu

:stop_bot
echo Stopping bot...
npm run pm2:stop
echo.
echo Bot stopped.
pause
goto menu

:restart_bot
echo Restarting bot...
npm run pm2:restart
echo.
echo Bot restarted.
pause
goto menu

:status_bot
echo Bot status:
npm run pm2:status
echo.
pause
goto menu

:logs_bot
echo Opening bot logs (Press Ctrl+C to exit logs)...
npm run pm2:logs
pause
goto menu

:start_simple
echo Starting bot in simple mode...
echo WARNING: Bot will stop when you close this window!
npm start
pause
goto menu

:install_deps
echo Installing dependencies...
npm install
echo.
echo Dependencies installed.
pause
goto menu

:deploy_commands
echo Deploying slash commands...
node deploy-commands.js
echo.
echo Commands deployed.
pause
goto menu

:exit
echo Goodbye!
exit
