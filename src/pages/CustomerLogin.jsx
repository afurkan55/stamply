import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/utils'

export default function CustomerLogin() {
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  async function handleLogin(e) {
    e.preventDefault()
    if (!phone.trim()) return
    setLoading(true)
    setError('')

    const { data, error } = await supabase
      .from('customers')
      .select('id, name')
      .eq('phone', normalizePhone(phone))
      .single()

    setLoading(false)
    if (error || !data) {
      setError("We couldn't find your number. Ask the cafe to register you!")
    } else {
      sessionStorage.setItem('customerId', data.id)
      sessionStorage.setItem('customerName', data.name)
      navigate('/customer')
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
            <div className="text-4xl mb-3">☕</div>
            <h2 className="text-2xl font-bold text-amber-900">Welcome Back!</h2>
            <p className="text-gray-500 text-sm mt-1">
              Enter your phone number to see your stamps
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="tel"
              value={phone}
              onChange={e => { setPhone(e.target.value); setError('') }}
              placeholder="Your phone number"
              className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-800 focus:border-amber-400 focus:outline-none text-lg"
              autoFocus
            />

            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || !phone.trim()}
              className="w-full bg-amber-800 text-white py-3 rounded-xl text-lg font-semibold hover:bg-amber-900 active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Checking...' : 'View My Card'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
