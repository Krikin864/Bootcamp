"use client"

import OpportunityCard from "@/components/opportunity-card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"

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

interface KanbanColumnProps {
  title: string
  color?: string
  opportunities: Opportunity[]
  onCardClick?: (opportunity: Opportunity) => void
  onAssignClick?: (opportunity: Opportunity) => void
  onMoveToComplete?: (opportunityId: string) => void
  onArchive?: (opportunityId: string) => void
  updatingIds?: Set<string>
}

export default function KanbanColumn({
  title,
  color,
  opportunities,
  onCardClick,
  onAssignClick,
  onMoveToComplete,
  onArchive,
  updatingIds = new Set(),
}: KanbanColumnProps) {
  // Colores por defecto para las columnas
  const defaultColors = {
    new: "bg-blue-500",
    assigned: "bg-purple-500",
    done: "bg-green-500",
  }

  const columnColor = color || defaultColors[title.toLowerCase() as keyof typeof defaultColors] || "bg-gray-500"

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${columnColor}`}></div>
        <h3 className="font-semibold text-foreground">{title}</h3>
        <span className="ml-auto px-2 py-1 bg-secondary text-xs text-muted-foreground rounded">
          {opportunities.length}
        </span>
      </div>

      <div className="space-y-3 min-h-96 bg-secondary/30 rounded-lg p-4">
        {opportunities.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">No opportunities</div>
        ) : (
          opportunities.map((opp) => {
            const isUpdating = updatingIds.has(opp.id)
            return (
              <div key={opp.id} className="flex gap-2 items-start relative">
                {isUpdating && (
                  <div className="absolute inset-0 bg-background/50 rounded-lg flex items-center justify-center z-10">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <OpportunityCard 
                    opportunity={opp} 
                    onClick={() => onCardClick?.(opp)}
                    isUpdating={isUpdating}
                  />
                </div>
                <div className="flex flex-col gap-1 pt-1">
                  {opp.status === "new" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onAssignClick?.(opp)}
                      className="bg-transparent text-xs"
                      disabled={isUpdating}
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
                      disabled={isUpdating}
                    >
                      <ArrowRight className="h-3 w-3" />
                      Done
                    </Button>
                  )}
                  {opp.status === "done" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onArchive?.(opp.id)}
                      className="bg-transparent text-xs"
                      disabled={isUpdating}
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
