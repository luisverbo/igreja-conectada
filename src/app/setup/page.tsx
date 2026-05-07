'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Church, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const CHURCH_ID = 'e7e4412f-1a99-4a2a-b536-5f9618815f2e'

export default function SetupPage() {
  const router = useRouter()
  const [step, setStep] = useState<'account' | 'done'>('account')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  })

  function set(k: string, v: string) { setForm(p => ({ ...p, [k]: v })) }

  async function handleSetup(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm_password) {
      setError('As senhas não coincidem.')
      return
    }
    if (form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.')
      return
    }
    setLoading(true)
    setError(null)

    const supabase = createClient()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: { full_name: form.full_name }
      }
    })

    if (authError || !authData.user) {
      setError(authError?.message || 'Erro ao criar conta.')
      setLoading(false)
      return
    }

    // Update profile with church_id, full_name and super_admin role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        church_id: CHURCH_ID,
        full_name: form.full_name,
        role: 'super_admin',
        is_active: true,
      })
      .eq('id', authData.user.id)

    if (profileError) {
      // Try upsert if update failed
      await supabase.from('profiles').upsert({
        id: authData.user.id,
        church_id: CHURCH_ID,
        full_name: form.full_name,
        role: 'super_admin',
        is_active: true,
      })
    }

    setLoading(false)
    setStep('done')
  }

  if (step === 'done') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 mx-auto">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Conta criada com sucesso!</h2>
            <p className="text-slate-500 text-sm">
              Sua conta de administrador foi configurada. Faça login para acessar o sistema.
            </p>
            <Button className="w-full" onClick={() => router.push('/login')}>
              Ir para o Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-8">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-600 mx-auto mb-4">
            <Church className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Configuração Inicial</h1>
          <p className="text-slate-500 mt-1">Crie a conta do administrador principal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar Conta Admin</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input value={form.full_name} onChange={e => set('full_name', e.target.value)} placeholder="Seu nome completo" required />
              </div>
              <div className="space-y-2">
                <Label>E-mail</Label>
                <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="admin@suaigreja.com" required />
              </div>
              <div className="space-y-2">
                <Label>Senha</Label>
                <Input type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Mínimo 6 caracteres" required />
              </div>
              <div className="space-y-2">
                <Label>Confirmar Senha</Label>
                <Input type="password" value={form.confirm_password} onChange={e => set('confirm_password', e.target.value)} placeholder="Repita a senha" required />
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
              )}

              <div className="rounded-lg bg-violet-50 border border-violet-200 p-3">
                <p className="text-xs text-violet-700">
                  Esta conta será criada com permissão de <strong>Super Admin</strong> e vinculada à igreja.
                  Use esta página apenas uma vez.
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Criando conta...' : 'Criar Conta e Entrar'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
