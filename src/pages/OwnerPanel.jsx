import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/utils'
import QrScanner from '../components/QrScanner'

const CARD_SLOTS = 20

const msgColors = {
  success: 'bg-green-50 text-green-700 border border-green-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  warn: 'bg-amber-50 text-amber-700 border border-amber-200',
}

function rewardsAvailable(customer) {
  if (!customer) return 0
  return Math.floor(customer.stamp_count / 5) - (customer.total_rewards || 0)
}

function StampGrid({ stampCount }) {
  const filled = Math.min(stampCount, CARD_SLOTS)
  return (
    <div className="grid grid-cols-5 gap-2">
      {Array.from({ length: CARD_SLOTS }).map((_, i) => {
        const isFilled = i < filled
        const isMilestone = (i + 1) % 5 === 0
        return (
          <div
            key={i}
            className={`h-10 w-10 rounded-full flex items-center justify-center text-base transition-all relative ${
              isFilled
                ? 'bg-amber-100 border-2 border-amber-500 shadow-sm'
                : 'border-2 border-dashed border-gray-200 bg-gray-50'
            }`}
          >
            {isFilled ? '☕' : ''}
            {isMilestone && (
              <span className="absolute -top-1 -right-1 text-[9px] leading-none">🎁</span>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function OwnerPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('search')

  const [searchPhone, setSearchPhone] = useState('')
  const [foundCustomer, setFoundCustomer] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' })
  const [stampLoading, setStampLoading] = useState(false)
  const [rewardLoading, setRewardLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addMsg, setAddMsg] = useState({ text: '', type: '' })

  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)

  function handleLogout() {
    sessionStorage.removeItem('ownerAuth')
    navigate('/')
  }

  async function searchByPhone(phone) {
    const normalized = normalizePhone(phone)
    if (!normalized) return
    setSearchPhone(normalized)
    setSearchLoading(true)
    setSearchError('')
    setFoundCustomer(null)
    setActionMsg({ text: '', type: '' })

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', normalized)
      .single()

    setSearchLoading(false)
    if (error || !data) {
      setSearchError('No customer found with that phone number.')
    } else {
      setFoundCustomer(data)
    }
  }

  async function searchCustomer(e) {
    e.preventDefault()
    await searchByPhone(searchPhone)
  }

  async function handleQrScan(phone) {
    setShowScanner(false)
    const normalized = normalizePhone(phone)
    if (!normalized) return

    setSearchPhone(normalized)
    setSearchLoading(true)
    setSearchError('')
    setFoundCustomer(null)
    setActionMsg({ text: '', type: '' })

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('phone', normalized)
      .single()

    setSearchLoading(false)

    if (error || !data) {
      setSearchError('No customer found with that phone number.')
      return
    }

    await supabase.from('stamps').insert({
      customer_id: data.id,
      stamped_at: new Date().toISOString(),
    })

    const newCount = data.stamp_count + 1
    const { data: updated } = await supabase
      .from('customers')
      .update({ stamp_count: newCount })
      .eq('id', data.id)
      .select()
      .single()

    setFoundCustomer(updated)
    const available = rewardsAvailable(updated)
    setActionMsg({
      text: available > 0
        ? `🎉 Stamp added! ${updated.name} has ${available} reward${available > 1 ? 's' : ''} available!`
        : `✅ Stamp added! ${updated.name} has ${newCount % 5}/5 stamps toward next reward.`,
      type: 'success',
    })
  }

  async function addStamp() {
    if (!foundCustomer) return
    setStampLoading(true)
    setActionMsg({ text: '', type: '' })

    const { error: stampError } = await supabase
      .from('stamps')
      .insert({ customer_id: foundCustomer.id, stamped_at: new Date().toISOString() })

    if (stampError) {
      setActionMsg({ text: 'Error adding stamp.', type: 'error' })
      setStampLoading(false)
      return
    }

    const newCount = foundCustomer.stamp_count + 1
    const { data, error: updateError } = await supabase
      .from('customers')
      .update({ stamp_count: newCount })
      .eq('id', foundCustomer.id)
      .select()
      .single()

    setStampLoading(false)
    if (updateError) {
      setActionMsg({ text: 'Stamp saved but count update failed.', type: 'error' })
    } else {
      setFoundCustomer(data)
      const available = rewardsAvailable(data)
      setActionMsg({
        text: available > 0
          ? `🎉 Stamp added! ${data.name} has ${available} reward${available > 1 ? 's' : ''} available!`
          : `✅ Stamp added! ${data.name} has ${newCount % 5}/5 stamps toward next reward.`,
        type: 'success',
      })
    }
  }

  async function markRewardUsed() {
    const available = rewardsAvailable(foundCustomer)
    if (!foundCustomer || available <= 0) return
    setRewardLoading(true)
    setActionMsg({ text: '', type: '' })

    const { error: rewardError } = await supabase
      .from('rewards')
      .insert({ customer_id: foundCustomer.id, used_at: new Date().toISOString() })

    if (rewardError) {
      setActionMsg({ text: 'Error recording reward.', type: 'error' })
      setRewardLoading(false)
      return
    }

    const { data, error: updateError } = await supabase
      .from('customers')
      .update({ total_rewards: (foundCustomer.total_rewards || 0) + 1 })
      .eq('id', foundCustomer.id)
      .select()
      .single()

    setRewardLoading(false)
    if (updateError) {
      setActionMsg({ text: 'Reward recorded but update failed.', type: 'error' })
    } else {
      setFoundCustomer(data)
      const stillAvailable = rewardsAvailable(data)
      setActionMsg({
        text: stillAvailable > 0
          ? `✅ Reward used! ${data.name} still has ${stillAvailable} more reward${stillAvailable > 1 ? 's' : ''}.`
          : `✅ Reward used! ${data.name}'s card continues.`,
        type: 'success',
      })
    }
  }

  async function addCustomer(e) {
    e.preventDefault()
    if (!newName.trim() || !newPhone.trim()) return
    setAddLoading(true)
    setAddMsg({ text: '', type: '' })

    const normalized = normalizePhone(newPhone)

    const { data: existing } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', normalized)
      .maybeSingle()

    if (existing) {
      setAddMsg({ text: 'A customer with that phone number already exists.', type: 'error' })
      setAddLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({ name: newName.trim(), phone: normalized, stamp_count: 0, total_rewards: 0 })
      .select()
      .single()

    setAddLoading(false)
    if (error) {
      setAddMsg({ text: 'Error adding customer.', type: 'error' })
    } else {
      setAddMsg({ text: `${data.name} added successfully!`, type: 'success' })
      setNewName('')
      setNewPhone('')
    }
  }

  async function loadCustomers() {
    setCustomersLoading(true)
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
    setCustomersLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'customers') loadCustomers()
  }, [activeTab])

  const hasReward = rewardsAvailable(foundCustomer) > 0

  const tabs = [
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'add', icon: '➕', label: 'New' },
    { id: 'customers', icon: '👥', label: 'Customers' },
  ]

  return (
    <>
      <div className="min-h-screen bg-amber-50">
        <header className="bg-amber-800 text-white px-4 py-4 flex items-center justify-between shadow-md sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <span className="text-2xl">☕</span>
            <span className="font-bold text-lg">Stamply</span>
            <span className="text-amber-300 text-xs bg-amber-900 px-2 py-0.5 rounded-full ml-1">Owner</span>
          </div>
          <button onClick={handleLogout} className="text-amber-200 hover:text-white text-sm transition-colors">
            Logout
          </button>
        </header>

        <div className="flex bg-white border-b border-amber-100 sticky top-16 z-10 shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-3 transition-colors ${
                activeTab === tab.id
                  ? 'text-amber-800 border-b-2 border-amber-800'
                  : 'text-gray-400 hover:text-amber-700'
              }`}
            >
              <span className="text-base block">{tab.icon}</span>
              <span className="text-xs font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 max-w-lg mx-auto pb-10">

          {activeTab === 'search' && (
            <div className="space-y-4 pt-2">
              <button
                onClick={() => setShowScanner(true)}
                className="w-full bg-amber-700 text-white py-4 rounded-xl font-semibold hover:bg-amber-800 active:scale-95 transition-all flex items-center justify-center gap-2 text-base"
              >
                📷 Scan Customer QR
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or search by phone</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <form onSubmit={searchCustomer} className="flex gap-2">
                <input
                  type="tel"
                  value={searchPhone}
                  onChange={e => { setSearchPhone(e.target.value); setSearchError('') }}
                  placeholder="Enter phone number..."
                  className="flex-1 border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-800 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={searchLoading || !searchPhone.trim()}
                  className="bg-amber-800 text-white px-5 rounded-xl font-semibold hover:bg-amber-900 transition-colors disabled:opacity-50"
                >
                  {searchLoading ? '...' : 'Find'}
                </button>
              </form>

              {searchError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
                  {searchError}
                </div>
              )}

              {foundCustomer && (
                <div className="bg-white rounded-3xl shadow-md p-5 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{foundCustomer.name}</h3>
                      <p className="text-gray-500 text-sm">{foundCustomer.phone}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        {foundCustomer.stamp_count} stamps · {foundCustomer.total_rewards || 0} rewards redeemed
                      </p>
                    </div>
                    {hasReward && (
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                        🎉 REWARD!
                      </span>
                    )}
                  </div>

                  <StampGrid stampCount={foundCustomer.stamp_count} />

                  <p className="text-xs text-gray-400 text-center">
                    🎁 = reward at every 5 stamps
                  </p>

                  {actionMsg.text && (
                    <div className={`text-sm p-3 rounded-xl ${msgColors[actionMsg.type]}`}>
                      {actionMsg.text}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={addStamp}
                      disabled={stampLoading}
                      className="bg-amber-700 text-white py-3 rounded-xl font-semibold hover:bg-amber-800 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {stampLoading ? 'Adding...' : '☕ Add Stamp'}
                    </button>
                    <button
                      onClick={markRewardUsed}
                      disabled={rewardLoading || !hasReward}
                      className="bg-green-600 text-white py-3 rounded-xl font-semibold hover:bg-green-700 active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {rewardLoading ? 'Processing...' : '🎁 Use Reward'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="bg-white rounded-3xl shadow-md p-6 mt-2">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Register New Customer</h3>
              <form onSubmit={addCustomer} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={e => { setNewName(e.target.value); setAddMsg({ text: '', type: '' }) }}
                    placeholder="e.g. Sarah Johnson"
                    className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-800 focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={e => { setNewPhone(e.target.value); setAddMsg({ text: '', type: '' }) }}
                    placeholder="e.g. 0555 123 4567"
                    className="w-full border-2 border-gray-200 rounded-xl py-3 px-4 text-gray-800 focus:border-amber-400 focus:outline-none"
                    required
                  />
                </div>
                {addMsg.text && (
                  <div className={`text-sm p-3 rounded-xl ${msgColors[addMsg.type]}`}>
                    {addMsg.text}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={addLoading || !newName.trim() || !newPhone.trim()}
                  className="w-full bg-amber-800 text-white py-3 rounded-xl font-semibold hover:bg-amber-900 active:scale-95 transition-all disabled:opacity-50"
                >
                  {addLoading ? 'Registering...' : 'Register Customer'}
                </button>
              </form>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="mt-2 space-y-3">
              <div className="flex items-center justify-between py-1">
                <h3 className="font-bold text-gray-900">
                  Customers{customers.length > 0 ? ` (${customers.length})` : ''}
                </h3>
                <button
                  onClick={loadCustomers}
                  disabled={customersLoading}
                  className="text-amber-700 text-sm hover:text-amber-900 disabled:opacity-50"
                >
                  {customersLoading ? 'Loading...' : '↺ Refresh'}
                </button>
              </div>

              {customersLoading && customers.length === 0 ? (
                <div className="text-center py-14 text-gray-400">Loading...</div>
              ) : customers.length === 0 ? (
                <div className="text-center py-14 text-gray-400">
                  <p className="text-4xl mb-3">☕</p>
                  <p>No customers yet.</p>
                </div>
              ) : (
                customers.map(customer => {
                  const available = rewardsAvailable(customer)
                  const progress = customer.stamp_count % 5
                  return (
                    <div key={customer.id} className="bg-white rounded-2xl shadow-sm p-4 flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{customer.name}</p>
                        <p className="text-gray-500 text-sm">{customer.phone}</p>
                      </div>
                      <div className="text-right">
                        <div className="flex gap-1 justify-end mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-5 h-5 rounded-full ${
                                i < (available > 0 ? 5 : progress) ? 'bg-amber-500' : 'border border-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                        <p className="text-xs text-gray-400">
                          {customer.stamp_count} stamps · {customer.total_rewards || 0} redeemed
                        </p>
                        {available > 0 && (
                          <p className="text-xs text-amber-600 font-semibold">🎁 {available} reward{available > 1 ? 's' : ''}!</p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {showScanner && (
        <QrScanner
          onScan={handleQrScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  )
}
