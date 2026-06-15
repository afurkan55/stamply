import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizePhone } from '../lib/utils'
import QrScanner from '../components/QrScanner'

const msgColors = {
  success: 'bg-green-50 text-green-700 border border-green-200',
  error: 'bg-red-50 text-red-700 border border-red-200',
  warn: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export default function OwnerPanel() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('search')

  // --- Search tab ---
  const [searchPhone, setSearchPhone] = useState('')
  const [foundCustomer, setFoundCustomer] = useState(null)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [actionMsg, setActionMsg] = useState({ text: '', type: '' })
  const [stampLoading, setStampLoading] = useState(false)
  const [rewardLoading, setRewardLoading] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // --- Add customer tab ---
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [addLoading, setAddLoading] = useState(false)
  const [addMsg, setAddMsg] = useState({ text: '', type: '' })

  // --- All customers tab ---
  const [customers, setCustomers] = useState([])
  const [customersLoading, setCustomersLoading] = useState(false)

  function handleLogout() {
    sessionStorage.removeItem('ownerAuth')
    navigate('/')
  }

  // ====================================================
  // SEARCH
  // ====================================================
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

  function handleQrScan(phone) {
    setShowScanner(false)
    searchByPhone(phone)
  }

  // ====================================================
  // ADD STAMP
  // ====================================================
  async function addStamp() {
    if (!foundCustomer) return
    if (foundCustomer.stamp_count >= 5) {
      setActionMsg({ text: 'Stamp card is full. Use the reward first.', type: 'warn' })
      return
    }
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

    const { data, error: updateError } = await supabase
      .from('customers')
      .update({ stamp_count: foundCustomer.stamp_count + 1 })
      .eq('id', foundCustomer.id)
      .select()
      .single()

    setStampLoading(false)
    if (updateError) {
      setActionMsg({ text: 'Stamp saved but count update failed.', type: 'error' })
    } else {
      setFoundCustomer(data)
      setActionMsg({
        text: data.stamp_count >= 5
          ? `🎉 ${data.name} has earned a free drink!`
          : `Stamp added! ${data.name} has ${data.stamp_count}/5 stamps.`,
        type: 'success',
      })
    }
  }

  // ====================================================
  // USE REWARD
  // ====================================================
  async function markRewardUsed() {
    if (!foundCustomer || foundCustomer.stamp_count < 5) return
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
      .update({ stamp_count: 0, total_rewards: (foundCustomer.total_rewards || 0) + 1 })
      .eq('id', foundCustomer.id)
      .select()
      .single()

    setRewardLoading(false)
    if (updateError) {
      setActionMsg({ text: 'Reward recorded but update failed.', type: 'error' })
    } else {
      setFoundCustomer(data)
      setActionMsg({ text: `✅ Reward used! ${data.name}'s card has been reset.`, type: 'success' })
    }
  }

  // ====================================================
  // ADD CUSTOMER
  // ====================================================
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

  // ====================================================
  // ALL CUSTOMERS
  // ====================================================
  async function loadCustomers() {
    setCustomersLoading(true)
    const { data } = await supabase.from('customers').select('*').order('name')
    setCustomers(data || [])
    setCustomersLoading(false)
  }

  useEffect(() => {
    if (activeTab === 'customers') loadCustomers()
  }, [activeTab])

  const hasReward = foundCustomer && foundCustomer.stamp_count >= 5

  const tabs = [
    { id: 'search', icon: '🔍', label: 'Search' },
    { id: 'add', icon: '➕', label: 'New' },
    { id: 'customers', icon: '👥', label: 'Customers' },
  ]

  return (
    <>
      <div className="min-h-screen bg-amber-50">
        {/* Header */}
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

        {/* Tabs */}
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

          {/* ===== SEARCH TAB ===== */}
          {activeTab === 'search' && (
            <div className="space-y-4 pt-2">
              {/* QR Scan button */}
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
                <div className="bg-white rounded-3xl shadow-md p-6 space-y-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{foundCustomer.name}</h3>
                      <p className="text-gray-500 text-sm">{foundCustomer.phone}</p>
                      <p className="text-gray-400 text-xs mt-1">
                        Rewards redeemed: {foundCustomer.total_rewards || 0}
                      </p>
                    </div>
                    {hasReward && (
                      <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded-full animate-pulse">
                        🎉 REWARD!
                      </span>
                    )}
                  </div>

                  <div>
                    <p className="text-sm text-gray-500 mb-3">
                      Stamps: <strong className="text-amber-800">{foundCustomer.stamp_count}/5</strong>
                    </p>
                    <div className="flex gap-3">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                            i < foundCustomer.stamp_count
                              ? 'bg-amber-700 shadow-md'
                              : 'border-2 border-dashed border-gray-200'
                          }`}
                        >
                          {i < foundCustomer.stamp_count ? '☕' : ''}
                        </div>
                      ))}
                    </div>
                  </div>

                  {actionMsg.text && (
                    <div className={`text-sm p-3 rounded-xl ${msgColors[actionMsg.type]}`}>
                      {actionMsg.text}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={addStamp}
                      disabled={stampLoading || foundCustomer.stamp_count >= 5}
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

                  {foundCustomer.stamp_count >= 5 && (
                    <p className="text-amber-600 text-xs text-center">
                      Card full — use the reward to reset and keep stamping!
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ===== ADD CUSTOMER TAB ===== */}
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

          {/* ===== ALL CUSTOMERS TAB ===== */}
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
                customers.map(customer => (
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
                              i < customer.stamp_count ? 'bg-amber-600' : 'border border-gray-200'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400">
                        {customer.stamp_count}/5 · {customer.total_rewards || 0} rewards
                      </p>
                      {customer.stamp_count >= 5 && (
                        <p className="text-xs text-amber-600 font-semibold">🎁 Ready!</p>
                      )}
                    </div>
                  </div>
                ))
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
