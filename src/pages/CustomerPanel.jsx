import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabase'

function formatDate(dateString) {
  return new Date(dateString).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function CustomerPanel() {
  const navigate = useNavigate()
  const customerId = sessionStorage.getItem('customerId')

  const [customer, setCustomer] = useState(null)
  const [stamps, setStamps] = useState([])
  const [loading, setLoading] = useState(true)

  function handleLogout() {
    sessionStorage.removeItem('customerId')
    sessionStorage.removeItem('customerName')
    navigate('/')
  }

  useEffect(() => {
    async function loadData() {
      const [{ data: customerData }, { data: stampData }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', customerId).single(),
        supabase
          .from('stamps')
          .select('*')
          .eq('customer_id', customerId)
          .order('stamped_at', { ascending: false })
          .limit(20),
      ])
      setCustomer(customerData)
      setStamps(stampData || [])
      setLoading(false)
    }
    loadData()
  }, [customerId])

  if (loading) {
    return (
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">☕</div>
          <p className="text-amber-700">Loading your card...</p>
        </div>
      </div>
    )
  }

  const stampCount = customer?.stamp_count || 0
  const totalRewards = customer?.total_rewards || 0
  const hasReward = stampCount >= 5
  const progressOnCard = Math.min(stampCount, 5)
  const stampsLeft = 5 - progressOnCard

  return (
    <div className="min-h-screen bg-amber-50">
      {/* Header */}
      <header className="bg-amber-800 text-white px-4 py-4 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-xl">☕</span>
          <span className="font-bold">Stamply</span>
        </div>
        <button
          onClick={handleLogout}
          className="text-amber-200 hover:text-white text-sm transition-colors"
        >
          Logout
        </button>
      </header>

      <div className="p-4 max-w-lg mx-auto space-y-4 pb-10">
        {/* Greeting */}
        <div className="pt-1">
          <h2 className="text-2xl font-bold text-gray-900">
            Hi, {customer?.name}! 👋
          </h2>
          <p className="text-gray-500 text-sm">Here's your loyalty card</p>
        </div>

        {/* Reward Banner */}
        {hasReward && (
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-2xl p-5 text-center shadow-lg">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-xl">You have a free drink!</p>
            <p className="text-amber-100 text-sm mt-1">
              Show this to the barista to redeem your reward.
            </p>
          </div>
        )}

        {/* Stamp Card */}
        <div className="bg-white rounded-3xl shadow-md p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-900 text-lg">My Stamp Card</h3>
            <span className="text-2xl font-bold text-amber-800">
              {progressOnCard}/5
            </span>
          </div>

          {/* Stamp circles */}
          <div className="flex gap-3 justify-center mb-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all duration-300 ${
                  i < progressOnCard
                    ? 'bg-amber-700 shadow-lg'
                    : 'border-2 border-dashed border-gray-200 bg-gray-50'
                }`}
              >
                {i < progressOnCard ? '☕' : ''}
              </div>
            ))}
          </div>

          {/* Progress message */}
          <p className="text-center text-sm text-gray-500">
            {hasReward
              ? '🎁 You have a reward — show it to the barista!'
              : `${stampsLeft} more stamp${stampsLeft !== 1 ? 's' : ''} until your free drink`}
          </p>

          {/* Progress bar */}
          <div className="mt-4 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${(progressOnCard / 5) * 100}%` }}
            />
          </div>

          {stampCount > 0 && (
            <p className="text-center text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
              {totalRewards > 0
                ? `${stampCount} stamps total · ${totalRewards} reward${totalRewards !== 1 ? 's' : ''} redeemed ❤️`
                : `${stampCount} stamp${stampCount !== 1 ? 's' : ''} total`}
            </p>
          )}
        </div>

        {/* QR Code */}
        {customer?.phone && (
          <div className="bg-white rounded-3xl shadow-md p-6 text-center">
            <h3 className="font-bold text-gray-900 mb-1">My QR Code</h3>
            <p className="text-gray-500 text-sm mb-5">
              Show this to the barista to request a stamp
            </p>
            <div className="flex justify-center p-4 bg-white rounded-2xl border-2 border-amber-100 inline-block mx-auto">
              <QRCode
                value={`${window.location.origin}/request-stamp/${customer.phone}`}
                size={180}
                fgColor="#92400e"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 font-mono">{customer.phone}</p>
          </div>
        )}

        {/* Stamp History */}
        <div className="bg-white rounded-3xl shadow-md p-6">
          <h3 className="font-bold text-gray-900 mb-4">Stamp History</h3>

          {stamps.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <p className="text-3xl mb-2">☕</p>
              <p className="text-sm">No stamps yet — come visit us!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stamps.map((stamp, idx) => (
                <div key={stamp.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center text-base flex-shrink-0">
                    ☕
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      Stamp #{stamps.length - idx}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {formatDate(stamp.stamped_at)}
                    </p>
                    {stamp.note && (
                      <p className="text-xs text-amber-600 italic mt-0.5">{stamp.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
