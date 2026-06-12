import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import OwnerLogin from './pages/OwnerLogin'
import OwnerPanel from './pages/OwnerPanel'
import CustomerLogin from './pages/CustomerLogin'
import CustomerPanel from './pages/CustomerPanel'
import RequestStamp from './pages/RequestStamp'

function OwnerRoute({ children }) {
  const isOwner = sessionStorage.getItem('ownerAuth') === 'true'
  return isOwner ? children : <Navigate to="/owner/login" replace />
}

function CustomerRoute({ children }) {
  const customerId = sessionStorage.getItem('customerId')
  return customerId ? children : <Navigate to="/customer/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/owner/login" element={<OwnerLogin />} />
        <Route
          path="/owner"
          element={
            <OwnerRoute>
              <OwnerPanel />
            </OwnerRoute>
          }
        />
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route
          path="/customer"
          element={
            <CustomerRoute>
              <CustomerPanel />
            </CustomerRoute>
          }
        />
        <Route path="/request-stamp/:phone" element={<RequestStamp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
