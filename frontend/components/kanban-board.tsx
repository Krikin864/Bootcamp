"use client"

import { useState, useEffect } from "react"
import { DragDropContext, DropResult, DragStart } from "@hello-pangea/dnd"
import KanbanColumn from "@/components/kanban-column"
import OpportunityDetailsModal from "@/components/opportunity-details-modal"
import TeamRecommendationModal from "@/components/team-recommendation-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { getOpportunities, updateOpportunityStatus, updateOpportunityAssignment, deleteOpportunity, type Opportunity } from "@/services/opportunities"
import { toast } from "sonner"

export default function KanbanBoard({ filters }: { filters?: any }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false)
  const [opportunityToAssign, setOpportunityToAssign] = useState<Opportunity | null>(null)
  const [draggingOverColumn, setDraggingOverColumn] = useState<string | null>(null)
  const [pendingMove, setPendingMove] = useState<{ opportunityId: string; newStatus: "new" | "assigned" | "done" } | null>(null)
  const [showDoneConfirmation, setShowDoneConfirmation] = useState(false)

  // Load opportunities from Supabase
  useEffect(() => {
    async function loadOpportunities() {
      try {
        setIsLoading(true)
        const data = await getOpportunities()
        setOpportunities(data)
      } catch (error) {
        console.error('Error loading opportunities:', error)
        toast.error('Failed to load opportunities. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    loadOpportunities()
  }, [])

  // Listen for new opportunity events and refresh data
  useEffect(() => {
    const handleAddOpportunity = async (event: Event) => {
      const customEvent = event as CustomEvent
      const newOpportunity = customEvent.detail as Opportunity
      
      // Add the new opportunity to state
      setOpportunities((prev) => {
        // Check that it's not already in the list
        if (prev.find(opp => opp.id === newOpportunity.id)) {
          return prev
        }
        return [...prev, newOpportunity]
      })

      // Also refresh from DB to ensure we have the most up-to-date data
      try {
        const data = await getOpportunities()
        setOpportunities(data)
        
        // Emit event to trigger stats refresh when new opportunity is added
        if (newOpportunity.status === 'new') {
          window.dispatchEvent(new CustomEvent('opportunityStatusChanged', {
            detail: { opportunityId: newOpportunity.id, previousStatus: null, newStatus: 'new' }
          }))
        }
      } catch (error) {
        console.error('Error refreshing opportunities:', error)
      }
    }

    const handleFinishProcessing = (event: Event) => {
      const customEvent = event as CustomEvent
      const opportunityId = customEvent.detail.opportunityId
      setOpportunities((prev) => prev.map((opp) => (opp.id === opportunityId ? { ...opp, isProcessing: false } : opp)))
    }

    window.addEventListener("addOpportunity", handleAddOpportunity)
    window.addEventListener("finishProcessing", handleFinishProcessing)

    return () => {
      window.removeEventListener("addOpportunity", handleAddOpportunity)
      window.removeEventListener("finishProcessing", handleFinishProcessing)
    }
  }, [])

  const filteredOpportunities: Opportunity[] = opportunities.filter((opp) => {
    // Only show opportunities with status: new, assigned, or done (exclude archived and cancelled)
    if (!['new', 'assigned', 'done'].includes(opp.status)) {
      return false
    }

    // Filter by urgency: if filter is "all" or empty, show all; otherwise, filter by specific urgency
    if (filters?.urgency && filters.urgency !== "" && filters.urgency !== "all") {
      if (opp.urgency !== filters.urgency.toLowerCase()) return false
    }

    // Filter by skill ID (from database)
    if (filters?.skill && filters.skill !== "" && filters.skill !== "all") {
      if (opp.requiredSkillId !== filters.skill) return false
    }

    // Filter by assigned team member ID (from database)
    if (filters?.assignedTeam && filters.assignedTeam !== "" && filters.assignedTeam !== "all") {
      if (opp.assigneeId !== filters.assignedTeam) return false
    }
    return true
  })

  const columns = [
    { status: "new" as const, title: "New" },
    { status: "assigned" as const, title: "Assigned" },
    { status: "done" as const, title: "Done" },
  ]

  // Centralized function to update the status of an opportunity
  const handleUpdateStatus = async (id: string, newStatus: "new" | "assigned" | "done" | "cancelled" | "archived") => {
    // Get the previous status to detect if it changed to/from 'new'
    const previousOpportunity = opportunities.find(opp => opp.id === id)
    const previousStatus = previousOpportunity?.status

    // Optimistic update: update UI immediately
    const previousOpportunities = [...opportunities]
    setOpportunities((prev) =>
      prev.map((opp) => (opp.id === id ? { ...opp, status: newStatus } : opp))
    )
    setUpdatingIds((prev) => new Set(prev).add(id))

    try {
      // Call the API to persist the change
      const updatedOpportunity = await updateOpportunityStatus(id, newStatus)
      
      if (updatedOpportunity) {
        // Update with real data from DB
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === id ? updatedOpportunity : opp))
        )
        toast.success(`Opportunity moved to ${newStatus}`)
        
        // Emit event if status changed to/from 'new' to trigger stats refresh
        if (previousStatus === 'new' || newStatus === 'new') {
          window.dispatchEvent(new CustomEvent('opportunityStatusChanged', {
            detail: { opportunityId: id, previousStatus, newStatus }
          }))
        }
      } else {
        throw new Error('Failed to update opportunity')
      }
    } catch (error) {
      // Revert change in case of error
      setOpportunities(previousOpportunities)
      toast.error('Failed to update opportunity status. Please try again.')
      console.error('Error updating opportunity status:', error)
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const handleAssignClick = (opportunity: Opportunity) => {
    setOpportunityToAssign(opportunity)
    setRecommendationModalOpen(true)
  }

  const handleAssignTeamMember = async (memberId: string) => {
    if (!opportunityToAssign) return

    // Get the previous status to detect if it changed to/from 'new'
    const previousStatus = opportunityToAssign.status

    // Optimistic update: update UI immediately with expected changes
    const previousOpportunities = [...opportunities]
    setUpdatingIds((prev) => new Set(prev).add(opportunityToAssign.id))

    // Optimistically update the opportunity status to 'assigned' immediately
    setOpportunities((prev) =>
      prev.map((opp) => 
        opp.id === opportunityToAssign.id 
          ? { ...opp, status: 'assigned' as const, assignee: 'Loading...' }
          : opp
      )
    )

    try {
      // Update assigned_user_id and status in Supabase
      const updatedOpportunity = await updateOpportunityAssignment(opportunityToAssign.id, memberId)
      
      if (updatedOpportunity) {
        // Update with actual DB data
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === opportunityToAssign.id ? updatedOpportunity : opp))
        )
        toast.success(`Opportunity assigned successfully`)
        setRecommendationModalOpen(false)
        setOpportunityToAssign(null)
        
        // Emit event if status changed to/from 'new' to trigger stats refresh
        if (previousStatus === 'new' || updatedOpportunity.status === 'new') {
          window.dispatchEvent(new CustomEvent('opportunityStatusChanged', {
            detail: { opportunityId: opportunityToAssign.id, previousStatus, newStatus: updatedOpportunity.status }
          }))
        }
      } else {
        throw new Error('Failed to update opportunity assignment')
      }
    } catch (error: any) {
      // Revert change in case of error
      setOpportunities(previousOpportunities)
      const errorMessage = error?.message || error?.details || 'Unknown error occurred'
      toast.error(`Failed to assign opportunity: ${errorMessage}`)
      console.error('Error assigning team member:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        opportunityId: opportunityToAssign.id,
        memberId,
        fullError: error,
      })
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(opportunityToAssign.id)
        return next
      })
    }
  }

  const handleMoveToComplete = async (opportunityId: string) => {
    await handleUpdateStatus(opportunityId, "done")
  }

  const handleArchive = async (opportunityId: string) => {
    await handleUpdateStatus(opportunityId, "archived")
    toast.success('Opportunity archived')
  }

  const handleCancel = async (opportunityId: string) => {
    await handleUpdateStatus(opportunityId, "cancelled")
    toast.success('Opportunity cancelled')
  }

  const handleDelete = async (opportunityId: string) => {
    // Get the opportunity before deleting for event emission
    const deletedOpportunity = opportunities.find(opp => opp.id === opportunityId)
    
    // Optimistic update: remove from state immediately
    setOpportunities((prev) => prev.filter((opp) => opp.id !== opportunityId))
    
    try {
      await deleteOpportunity(opportunityId)
      
      toast.success('Opportunity deleted successfully')
      
      // Emit event to trigger stats refresh if needed
      if (deletedOpportunity && deletedOpportunity.status === 'new') {
        window.dispatchEvent(new CustomEvent('opportunityStatusChanged', {
          detail: { opportunityId, previousStatus: 'new', newStatus: null }
        }))
      }
    } catch (error: any) {
      // Revert optimistic update on error
      const data = await getOpportunities()
      setOpportunities(data)
      
      const errorMessage = error?.message || 'Unknown error occurred'
      toast.error(`Failed to delete opportunity: ${errorMessage}`)
      console.error('Error deleting opportunity:', error)
    }
  }

  const handleSaveEdits = (updatedOpportunity: Opportunity) => {
    if (selectedOpportunity) {
      // Update with real data from DB (already persisted)
      setOpportunities((prev) => 
        prev.map((opp) => (opp.id === selectedOpportunity.id ? updatedOpportunity : opp))
      )
      setSelectedOpportunity(updatedOpportunity)
    }
  }

  // Validate workflow rules
  const validateMove = (fromStatus: string, toStatus: string): { valid: boolean; reason?: string } => {
    // Prohibited: Cannot move from Assigned back to New
    if (fromStatus === "assigned" && toStatus === "new") {
      return { valid: false, reason: "Cannot move from Assigned back to New" }
    }
    
    // Allowed: Done to Assigned (re-work)
    // Allowed: New to Assigned (with modal)
    // Allowed: Any to Done (with confirmation)
    // Allowed: Assigned to Done
    return { valid: true }
  }

  // Handle drag start to track which column is being dragged over
  const handleDragStart = (start: DragStart) => {
    const opportunity = opportunities.find(opp => opp.id === start.draggableId)
    if (opportunity) {
      setDraggingOverColumn(opportunity.status)
    }
  }

  // Handle drag update to track which column is being dragged over
  const handleDragUpdate = (update: any) => {
    if (update.destination) {
      setDraggingOverColumn(update.destination.droppableId)
    } else {
      setDraggingOverColumn(null)
    }
  }

  // Confirm move to Done
  const handleConfirmDone = async () => {
    if (!pendingMove) return

    const { opportunityId, newStatus } = pendingMove
    await executeMove(opportunityId, newStatus)
    setShowDoneConfirmation(false)
    setPendingMove(null)
  }

  // Execute the actual move to database
  const executeMove = async (opportunityId: string, newStatus: "new" | "assigned" | "done") => {
    const opportunity = opportunities.find(opp => opp.id === opportunityId)
    if (!opportunity) return

    const previousOpportunities = [...opportunities]
    setOpportunities((prev) =>
      prev.map((opp) => (opp.id === opportunityId ? { ...opp, status: newStatus } : opp))
    )
    setUpdatingIds((prev) => new Set(prev).add(opportunityId))

    try {
      const updatedOpportunity = await updateOpportunityStatus(opportunityId, newStatus)
      
      if (updatedOpportunity) {
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === opportunityId ? updatedOpportunity : opp))
        )
        
        if (opportunity.status === 'new' || newStatus === 'new') {
          window.dispatchEvent(new CustomEvent('opportunityStatusChanged', {
            detail: { opportunityId, previousStatus: opportunity.status, newStatus }
          }))
        }
      } else {
        throw new Error('Failed to update opportunity')
      }
    } catch (error) {
      setOpportunities(previousOpportunities)
      toast.error('Failed to update opportunity status. Please try again.')
      console.error('Error updating opportunity status:', error)
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(opportunityId)
        return next
      })
    }
  }

  // Handle drag and drop
  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    setDraggingOverColumn(null)

    // If dropped outside a droppable area, do nothing
    if (!destination) {
      return
    }

    // If dropped in the same position, do nothing
    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return
    }

    // Map column IDs to status values
    const statusMap: Record<string, "new" | "assigned" | "done"> = {
      "new": "new",
      "assigned": "assigned",
      "done": "done",
    }

    const newStatus = statusMap[destination.droppableId]
    const oldStatus = statusMap[source.droppableId]
    
    if (!newStatus || !oldStatus) {
      return
    }

    // Get the opportunity being moved
    const opportunity = opportunities.find(opp => opp.id === draggableId)
    if (!opportunity) {
      return
    }

    // If status hasn't changed, do nothing
    if (opportunity.status === newStatus) {
      return
    }

    // Validate workflow rules
    const validation = validateMove(oldStatus, newStatus)
    if (!validation.valid) {
      // Invalid move - show bounce animation via toast
      toast.error(validation.reason || "Invalid move")
      // The card will automatically return to its original position
      return
    }

    // Handle special cases that require modals
    if (oldStatus === "new" && newStatus === "assigned") {
      // Open assign modal instead of moving directly
      setOpportunityToAssign(opportunity)
      setRecommendationModalOpen(true)
      setPendingMove({ opportunityId: draggableId, newStatus })
      return
    }

    if (newStatus === "done") {
      // Open confirmation dialog
      setPendingMove({ opportunityId: draggableId, newStatus })
      setShowDoneConfirmation(true)
      return
    }

    // Direct move (no modal required)
    await executeMove(draggableId, newStatus)
  }

  // Handle team member assignment from drag & drop
  const handleAssignFromDrag = async (memberId: string) => {
    if (!opportunityToAssign || !pendingMove) return

    const previousStatus = opportunityToAssign.status

    // Update assignment and status
    const previousOpportunities = [...opportunities]
    setUpdatingIds((prev) => new Set(prev).add(opportunityToAssign.id))

    setOpportunities((prev) =>
      prev.map((opp) => 
        opp.id === opportunityToAssign.id 
          ? { ...opp, status: 'assigned' as const, assignee: 'Loading...' }
          : opp
      )
    )

    try {
      // Update assigned_user_id and status in Supabase
      const updatedOpportunity = await updateOpportunityAssignment(opportunityToAssign.id, memberId)
      
      if (updatedOpportunity) {
        setOpportunities((prev) =>
          prev.map((opp) => (opp.id === opportunityToAssign.id ? updatedOpportunity : opp))
        )
        toast.success(`Opportunity assigned successfully`)
        setRecommendationModalOpen(false)
        setOpportunityToAssign(null)
        setPendingMove(null)
        
        if (previousStatus === 'new' || updatedOpportunity.status === 'new') {
          window.dispatchEvent(new CustomEvent('opportunityStatusChanged', {
            detail: { opportunityId: opportunityToAssign.id, previousStatus, newStatus: updatedOpportunity.status }
          }))
        }
      } else {
        throw new Error('Failed to update opportunity assignment')
      }
    } catch (error: any) {
      setOpportunities(previousOpportunities)
      const errorMessage = error?.message || error?.details || 'Unknown error occurred'
      toast.error(`Failed to assign opportunity: ${errorMessage}`)
      console.error('Error assigning team member:', error)
      setPendingMove(null)
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev)
        next.delete(opportunityToAssign.id)
        return next
      })
    }
  }

  // Mostrar skeleton mientras carga
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {columns.map((column) => (
            <div key={column.status} className="space-y-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-3 h-3 rounded-full" />
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-8 ml-auto" />
              </div>
              <div className="space-y-4 min-h-96 bg-white/30 backdrop-blur-xl rounded-[2rem] p-5 border border-white/40 shadow-[0_8px_32px_0_rgba(31,38,135,0.05)]">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-2xl bg-white/50" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <DragDropContext 
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-sm text-slate-600 font-medium">
            {filteredOpportunities.length} opportunity{filteredOpportunities.length !== 1 ? "ies" : ""}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              droppableId={column.status}
              title={column.title}
              opportunities={filteredOpportunities.filter((o) => o.status === column.status)}
              onCardClick={(opp) => setSelectedOpportunity(opp)}
              onAssignClick={handleAssignClick}
              onMoveToComplete={handleMoveToComplete}
              onArchive={handleArchive}
              updatingIds={updatingIds}
              isDraggingOverOther={draggingOverColumn !== null && draggingOverColumn !== column.status}
            />
          ))}
        </div>
      </div>

      {selectedOpportunity && (
        <OpportunityDetailsModal
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
          onAssignClick={() => {
            setOpportunityToAssign(selectedOpportunity)
            setRecommendationModalOpen(true)
            setSelectedOpportunity(null)
          }}
          onSaveEdits={handleSaveEdits}
          onCancel={handleCancel}
          onDelete={handleDelete}
        />
      )}

      {opportunityToAssign && (
        <TeamRecommendationModal
          open={recommendationModalOpen}
          onOpenChange={(open) => {
            setRecommendationModalOpen(open)
            if (!open) {
              setOpportunityToAssign(null)
              setPendingMove(null)
            }
          }}
          opportunity={opportunityToAssign}
          onAssignTeamMember={pendingMove ? handleAssignFromDrag : handleAssignTeamMember}
        />
      )}

      {/* Confirmation Dialog for Done */}
      <Dialog open={showDoneConfirmation} onOpenChange={setShowDoneConfirmation}>
        <DialogContent className="max-w-md bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">Mark as Done?</DialogTitle>
            <DialogDescription className="text-slate-600">
              Are you sure you want to mark this opportunity as done? This action can be reversed later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDoneConfirmation(false)
                setPendingMove(null)
              }}
              className="rounded-2xl border-white/40 bg-white/50"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmDone}
              className="rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
            >
              Mark as Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DragDropContext>
  )
}
