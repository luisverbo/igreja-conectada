'use client'

import { useState, useEffect, useCallback } from 'react'
import { MessageSquare, Plus, Trash2, LogOut, RefreshCw, Star, Loader2, CheckCircle, X, Wifi, WifiOff } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Instance {
  id: string
  instance_name: string
  display_name: string
  phone_number: string | null
  status: string
  is_default: boolean
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'open') return <Badge variant="success"><Wifi className="h-3 w-3 mr-1" />Conectado</Badge>
  if (status === 'connecting') return <Badge variant="warning"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Conectando</Badge>
  return <Badge variant="outline"><WifiOff className="h-3 w-3 mr-1" />Desconectado</Badge>
}

function QRModal({ instance, onClose, onConnected }: { instance: Instance; onClose: () => void; onConnected: () => void }) {
  const [qr, setQr] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)

  const fetchQR = useCallback(async () => {
    setLoading(true)
    setError(null)
    const res = await fetch(`/api/whatsapp?action=qr&instance=${instance.instance_name}`)
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Erro ao obter QR'); setLoading(false); return }
    // Evolution API returns base64 qr in data.qrcode.base64 or data.base64
    const base64 = data?.qrcode?.base64 || data?.base64 || data?.qr
    if (base64) setQr(base64)
    else setError('QR Code não disponível. A instância pode já estar conectada.')
    setLoading(false)
  }, [instance.instance_name])

  const checkStatus = useCallback(async () => {
    setChecking(true)
    const res = await fetch(`/api/whatsapp?action=status&instance=${instance.instance_name}`)
    const data = await res.json()
    if (data.status === 'open') { onConnected(); onClose() }
    setChecking(false)
  }, [instance.instance_name, onConnected, onClose])

  useEffect(() => { fetchQR() }, [fetchQR])

  // Auto-check status every 5s while modal is open
  useEffect(() => {
    const interval = setInterval(checkStatus, 5000)
    return () => clearInterval(interval)
  }, [checkStatus])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900">Conectar WhatsApp</h2>
            <p className="text-xs text-slate-500">{instance.display_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Loader2 className="h-8 w-8 text-violet-500 animate-spin" />
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center gap-3">
              <p className="text-sm text-red-600 text-center">{error}</p>
              <button onClick={fetchQR} className="text-sm text-violet-600 hover:underline">Tentar novamente</button>
            </div>
          ) : qr ? (
            <>
              <div className="flex justify-center">
                <img src={qr} alt="QR Code WhatsApp" className="w-56 h-56 rounded-xl border border-slate-200" />
              </div>
              <p className="text-xs text-slate-500 text-center">Abra o WhatsApp → Menu → Dispositivos Conectados → Conectar Dispositivo</p>
            </>
          ) : null}
          <div className="flex gap-2">
            <button onClick={fetchQR} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50">
              <RefreshCw className="h-3.5 w-3.5" />Novo QR
            </button>
            <button onClick={checkStatus} disabled={checking} className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 py-2 text-sm text-white hover:bg-emerald-700 disabled:opacity-60">
              {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
              Verificar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateInstanceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ display_name: '', instance_name: '' })

  function handleNameChange(display: string) {
    const slug = display.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
    setForm({ display_name: display, instance_name: slug })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const res = await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'create', instance_name: form.instance_name, display_name: form.display_name }),
    })
    const data = await res.json()
    if (!res.ok || !data.success) { setError(data.error || 'Erro ao criar'); setLoading(false); return }
    onCreated()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-900">Nova Instância WhatsApp</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Nome da Instância *</label>
            <input
              type="text"
              required
              value={form.display_name}
              onChange={e => handleNameChange(e.target.value)}
              placeholder="Ex: Célula Centro, Culto Domingo..."
              className="w-full h-10 rounded-lg border border-slate-200 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
          {form.instance_name && (
            <p className="text-xs text-slate-400">ID interno: <code className="bg-slate-100 px-1 rounded">{form.instance_name}</code></p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600">Cancelar</button>
            <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function WhatsAppSection() {
  const [instances, setInstances] = useState<Instance[]>([])
  const [loading, setLoading] = useState(true)
  const [qrInstance, setQrInstance] = useState<Instance | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchInstances = useCallback(async () => {
    const res = await fetch('/api/whatsapp?action=list')
    const data = await res.json()
    setInstances(data.instances || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchInstances() }, [fetchInstances])

  async function refreshStatus(inst: Instance) {
    setActionLoading(`status-${inst.id}`)
    await fetch(`/api/whatsapp?action=status&instance=${inst.instance_name}`)
    await fetchInstances()
    setActionLoading(null)
  }

  async function doAction(action: string, inst: Instance) {
    setActionLoading(`${action}-${inst.id}`)
    await fetch('/api/whatsapp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, instance_name: inst.instance_name }),
    })
    await fetchInstances()
    setActionLoading(null)
  }

  const configured = !!process.env.NEXT_PUBLIC_EVOLUTION_CONFIGURED

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-900">Instâncias WhatsApp</h3>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Instância
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 text-slate-300 animate-spin" />
        </div>
      ) : instances.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center">
          <MessageSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500 font-medium">Nenhuma instância configurada</p>
          <p className="text-xs text-slate-400 mt-1">Crie uma instância para começar a enviar mensagens pelo WhatsApp</p>
        </div>
      ) : (
        <div className="space-y-2">
          {instances.map(inst => (
            <div key={inst.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-900">{inst.display_name}</p>
                    {inst.is_default && (
                      <span className="flex items-center gap-0.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                        <Star className="h-3 w-3" />Padrão
                      </span>
                    )}
                    <StatusBadge status={inst.status} />
                  </div>
                  {inst.phone_number && (
                    <p className="text-xs text-slate-500 mt-0.5">+{inst.phone_number}</p>
                  )}
                  <p className="text-xs text-slate-400 font-mono mt-0.5">{inst.instance_name}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                  {inst.status !== 'open' ? (
                    <button
                      onClick={() => setQrInstance(inst)}
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Conectar
                    </button>
                  ) : (
                    <button
                      onClick={() => doAction('logout', inst)}
                      disabled={actionLoading === `logout-${inst.id}`}
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-1"
                    >
                      {actionLoading === `logout-${inst.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                      Desconectar
                    </button>
                  )}
                  <button
                    onClick={() => refreshStatus(inst)}
                    disabled={actionLoading === `status-${inst.id}`}
                    title="Verificar status"
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-50"
                  >
                    {actionLoading === `status-${inst.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  </button>
                  {!inst.is_default && (
                    <button
                      onClick={() => doAction('set_default', inst)}
                      title="Definir como padrão"
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-600 hover:border-amber-200"
                    >
                      <Star className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => doAction('delete', inst)}
                    disabled={actionLoading === `delete-${inst.id}`}
                    title="Remover instância"
                    className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                  >
                    {actionLoading === `delete-${inst.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info box */}
      <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs text-slate-500 space-y-1">
        <p className="font-semibold text-slate-700">Como funciona</p>
        <p>• Crie uma instância para cada número de WhatsApp que quer usar</p>
        <p>• Clique em <strong>Conectar</strong> e escaneie o QR Code com o WhatsApp do celular</p>
        <p>• A instância <strong>Padrão</strong> ⭐ é usada para envios automáticos</p>
        <p>• Você pode ter múltiplos números ativos ao mesmo tempo</p>
      </div>

      {qrInstance && (
        <QRModal
          instance={qrInstance}
          onClose={() => setQrInstance(null)}
          onConnected={fetchInstances}
        />
      )}
      {showCreate && (
        <CreateInstanceModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchInstances}
        />
      )}
    </div>
  )
}
