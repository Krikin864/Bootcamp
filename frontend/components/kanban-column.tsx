"use client"

import OpportunityCard from "@/components/opportunity-card"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

interface Opportunity {
  id: string
  clientName: string
  company: string
  summary: string
  requiredSkill: string
  assignee: string
  status: "new" | "assigned" | "done"
  urgency: "high" | "medium" | "low"
  aiSummary: string
  isProcessing?: boolean
}

interface KanbanColumnProps {
  title: string
  color: string
  opportunities: Opportunity[]
  onCardClick?: (opportunity: Opportunity) => void
  onAssignClick?: (opportunity: Opportunity) => void
  onMoveToComplete?: (opportunityId: string) => void
}

export default function KanbanColumn({
  title,
  color,
  opportunities,
  onCardClick,
  onAssignClick,
  onMoveToComplete,
}: KanbanColumnProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${color}`}></div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className="ml-auto px-2 py-1 bg-secondary text-xs text-muted-foreground rounded">
          {opportunities.length}
        </span>
      </div>

      <div className="space-y-3 min-h-96 bg-secondary/30 rounded-lg p-4">
        {opportunities.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No opportunities</div>
        ) : (
          opportunities.map((opp) => (
            <div key={opp.id} className="flex gap-2 items-start">
              <div className="flex-1">
                <OpportunityCard opportunity={opp} onClick={() => onCardClick?.(opp)} />
              </div>
              <div className="flex flex-col gap-1 pt-1">
                {opp.status === "new" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onAssignClick?.(opp)}
                    className="bg-transparent text-xs"
                  >
                    Assign
                  </Button>
                )}
                {opp.status === "assigned" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onMoveToComplete?.(opp.id)}
                    className="bg-transparent gap-1"
                  >
                    <ArrowRight className="h-3 w-3" />
                    Done
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
