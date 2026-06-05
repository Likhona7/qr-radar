param(
  [string]$ServerPath = "C:\Users\DELL\Desktop\Prototypes\radar\radar_backend\server.js"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ServerPath)) {
  throw "server.js not found at $ServerPath"
}

$content = Get-Content -LiteralPath $ServerPath -Raw
$original = $content

$backupPath = "$ServerPath.app-ratings-source-expansion-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $ServerPath -Destination $backupPath -Force

$content = $content.Replace(
  "topic: 'qatar airways mobile app reviews ratings booking check-in loyalty',",
  "topic: 'Qatar Airways Apple App Store iOS app reviews star rating booking check-in loyalty Privilege Club boarding pass app friction',"
)

$content = $content.Replace(
  "enabled: () => process.env.APP_STORE_LOOKUP_ENABLED === 'true'",
  "enabled: () => process.env.APP_STORE_LOOKUP_ENABLED !== 'false'"
)

$content = $content.Replace(
  "topic: 'qatar airways android app reviews ratings booking check-in loyalty',",
  "topic: 'Qatar Airways Google Play Android app reviews star rating booking check-in loyalty Privilege Club boarding pass app friction',"
)

$content = $content.Replace(
  "enabled: () => process.env.GOOGLE_PLAY_LOOKUP_ENABLED === 'true'",
  "enabled: () => process.env.GOOGLE_PLAY_LOOKUP_ENABLED !== 'false'"
)

$content = $content.Replace(
  "topic: 'Emirates Etihad Turkish Singapore Air India British Airways Cathay Pacific Lufthansa Saudia app reviews ratings',",
  "topic: 'Emirates Etihad Turkish Airlines Singapore Airlines Air India British Airways Cathay Pacific Lufthansa Saudia Apple App Store Google Play app reviews ratings booking check-in loyalty app friction compared with Qatar Airways',"
)

if ($content -eq $original) {
  throw "No changes were made. server.js structure did not match expected app-ratings patch points."
}

Set-Content -LiteralPath $ServerPath -Value $content -Encoding UTF8

Write-Host "Patched server.js app ratings source expansion."
Write-Host "Backup: $backupPath"
