'use client'

import { useState, useMemo } from 'react'
import { MapPin, Phone, Search, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface PersonItem {
  id: string
  full_name: string
  status: string
  phone: string | null
  neighborhood: string | null
  city: string | null
}

interface Props {
  people: PersonItem[]
}

const STATUS_LABELS: Record<string, string> = {
  novo: 'Novo Convertido',
  em_novos_membros: 'Em Novos Membros',
  concluiu_novos_membros: 'Concluiu NM',
  em_discipulado: 'Em Discipulado',
  em_acompanhamento: 'Em Acompanhamento',
  servindo: 'Servindo',
  inativo: 'Inativo',
}

const STATUS_VARIANT: Record<string, string> = {
  novo: 'bg-pink-100 text-pink-700',
  em_novos_membros: 'bg-blue-100 text-blue-700',
  concluiu_novos_membros: 'bg-blue-200 text-blue-800',
  em_discipulado: 'bg-violet-100 text-violet-700',
  em_acompanhamento: 'bg-amber-100 text-amber-700',
  servindo: 'bg-emerald-100 text-emerald-700',
  inativo: 'bg-slate-100 text-slate-500',
}

type FilterType = 'todos' | 'novos' | 'membros'

export function NeighborhoodFilter({ people }: Props) {
  const [selectedNeighborhood, setSelectedNeighborhood] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterType>('todos')
  const [search, setSearch] = useState('')

  // Build neighborhood list sorted by count
  const neighborhoods = useMemo(() => {
    const map: Record<string, { neighborhood: string; city: string | null; total: number; novos: number; membros: number }> = {}
    people.forEach(p => {
      const key = p.neighborhood || p.city || ''
      if (!key) return
      if (!map[key]) map[key] = { neighborhood: p.neighborhood || '', city: p.city, total: 0, novos: 0, membros: 0 }
      map[key].total++
      if (p.status === 'novo') map[key].novos++
      else map[key].membros++
    })
    return Object.values(map).sort((a, b) => b.total - a.total)
  }, [people])

  // Filter neighborhoods by search
  const filteredNeighborhoods = useMemo(() =>
    neighborhoods.filter(n =>
      n.neighborhood.toLowerCase().includes(search.toLowerCase()) ||
      (n.city || '').toLowerCase().includes(search.toLowerCase())
    ), [neighborhoods, search])

  // People in selected neighborhood filtered by type
  const selectedPeople = useMemo(() => {
    if (!selectedNeighborhood) return []
    return people.filter(p => {
      const key = p.neighborhood || p.city || ''
      if (key !== selectedNeighborhood) return false
      if (filter === 'novos') return p.status === 'novo'
      if (filter === 'membros') return p.status !== 'novo'
      return true
    })
  }, [people, selectedNeighborhood, filter])

  const selectedInfo = neighborhoods.find(n => (n.neighborhood || n.city) === selectedNeighborhood)

  const filterCounts = useMemo(() => {
    if (!selectedNeighborhood) return { todos: 0, novos: 0, membros: 0 }
    const inNeighborhood = people.filter(p => (p.neighborhood || p.city || '') === selectedNeighborhood)
    return {
      todos: inNeighborhood.length,
      novos: inNeighborhood.filter(p => p.status === 'novo').length,
      membros: inNeighborhood.filter(p => p.status !== 'novo').length,
    }
  }, [people, selectedNeighborhood])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-4 w-4 text-amber-600" />
          Pessoas por Bairro
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: neighborhood list */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar bairro ou cidade..."
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
            </div>
            <div className="space-y-1 max-h-96 overflow-y-auto pr-1">
              {filteredNeighborhoods.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-6">Nenhum bairro encontrado</p>
              )}
              {filteredNeighborhoods.map(n => {
                const key = n.neighborhood || n.city || ''
                const isSelected = selectedNeighborhood === key
                return (
                  <button
                    key={key}
                    onClick={() => { setSelectedNeighborhood(key); setFilter('todos') }}
                    className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                        {n.neighborhood || n.city}
                      </p>
                      {n.neighborhood && n.city && (
                        <p className={`text-xs truncate ${isSelected ? 'text-violet-200' : 'text-slate-400'}`}>{n.city}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                      {n.novos > 0 && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-pink-100 text-pink-700'}`}>
                          {n.novos}N
                        </span>
                      )}
                      {n.membros > 0 && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-violet-100 text-violet-700'}`}>
                          {n.membros}M
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-slate-400 pt-1">
              {filteredNeighborhoods.length} bairro{filteredNeighborhoods.length !== 1 ? 's' : ''} · <span className="text-pink-600">N</span> = Novos · <span className="text-violet-600">M</span> = Membros
            </p>
          </div>

          {/* Right: people list */}
          <div>
            {!selectedNeighborhood ? (
              <div className="h-full flex items-center justify-center rounded-xl bg-slate-50 border border-dashed border-slate-200 p-8">
                <div className="text-center">
                  <MapPin className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Clique em um bairro para ver as pessoas</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-900 truncate">
                    {selectedInfo?.neighborhood || selectedInfo?.city}
                    {selectedInfo?.neighborhood && selectedInfo?.city && (
                      <span className="text-slate-400 font-normal"> · {selectedInfo.city}</span>
                    )}
                  </h3>
                  <button onClick={() => setSelectedNeighborhood(null)} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Filter tabs */}
                <div className="flex gap-1.5">
                  {([
                    { key: 'todos', label: `Todos (${filterCounts.todos})` },
                    { key: 'novos', label: `Novos (${filterCounts.novos})` },
                    { key: 'membros', label: `Membros (${filterCounts.membros})` },
                  ] as { key: FilterType; label: string }[]).map(t => (
                    <button
                      key={t.key}
                      onClick={() => setFilter(t.key)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                        filter === t.key ? 'bg-violet-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                  {selectedPeople.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-6">Nenhuma pessoa neste filtro</p>
                  ) : (
                    selectedPeople.map(p => (
                      <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2 hover:border-violet-200 transition-colors">
                        <div className="min-w-0 flex-1">
                          <Link href={`/pessoas/${p.id}`} className="text-sm font-medium text-slate-900 hover:text-violet-600 transition-colors truncate block">
                            {p.full_name}
                          </Link>
                          <span className={`inline-block text-xs px-1.5 py-0.5 rounded-full mt-0.5 ${STATUS_VARIANT[p.status] || 'bg-slate-100 text-slate-500'}`}>
                            {STATUS_LABELS[p.status] || p.status}
                          </span>
                        </div>
                        {p.phone && (
                          <a
                            href={`https://wa.me/55${p.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-green-600 flex-shrink-0"
                            title={p.phone}
                          >
                            <Phone className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
