import { useNavigate } from 'react-router-dom'

export default function Home() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-12">
        <div className="text-7xl mb-4">☕</div>
        <h1 className="text-5xl font-bold text-amber-900 tracking-tight mb-3">Stamply</h1>
        <p className="text-amber-700 text-lg">Your loyalty, rewarded.</p>
      </div>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => navigate('/owner/login')}
          className="w-full bg-amber-800 text-white py-4 px-6 rounded-2xl text-lg font-semibold shadow-lg hover:bg-amber-900 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <span className="text-xl">🏪</span>
          I'm the Owner
        </button>

        <button
          onClick={() => navigate('/customer/login')}
          className="w-full bg-white text-amber-800 py-4 px-6 rounded-2xl text-lg font-semibold shadow-md border-2 border-amber-200 hover:border-amber-400 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <span className="text-xl">👤</span>
          I'm a Customer
        </button>
      </div>

      <p className="mt-12 text-amber-600 text-sm">
        Collect 5 stamps · Get a free drink ☕
      </p>
    </div>
  )
}
