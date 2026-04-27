@echo off
setlocal
cd /d "%~dp0"
echo Starting Praxis Desk...
if not exist "node_modules\better-sqlite3\build\Release\better_sqlite3.node" (
  echo Native SQLite dependency is missing. Repairing native dependencies...
  npm run repair:native
)
npm run dev
pause
