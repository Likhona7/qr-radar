param(
  [string]$ServerPath = "C:\Users\DELL\Desktop\Prototypes\radar\radar_backend\server.js"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ServerPath)) {
  throw "server.js not found at $ServerPath"
}

$content = Get-Content -LiteralPath $ServerPath -Raw
$original = $content

$backupPath = "$ServerPath.source-ledger-proof-fix-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $ServerPath -Destination $backupPath -Force

$newIngestionFunction = @'
async function recordSourceIngestionRun({ viewMode, sourceType, sourceName, itemsSeen, itemsSaved, status = 'completed', metadata = {} }) {
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
  const { data, error } = await supabase.from('source_ingestion_runs').insert(fullRow).select().maybeSingle();
  if (!error) return { ok: true, inserted: 1, row: data || null };

  log.warn({ err: error.message }, 'source_ingestion_runs full insert skipped; trying minimal insert');
  const minimalRow = {
    view_mode: viewMode,
    source_name: sourceName,
    items_seen: itemsSeen,
    items_saved: itemsSaved,
    status,
    run_at: runAt,
    metadata: { ...metadata, sourceType, fullInsertError: error.message }
  };
  const { data: minimalData, error: minimalError } = await supabase
    .from('source_ingestion_runs')
    .insert(minimalRow)
    .select()
    .maybeSingle();
  if (!minimalError) return { ok: true, inserted: 1, row: minimalData || null, fallback: 'minimal' };

  log.warn({ err: minimalError.message }, 'source_ingestion_runs minimal insert skipped');
  return { ok: false, inserted: 0, error: minimalError.message, firstError: error.message };
}
'@

