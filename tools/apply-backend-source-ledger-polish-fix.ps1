param(
  [string]$ServerPath = "C:\Users\DELL\Desktop\Prototypes\radar\radar_backend\server.js"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ServerPath)) {
  throw "server.js not found at $ServerPath"
}

$content = Get-Content -LiteralPath $ServerPath -Raw
$original = $content

$backupPath = "$ServerPath.source-ledger-polish-fix-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $ServerPath -Destination $backupPath -Force

$oldIngestionStart = @'
  const runAt = new Date().toISOString();
  const fullRow = {
    view_mode: viewMode,
    source_type: sourceType,
    source_name: sourceName,
    items_seen: itemsSeen,
    items_saved: itemsSaved,
    status,
    run_at: runAt,
    metadata
  };
'@

$newIngestionStart = @'
  const runAt = new Date().toISOString();
  const sourceResults = Array.isArray(metadata.sourceResults) ? metadata.sourceResults : [];
  const checkedSources = sourceResults.filter(source => source.status === 'checked').length;
  const failed = status === 'failed';
  const fullRow = {
    view_mode: viewMode,
    source_type: sourceType,
    source_name: sourceName,
    items_seen: itemsSeen,
    items_saved: itemsSaved,
    status,
    run_at: runAt,
    started_at: runAt,
    completed_at: runAt,
    last_success_at: failed ? null : runAt,
    duplicates_skipped: Number(metadata.duplicatesSkipped || metadata.deduplicated || 0),
    claude_calls: checkedSources || sourceResults.length || 0,
    web_search_used: sourceResults.some(source => source.provider === 'anthropic' && source.status === 'checked'),
    error: failed ? (metadata.error || metadata.errors?.[0] || 'source_ingestion_failed') : null,
    metadata
  };
'@

if ($content.Contains($oldIngestionStart)) {
  $content = $content.Replace($oldIngestionStart, $newIngestionStart)
} else {
  Write-Warning "Source ingestion full row block not found; skipping."
}

$oldLedgerHeader = @'
  const now = new Date().toISOString();
  const bySource = new Map();
'@

$newLedgerHeader = @'
  const now = new Date().toISOString();
  const savedTotal = Math.max(Number(savedCount) || 0, 0);
  const sourceConfidenceScore = savedTotal > 0 ? 90 : 70;
  const bySource = new Map();
'@

if ($content.Contains($oldLedgerHeader)) {
  $content = $content.Replace($oldLedgerHeader, $newLedgerHeader)
} else {
  Write-Warning "Source ledger header block not found; skipping."
}

$oldLedgerObject = @'
    const current = bySource.get(key) || {
      view_mode: viewMode,
      source_type: row.source_type || 'unknown',
      source_name: row.source_name || '',
      status: 'fresh',
      last_seen_at: now,
      last_item_at: safePublishedAt,
      items_seen: 0,
      metadata: { savedCount }
    };
    current.items_seen += 1;
'@

$newLedgerObject = @'
    const current = bySource.get(key) || {
      view_mode: viewMode,
      source_type: row.source_type || 'unknown',
      source_name: row.source_name || '',
      status: 'fresh',
      last_seen_at: now,
      last_item_at: safePublishedAt,
      last_checked_at: now,
      last_success_at: now,
      items_seen: 0,
      items_saved: savedTotal,
      freshness_state: 'fresh',
      confidence_score: sourceConfidenceScore,
      error: null,
      metadata: { savedCount: savedTotal }
    };
    current.items_seen += 1;
    current.items_saved = savedTotal;
    current.last_checked_at = now;
    current.last_success_at = now;
    current.freshness_state = 'fresh';
    current.confidence_score = sourceConfidenceScore;
    current.error = null;
'@

if ($content.Contains($oldLedgerObject)) {
  $content = $content.Replace($oldLedgerObject, $newLedgerObject)
} else {
  Write-Warning "Source ledger proof field block not found; skipping."
}

$oldLedgerRows = @'
  const ledgerRows = Array.from(bySource.values()).map(row => ({ ...row, updated_at: now }));
'@

$newLedgerRows = @'
  const ledgerRows = Array.from(bySource.values()).map(row => ({
    ...row,
    updated_at: now,
    metadata: {
      ...(row.metadata || {}),
      itemsSeen: row.items_seen,
      itemsSaved: row.items_saved,
      lastCheckedAt: row.last_checked_at,
      lastSuccessAt: row.last_success_at,
      confidenceScore: row.confidence_score
    }
  }));
'@

if ($content.Contains($oldLedgerRows)) {
  $content = $content.Replace($oldLedgerRows, $newLedgerRows)
} else {
  Write-Warning "Source ledger row mapping block not found; skipping."
}

if ($content -eq $original) {
  throw "No changes were made. server.js structure did not match expected patch points."
}

Set-Content -LiteralPath $ServerPath -Value $content -Encoding UTF8

Write-Host "Patched server.js source ledger proof polish."
Write-Host "Backup: $backupPath"
