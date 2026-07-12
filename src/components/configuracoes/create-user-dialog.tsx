'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'

import { ROLE_LABELS, MODULES } from '@/lib/roles'

const allRoles = [
  'pastor', 'coordinator', 'supervisor',
  'counselor', 'counselor_full', 'counselor_leader',
  'new_members_leader', 'new_members_teacher', 'new_members_helper',
  'discipleship_supervisor', 'discipleship_leader', 'viewer',
]

interface CreateUserDialogProps {
  allowedRoles?: string[]
  buttonLabel?: string
  allowCustomAccess?: boolean
}

export function CreateUserDialog({ allowedRoles, buttonLabel = 'Novo Usuário', allowCustomAccess = false }: CreateUserDialogProps) {
  const roles = (allowedRoles || allRoles).map(r => ({ value: r, label: ROLE_LABELS[r] || r }))
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ full_name: '', email: '', password: '', role: '' })
  const [customAccess, setCustomAccess] = useState<string[]>([])

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  function toggleAccess(key: string) {
    setCustomAccess(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.role) { setError('Selecione uma função.'); return }
    if (form.password.length < 6) { setError('Senha deve ter ao menos 6 caracteres.'); return }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, custom_access: allowCustomAccess && customAccess.length > 0 ? customAccess : undefined }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || 'Erro ao criar usuário.')
      setLoading(false)
      return
    }

    setOpen(false)
    setForm({ full_name: '', email: '', password: '', role: '' })
    setCustomAccess([])
    router.refresh()
  }

  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm" className="gap-2">
        <UserPlus className="h-4 w-4" />
        {buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Nome do usuário" required />
            </div>

            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="email@exemplo.com" required />
            </div>

            <div className="space-y-2">
              <Label>Senha</Label>
              <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" required />
            </div>

            <div className="space-y-2">
              <Label>Função</Label>
              <Select
                value={form.role}
                onChange={e => set('role', e.target.value)}
                placeholder="Selecione a função"
                required
              >
                {roles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </Select>
            </div>

            {allowCustomAccess && (
              <div className="space-y-2">
                <Label>Acessos adicionais <span className="text-slate-400 font-normal text-xs">(além do que a função permite)</span></Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {MODULES.map(m => (
                    <label key={m.key} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                      customAccess.includes(m.key) ? 'border-violet-400 bg-violet-50 text-violet-800' : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}>
                      <input
                        type="checkbox"
                        checked={customAccess.includes(m.key)}
                        onChange={() => toggleAccess(m.key)}
                        className="h-3.5 w-3.5 accent-violet-600"
                      />
                      {m.label}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-slate-400">Útil para supervisores de departamento que precisam ver outras abas.</p>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? 'Criando...' : 'Criar Usuário'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
