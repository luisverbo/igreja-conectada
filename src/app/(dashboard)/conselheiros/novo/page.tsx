import { getSessionProfile } from '@/lib/get-profile'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { CounselorNewConvert } from '@/components/conselheiros/counselor-new-convert'

// Same new-convert form counselors use on mobile, available to anyone
// with access to the Conselheiros tab (e.g., a GCA leader who also
// serves as counselor during services).
export default async function NovoConvertidoPage() {
  const { user, profile } = await getSessionProfile()
  if (!user || !profile?.church_id) return null

  return (
    <div className="min-h-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white px-4 sm:px-6 py-3">
        <Link href="/conselheiros" className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Conselheiros
        </Link>
      </div>
      <div className="mx-auto max-w-md">
        <CounselorNewConvert
          churchId={profile.church_id}
          userId={user.id}
          userName={profile.full_name}
        />
      </div>
    </div>
  )
}
