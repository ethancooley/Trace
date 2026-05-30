import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Callback from './pages/Callback'
import Dashboard from './pages/Dashboard'

const isAuthenticated = () => !!localStorage.getItem('strava_access_token')

function PrivateRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/callback" element={<Callback />} />
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />
      </Routes>
    </BrowserRouter>
  )
}
