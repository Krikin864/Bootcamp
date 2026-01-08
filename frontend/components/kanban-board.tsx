"use client"

import { useState, useEffect } from "react"
import KanbanColumn from "@/components/kanban-column"
import OpportunityDetailsModal from "@/components/opportunity-details-modal"
import TeamRecommendationModal from "@/components/team-recommendation-modal"
import { Skeleton } from "@/components/ui/skeleton"
import { getOpportunities, updateOpportunityStatus, updateOpportunityAssignment, type Opportunity } from "@/services/opportunities"
import { toast } from "sonner"

export default function KanbanBoard({ filters }: { filters?: any }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set())
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false)
  const [opportunityToAssign, setOpportunityToAssign] = useState<Opportunity | null>(null)

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

  const filteredOpportunities = opportunities.filter((opp) => {
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

  const handleSaveEdits = (updatedOpportunity: Opportunity) => {
    if (selectedOpportunity) {
      // Update with real data from DB (already persisted)
      setOpportunities((prev) => 
        prev.map((opp) => (opp.id === selectedOpportunity.id ? updatedOpportunity : opp))
      )
      setSelectedOpportunity(updatedOpportunity)
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
              <div className="space-y-3 min-h-96 bg-secondary/30 rounded-lg p-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {filteredOpportunities.length} opportunity{filteredOpportunities.length !== 1 ? "ies" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {columns.map((column) => (
          <KanbanColumn
            key={column.status}
            title={column.title}
            opportunities={filteredOpportunities.filter((o) => o.status === column.status)}
            onCardClick={setSelectedOpportunity}
            onAssignClick={handleAssignClick}
            onMoveToComplete={handleMoveToComplete}
            onArchive={handleArchive}
            updatingIds={updatingIds}
          />
        ))}
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
        />
      )}

      {opportunityToAssign && (
        <TeamRecommendationModal
          open={recommendationModalOpen}
          onOpenChange={setRecommendationModalOpen}
          opportunity={opportunityToAssign}
          onAssignTeamMember={handleAssignTeamMember}
        />
      )}
    </div>
  )
}
