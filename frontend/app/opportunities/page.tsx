"use client"

import { useState, useEffect } from "react"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Search, Plus, LayoutGrid, LayoutList } from "lucide-react"
import { Input } from "@/components/ui/input"
import OpportunityCard from "@/components/opportunity-card"
import FilterBar from "@/components/filter-bar"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getOpportunities, type Opportunity } from "@/services/opportunities"
import NewOpportunityModal from "@/components/new-opportunity-modal"
import { useSidebarState } from "@/hooks/use-sidebar-state"

export default function OpportunitiesPage() {
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebarState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [sortBy, setSortBy] = useState("recent")
  const [filters, setFilters] = useState({
    urgency: "",
    skill: "",
    assignedTeam: "",
  })
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewOpportunityModal, setShowNewOpportunityModal] = useState(false)

  // Cargar oportunidades desde Supabase
  useEffect(() => {
    async function loadOpportunities() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getOpportunities()
        setOpportunities(data)
      } catch (err) {
        console.error('Error loading opportunities:', err)
        setError('Failed to load opportunities. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    loadOpportunities()
  }, [])

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "text-red-600 bg-red-50"
      case "medium":
        return "text-yellow-600 bg-yellow-50"
      case "low":
        return "text-green-600 bg-green-50"
      default:
        return ""
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return "bg-blue-100 text-blue-800"
      case "assigned":
        return "bg-purple-100 text-purple-800"
      case "done":
        return "bg-green-100 text-green-800"
      default:
        return ""
    }
  }

  const filteredAndSortedOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    // Filtrar por urgencia: si el filtro es "all" o está vacío, mostrar todas; si no, filtrar por la urgencia específica
    if (filters.urgency && filters.urgency !== "" && filters.urgency !== "all") {
      if (opp.urgency !== filters.urgency.toLowerCase()) return false
    }

    if (filters.skill && filters.skill !== "") {
      const skills = Array.isArray(opp.requiredSkill) ? opp.requiredSkill : [opp.requiredSkill]
      if (!skills.includes(filters.skill)) return false
    }

    if (filters.assignedTeam && filters.assignedTeam !== "" && opp.assignee !== filters.assignedTeam) return false
    return true
  }).sort((a, b) => {
    switch (sortBy) {
      case "oldest":
        return new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime()
      case "urgency-high":
        return a.urgency === "high" ? -1 : a.urgency === "medium" ? 1 : 2
      case "urgency-low":
        return a.urgency === "low" ? -1 : a.urgency === "medium" ? 1 : 2
      case "status":
        return a.status.localeCompare(b.status)
      case "recent":
      default:
        return new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime()
    }
  })

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar open={sidebarOpen} />
      <div className="flex flex-col flex-1">
        <Header onSidebarToggle={toggleSidebar} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Opportunities</h1>
                <p className="text-muted-foreground">Manage all your leads and opportunities</p>
              </div>
              <Button className="gap-2" onClick={() => setShowNewOpportunityModal(true)}>
                <Plus className="h-4 w-4" />
                New Opportunity
              </Button>
            </div>

            <div className="flex gap-4 items-end">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search opportunities..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "table" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("table")}
                  className="bg-transparent"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "default" : "outline"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="bg-transparent"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <FilterBar filters={filters} setFilters={setFilters} sortBy={sortBy} setSortBy={setSortBy} />

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <p className="text-destructive">{error}</p>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-4">
                {viewMode === "grid" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="bg-card border border-border rounded-lg p-4 space-y-3">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-muted border-b border-border">
                        <tr>
                          <th className="px-6 py-3 text-left font-semibold text-foreground">Client</th>
                          <th className="px-6 py-3 text-left font-semibold text-foreground">Company</th>
                          <th className="px-6 py-3 text-left font-semibold text-foreground">Skill Required</th>
                          <th className="px-6 py-3 text-left font-semibold text-foreground">Urgency</th>
                          <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                          <th className="px-6 py-3 text-left font-semibold text-foreground">Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[...Array(5)].map((_, i) => (
                          <tr key={i}>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                            <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : filteredAndSortedOpportunities.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-foreground">No opportunities yet</h3>
                  <p className="text-muted-foreground">
                    Get started by creating your first opportunity. Add client information and let AI help you analyze their needs.
                  </p>
                  <Button className="gap-2 mt-4" onClick={() => setShowNewOpportunityModal(true)}>
                    <Plus className="h-4 w-4" />
                    Create First Opportunity
                  </Button>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAndSortedOpportunities.map((opp) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={{
                      ...opp,
                      isProcessing: false,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted border-b border-border">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">Client</th>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">Company</th>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">Skill Required</th>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">Urgency</th>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredAndSortedOpportunities.map((opp) => {
                      const skills = Array.isArray(opp.requiredSkill) ? opp.requiredSkill : [opp.requiredSkill]
                      return (
                        <tr key={opp.id} className="hover:bg-muted transition-colors">
                          <td className="px-6 py-4 font-medium text-foreground">{opp.clientName}</td>
                          <td className="px-6 py-4 text-card-foreground">{opp.company}</td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1.5">
                              {skills.length > 0 ? (
                                skills.map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted-foreground text-sm">No skills</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(opp.urgency)}`}
                            >
                              {opp.urgency.charAt(0).toUpperCase() + opp.urgency.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(opp.status)}`}>
                              {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-muted-foreground">{opp.createdDate}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
      <NewOpportunityModal 
        open={showNewOpportunityModal} 
        onOpenChange={setShowNewOpportunityModal} 
      />
    </div>
  )
}
