import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import TopBar from './components/TopBar'
import TabNav from './components/TabNav'
import LegacyPageEmbed from './components/LegacyPageEmbed'
import CustomerIntelligenceOS from './pages/CustomerIntelligenceOS'
import SentimentPage from './pages/SentimentPage'
import ExecutiveSummaryPage from './pages/ExecutiveSummaryPage'
import PredictiveIntelligencePage from './pages/PredictiveIntelligencePage'

// Ported 1:1 from components/01-top-shell.html:114-174 (showMain/showComp/...).
const PRIMARY_NAV = [
  { key: '/', label: 'Intelligence' },
  { key: '/competitors', label: 'Competitor Intelligence' },
  { key: '/partners', label: 'Partner Network' },
  { key: '/sentiment', label: 'Customer Sentiment' },
  { key: '/customer-intelligence', label: 'Customer Intelligence' },
  { key: '/customer-os', label: 'Intelligence OS' },
  { key: '/team-actions', label: 'Team Actions' },
  { key: '/executive-summary', label: 'Executive Summary' },
  { key: '/predictive', label: 'Predictive Intelligence' },
  { key: '/ai-discovery', label: 'AI Discovery' },
  { key: '/public-apis', label: 'Public APIs' },
  { key: '/roadmap', label: 'Roadmap Tracker' },
]

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <div>
      <TopBar />
      <TabNav level="primary" items={PRIMARY_NAV} activeKey={location.pathname} onChange={(path) => navigate(path)} />
      <div className="main">
        <Routes>
          <Route path="/customer-os" element={<CustomerIntelligenceOS />} />
          <Route path="/" element={<LegacyPageEmbed label="Intelligence" />} />
          <Route path="/competitors" element={<LegacyPageEmbed label="Competitor Intelligence" />} />
          <Route path="/partners" element={<LegacyPageEmbed label="Partner Network" />} />
          <Route path="/sentiment" element={<SentimentPage />} />
          <Route path="/customer-intelligence" element={<LegacyPageEmbed label="Customer Intelligence" />} />
          <Route path="/team-actions" element={<LegacyPageEmbed label="Team Actions" />} />
          <Route path="/executive-summary" element={<ExecutiveSummaryPage />} />
          <Route path="/predictive" element={<PredictiveIntelligencePage />} />
          <Route path="/ai-discovery" element={<LegacyPageEmbed label="AI Discovery" />} />
          <Route path="/public-apis" element={<LegacyPageEmbed label="Public APIs" />} />
          <Route path="/roadmap" element={<LegacyPageEmbed label="Roadmap Tracker" />} />
        </Routes>
      </div>
    </div>
  )
}
