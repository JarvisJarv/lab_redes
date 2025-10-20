import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import Login from './pages/Login'
import Home from './pages/Home'
import Historico from './pages/Historico'
import Header from './components/Header'
import Footer from './components/Footer'

function Protected({ children }) {
  const userDID = localStorage.getItem('userDID')
  const userName = localStorage.getItem('userName')
  if (!userDID || !userName) return <Navigate to="/" replace />
  return children
}

function Layout() {
  return (
    <div className="app-shell">
      <div className="app-shell__background" aria-hidden="true">
        <div className="app-shell__gradient" />
        <div className="app-shell__grid" />
      </div>
      <Header />
      <main className="app-shell__content">
        <Outlet />
      </main>
      <Footer />
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
