param(
  [string]$ServerPath = "C:\Users\DELL\Desktop\Prototypes\radar\radar_backend\server.js"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ServerPath)) {
  throw "server.js not found at $ServerPath"
}

$content = Get-Content -LiteralPath $ServerPath -Raw
$original = $content

$backupPath = "$ServerPath.discovery-signal-fix-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $ServerPath -Destination $backupPath -Force

$newLedgerFunction = @'
async function recordSourceFreshnessLedger({ viewMode, rows, savedCount }) {
  const now = new Date().toISOString();
  const bySource = new Map();
  for (const row of rows || []) {
    const key = `${row.source_type || 'unknown'}::${row.source_name || ''}`;
    const current = bySource.get(key) || {
      view_mode: viewMode,
      source_type: row.source_type || 'unknown',
      source_name: row.source_name || '',
      status: 'fresh',
      last_seen_at: now,
      last_item_at: row.published_at || now,
      items_seen: 0,
      metadata: { savedCount }
    };
    current.items_seen += 1;
    if (row.published_at && new Date(row.published_at) > new Date(current.last_item_at || 0)) {
      current.last_item_at = row.published_at;
    }
    bySource.set(key, current);
  }
  const ledgerRows = Array.from(bySource.values()).map(row => ({ ...row, updated_at: now }));
  if (!ledgerRows.length) return;

  const { error } = await supabase
    .from('source_freshness_ledger')
    .upsert(ledgerRows, { onConflict: 'view_mode,source_type,source_name', ignoreDuplicates: false });
  if (!error) return;

  log.warn({ err: error.message }, 'source_freshness_ledger upsert skipped; falling back to update/insert');
  for (const row of ledgerRows) {
    const { data: existing, error: lookupError } = await supabase
      .from('source_freshness_ledger')
      .select('id')
      .eq('view_mode', row.view_mode)
      .eq('source_type', row.source_type)
      .eq('source_name', row.source_name)
      .limit(1)
      .maybeSingle();
    if (lookupError) {
      log.warn({ err: lookupError.message, source: row.source_name }, 'source_freshness_ledger lookup skipped');
      continue;
    }
    if (existing?.id) {
      const { error: updateError } = await supabase
        .from('source_freshness_ledger')
        .update(row)
        .eq('id', existing.id);
      if (updateError) log.warn({ err: updateError.message, source: row.source_name }, 'source_freshness_ledger update skipped');
    } else {
      const { error: insertError } = await supabase
        .from('source_freshness_ledger')
        .insert(row);
      if (insertError) log.warn({ err: insertError.message, source: row.source_name }, 'source_freshness_ledger insert skipped');
    }
  }
}
'@

