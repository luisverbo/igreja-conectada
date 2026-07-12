'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, LockOpen, Lock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  turmaId: string
  enrollmentOpen: boolean
  closeAfterLesson: number | null
}

export function EnrollmentToggle({ turmaId, enrollmentOpen, closeAfterLesson }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggle() {
    setLoading(true)
    const supabase = createClient()
    await supabase
      .from('new_members_classes')
      .update({ enrollment_open: !enrollmentOpen })
      .eq('id', turmaId)
    setLoading(false)
    router.refresh()
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={enrollmentOpen
        ? `Inscrições abertas${closeAfterLesson ? ` (fecham após a Aula ${closeAfterLesson})` : ''} — clique para fechar`
        : 'Inscrições fechadas — clique para reabrir'}
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-colors ${
        enrollmentOpen
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          : 'border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200'
      }`}
    >
      {loading
        ? <Loader2 className="h-4 w-4 animate-spin" />
        : enrollmentOpen ? <LockOpen className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
      {enrollmentOpen ? 'Inscrições Abertas' : 'Inscrições Fechadas'}
    </button>
  )
}
