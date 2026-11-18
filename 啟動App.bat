@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist "C:\Users\user\AppData\Local\Programs\Python\Python312\python.exe" (
  "C:\Users\user\AppData\Local\Programs\Python\Python312\python.exe" server.py
) else (
  py server.py
)
pause
