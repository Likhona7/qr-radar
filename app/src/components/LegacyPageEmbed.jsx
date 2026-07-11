/**
 * Transitional placeholder for the 10 pages not yet ported to React (Phase 2+
 * roadmap, plan §7). Embeds a verbatim copy of the legacy modular app (kept
 * under public/legacy/, untouched) so every nav destination is reachable
 * even though only Customer Intelligence OS is a real React page in Phase 1.
 * Removed page-by-page as each route gets a real implementation.
 */
export default function LegacyPageEmbed({ label }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
      <div style={{ padding: '8px 14px', fontSize: 11, color: 'var(--t3)', borderBottom: '1px solid var(--bo)' }}>
        <strong>{label}</strong> — not yet migrated to React (Phase 2+). Showing the legacy app below.
      </div>
      <iframe
        title={`legacy-${label}`}
        src="/legacy/index.html"
        style={{ flex: 1, border: 'none', width: '100%' }}
      />
    </div>
  )
}
