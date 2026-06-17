import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import QRCode from 'react-qr-code'
import { supabase } from '../lib/supabase'

const CARD_SLOTS = 20

function formatDate(dateString) {
  return new Date(dateString).toLocaleString(undefined, {
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
  const [rewards, setRewards] = useState([])
  const [loading, setLoading] = useState(true)

  function handleLogout() {
    sessionStorage.removeItem('customerId')
    sessionStorage.removeItem('customerName')
    navigate('/')
  }

  useEffect(() => {
    async function loadData() {
      const [{ data: customerData }, { data: stampData }, { data: rewardData }] = await Promise.all([
        supabase.from('customers').select('*').eq('id', customerId).single(),
        supabase
          .from('stamps')
          .select('*')
          .eq('customer_id', customerId)
          .order('stamped_at', { ascending: false })
          .limit(20),
        supabase
          .from('rewards')
          .select('*')
          .eq('customer_id', customerId)
          .order('used_at', { ascending: false }),
      ])
      setCustomer(customerData)
      setStamps(stampData || [])
      setRewards(rewardData || [])
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
  const rewardsAvailable = Math.floor(stampCount / 5)
  const hasReward = rewardsAvailable > 0
  const progressOnCard = stampCount % 5
  const stampsLeft = hasReward ? 0 : 5 - progressOnCard
  const filledSlots = Math.min(stampCount, CARD_SLOTS)

  return (
    <div className="min-h-screen bg-amber-50">
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
        <div className="pt-1">
          <h2 className="text-2xl font-bold text-gray-900">
            Hi, {customer?.name}! 👋
          </h2>
          <p className="text-gray-500 text-sm">Here's your loyalty card</p>
        </div>

        {hasReward && (
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 text-white rounded-2xl p-5 text-center shadow-lg">
            <div className="text-4xl mb-2">🎉</div>
            <p className="font-bold text-xl">
              You have {rewardsAvailable} free drink{rewardsAvailable > 1 ? 's' : ''}!
            </p>
            <p className="text-amber-100 text-sm mt-1">
              Show this to the barista to redeem your reward.
            </p>
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-md p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 text-lg">My Stamp Card</h3>
            <span className="text-sm font-bold text-amber-800">
              {stampCount} total
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-4">
            {Array.from({ length: CARD_SLOTS }).map((_, i) => {
              const isFilled = i < filledSlots
              const isMilestone = (i + 1) % 5 === 0
              return (
                <div
                  key={i}
                  className={`h-12 w-full rounded-full flex items-center justify-center text-xl transition-all duration-300 relative ${
                    isFilled
                      ? 'bg-amber-100 border-2 border-amber-500 shadow-sm'
                      : 'border-2 border-dashed border-gray-200 bg-gray-50'
                  }`}
                >
                  {isFilled ? '☕' : ''}
                  {isMilestone && (
                    <span className="absolute -top-2 -right-2 text-base leading-none">🎁</span>
                  )}
                </div>
              )
            })}
          </div>

          <p className="text-center text-sm text-gray-500">
            {hasReward
              ? `🎁 You have ${rewardsAvailable} reward${rewardsAvailable > 1 ? 's' : ''} — show the barista!`
              : `${stampsLeft} more stamp${stampsLeft !== 1 ? 's' : ''} until your next free drink`}
          </p>

          <div className="mt-3 bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-amber-500 h-2 rounded-full transition-all duration-500"
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

        {customer?.phone && (
          <div className="bg-white rounded-3xl shadow-md p-6 text-center">
            <h3 className="font-bold text-gray-900 mb-1">My QR Code</h3>
            <p className="text-gray-500 text-sm mb-5">
              Show this to the barista to get a stamp
            </p>
            <div className="flex justify-center p-4 bg-white rounded-2xl border-2 border-amber-100">
              <QRCode
                value={`${window.location.origin}/request-stamp/${customer.phone}`}
                size={180}
                fgColor="#92400e"
              />
            </div>
            <p className="text-xs text-gray-400 mt-3 font-mono">{customer.phone}</p>
          </div>
        )}

        {rewards.length > 0 && (
          <div className="bg-white rounded-3xl shadow-md p-6">
            <h3 className="font-bold text-gray-900 mb-4">Reward History</h3>
            <div className="space-y-3">
              {rewards.map((reward, idx) => (
                <div key={reward.id} className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-base flex-shrink-0">
                    🎁
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">
                      Reward #{rewards.length - idx} redeemed
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {formatDate(reward.used_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
