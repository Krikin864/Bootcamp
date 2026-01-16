"use client"

import { Draggable } from "@hello-pangea/dnd"
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
  status: "new" | "assigned" | "done" | "cancelled" | "archived"
  urgency: "high" | "medium" | "low"
  aiSummary: string
  isProcessing?: boolean
  createdDate?: string
}

interface OpportunityCardProps {
  opportunity: Opportunity
  onClick?: () => void
  isUpdating?: boolean
  index: number
}

export default function OpportunityCard({ opportunity, onClick, isUpdating = false, index }: OpportunityCardProps) {
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
    <Draggable draggableId={opportunity.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`p-5 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] transition-all cursor-pointer ${
            snapshot.isDragging
              ? "shadow-2xl opacity-90 rotate-2 scale-105 z-50"
              : "shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.12)]"
          } ${
            isUpdating ? "opacity-60" : ""
          }`}
        >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span 
              key={skill} 
              className="text-xs px-3 py-1.5 bg-white rounded-full text-slate-700 font-medium shadow-md border border-white/60"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="space-y-1">
          <h4 className="font-semibold text-slate-800 text-sm leading-tight">{opportunity.clientName}</h4>
          <p className="text-xs text-slate-600">{opportunity.company}</p>
        </div>

        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-white/40">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3 w-3 text-indigo-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-snug line-clamp-2">
              {opportunity.aiSummary && opportunity.aiSummary.trim() 
                ? opportunity.aiSummary 
                : opportunity.summary && opportunity.summary.trim()
                  ? opportunity.summary
                  : 'Processing summary...'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/30">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs border px-2.5 py-1 rounded-full ${urgencyColors[opportunity.urgency]}`}>
              {urgencyLabels[opportunity.urgency]}
            </Badge>
            <span className="text-xs text-slate-600">{opportunity.createdDate}</span>
          </div>
          {opportunity.assignee && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-indigo-600">{opportunity.assignee.charAt(0)}</span>
              </div>
              <span className="text-xs text-slate-800 font-medium">{opportunity.assignee.split(" ")[0]}</span>
            </div>
          )}
        </div>

        {opportunity.status === "done" && (
          <div className="pt-2 border-t border-white/30 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs text-emerald-600">✓</span>
            </div>
            <span className="text-xs text-emerald-600 font-medium">Done</span>
          </div>
        )}
      </div>
        </div>
      )}
    </Draggable>
  )
}
