param(
  [string]$ServerPath = "C:\Users\DELL\Desktop\Prototypes\radar\radar_backend\server.js"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ServerPath)) {
  throw "server.js not found at $ServerPath"
}

$content = Get-Content -LiteralPath $ServerPath -Raw
$original = $content

$backupPath = "$ServerPath.discovery-date-safety-fix-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $ServerPath -Destination $backupPath -Force

$helper = @'

function normalizeOptionalIsoTimestamp(value) {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  // Models and public sources often return partial dates such as "2026-05".
  if (/^\d{4}-\d{2}$/.test(raw)) {
    return `${raw}-01T00:00:00.000Z`;
  }
  if (/^\d{4}$/.test(raw)) {
    return `${raw}-01-01T00:00:00.000Z`;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T00:00:00.000Z`;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

'@

if ($content -notmatch "function normalizeOptionalIsoTimestamp") {
  $content = $content.Replace("function stableHash(value) {", "$helper`r`nfunction stableHash(value) {")
}

$content = $content.Replace(
  "publishedAt: item.publishedAt || item.published_at || null,",
  "publishedAt: normalizeOptionalIsoTimestamp(item.publishedAt || item.published_at),"
)

$content = $content.Replace(
  "const sourceDate = item.publishedAt || item.published_at || null;",
  "const sourceDate = normalizeOptionalIsoTimestamp(item.publishedAt || item.published_at);"
)

$content = $content.Replace(
  "published_at: item.publishedAt || item.published_at || null,",
  "published_at: normalizeOptionalIsoTimestamp(item.publishedAt || item.published_at),"
)

$content = $content.Replace(
  "source_date: signal.sourceDate || signal.source_date || null,",
  "source_date: normalizeOptionalIsoTimestamp(signal.sourceDate || signal.source_date),"
)

$content = $content.Replace(
  "const safePublishedAt = row.published_at && !Number.isNaN(new Date(row.published_at).getTime())`r`n      ? row.published_at`r`n      : now;",
  "const safePublishedAt = normalizeOptionalIsoTimestamp(row.published_at) || now;"
)

$content = $content.Replace(
  "const safePublishedAt = row.published_at && !Number.isNaN(new Date(row.published_at).getTime())`n      ? row.published_at`n      : now;",
  "const safePublishedAt = normalizeOptionalIsoTimestamp(row.published_at) || now;"
)

if ($content -eq $original) {
  throw "No changes were made. server.js structure did not match expected patch points."
}

Set-Content -LiteralPath $ServerPath -Value $content -Encoding UTF8

Write-Host "Patched server.js discovery date safety."
Write-Host "Backup: $backupPath"
