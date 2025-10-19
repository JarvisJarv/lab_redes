import React from 'react'

export default function ModalConfirm({ open, title, message, onCancel, onConfirm }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onCancel}></div>
      <div className="bg-white text-black rounded-md p-6 z-10 w-full max-w-md">
        <h4 className="text-lg font-bold mb-2">{title || 'Confirmação'}</h4>
        <p className="mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button className="btn-primary bg-gray-300 text-black" onClick={onCancel}>Cancelar</button>
          <button className="btn-primary" onClick={onConfirm}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}
