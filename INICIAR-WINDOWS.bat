@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 20 ou superior antes de continuar.
  pause
  exit /b 1
)
if not exist "backend\node_modules" (
  cd backend
  call npm.cmd ci
  if errorlevel 1 goto erro
  cd ..
)
if not exist "frontend\node_modules" (
  cd frontend
  call npm.cmd ci
  if errorlevel 1 goto erro
  cd ..
)
start "MediSync - Backend" /D "%~dp0backend" cmd /k npm.cmd start
start "MediSync - Frontend" /D "%~dp0frontend" cmd /k npm.cmd run dev
 echo Abra http://localhost:5173 depois que os dois terminais iniciarem.
 echo Mantenha os dois terminais abertos enquanto usa o MediSync.
 pause
 exit /b 0
:erro
 echo Nao foi possivel instalar as dependencias. Confira a internet e o erro acima.
 pause
 exit /b 1