$content = [regex]::Replace(
  $content,
  "async function recordSourceFreshnessLedger\(\{ viewMode, rows, savedCount \}\) \{.*?\n\}",
  $newLedgerFunction,
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$newScoringFunction = @'
function fallbackDiscoverySignalFromItem(item = {}, index = 0) {
  const domainId = item.domainId || item.domain_id || 'dig';
  const sourceName = item.sourceName || item.source_name || item.source || 'AI discovery source';
  const title = String(item.title || item.body || `AI discovery item ${index + 1}`).slice(0, 180);
  const body = String(item.body || item.summary || item.title || 'Source evidence requires human review.').slice(0, 900);
  const confidence = item.confidence || 'medium';
  const topic = item.topic || 'customer and market signal';
  const sourceUrl = item.sourceUrl || item.source_url || null;
  const sourceDate = item.publishedAt || item.published_at || null;
  return {
    domainId,
    title,
    body,
    commercialImpactScore: confidence === 'high' ? 72 : 58,
    impactLabel: confidence === 'high' ? 'High' : 'Monitor',
    impact: confidence === 'high' ? 'high' : 'medium',
    demandImpact: `Potential QR business impact from ${topic}.`,
    timeToImpact: '7-30 days',
    relevanceWindow: 'This month',
    captureStrategy: 'Validate the source, confirm owner, and convert into a targeted Radar action if corroborated.',
    whyItMattersNow: 'New external source evidence was discovered by AI Discovery and should not be lost because model JSON formatting failed.',
    source: sourceName,
    sourceUrl,
    sourceDate,
    confidence,
    verified: Boolean(sourceUrl),
    recommendedAction: {
      owner: domainId === 'cmp' ? 'Competitive Intelligence' : domainId === 'dig' ? 'Digital Product' : 'Radar owner',
      firstStep: 'Review source evidence and decide action or monitor within 24 hours.',
      dueInDays: 7,
      expectedImpact: 'Protect revenue, reduce risk, or capture demand opportunity.',
      status: 'monitor'
    },
    rawSourceItem: item,
    fallbackGenerated: true
  };
}

function fallbackDiscoverySignalsFromItems(items = []) {
  return (items || [])
    .filter(item => item?.title || item?.body)
    .map((item, index) => fallbackDiscoverySignalFromItem(item, index));
}

async function scoreDiscoverySignalsWithOpenAI({ items = [], viewMode = 'b2c' } = {}) {
  if (!items.length) return { signals: [], provider: 'openai', skipped: true, reason: 'no_items', parseErrors: [], chunkResults: [] };
  const chunkSize = 4;
  const signals = [];
  const parseErrors = [];
  const chunkResults = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const prompt = `Convert these source items into QR Radar signals. Return one valid JSON object only. Do not use markdown. Do not include comments. Do not include trailing commas. Shape: {"signals":[{"domainId":"dig|cmp|rep|ops|loy|prd|rev|sml|reg|geo|sec|soc","title":"decision signal title","body":"evidence summary","commercialImpactScore":0,"impactLabel":"High","impact":"high","demandImpact":"plain language impact","timeToImpact":"days","relevanceWindow":"time window","captureStrategy":"what QR should do","whyItMattersNow":"why this matters now","source":"source name","sourceUrl":"url","sourceDate":"date if known","confidence":"medium","verified":true,"recommendedAction":{"owner":"team/persona","firstStep":"first step","dueInDays":14,"expectedImpact":"impact","status":"monitor"}}]}. Create at most ${Math.min(4, chunk.length)} signals. Every signal must include an owner-ready recommendedAction or explicit monitor decision. View mode: ${viewMode}. Items: ${JSON.stringify(chunk).slice(0, 12000)}`;
    try {
      const data = await callOpenAI({
        route: 'ai_discovery_openai_signal_scoring',
        json: true,
        max_tokens: 1800,
        messages: [{ role: 'user', content: prompt }]
      });
      const text = extractOpenAIText(data);
      const parsedAttempt = tryParseJsonValueFromText(text);
      if (!parsedAttempt.value) {
        const fallbackSignals = fallbackDiscoverySignalsFromItems(chunk);
        signals.push(...fallbackSignals);
        parseErrors.push({
          chunkStart: i,
          itemCount: chunk.length,
          error: parsedAttempt.error,
          finishReason: data?.choices?.[0]?.finish_reason || null,
          fallbackSignals: fallbackSignals.length
        });
        chunkResults.push({ chunkStart: i, status: 'fallback_from_parse_failed', signals: fallbackSignals.length });
        continue;
      }
      const chunkSignals = Array.isArray(parsedAttempt.value.signals) ? parsedAttempt.value.signals : [];
      if (!chunkSignals.length) {
        const fallbackSignals = fallbackDiscoverySignalsFromItems(chunk);
        signals.push(...fallbackSignals);
        chunkResults.push({
          chunkStart: i,
          status: 'fallback_from_empty_signals',
          signals: fallbackSignals.length,
          finishReason: data?.choices?.[0]?.finish_reason || null
        });
        continue;
      }
      signals.push(...chunkSignals);
      chunkResults.push({
        chunkStart: i,
        status: 'parsed',
        signals: chunkSignals.length,
        finishReason: data?.choices?.[0]?.finish_reason || null
      });
    } catch (err) {
      const fallbackSignals = fallbackDiscoverySignalsFromItems(chunk);
      signals.push(...fallbackSignals);
      parseErrors.push({
        chunkStart: i,
        itemCount: chunk.length,
        error: err.message,
        fallbackSignals: fallbackSignals.length
      });
      chunkResults.push({ chunkStart: i, status: 'fallback_from_openai_error', signals: fallbackSignals.length });
    }
  }

  return {
    signals: signals.slice(0, 30),
    provider: 'openai',
    skipped: false,
    parseErrors,
    chunkResults
  };
}
'@

$content = [regex]::Replace(
  $content,
  "async function scoreDiscoverySignalsWithOpenAI\(\{ items = \[\], viewMode = 'b2c' \} = \{\}\) \{.*?\n\}\r?\n\r?\nasync function persistDiscoverySourceItems",
  "$newScoringFunction`r`n`r`nasync function persistDiscoverySourceItems",
  [System.Text.RegularExpressions.RegexOptions]::Singleline
)

$oldDiscoveryInsert = @'
  await supabase.from('refresh_runs').insert({
    domains_refreshed: savedSignals.refreshes.length,
    critical_signals: savedSignals.savedRows.filter(s => Number(s.ai_rank_score || 0) >= 70).length,
    run_at: completedAt.toISOString(),
    metadata: runPayload
  });
'@

$newDiscoveryInsert = @'
  const discoveryStatus = errors.length
    ? (savedSignals.savedCount ? 'partial' : 'failed')
    : (warnings.length ? 'partial' : 'completed');
  await supabase.from('refresh_runs').insert({
    domains_refreshed: savedSignals.refreshes.length,
    critical_signals: savedSignals.savedRows.filter(s => Number(s.ai_rank_score || 0) >= 70).length,
    run_at: completedAt.toISOString(),
    run_type: 'ai_discovery',
    trigger,
    view_mode: viewMode,
    status: discoveryStatus,
    started_at: startedAt.toISOString(),
    completed_at: completedAt.toISOString(),
    signals_checked: discoveredItems.length,
    signals_created: savedSignals.savedCount,
    rankings_updated: 0,
    vector_memory_upserted: savedSignals.savedCount,
    competitor_cache_refreshed: 0,
    warnings,
    error: errors[0] || null,
    metadata: { ...runPayload, status: discoveryStatus }
  });
