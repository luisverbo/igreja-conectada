'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, X, Loader2, Building2, User } from 'lucide-react'

export function CreateChurchDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [form, setForm] = useState({
    church_name: '',
    city: '',
    state: '',
    pastor_name: '',
    email: '',
    phone: '',
    admin_name: '',
    admin_email: '',
    admin_password: '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/create-church', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok || !data.success) {
      setError(data.error || 'Erro ao criar igreja')
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
    setTimeout(() => {
      setOpen(false)
      setSuccess(false)
      setForm({ church_name: '', city: '', state: '', pastor_name: '', email: '', phone: '', admin_name: '', admin_email: '', admin_password: '' })
      router.refresh()
    }, 1500)
  }

  const inputClass = "w-full h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
  const labelClass = "block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide"

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Nova Igreja
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">Nova Igreja</h2>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {success ? (
              <div className="p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 mx-auto mb-3">
                  <Building2 className="h-7 w-7 text-emerald-600" />
                </div>
                <p className="text-lg font-bold text-slate-900">Igreja criada!</p>
                <p className="text-sm text-slate-500 mt-1">Tudo pronto para começar.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                {/* Church info */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-bold text-slate-700">Dados da Igreja</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Nome da Igreja *</label>
                      <input type="text" required value={form.church_name} onChange={e => set('church_name', e.target.value)} placeholder="Ex: Igreja Batista da Graça" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Cidade</label>
                        <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="São Paulo" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Estado</label>
                        <input type="text" value={form.state} onChange={e => set('state', e.target.value)} placeholder="SP" maxLength={2} className={inputClass} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Nome do Pastor</label>
                      <input type="text" value={form.pastor_name} onChange={e => set('pastor_name', e.target.value)} placeholder="Pastor João Silva" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>E-mail</label>
                        <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contato@igreja.com" className={inputClass} />
                      </div>
                      <div>
                        <label className={labelClass}>Telefone</label>
                        <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Admin user */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <User className="h-4 w-4 text-violet-600" />
                    <span className="text-sm font-bold text-slate-700">Usuário Administrador</span>
                    <span className="text-xs text-slate-400">(opcional)</span>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Nome Completo</label>
                      <input type="text" value={form.admin_name} onChange={e => set('admin_name', e.target.value)} placeholder="Nome do pastor/admin" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>E-mail de Acesso</label>
                      <input type="email" value={form.admin_email} onChange={e => set('admin_email', e.target.value)} placeholder="pastor@igreja.com" className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass}>Senha</label>
                      <input type="password" value={form.admin_password} onChange={e => set('admin_password', e.target.value)} placeholder="Mínimo 8 caracteres" minLength={8} className={inputClass} />
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setOpen(false)} className="flex-1 h-10 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">
                    Cancelar
                  </button>
                  <button type="submit" disabled={loading} className="flex-1 h-10 rounded-lg bg-violet-600 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-60 hover:bg-violet-700">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Criar Igreja'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
