import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Historico from './pages/Historico'
import Presenca from './pages/Presenca'
import Header from './components/Header'

function Protected({ children }) {
  const userDID = localStorage.getItem('userDID')
  const userName = localStorage.getItem('userName')
  if (!userDID || !userName) return <Navigate to="/" replace />
  return children
}

function Layout() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.18),_transparent_60%),_radial-gradient(circle_at_bottom,_rgba(129,140,248,0.16),_transparent_55%)]" />
        <div className="absolute left-10 top-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl" />
        <div className="absolute bottom-10 right-16 h-72 w-72 rounded-full bg-indigo-500/20 blur-3xl" />
      </div>
      <Header />
      <main className="relative z-10 pt-24 pb-16">
        <div className="mx-auto w-full max-w-6xl px-6 lg:px-10">
          <Outlet />
        </div>
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
          <Route path="/presenca" element={<Presenca />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
