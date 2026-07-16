import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ProProvider } from './lib/ProContext'
import { ThemeProvider } from './lib/ThemeContext'
import AppToaster from './lib/AppToaster'

import Onboarding from './screens/Onboarding'
import Login from './screens/Login'
import ProfileSelector from './screens/ProfileSelector'
import Home from './screens/Home'
import Topics from './screens/Topics'
import Progress from './screens/Progress'
import AddTopic from './screens/AddTopic'
import ScanSyllabus from './screens/ScanSyllabus'
import Plan from './screens/Plan'
import ExamRecap from './screens/ExamRecap'
import TopicDetail from './screens/TopicDetail'
import RevisionSession from './screens/RevisionSession'
import Leaderboard from './screens/Leaderboard'
import Learn from './screens/Learn'
import NotificationSettings from './screens/NotificationSettings'
import Referral from './screens/Referral'
import ThemeSettings from './screens/ThemeSettings'
import StudyPlanSettings from './screens/StudyPlanSettings'
import Settings from './screens/Settings'
import ManageSubjects from './screens/ManageSubjects'
import SharedTopic from './screens/SharedTopic'
import Paywall from './screens/Paywall'
import { UpsellProvider } from './lib/ProUpsell'

// Routes the app when a notification is tapped while it's already open.
// The service worker can't navigate an existing window on iOS (Safari has no
// WindowClient.navigate), so sw.js posts { type: 'open-url', url } instead
// and this component runs the client-side router.
function PushNavigator() {
  const navigate = useNavigate()
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (e) => {
      const url = e.data?.type === 'open-url' ? e.data.url : null
      if (typeof url === 'string' && url.startsWith('/')) navigate(url)
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    return () => navigator.serviceWorker.removeEventListener('message', onMessage)
  }, [navigate])
  return null
}

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-sans text-sm">Loading...</div>
  return user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ProProvider>
      <ThemeProvider>
      <MotionConfig reducedMotion="user">
      <AppToaster />
      <BrowserRouter>
        <PushNavigator />
        <UpsellProvider>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/s/:token" element={<SharedTopic />} />
          <Route path="/profiles" element={<PrivateRoute><ProfileSelector /></PrivateRoute>} />
          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/topics" element={<PrivateRoute><Topics /></PrivateRoute>} />
          <Route path="/progress" element={<PrivateRoute><Progress /></PrivateRoute>} />
          <Route path="/add-topic" element={<PrivateRoute><AddTopic /></PrivateRoute>} />
          <Route path="/scan" element={<PrivateRoute><ScanSyllabus /></PrivateRoute>} />
          <Route path="/plan" element={<PrivateRoute><Plan /></PrivateRoute>} />
          <Route path="/exam-recap" element={<PrivateRoute><ExamRecap /></PrivateRoute>} />
          <Route path="/topic/:id" element={<PrivateRoute><TopicDetail /></PrivateRoute>} />
          <Route path="/revise/:id" element={<PrivateRoute><RevisionSession /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/learn" element={<PrivateRoute><Learn /></PrivateRoute>} />
          <Route path="/settings/notifications" element={<PrivateRoute><NotificationSettings /></PrivateRoute>} />
          <Route path="/referral" element={<PrivateRoute><Referral /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/settings/subjects" element={<PrivateRoute><ManageSubjects /></PrivateRoute>} />
          <Route path="/settings/theme" element={<PrivateRoute><ThemeSettings /></PrivateRoute>} />
          <Route path="/settings/study-plan" element={<PrivateRoute><StudyPlanSettings /></PrivateRoute>} />
          <Route path="/pro" element={<PrivateRoute><Paywall /></PrivateRoute>} />
        </Routes>
        </UpsellProvider>
      </BrowserRouter>
      </MotionConfig>
      </ThemeProvider>
      </ProProvider>
    </AuthProvider>
  )
}
