"use client"
import { useState } from "react"
import KanbanBoard from "@/components/kanban-board"
import StatsCard from "@/components/stats-card"
import FilterBar from "@/components/filter-bar"
import NewOpportunityModal from "@/components/new-opportunity-modal"
import { TrendingUp, Users, Zap, Target, Plus, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TEAM_MEMBERS } from "@/lib/team-data"

export default function DashboardContent({ onSidebarToggle }: { onSidebarToggle: () => void }) {
  const [showNewOpportunity, setShowNewOpportunity] = useState(false)
  const [filters, setFilters] = useState({
    urgency: "",
    skill: "",
    assignedTeam: "",
  })

  const stats = [
    { label: "Total Opportunities", value: "48", icon: Target },
    { label: "Active Leads", value: "23", icon: Zap },
    { label: "Team Members", value: String(TEAM_MEMBERS.length), icon: Users },
    { label: "AI Summaries", value: "156", icon: TrendingUp },
  ]

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

      <FilterBar filters={filters} setFilters={setFilters} />

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Opportunities Pipeline</h2>
        <KanbanBoard filters={filters} />
      </div>

      <NewOpportunityModal open={showNewOpportunity} onOpenChange={setShowNewOpportunity} />
    </div>
  )
}
