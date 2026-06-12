import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'
import { normalizePhone } from '../lib/utils'

const ELEMENT_ID = 'stamply-qr-reader'

export default function QrScanner({ onScan, onClose }) {
  const [errorMsg, setErrorMsg] = useState('')
  const qrRef = useRef(null)
  const activeRef = useRef(false)

  useEffect(() => {
    let instance

    async function start() {
      try {
        instance = new Html5Qrcode(ELEMENT_ID)
        qrRef.current = instance

        await instance.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (text) => {
            if (!activeRef.current) return
            handleDecoded(text, instance)
          },
          () => {} // per-frame misses — ignore
        )
        activeRef.current = true
      } catch (err) {
        const msg = err?.message ?? ''
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('denied')) {
          setErrorMsg('Camera permission denied. Please allow camera access in your browser settings.')
        } else if (msg.toLowerCase().includes('no cameras')) {
          setErrorMsg('No camera found on this device.')
        } else {
          setErrorMsg('Could not start camera. Make sure no other app is using it.')
        }
      }
    }

    start()

    return () => {
      activeRef.current = false
      qrRef.current?.stop().catch(() => {})
    }
  }, [])

  function handleDecoded(text, instance) {
    // Extract phone from URL: …/request-stamp/PHONE
    const match = text.match(/\/request-stamp\/([^?#/\s]+)/)
    if (!match) {
      setErrorMsg('Not a Stamply QR code. Please scan a customer QR.')
      return
    }

    const phone = normalizePhone(decodeURIComponent(match[1]))
    activeRef.current = false
    instance.stop().catch(() => {}).finally(() => onScan(phone))
  }

  async function close() {
    activeRef.current = false
    await qrRef.current?.stop().catch(() => {})
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-end sm:items-center justify-center">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-sm overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <h3 className="font-bold text-gray-900">📷 Scan Customer QR</h3>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Camera area */}
        <div className="px-4 pt-4 pb-2">
          {errorMsg ? (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-xl p-4 text-sm text-center mb-3">
              <p>{errorMsg}</p>
              <button
                onClick={() => { setErrorMsg(''); window.location.reload() }}
                className="mt-2 text-xs underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <p className="text-gray-500 text-sm text-center mb-3">
              Point the camera at the customer's QR code
            </p>
          )}

          {/* html5-qrcode renders its camera feed inside this div */}
          <div
            id={ELEMENT_ID}
            className="rounded-2xl overflow-hidden bg-gray-900"
            style={{ minHeight: 280 }}
          />
        </div>

        {/* Cancel */}
        <div className="px-4 py-4">
          <button
            onClick={close}
            className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
