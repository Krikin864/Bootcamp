"use client"
import { useState, useEffect } from "react"
import KanbanBoard from "@/components/kanban-board"
import StatsCard from "@/components/stats-card"
import FilterBar from "@/components/filter-bar"
import NewOpportunityModal from "@/components/new-opportunity-modal"
import { Flame, Code, Users, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getHighPriorityCount, getTopNeededSkill } from "@/services/opportunities"
import { getTeamAvailabilityPercentage } from "@/services/members"

export default function DashboardContent() {
  const [showNewOpportunity, setShowNewOpportunity] = useState(false)
  const [filters, setFilters] = useState({
    urgency: "",
    skill: "",
    assignedTeam: "",
  })
  const [stats, setStats] = useState([
    { label: "Critical Arrivals", value: "0", icon: Flame },
    { label: "Top Needed Skill", value: "Loading...", icon: Code },
    { label: "Team Availability", value: "0%", icon: Users },
  ])

  // Load real statistics from Supabase
  const loadStats = async () => {
    try {
      const [highPriorityCount, topSkill, availability] = await Promise.all([
        getHighPriorityCount(),
        getTopNeededSkill(),
        getTeamAvailabilityPercentage(),
      ])

      setStats([
        { label: "Critical Arrivals", value: String(highPriorityCount), icon: Flame },
        { label: "Top Needed Skill", value: topSkill, icon: Code },
        { label: "Team Availability", value: `${availability}%`, icon: Users },
      ])
    } catch (error) {
      console.error('Error loading stats:', error)
      // Keep default values in case of error
    }
  }

  // Load stats on mount
  useEffect(() => {
    loadStats()
  }, [])

  // Listen for opportunity status changes to refresh stats
  useEffect(() => {
    const handleOpportunityStatusChanged = () => {
      // Refresh stats when opportunity status or urgency changes
      loadStats()
    }

    // Listen for custom events from KanbanBoard
    window.addEventListener('opportunityStatusChanged', handleOpportunityStatusChanged)
    window.addEventListener('addOpportunity', handleOpportunityStatusChanged)

    return () => {
      window.removeEventListener('opportunityStatusChanged', handleOpportunityStatusChanged)
      window.removeEventListener('addOpportunity', handleOpportunityStatusChanged)
    }
  }, [])

  return (
    <div className="space-y-6 p-6 pt-4">
      <div className="mt-4 mx-4 bg-white/70 backdrop-blur-md border border-white/40 rounded-[2rem] shadow-sm px-8 py-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
        <Button 
          onClick={() => setShowNewOpportunity(true)} 
          className="gap-2 bg-gradient-to-r from-primary to-accent text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          New Opportunity
        </Button>
      </div>

      <div className="space-y-6 px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((stat) => (
            <StatsCard key={stat.label} {...stat} />
          ))}
        </div>

        <FilterBar filters={filters} setFilters={setFilters} hideSortBy />

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 px-2">Opportunities Pipeline</h2>
          <KanbanBoard filters={filters} />
        </div>

        <NewOpportunityModal open={showNewOpportunity} onOpenChange={setShowNewOpportunity} />
      </div>
    </div>
  )
}
