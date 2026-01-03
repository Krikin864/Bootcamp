"use client"

import { useState, useEffect } from "react"
import KanbanColumn from "@/components/kanban-column"
import OpportunityDetailsModal from "@/components/opportunity-details-modal"
import TeamRecommendationModal from "@/components/team-recommendation-modal"
import { OPPORTUNITIES, type Opportunity } from "@/lib/opportunities-data"

export default function KanbanBoard({ filters }: { filters?: any }) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(OPPORTUNITIES)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)
  const [recommendationModalOpen, setRecommendationModalOpen] = useState(false)
  const [opportunityToAssign, setOpportunityToAssign] = useState<Opportunity | null>(null)

  useEffect(() => {
    const handleAddOpportunity = (event: Event) => {
      const customEvent = event as CustomEvent
      setOpportunities((prev) => [...prev, customEvent.detail])
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
    if (filters?.urgency && filters.urgency !== "" && opp.urgency !== filters.urgency) return false

    if (filters?.skill && filters.skill !== "") {
      const skills = Array.isArray(opp.requiredSkill) ? opp.requiredSkill : [opp.requiredSkill]
      if (!skills.includes(filters.skill)) return false
    }

    if (filters?.assignedTeam && filters.assignedTeam !== "" && opp.assignee !== filters.assignedTeam) return false
    return true
  })

  const columns = [
    { status: "new" as const, title: "New" },
    { status: "assigned" as const, title: "Assigned" },
    { status: "done" as const, title: "Done" },
  ]

  const handleAssignClick = (opportunity: Opportunity) => {
    setOpportunityToAssign(opportunity)
    setRecommendationModalOpen(true)
  }

  const handleAssignTeamMember = (teamMember: string) => {
    if (opportunityToAssign) {
      setOpportunities(
        opportunities.map((opp) =>
          opp.id === opportunityToAssign.id ? { ...opp, assignee: teamMember, status: "assigned" } : opp,
        ),
      )
      setRecommendationModalOpen(false)
      setOpportunityToAssign(null)
    }
  }

  const handleMoveToComplete = (opportunityId: string) => {
    setOpportunities(opportunities.map((opp) => (opp.id === opportunityId ? { ...opp, status: "done" } : opp)))
  }

  const handleSaveEdits = (updates: Partial<Opportunity>) => {
    if (selectedOpportunity) {
      const updatedOpportunity = { ...selectedOpportunity, ...updates }
      setOpportunities((prev) => prev.map((opp) => (opp.id === selectedOpportunity.id ? updatedOpportunity : opp)))
      setSelectedOpportunity(updatedOpportunity)
    }
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
