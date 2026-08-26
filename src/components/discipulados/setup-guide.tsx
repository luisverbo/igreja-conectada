import { Check, MapPin, UserPlus, Home } from 'lucide-react'

interface Props {
  locationCount: number
  leaderCount: number
  gcaCount: number
}

/**
 * Passo a passo dos primeiros GCAs. Some sozinho quando os três
 * passos estiverem prontos.
 */
export function GcaSetupGuide({ locationCount, leaderCount, gcaCount }: Props) {
  const steps = [
    {
      done: locationCount > 0,
      icon: MapPin,
      title: 'Cadastre o local',
      desc: 'A casa que cede o espaço (com o anfitrião) ou a própria igreja.',
      where: 'Card “Locais dos GCAs” → Novo Local',
    },
    {
      done: leaderCount > 0,
      icon: UserPlus,
      title: 'Cadastre o líder',
      desc: 'O líder acessa o sistema, então precisa de e-mail e senha. O cônjuge não precisa — o nome dele entra no passo 3.',
      where: 'Card “Equipe de GCA” → Adicionar',
    },
    {
      done: gcaCount > 0,
      icon: Home,
      title: 'Crie o GCA',
      desc: 'Aqui você junta tudo: nome do grupo, líder (e o cônjuge), o local e o dia/horário.',
      where: 'Botão “Novo GCA”, mais abaixo',
    },
  ]

  if (steps.every(s => s.done)) return null

  return (
    <div className="rounded-2xl border border-violet-200 bg-white p-5">
      <h2 className="text-base font-bold text-slate-900 mb-1">Como montar um GCA</h2>
      <p className="text-xs text-slate-500 mb-4">Siga esta ordem — cada passo depende do anterior.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {steps.map((s, i) => {
          const Icon = s.icon
          return (
            <div
              key={i}
              className={`rounded-xl border-2 p-4 ${
                s.done ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  s.done ? 'bg-emerald-500 text-white' : 'bg-violet-100 text-violet-700'
                }`}>
                  {s.done ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <p className={`text-sm font-bold ${s.done ? 'text-emerald-800' : 'text-slate-900'}`}>{s.title}</p>
              </div>
              <p className="text-xs text-slate-600 mb-2">{s.desc}</p>
              <p className={`text-[11px] font-medium flex items-center gap-1 ${s.done ? 'text-emerald-600' : 'text-violet-600'}`}>
                <Icon className="h-3 w-3" /> {s.where}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
