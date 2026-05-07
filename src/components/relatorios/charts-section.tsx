'use client'

import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  type PieLabelRenderProps,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart as PieChartIcon, BarChart3, MapPin, Users } from 'lucide-react'

interface PersonData {
  status: string
  gender: string | null
  birth_date: string | null
  origin: string | null
  neighborhood: string | null
}

interface Props {
  people: PersonData[]
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

const STATUS_COLORS: Record<string, string> = {
  novo: '#ec4899',
  em_novos_membros: '#3b82f6',
  concluiu_novos_membros: '#1d4ed8',
  em_discipulado: '#7c3aed',
  em_acompanhamento: '#f59e0b',
  servindo: '#10b981',
  inativo: '#94a3b8',
}

const GENDER_COLORS: Record<string, string> = {
  M: '#3b82f6',
  F: '#ec4899',
  outro: '#94a3b8',
}

const GENDER_LABELS: Record<string, string> = {
  M: 'Masculino',
  F: 'Feminino',
  outro: 'Outro',
}

const ORIGIN_COLORS: Record<string, string> = {
  aceitou_jesus_aqui: '#7c3aed',
  veio_de_outra_igreja: '#10b981',
  sem_informacao: '#94a3b8',
}

const ORIGIN_LABELS: Record<string, string> = {
  aceitou_jesus_aqui: 'Aceitou Jesus aqui',
  veio_de_outra_igreja: 'Veio de outra igreja',
  sem_informacao: 'Sem informação',
}

function calcAge(birthDate: string): number {
  const today = new Date()
  const dob = new Date(birthDate)
  let age = today.getFullYear() - dob.getFullYear()
  const m = today.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--
  return age
}

export function ChartsSection({ people }: Props) {
  // Status distribution
  const statusMap: Record<string, number> = {}
  people.forEach(p => {
    statusMap[p.status] = (statusMap[p.status] || 0) + 1
  })
  const statusData = Object.entries(statusMap).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
    color: STATUS_COLORS[key] || '#94a3b8',
  }))

  // Gender distribution
  const genderMap: Record<string, number> = {}
  people.forEach(p => {
    const g = p.gender || 'outro'
    genderMap[g] = (genderMap[g] || 0) + 1
  })
  const genderData = Object.entries(genderMap).map(([key, value]) => ({
    name: GENDER_LABELS[key] || key,
    value,
    color: GENDER_COLORS[key] || '#94a3b8',
  }))

  // Age groups
  const ageGroups: Record<string, number> = {
    '0-17': 0,
    '18-25': 0,
    '26-35': 0,
    '36-50': 0,
    '50+': 0,
  }
  people.forEach(p => {
    if (!p.birth_date) return
    const age = calcAge(p.birth_date)
    if (age <= 17) ageGroups['0-17']++
    else if (age <= 25) ageGroups['18-25']++
    else if (age <= 35) ageGroups['26-35']++
    else if (age <= 50) ageGroups['36-50']++
    else ageGroups['50+']++
  })
  const ageData = Object.entries(ageGroups).map(([name, value]) => ({ name, value }))

  // Origin distribution
  const originMap: Record<string, number> = {}
  people.forEach(p => {
    const key = p.origin || 'sem_informacao'
    originMap[key] = (originMap[key] || 0) + 1
  })
  const originData = Object.entries(originMap).map(([key, value]) => ({
    name: ORIGIN_LABELS[key] || key,
    value,
    color: ORIGIN_COLORS[key] || '#94a3b8',
  }))

  // Top neighborhoods
  const neighborhoodMap: Record<string, number> = {}
  people.forEach(p => {
    if (!p.neighborhood) return
    neighborhoodMap[p.neighborhood] = (neighborhoodMap[p.neighborhood] || 0) + 1
  })
  const neighborhoodData = Object.entries(neighborhoodMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }))

  const renderCustomLabel = ({ percent }: PieLabelRenderProps) =>
    (percent ?? 0) > 0.05 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChartIcon className="h-4 w-4 text-violet-600" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Pessoas']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5">
                  {statusData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-slate-600 truncate">{d.name}</span>
                      <span className="font-semibold text-slate-900 ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Gender Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-blue-600" />
              Distribuição por Gênero
            </CardTitle>
          </CardHeader>
          <CardContent>
            {genderData.length > 0 ? (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={genderData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {genderData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Pessoas']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">Sem dados</p>
            )}
          </CardContent>
        </Card>

        {/* Age Groups */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <BarChart3 className="h-4 w-4 text-emerald-600" />
              Faixas Etárias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ageData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [v, 'Pessoas']} />
                <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Origin Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <PieChartIcon className="h-4 w-4 text-violet-600" />
              Origem dos Membros
            </CardTitle>
          </CardHeader>
          <CardContent>
            {originData.length > 0 ? (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={originData}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      dataKey="value"
                      label={renderCustomLabel}
                      labelLine={false}
                    >
                      {originData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => [v, 'Pessoas']} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {originData.map(d => (
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-slate-600">{d.name}</span>
                      <span className="font-semibold text-slate-900 ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-10">Sem dados de origem</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Neighborhoods */}
      {neighborhoodData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-amber-600" />
              Top Bairros (por número de membros)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={neighborhoodData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
              >
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'Pessoas']} />
                <Bar dataKey="value" fill="#7c3aed" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
