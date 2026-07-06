import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/AuthContext'
import { ThemeProvider } from './lib/ThemeContext'

import Onboarding from './screens/Onboarding'
import Login from './screens/Login'
import ProfileSelector from './screens/ProfileSelector'
import Home from './screens/Home'
import AddTopic from './screens/AddTopic'
import TopicDetail from './screens/TopicDetail'
import RevisionSession from './screens/RevisionSession'
import Leaderboard from './screens/Leaderboard'
import Learn from './screens/Learn'
import NotificationSettings from './screens/NotificationSettings'
import Referral from './screens/Referral'
import ThemeSettings from './screens/ThemeSettings'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 font-sans text-sm">Loading...</div>
  return user ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profiles" element={<PrivateRoute><ProfileSelector /></PrivateRoute>} />
          <Route path="/home" element={<PrivateRoute><Home /></PrivateRoute>} />
          <Route path="/add-topic" element={<PrivateRoute><AddTopic /></PrivateRoute>} />
          <Route path="/topic/:id" element={<PrivateRoute><TopicDetail /></PrivateRoute>} />
          <Route path="/revise/:id" element={<PrivateRoute><RevisionSession /></PrivateRoute>} />
          <Route path="/leaderboard" element={<PrivateRoute><Leaderboard /></PrivateRoute>} />
          <Route path="/learn" element={<PrivateRoute><Learn /></PrivateRoute>} />
          <Route path="/settings/notifications" element={<PrivateRoute><NotificationSettings /></PrivateRoute>} />
          <Route path="/referral" element={<PrivateRoute><Referral /></PrivateRoute>} />
          <Route path="/settings/theme" element={<PrivateRoute><ThemeSettings /></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}
