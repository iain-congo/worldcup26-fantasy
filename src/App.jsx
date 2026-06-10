import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import ManagerDetail from './pages/ManagerDetail.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <div className="min-h-screen bg-dark-900">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<Leaderboard />} />
          <Route path="/manager/:name" element={<ManagerDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  )
}
