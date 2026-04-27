Set-Location -LiteralPath $PSScriptRoot
Write-Host "Starting Praxis Desk..."
if (-not (Test-Path -LiteralPath "node_modules\better-sqlite3\build\Release\better_sqlite3.node")) {
  Write-Host "Native SQLite dependency is missing. Repairing native dependencies..."
  npm run repair:native
}
npm run dev
