'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Church, Eye, EyeOff } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('Email ou senha inválidos. Tente novamente.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: 'var(--sidebar-bg)' }}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500">
            <Church className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Igreja Conectada</span>
        </div>

        <div>
          <h2 className="text-4xl font-bold text-white leading-tight mb-4">
            Acompanhe cada jornada<br />espiritual com cuidado.
          </h2>
          <p className="text-violet-300 text-lg leading-relaxed">
            Do primeiro passo em Jesus até o serviço na igreja — gerencie, acompanhe e cuide de cada pessoa com excelência.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { label: 'Conselheiros', desc: 'Registre decisões e acompanhe novos convertidos' },
              { label: 'Novos Membros', desc: 'Controle de presença e conclusão de turmas' },
              { label: 'Discipulados', desc: 'Acompanhamento pastoral sem burocracia' },
            ].map((item) => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="mt-0.5 h-5 w-5 flex-shrink-0 rounded-full bg-violet-500 flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-white" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{item.label}</p>
                  <p className="text-violet-300 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-violet-400 text-sm">© 2026 Igreja Conectada. Todos os direitos reservados.</p>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600">
              <Church className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Igreja Conectada</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">Entrar</h1>
              <p className="text-slate-500 mt-1">Acesse o sistema de gestão da sua igreja</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </form>

            <p className="text-center text-xs text-slate-400 mt-6">
              Problemas para acessar? Fale com o administrador da sua igreja.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
