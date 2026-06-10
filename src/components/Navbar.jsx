import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
  const { pathname } = useLocation()

  return (
    <nav className="bg-dark-800 border-b border-dark-600 sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-4 flex items-center justify-between h-14">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <span className="text-2xl">🏆</span>
          <span>WC26 <span className="text-gold-500">Fantasy</span></span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <Link
            to="/"
            className={pathname === '/' ? 'text-gold-500 font-semibold' : 'text-gray-400 hover:text-white transition-colors'}
          >
            Leaderboard
          </Link>
          <Link
            to="/admin"
            className={pathname === '/admin' ? 'text-gold-500 font-semibold' : 'text-gray-400 hover:text-white transition-colors'}
          >
            Admin
          </Link>
        </div>
      </div>
    </nav>
  )
}
