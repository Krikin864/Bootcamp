"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles } from "lucide-react"

interface Opportunity {
  id: string
  clientName: string
  company: string
  summary: string
  requiredSkill: string | string[]
  assignee: string
  status: "new" | "assigned" | "done"
  urgency: "high" | "medium" | "low"
  aiSummary: string
  isProcessing?: boolean
  createdDate: string // Added for date display
}

interface OpportunityCardProps {
  opportunity: Opportunity
  onClick?: () => void
}

export default function OpportunityCard({ opportunity, onClick }: OpportunityCardProps) {
  const urgencyColors = {
    high: "bg-red-500/10 text-red-600 border-red-200",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    low: "bg-green-500/10 text-green-600 border-green-200",
  }

  const urgencyLabels = {
    high: "High",
    medium: "Medium",
    low: "Low",
  }

  const skills = Array.isArray(opportunity.requiredSkill) ? opportunity.requiredSkill : [opportunity.requiredSkill]

  return (
    <Card
      onClick={onClick}
      className={`p-3 bg-card border border-border hover:border-primary/50 hover:shadow-md transition-all cursor-pointer`}
    >
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <Badge key={skill} variant="secondary" className="text-xs px-2 py-0.5">
              {skill}
            </Badge>
          ))}
        </div>

        <div className="space-y-0.5">
          <h4 className="font-semibold text-foreground text-sm leading-tight">{opportunity.clientName}</h4>
          <p className="text-xs text-muted-foreground">{opportunity.company}</p>
        </div>

        <div className="bg-secondary/40 p-2 rounded space-y-1 border border-border/30">
          <div className="flex items-start gap-1.5">
            <Sparkles className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-foreground/70 leading-snug line-clamp-2">{opportunity.summary}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-border/30">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs border px-2 py-0.5 ${urgencyColors[opportunity.urgency]}`}>
              {urgencyLabels[opportunity.urgency]}
            </Badge>
            {/* Subtle date display added */}
            <span className="text-xs text-muted-foreground">{opportunity.createdDate}</span>
          </div>
          {opportunity.assignee && (
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                <span className="text-xs font-bold text-primary">{opportunity.assignee.charAt(0)}</span>
              </div>
              <span className="text-xs text-foreground">{opportunity.assignee.split(" ")[0]}</span>
            </div>
          )}
        </div>

        {opportunity.status === "done" && (
          <div className="pt-1.5 border-t border-border/30 flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs text-emerald-600">✓</span>
            </div>
            <span className="text-xs text-emerald-600 font-medium">Done</span>
          </div>
        )}
      </div>
    </Card>
  )
}
