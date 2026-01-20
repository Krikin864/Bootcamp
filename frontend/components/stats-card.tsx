import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"

interface StatsCardProps {
  label: string
  value: string
  icon: LucideIcon
}

export default function StatsCard({ label, value, icon: Icon }: StatsCardProps) {
  return (
    <div className="p-6 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.12)] transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-600 mb-2 font-medium">{label}</p>
          <p className="text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl backdrop-blur-sm">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </div>
  )
}
