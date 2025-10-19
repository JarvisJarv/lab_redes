import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Historico from './pages/Historico'
import Header from './components/Header'

function Protected({ children }) {
  const userDID = localStorage.getItem('userDID')
  const userName = localStorage.getItem('userName')
  if (!userDID || !userName) return <Navigate to="/" replace />
  return children
}

function Layout() {
  return (
    <div>
      <Header />
      <main className="pt-20 min-h-[calc(100vh-5rem)]">
        <Outlet />
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/home" element={<Home />} />
          <Route path="/historico" element={<Historico />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
