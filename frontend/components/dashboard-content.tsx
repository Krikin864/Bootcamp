"use client"
import { useState, useEffect } from "react"
import KanbanBoard from "@/components/kanban-board"
import StatsCard from "@/components/stats-card"
import FilterBar from "@/components/filter-bar"
import NewOpportunityModal from "@/components/new-opportunity-modal"
import { TrendingUp, Users, Zap, Target, Plus, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getTotalOpportunitiesCount, getActiveOpportunitiesCount } from "@/services/opportunities"
import { getTeamMembersCount } from "@/services/members"

export default function DashboardContent({ onSidebarToggle }: { onSidebarToggle: () => void }) {
  const [showNewOpportunity, setShowNewOpportunity] = useState(false)
  const [filters, setFilters] = useState({
    urgency: "",
    skill: "",
    assignedTeam: "",
  })
  const [stats, setStats] = useState([
    { label: "Total Opportunities", value: "0", icon: Target },
    { label: "Active Leads", value: "0", icon: Zap },
    { label: "Team Members", value: "0", icon: Users },
    { label: "AI Summaries", value: "156", icon: TrendingUp },
  ])

  // Cargar estadísticas reales desde Supabase
  useEffect(() => {
    async function loadStats() {
      try {
        const [totalOpps, activeOpps, teamMembers] = await Promise.all([
          getTotalOpportunitiesCount(),
          getActiveOpportunitiesCount(),
          getTeamMembersCount(),
        ])

        setStats([
          { label: "Total Opportunities", value: String(totalOpps), icon: Target },
          { label: "Active Leads", value: String(activeOpps), icon: Zap },
          { label: "Team Members", value: String(teamMembers), icon: Users },
          { label: "AI Summaries", value: "156", icon: TrendingUp }, // Mantener mock
        ])
      } catch (error) {
        console.error('Error loading stats:', error)
        // Mantener valores por defecto en caso de error
      }
    }

    loadStats()
  }, [])

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onSidebarToggle} className="text-foreground hover:bg-secondary">
            <Menu className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground text-sm">Welcome back! Here's your lead management overview.</p>
          </div>
        </div>
        <Button onClick={() => setShowNewOpportunity(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Opportunity
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatsCard key={stat.label} {...stat} />
        ))}
      </div>

      <FilterBar filters={filters} setFilters={setFilters} hideSortBy />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Opportunities Pipeline</h2>
        <KanbanBoard filters={filters} />
      </div>

      <NewOpportunityModal open={showNewOpportunity} onOpenChange={setShowNewOpportunity} />
    </div>
  )
}
