"use client"

import { Droppable } from "@hello-pangea/dnd"
import OpportunityCard from "@/components/opportunity-card"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"
import { type Opportunity } from "@/services/opportunities"
import { motion } from "framer-motion"

interface KanbanColumnProps {
  droppableId: string
  title: string
  color?: string
  opportunities: Opportunity[]
  onCardClick?: (opportunity: Opportunity) => void
  onAssignClick?: (opportunity: Opportunity) => void
  onMoveToComplete?: (opportunityId: string) => void
  onArchive?: (opportunityId: string) => void
  updatingIds?: Set<string>
  isDraggingOverOther?: boolean
}

export default function KanbanColumn({
  droppableId,
  title,
  color,
  opportunities,
  onCardClick,
  onAssignClick,
  onMoveToComplete,
  onArchive,
  updatingIds = new Set(),
  isDraggingOverOther = false,
}: KanbanColumnProps) {
  // Colores por defecto para las columnas
  const defaultColors = {
    new: "bg-blue-500",
    assigned: "bg-primary",
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

      <Droppable droppableId={droppableId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`space-y-4 min-h-96 bg-white/30 backdrop-blur-xl rounded-[2rem] p-5 border transition-colors ${
              snapshot.isDraggingOver
                ? "border-2 border-dashed border-primary/40 bg-primary/5 shadow-[0_8px_32px_0_rgba(99,102,241,0.15)]"
                : isDraggingOverOther && !snapshot.isDraggingOver
                ? "border-2 border-dashed border-primary/20 bg-primary/5"
                : "border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]"
            }`}
          >
        {opportunities.length === 0 ? (
              <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
                {snapshot.isDraggingOver ? "Drop here" : "No opportunities"}
              </div>
        ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
              >
                {opportunities.map((opp, index) => {
            const isUpdating = updatingIds.has(opp.id)
            return (
                    <motion.div
                      key={opp.id}
                      variants={{
                        hidden: { opacity: 0, y: 20 },
                        visible: { opacity: 1, y: 0 }
                      }}
                      transition={{ duration: 0.3 }}
                      layout
                      className="flex gap-2 items-start relative"
                    >
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
                        index={index}
                        isDraggable={true}
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
                    </motion.div>
                  )
                })}
              </motion.div>
            )}
            {provided.placeholder}
              </div>
        )}
      </Droppable>
    </div>
  )
}
