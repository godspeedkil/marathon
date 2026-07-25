import { Routes, Route } from 'react-router'
import Header from './components/Header'
import Home from './pages/Home'
import EditSurvey from './pages/EditSurvey'
import TakeSurvey from './pages/TakeSurvey'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/survey/:surveyId/edit/:creatorSecret" element={<EditSurvey />} />
          <Route path="/survey/:surveyId" element={<TakeSurvey />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}
