"use client"

import OpportunityCard from "@/components/opportunity-card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"
import { type Opportunity } from "@/services/opportunities"

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
      <div className="flex items-center gap-3 px-2">
        <div className={`w-3 h-3 rounded-full ${columnColor} shadow-sm`}></div>
        <h3 className="font-semibold text-slate-800">{title}</h3>
        <span className="ml-auto px-3 py-1 bg-white/70 backdrop-blur-sm text-xs text-slate-700 rounded-full shadow-sm border border-white/40">
          {opportunities.length}
        </span>
      </div>

      <div className="space-y-4 min-h-96 bg-white/30 backdrop-blur-xl rounded-[2rem] p-5 border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]">
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
