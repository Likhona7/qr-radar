import { useEffect, useRef, useState } from 'react'
import Chart from 'chart.js/auto'
import { getSentimentTrajectory } from '../api/endpoints'

/**
 * Port of loadSentimentTrajectory (customer-os.js:1880-1939) as a React
 * component. Chart.js is used imperatively (real npm dep now, not a CDN
 * global) — this is the first page in the migration that needs a chart, per
 * the plan's decision to defer chart wiring until a page actually needs it.
 */
export default function SentimentTrajectoryChart() {
  const [topic, setTopic] = useState('')
  const [status, setStatus] = useState('Enter a topic and click "Load trajectory" to see how sentiment is trending.')
  const [trajectory, setTrajectory] = useState(null)
  const canvasRef = useRef(null)
  const chartRef = useRef(null)

  async function loadTrajectory(topicOverride) {
    const t = (topicOverride || topic).trim()
    if (!t) {
      setStatus('Enter a topic first (e.g. booking, baggage, pricing).')
      return
    }
    setStatus(`Loading trajectory for "${t}"...`)
    try {
      const json = await getSentimentTrajectory(t, 30)
      if (!json?.ok || !json.data?.trajectory?.length) {
        setStatus(`No sentiment data found for "${t}" in the last 30 days.`)
        setTrajectory(null)
        return
      }
      setTrajectory(json.data.trajectory)
      const direction = json.data.trendDirection || 'stable'
      const directionLabel = direction === 'worsening' ? 'Worsening ⚠️' : direction === 'improving' ? 'Improving ✅' : 'Stable'
      setStatus(`Trend for "${t}": ${directionLabel} (${json.data.trajectory.length} data points)`)
    } catch (err) {
      setStatus(`Could not load trajectory: ${err?.message || 'request failed'}`)
      setTrajectory(null)
    }
  }

  useEffect(() => {
    if (!trajectory || !canvasRef.current) return
    if (chartRef.current) chartRef.current.destroy()
    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels: trajectory.map((t) => t.timestamp),
        datasets: [
          { label: 'Positive %', data: trajectory.map((t) => t.positiveRatio), borderColor: '#1abc9c', backgroundColor: 'rgba(26,188,156,.12)', tension: 0.3, fill: true },
          { label: 'Negative %', data: trajectory.map((t) => t.negativeRatio), borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,.12)', tension: 0.3, fill: true },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { font: { size: 10 } } } },
        scales: {
          y: { beginAtZero: true, max: 100, ticks: { font: { size: 9 } } },
          x: { ticks: { font: { size: 9 }, maxRotation: 0 } },
        },
      },
    })
    return () => chartRef.current?.destroy()
  }, [trajectory])

  return (
    <div style={{ background: 'var(--su)', border: '1px solid var(--bo)', borderRadius: 'var(--r3)', padding: 16, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--t1)' }}>Sentiment Trajectory</div>
          <div style={{ fontSize: 10, color: 'var(--t2)' }}>Track how sentiment on a topic is trending over the last 30 days</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') loadTrajectory() }}
            placeholder="e.g. booking, baggage, pricing"
            style={{ fontSize: 11, padding: '6px 10px', border: '1px solid var(--bo)', borderRadius: 6, minWidth: 180 }}
          />
          <button
            onClick={() => loadTrajectory()}
            style={{ fontSize: 10, fontWeight: 700, padding: '6px 12px', background: 'var(--qb)', border: '1px solid var(--qb)', borderRadius: 6, color: '#fff', cursor: 'pointer' }}
          >
            Load trajectory
          </button>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 8 }}>{status}</div>
      <div style={{ position: 'relative', height: 180, display: trajectory ? 'block' : 'none' }}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  )
}