'@

if ($content.Contains($oldDiscoveryInsert)) {
  $content = $content.Replace($oldDiscoveryInsert, $newDiscoveryInsert)
} else {
  Write-Warning "Discovery refresh_runs insert block not found; skipping top-level discovery status patch."
}

$oldMaintenanceInsert = @'
  const { data: runRecord, error: runInsertErr } = await supabase.from('refresh_runs').insert({
    domains_refreshed: 0,
    critical_signals: rankedSignals.filter(item => item.ranking.aiRankScore >= 70).length,
    run_at: completedAt.toISOString(),
    metadata: runMetadata
  }).select().single();
'@

$newMaintenanceInsert = @'
  const { data: runRecord, error: runInsertErr } = await supabase.from('refresh_runs').insert({
    domains_refreshed: 0,
    critical_signals: rankedSignals.filter(item => item.ranking.aiRankScore >= 70).length,
    run_at: completedAt.toISOString(),
    run_type: 'maintenance',
    trigger,
    view_mode: viewMode,
    status: 'completed',
    started_at: started.toISOString(),
    completed_at: completedAt.toISOString(),
    signals_checked: rows.length,
    signals_created: 0,
    rankings_updated: rankedSignals.length,
    vector_memory_upserted: rankedSignals.length,
    competitor_cache_refreshed: 0,
    warnings: [],
    error: null,
    metadata: runMetadata
  }).select().single();
'@

if ($content.Contains($oldMaintenanceInsert)) {
  $content = $content.Replace($oldMaintenanceInsert, $newMaintenanceInsert)
} else {
  Write-Warning "Maintenance refresh_runs insert block not found; skipping maintenance status patch."
}

$oldMaintenanceUpdate = @'
      await supabase.from('refresh_runs').update({
        metadata: {
          trigger: result.trigger,
          viewMode: result.viewMode,
          maintenanceType: 'ranking_vector_cache_health',
          startedAt: result.startedAt,
          completedAt: result.completedAt,
          signalsChecked: result.signalsChecked,
          rankingsUpdated: result.rankingsUpdated,
          vectorMemoryUpserted: result.vectorMemoryUpserted,
          latestDomainRefresh: result.latestDomainRefresh,
          contentRefreshNeeded: result.contentRefreshNeeded,
          competitorCache,
          competitorCacheSummary: {
            refreshed: competitorCache.filter(c => c.status === 'refreshed').length,
            fresh: competitorCache.filter(c => c.status === 'fresh').length,
            failed: competitorCache.filter(c => c.status === 'failed').length
          }
        }
      }).eq('id', result.maintenanceRunId);
'@

$newMaintenanceUpdate = @'
      await supabase.from('refresh_runs').update({
        status: 'completed',
        completed_at: result.completedAt,
        signals_checked: result.signalsChecked,
        rankings_updated: result.rankingsUpdated,
        vector_memory_upserted: result.vectorMemoryUpserted,
        competitor_cache_refreshed: competitorCache.filter(c => c.status === 'refreshed').length,
        warnings: competitorCache.filter(c => c.status === 'failed').map(c => `${c.rival}: ${c.error || 'refresh failed'}`),
        error: null,
        metadata: {
          trigger: result.trigger,
          viewMode: result.viewMode,
          maintenanceType: 'ranking_vector_cache_health',
          startedAt: result.startedAt,
          completedAt: result.completedAt,
          signalsChecked: result.signalsChecked,
          rankingsUpdated: result.rankingsUpdated,
          vectorMemoryUpserted: result.vectorMemoryUpserted,
          latestDomainRefresh: result.latestDomainRefresh,
          contentRefreshNeeded: result.contentRefreshNeeded,
          competitorCache,
          competitorCacheSummary: {
            refreshed: competitorCache.filter(c => c.status === 'refreshed').length,
            fresh: competitorCache.filter(c => c.status === 'fresh').length,
            failed: competitorCache.filter(c => c.status === 'failed').length
          }
        }
      }).eq('id', result.maintenanceRunId);
'@

if ($content.Contains($oldMaintenanceUpdate)) {
  $content = $content.Replace($oldMaintenanceUpdate, $newMaintenanceUpdate)
} else {
  Write-Warning "Maintenance refresh_runs update block not found; skipping maintenance update patch."
}

if ($content -eq $original) {
  throw "No changes were made. server.js structure did not match expected patch points."
}

Set-Content -LiteralPath $ServerPath -Value $content -Encoding UTF8

Write-Host "Patched server.js discovery-to-signal automation."
Write-Host "Backup: $backupPath"
