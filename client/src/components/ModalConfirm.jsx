import React from 'react'

export default function ModalConfirm({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-slate-900/80 p-6 text-slate-100 shadow-2xl shadow-black/40">
        <h4 className="text-lg font-semibold text-white">{title || 'Confirmação'}</h4>
        <p className="mt-2 text-sm text-slate-300">{message}</p>
        <div className="mt-6 flex justify-end gap-2 text-sm font-medium">
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-slate-200 transition hover:border-white/40 hover:text-white"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-rose-400 to-red-500 px-4 py-2 text-slate-950 shadow-lg shadow-rose-500/20 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-rose-500/30"
            onClick={onConfirm}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
