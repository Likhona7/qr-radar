param(
  [string]$ServerPath = "C:\Users\DELL\Desktop\Prototypes\radar\radar_backend\server.js"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $ServerPath)) {
  throw "server.js not found at $ServerPath"
}

$content = Get-Content -LiteralPath $ServerPath -Raw
$original = $content

$backupPath = "$ServerPath.source-ledger-per-source-count-fix-backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
Copy-Item -LiteralPath $ServerPath -Destination $backupPath -Force

$replacements = @(
  @{
    Old = "  const sourceConfidenceScore = savedTotal > 0 ? 90 : 70;`r`n"
    New = ""
  },
  @{
    Old = "      items_saved: savedTotal,`r`n      freshness_state: 'fresh',`r`n      confidence_score: sourceConfidenceScore,`r`n"
    New = "      items_saved: 0,`r`n      freshness_state: 'fresh',`r`n      confidence_score: 70,`r`n"
  },
  @{
    Old = "    current.items_seen += 1;`r`n    current.items_saved = savedTotal;`r`n    current.last_checked_at = now;`r`n"
    New = "    current.items_seen += 1;`r`n    current.items_saved = current.items_seen;`r`n    current.confidence_score = current.items_saved > 0 ? 90 : 70;`r`n    current.last_checked_at = now;`r`n"
  },
  @{
    Old = "    current.freshness_state = 'fresh';`r`n    current.confidence_score = sourceConfidenceScore;`r`n    current.error = null;`r`n"
    New = "    current.freshness_state = 'fresh';`r`n    current.error = null;`r`n"
  },
  @{
    Old = "      itemsSaved: row.items_saved,`r`n      lastCheckedAt: row.last_checked_at,`r`n"
    New = "      itemsSaved: row.items_saved,`r`n      sourceSavedCount: row.items_saved,`r`n      totalSavedCount: savedTotal,`r`n      lastCheckedAt: row.last_checked_at,`r`n"
  }
)

foreach ($replacement in $replacements) {
  if ($content.Contains($replacement.Old)) {
    $content = $content.Replace($replacement.Old, $replacement.New)
  } else {
    Write-Warning "Expected source-ledger count block not found; trying LF fallback."
    $oldLf = $replacement.Old -replace "`r`n", "`n"
    $newLf = $replacement.New -replace "`r`n", "`n"
    if ($content.Contains($oldLf)) {
      $content = $content.Replace($oldLf, $newLf)
    }
  }
}

if ($content -eq $original) {
  throw "No changes were made. server.js structure did not match expected patch points."
}

Set-Content -LiteralPath $ServerPath -Value $content -Encoding UTF8

Write-Host "Patched server.js source ledger per-source saved counts."
Write-Host "Backup: $backupPath"
