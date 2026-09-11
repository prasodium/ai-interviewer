import { HashRouter, Routes, Route } from 'react-router-dom'
import { InterviewFlowProvider } from './state/InterviewFlowContext'
import Header from './components/Header'
import HomePage from './pages/HomePage'
import InterviewSetupPage from './pages/InterviewSetupPage'
import ResumePreviewPage from './pages/ResumePreviewPage'
import InterviewPage from './pages/InterviewPage'
import ResultsPage from './pages/ResultsPage'
import HistoryPage from './pages/HistoryPage'
import SettingsPage from './pages/SettingsPage'

export default function App(): JSX.Element {
  return (
    <InterviewFlowProvider>
      <HashRouter>
        <div className="app-shell">
          <Header />
          <main className="app-main">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/setup" element={<InterviewSetupPage />} />
              <Route path="/resume-preview" element={<ResumePreviewPage />} />
              <Route path="/interview" element={<InterviewPage />} />
              <Route path="/results/:interviewId" element={<ResultsPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </InterviewFlowProvider>
  )
}