$content = [regex]::Replace(
  $content,
  "async function recordSourceIngestionRun\(\{ viewMode, sourceType, sourceName, itemsSeen, itemsSaved, status = 'completed', metadata = \{\} \}\) \{.*?\n\}",
  $newIngestionFunction,
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$newLedgerFunction = @'
async function recordSourceFreshnessLedger({ viewMode, rows, savedCount }) {
  const now = new Date().toISOString();
  const bySource = new Map();
  for (const row of rows || []) {
    const safePublishedAt = row.published_at && !Number.isNaN(new Date(row.published_at).getTime())
      ? row.published_at
      : now;
    const key = `${row.source_type || 'unknown'}::${row.source_name || ''}`;
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
    if (safePublishedAt && new Date(safePublishedAt) > new Date(current.last_item_at || 0)) {
      current.last_item_at = safePublishedAt;
    }
    bySource.set(key, current);
  }
  const ledgerRows = Array.from(bySource.values()).map(row => ({ ...row, updated_at: now }));
  if (!ledgerRows.length) return { ok: true, attempted: 0, written: 0, errors: [] };

  const { error } = await supabase
    .from('source_freshness_ledger')
    .upsert(ledgerRows, { onConflict: 'view_mode,source_type,source_name', ignoreDuplicates: false });
  if (!error) return { ok: true, attempted: ledgerRows.length, written: ledgerRows.length, mode: 'upsert', errors: [] };

  log.warn({ err: error.message }, 'source_freshness_ledger upsert skipped; trying insert fallbacks');
  const errors = [error.message];
  let written = 0;
  for (const row of ledgerRows) {
    const { error: fullInsertError } = await supabase
      .from('source_freshness_ledger')
      .insert(row);
    if (!fullInsertError) {
      written += 1;
      continue;
    }
    errors.push(fullInsertError.message);

    const minimalRow = {
      view_mode: row.view_mode,
      source_type: row.source_type,
      source_name: row.source_name,
      status: row.status,
      updated_at: row.updated_at,
      metadata: {
        ...(row.metadata || {}),
        lastSeenAt: row.last_seen_at,
        lastItemAt: row.last_item_at,
        itemsSeen: row.items_seen,
        fullInsertError: fullInsertError.message
      }
    };
    const { error: minimalInsertError } = await supabase
      .from('source_freshness_ledger')
      .insert(minimalRow);
    if (!minimalInsertError) {
      written += 1;
      continue;
    }
    errors.push(minimalInsertError.message);
  }
  return { ok: written > 0, attempted: ledgerRows.length, written, mode: 'fallback_insert', errors: Array.from(new Set(errors)).slice(0, 8) };
}
'@

$content = [regex]::Replace(
  $content,
  "async function recordSourceFreshnessLedger\(\{ viewMode, rows, savedCount \}\) \{.*?\n\}",
  $newLedgerFunction,
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$oldPersist = @'
  await recordSourceFreshnessLedger({ viewMode, rows, savedCount: data?.length || 0 });
  return { saved: data?.length || 0, rows };
'@
$newPersist = @'
  const ledgerResult = await recordSourceFreshnessLedger({ viewMode, rows, savedCount: data?.length || 0 });
  return { saved: data?.length || 0, rows, ledgerResult };
'@
if ($content.Contains($oldPersist)) {
  $content = $content.Replace($oldPersist, $newPersist)
} else {
  Write-Warning "Persist source ledger return block not found; skipping."
}

$oldVars = @'
  let persistedSources = { saved: 0 };
  let savedSignals = { savedRows: [], savedCount: 0, duplicatesSkipped: 0, refreshes: [] };
'@
$newVars = @'
  let persistedSources = { saved: 0, ledgerResult: null };
  let sourceIngestionResult = null;
  let sourceLedgerResult = null;
  let savedSignals = { savedRows: [], savedCount: 0, duplicatesSkipped: 0, refreshes: [] };
'@
if ($content.Contains($oldVars)) {
  $content = $content.Replace($oldVars, $newVars)
} else {
  Write-Warning "Discovery result variable block not found; skipping."
}

$oldRecord = @'
    await recordSourceIngestionRun({
      viewMode,
      sourceType: 'ai_discovery',
      sourceName: selectedSources.map(s => s.sourceName).join(', '),
      itemsSeen: discoveredItems.length,
      itemsSaved: persistedSources.saved,
      status: sourceResults.some(s => s.status === 'failed') ? 'partial' : 'completed',
      metadata: { trigger, sourceResults, providerChain: ['anthropic_web_search'] }
    });
'@
$newRecord = @'
    sourceLedgerResult = persistedSources.ledgerResult || null;
    if (sourceLedgerResult && !sourceLedgerResult.ok) {
      warnings.push(`Source freshness ledger write warning: ${sourceLedgerResult.errors?.[0] || 'no ledger rows written'}`);
    }
    sourceIngestionResult = await recordSourceIngestionRun({
      viewMode,
      sourceType: 'ai_discovery',
      sourceName: selectedSources.map(s => s.sourceName).join(', '),
      itemsSeen: discoveredItems.length,
      itemsSaved: persistedSources.saved,
      status: sourceResults.some(s => s.status === 'failed') ? 'partial' : 'completed',
      metadata: { trigger, sourceResults, providerChain: ['anthropic_web_search'], sourceLedgerResult }
    });
    if (sourceIngestionResult && !sourceIngestionResult.ok) {
      warnings.push(`Source ingestion run write warning: ${sourceIngestionResult.error || 'no source ingestion row written'}`);
    }
'@
if ($content.Contains($oldRecord)) {
  $content = $content.Replace($oldRecord, $newRecord)
} else {
  Write-Warning "Source ingestion record block not found; skipping."
}

$oldPayloadTail = @'
    openaiRan: !scored.skipped && scored.provider === 'openai',
    openaiChunkResults: scored.chunkResults || [],
    openaiParseErrors: scored.parseErrors || [],
    warnings,
    errors
'@
$newPayloadTail = @'
    openaiRan: !scored.skipped && scored.provider === 'openai',
    sourceIngestionResult,
    sourceLedgerResult,
    openaiChunkResults: scored.chunkResults || [],
    openaiParseErrors: scored.parseErrors || [],
    warnings,
    errors
'@
if ($content.Contains($oldPayloadTail)) {
  $content = $content.Replace($oldPayloadTail, $newPayloadTail)
} else {
  Write-Warning "Run payload tail block not found; skipping."
}

if ($content -eq $original) {
  throw "No changes were made. server.js structure did not match expected patch points."
}

Set-Content -LiteralPath $ServerPath -Value $content -Encoding UTF8

Write-Host "Patched server.js source ledger proof tracking."
Write-Host "Backup: $backupPath"
