import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Change this to your desired owner password
const OWNER_PASSWORD = 'stamply'

export default function OwnerLogin() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function handleSubmit(e) {
    e.preventDefault()
    if (password === OWNER_PASSWORD) {
      sessionStorage.setItem('ownerAuth', 'true')
      navigate('/owner')
    } else {
      setError('Wrong password. Try again.')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate('/')}
          className="text-amber-700 mb-8 flex items-center gap-1 text-sm hover:text-amber-900 transition-colors"
        >
          ← Back
        </button>

        <div className="bg-white rounded-3xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🔐</div>
            <h2 className="text-2xl font-bold text-amber-900">Owner Access</h2>
            <p className="text-gray-500 text-sm mt-1">Enter your password to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError('') }}
              placeholder="Password"
              className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-800 focus:border-amber-400 focus:outline-none text-lg"
              autoFocus
            />

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              className="w-full bg-amber-800 text-white py-3 rounded-xl text-lg font-semibold hover:bg-amber-900 active:scale-95 transition-all"
            >
              Enter
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Default password: <span className="font-mono">stamply</span>
        </p>
      </div>
    </div>
  )
}
