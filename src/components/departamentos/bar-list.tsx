import Link from 'next/link'

export interface BarItem { key: string; label: string; value: number; href?: string; note?: string; hint?: string }

/**
 * Gráfico de barras horizontais (uma cor = uma medida). O número fica ao
 * lado de cada barra; o detalhe aparece ao passar o mouse (title).
 */
export function BarList({ items, unit = 'pessoas', emptyText = 'Nada para mostrar ainda.' }: { items: BarItem[]; unit?: string; emptyText?: string }) {
  const max = Math.max(1, ...items.map(i => i.value))
  if (items.length === 0) return <p className="text-sm text-slate-400 py-6 text-center">{emptyText}</p>
  return (
    <ul className="space-y-2.5" role="list">
      {items.map(i => {
        const pct = Math.max(i.value > 0 ? 2 : 0, Math.round((i.value / max) * 100))
        const row = (
          <div className="group grid grid-cols-[minmax(0,9rem)_1fr_auto] sm:grid-cols-[minmax(0,12rem)_1fr_auto] items-center gap-3"
            title={i.hint || `${i.label}: ${i.value} ${i.value === 1 ? unit.replace(/s$/, '') : unit}`}>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-slate-800 group-hover:text-violet-700">{i.label}</span>
              {i.note && <span className="block truncate text-[11px] text-slate-400">{i.note}</span>}
            </span>
            <span className="h-3 rounded-r bg-slate-100">
              <span className="block h-3 rounded-r bg-violet-600 group-hover:bg-violet-700 transition-colors" style={{ width: `${pct}%` }} />
            </span>
            <span className="w-8 text-right text-sm font-semibold tabular-nums text-slate-700">{i.value}</span>
          </div>
        )
        return <li key={i.key}>{i.href ? <Link href={i.href} className="block rounded-md -mx-1 px-1 py-0.5 hover:bg-slate-50">{row}</Link> : row}</li>
      })}
    </ul>
  )
}
