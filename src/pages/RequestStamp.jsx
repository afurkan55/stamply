import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Screen({ icon, title, subtitle, children, pulse, bounce }) {
  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-sm w-full">
        <div className={`text-7xl mb-6 ${bounce ? 'animate-bounce' : ''}`}>{icon}</div>
        <h2 className={`text-2xl font-bold text-gray-900 mb-2 ${pulse ? 'animate-pulse' : ''}`}>
          {title}
        </h2>
        <p className="text-gray-500 leading-relaxed">{subtitle}</p>
        {children}
      </div>
    </div>
  )
}

export default function RequestStamp() {
  const { phone } = useParams()
  const navigate = useNavigate()
  // states: loading | waiting | approved | rejected | full | notfound | error
  const [state, setState] = useState('loading')
  const [customerName, setCustomerName] = useState('')
  const channelRef = useRef(null)

  useEffect(() => {
    let mounted = true

    async function init() {
      // 1. Look up customer by phone
      const { data: customer, error } = await supabase
        .from('customers')
        .select('id, name, stamp_count')
        .eq('phone', phone)
        .single()

      if (!mounted) return

      if (error || !customer) {
        setState('notfound')
        return
      }

      setCustomerName(customer.name)

      // 2. Block if card is full
      if (customer.stamp_count >= 5) {
        setState('full')
        return
      }

      // 3. Check for existing pending request (prevents duplicates on refresh)
      const { data: existing } = await supabase
        .from('stamp_requests')
        .select('id')
        .eq('customer_id', customer.id)
        .eq('status', 'pending')
        .maybeSingle()

      if (!mounted) return

      let reqId

      if (existing) {
        reqId = existing.id
      } else {
        const { data: newReq, error: insertErr } = await supabase
          .from('stamp_requests')
          .insert({
            customer_id: customer.id,
            customer_name: customer.name,
            phone,
            status: 'pending',
          })
          .select('id')
          .single()

        if (!mounted) return

        if (insertErr) {
          setState('error')
          return
        }

        reqId = newReq.id
      }

      if (!mounted) return
      setState('waiting')

      // 4. Subscribe to real-time status changes on this request
      channelRef.current = supabase
        .channel(`stamp_req_${reqId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'stamp_requests',
            filter: `id=eq.${reqId}`,
          },
          (payload) => {
            if (!mounted) return
            const newStatus = payload.new?.status
            if (newStatus === 'approved') setState('approved')
            else if (newStatus === 'rejected') setState('rejected')
          }
        )
        .subscribe()
    }

    init()

    return () => {
      mounted = false
      channelRef.current?.unsubscribe()
    }
  }, [phone])

  if (state === 'loading') {
    return <Screen icon="☕" title="Loading..." subtitle="One moment please." pulse />
  }

  if (state === 'notfound') {
    return (
      <Screen
        icon="😕"
        title="Not Registered"
        subtitle="Your phone number isn't in our system. Ask the barista to register you first!"
      >
        <button
          onClick={() => navigate('/')}
          className="mt-6 text-amber-700 underline text-sm"
        >
          Go to homepage
        </button>
      </Screen>
    )
  }

  if (state === 'full') {
    return (
      <Screen
        icon="🎁"
        title="Your Card is Full!"
        subtitle={`Hi ${customerName}! You already have a free drink waiting. Ask the barista to redeem it first.`}
      >
        <button
          onClick={() => navigate('/customer/login')}
          className="mt-6 bg-amber-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
        >
          View My Card
        </button>
      </Screen>
    )
  }

  if (state === 'error') {
    return (
      <Screen icon="⚠️" title="Something went wrong" subtitle="Please try again.">
        <button
          onClick={() => window.location.reload()}
          className="mt-6 bg-amber-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
        >
          Retry
        </button>
      </Screen>
    )
  }

  if (state === 'waiting') {
    return (
      <Screen
        icon="⏳"
        title="Waiting for approval..."
        subtitle={`Hi ${customerName}! Your stamp request has been sent to the barista. ☕`}
        pulse
      >
        <div className="mt-6 flex justify-center gap-1.5">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">This page updates automatically</p>
      </Screen>
    )
  }

  if (state === 'approved') {
    return (
      <Screen
        icon="✅"
        title="Stamp Added!"
        subtitle={`Great job, ${customerName}! Keep collecting — 5 stamps = free drink! ☕`}
        bounce
      >
        <button
          onClick={() => navigate('/customer/login')}
          className="mt-6 bg-amber-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
        >
          View My Card
        </button>
      </Screen>
    )
  }

  if (state === 'rejected') {
    return (
      <Screen
        icon="❌"
        title="Request Declined"
        subtitle="The barista declined this request. Please try again or ask for help."
      >
        <button
          onClick={() => window.location.reload()}
          className="mt-6 bg-amber-800 text-white px-6 py-2.5 rounded-xl text-sm font-semibold"
        >
          Try Again
        </button>
      </Screen>
    )
  }

  return null
}
