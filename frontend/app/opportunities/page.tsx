"use client"

import { useState } from "react"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Search, Plus, LayoutGrid, LayoutList } from "lucide-react"
import { Input } from "@/components/ui/input"
import OpportunityCard from "@/components/opportunity-card"
import FilterBar from "@/components/filter-bar"
import { OPPORTUNITIES } from "@/lib/opportunities-data"

interface Opportunity {
  id: string
  clientName: string
  company: string
  requiredSkill: string | string[]
  urgency: "high" | "medium" | "low"
  status: "new" | "assigned" | "done"
  createdDate: string
  summary: string
  aiSummary: string
  assignee: string
}

export default function OpportunitiesPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [sortBy, setSortBy] = useState("recent")
  const [filters, setFilters] = useState({
    urgency: "",
    skill: "",
    assignedTeam: "",
  })

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

  const filteredAndSortedOpportunities = OPPORTUNITIES.filter((opp) => {
    const matchesSearch =
      opp.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchTerm.toLowerCase())

    if (!matchesSearch) return false

    if (filters.urgency && filters.urgency !== "" && opp.urgency !== filters.urgency.toLowerCase()) return false

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
        <Header onSidebarToggle={() => setSidebarOpen(!sidebarOpen)} />
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Opportunities</h1>
                <p className="text-muted-foreground">Manage all your leads and opportunities</p>
              </div>
              <Button className="gap-2">
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

            {viewMode === "grid" ? (
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
                    {filteredAndSortedOpportunities.map((opp) => (
                      <tr key={opp.id} className="hover:bg-muted transition-colors">
                        <td className="px-6 py-4 font-medium text-foreground">{opp.clientName}</td>
                        <td className="px-6 py-4 text-card-foreground">{opp.company}</td>
                        <td className="px-6 py-4 text-card-foreground">
                          {Array.isArray(opp.requiredSkill) ? opp.requiredSkill.join(", ") : opp.requiredSkill}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
