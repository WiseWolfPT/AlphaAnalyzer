@echo off
REM Alfalyzer Local Domain Setup Script for Windows
REM This script sets up local domain aliases for easier access

echo 🔧 Alfalyzer Local Domain Setup (Windows)
echo ==========================================

REM Check if running as Administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running as Administrator
) else (
    echo ❌ This script needs to be run as Administrator
    echo Right-click on this file and select "Run as administrator"
    pause
    exit /b 1
)

set HOSTS_FILE=%SystemRoot%\System32\drivers\etc\hosts
set BACKUP_FILE=%SystemRoot%\System32\drivers\etc\hosts.alfalyzer.backup

REM Backup hosts file
if not exist "%BACKUP_FILE%" (
    echo 📁 Creating backup of hosts file...
    copy "%HOSTS_FILE%" "%BACKUP_FILE%" >nul
    echo ✅ Backup created at %BACKUP_FILE%
) else (
    echo 📁 Backup already exists at %BACKUP_FILE%
)

REM Check if domains already exist
findstr /C:"alfalyzer.local" "%HOSTS_FILE%" >nul
if %errorLevel% == 0 (
    echo ⚠️  Alfalyzer domains already configured
    goto :verify
)

echo.
echo 🌐 Adding local domains to hosts file...

REM Add domains to hosts file
echo. >> "%HOSTS_FILE%"
echo # Alfalyzer Local Development >> "%HOSTS_FILE%"
echo 127.0.0.1 alfalyzer.local >> "%HOSTS_FILE%"
echo 127.0.0.1 dev.alfalyzer.local >> "%HOSTS_FILE%"
echo 127.0.0.1 api.alfalyzer.local >> "%HOSTS_FILE%"
echo 127.0.0.1 app.alfalyzer.local >> "%HOSTS_FILE%"
echo 127.0.0.1 admin.alfalyzer.local >> "%HOSTS_FILE%"

echo ✅ Added: 127.0.0.1 alfalyzer.local
echo ✅ Added: 127.0.0.1 dev.alfalyzer.local
echo ✅ Added: 127.0.0.1 api.alfalyzer.local
echo ✅ Added: 127.0.0.1 app.alfalyzer.local
echo ✅ Added: 127.0.0.1 admin.alfalyzer.local

:verify
echo.
echo 🔍 Verifying domain resolution...

REM Flush DNS cache
ipconfig /flushdns >nul

REM Test domains
ping -n 1 alfalyzer.local >nul 2>&1 && echo ✅ alfalyzer.local resolved || echo ❌ alfalyzer.local failed
ping -n 1 dev.alfalyzer.local >nul 2>&1 && echo ✅ dev.alfalyzer.local resolved || echo ❌ dev.alfalyzer.local failed
ping -n 1 api.alfalyzer.local >nul 2>&1 && echo ✅ api.alfalyzer.local resolved || echo ❌ api.alfalyzer.local failed
ping -n 1 app.alfalyzer.local >nul 2>&1 && echo ✅ app.alfalyzer.local resolved || echo ❌ app.alfalyzer.local failed
ping -n 1 admin.alfalyzer.local >nul 2>&1 && echo ✅ admin.alfalyzer.local resolved || echo ❌ admin.alfalyzer.local failed

echo.
echo 📚 Usage Instructions:
echo ======================
echo.
echo After running this script, you can access Alfalyzer using these URLs:
echo.
echo 🌐 Main Application:
echo    http://alfalyzer.local:3000
echo    http://app.alfalyzer.local:3000
echo.
echo 🔧 Development Versions:
echo    http://dev.alfalyzer.local:3005
echo    http://dev.alfalyzer.local:8080
echo.
echo 🔌 API Access:
echo    http://api.alfalyzer.local:3001/api/health
echo    http://api.alfalyzer.local:3001/api/stocks
echo.
echo 👨‍💼 Admin Panel (when implemented):
echo    http://admin.alfalyzer.local:3000/admin
echo.
echo 💡 Start the application with:
echo    npm run dev:multi    # Multiple ports
echo    npm run dev:ultra    # Everything + backup backend
echo.

pause