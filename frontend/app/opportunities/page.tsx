"use client"

import { useState, useEffect } from "react"
import Header from "@/components/header"
import Sidebar from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Search, Plus, LayoutGrid, LayoutList } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import OpportunityCard from "@/components/opportunity-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getOpportunities, updateOpportunityStatus, type Opportunity } from "@/services/opportunities"
import { getSkills, type Skill } from "@/services/skills"
import { getTeamMembers, type TeamMember } from "@/services/members"
import NewOpportunityModal from "@/components/new-opportunity-modal"
import OpportunityDetailsModal from "@/components/opportunity-details-modal"
import { useSidebarState } from "@/hooks/use-sidebar-state"
import { toast } from "sonner"

export default function OpportunitiesPage() {
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebarState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"table" | "grid">("table")
  const [sortBy, setSortBy] = useState("recent")
  const [filters, setFilters] = useState({
    status: "",
    startDate: "",
    endDate: "",
    urgency: "",
    skill: "",
    assignedTeam: "",
  })
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showNewOpportunityModal, setShowNewOpportunityModal] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoadingFilters, setIsLoadingFilters] = useState(true)
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null)

  // Load opportunities from database
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

  // Load filter options (skills and team members) from database
  useEffect(() => {
    async function loadFilterOptions() {
      try {
        setIsLoadingFilters(true)
        const [skillsData, membersData] = await Promise.all([
          getSkills(),
          getTeamMembers(),
        ])
        setSkills(skillsData)
        setTeamMembers(membersData)
      } catch (err) {
        console.error('Error loading filter options:', err)
      } finally {
        setIsLoadingFilters(false)
      }
    }

    loadFilterOptions()
  }, [])

  // Real-time filtering: the filteredAndSortedOpportunities computed value
  // automatically updates when filters, searchTerm, or opportunities change

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
      case "cancelled":
        return "bg-red-100 text-red-800"
      case "archived":
        return "bg-gray-100 text-gray-800"
      default:
        return ""
    }
  }

  const filteredAndSortedOpportunities = opportunities.filter((opp) => {
    // Search filter
    const matchesSearch =
      opp.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      opp.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opp.aiSummary && opp.aiSummary.toLowerCase().includes(searchTerm.toLowerCase()))

    if (!matchesSearch) return false

    // Status filter - filter by Archived, Cancelled, or Done
    if (filters.status && filters.status !== "" && filters.status !== "all") {
      if (opp.status !== filters.status.toLowerCase()) return false
    }

    // Urgency filter
    if (filters.urgency && filters.urgency !== "" && filters.urgency !== "all") {
      if (opp.urgency !== filters.urgency.toLowerCase()) return false
    }

    // Skill filter - filter by skill ID (from database)
    if (filters.skill && filters.skill !== "" && filters.skill !== "all") {
      if (opp.requiredSkillId !== filters.skill) return false
    }

    // Assigned team member filter - filter by member ID (from database)
    if (filters.assignedTeam && filters.assignedTeam !== "" && filters.assignedTeam !== "all") {
      if (opp.assigneeId !== filters.assignedTeam) return false
    }

    // Date range filter - parse createdDate string (format: "Jan 15, 2024")
    // Note: createdDate is formatted as locale string, so we parse it carefully
    if (filters.startDate || filters.endDate) {
      try {
        // Parse the formatted date string (e.g., "Jan 15, 2024")
        const oppDate = new Date(opp.createdDate)
        if (isNaN(oppDate.getTime())) {
          // If parsing fails, include the opportunity to avoid filtering out valid data
          return true
        }
        
        // Normalize to start of day for comparison
        oppDate.setHours(0, 0, 0, 0)
        
        if (filters.startDate) {
          const startDate = new Date(filters.startDate)
          startDate.setHours(0, 0, 0, 0)
          if (oppDate < startDate) return false
        }
        if (filters.endDate) {
          const endDate = new Date(filters.endDate)
          endDate.setHours(23, 59, 59, 999)
          if (oppDate > endDate) return false
        }
      } catch (error) {
        // If date parsing fails, include the opportunity to avoid filtering out valid data
        console.warn('Error parsing date for opportunity:', opp.id, error)
      }
    }

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
                <h1 className="text-3xl font-bold text-foreground">Opportunities History</h1>
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

            {/* History Page Filters - Organized in responsive grid */}
            <div className="space-y-4 p-4 bg-card border border-border rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Status Filter */}
                <div className="space-y-2">
                  <Label htmlFor="status-filter" className="text-sm font-medium">Status</Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
                    disabled={isLoadingFilters}
                  >
                    <SelectTrigger id="status-filter" className="w-full">
                      <SelectValue placeholder={isLoadingFilters ? "Loading..." : "All Statuses"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="new">New</SelectItem>
                      <SelectItem value="assigned">Assigned</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Urgency Filter */}
                <div className="space-y-2">
                  <Label htmlFor="urgency-filter" className="text-sm font-medium">Urgency</Label>
                  <Select
                    value={filters.urgency || "all"}
                    onValueChange={(value) => setFilters({ ...filters, urgency: value === "all" ? "" : value })}
                    disabled={isLoadingFilters}
                  >
                    <SelectTrigger id="urgency-filter" className="w-full">
                      <SelectValue placeholder="All Urgencies" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Urgencies</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Skill Filter */}
                <div className="space-y-2">
                  <Label htmlFor="skill-filter" className="text-sm font-medium">Skill</Label>
                  <Select
                    value={filters.skill || "all"}
                    onValueChange={(value) => setFilters({ ...filters, skill: value === "all" ? "" : value })}
                    disabled={isLoadingFilters}
                  >
                    <SelectTrigger id="skill-filter" className="w-full">
                      <SelectValue placeholder={isLoadingFilters ? "Loading..." : "All Skills"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Skills</SelectItem>
                      {skills.map((skill) => (
                        <SelectItem key={skill.id} value={skill.id}>
                          {skill.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Team Member Filter */}
                <div className="space-y-2">
                  <Label htmlFor="team-filter" className="text-sm font-medium">Team Member</Label>
                  <Select
                    value={filters.assignedTeam || "all"}
                    onValueChange={(value) => setFilters({ ...filters, assignedTeam: value === "all" ? "" : value })}
                    disabled={isLoadingFilters}
                  >
                    <SelectTrigger id="team-filter" className="w-full">
                      <SelectValue placeholder={isLoadingFilters ? "Loading..." : "All Members"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Members</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Start Date Filter */}
                <div className="space-y-2">
                  <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={filters.startDate}
                    onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                    className="w-full"
                  />
                </div>

                {/* End Date Filter */}
                <div className="space-y-2">
                  <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={filters.endDate}
                    onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Clear Filters Button */}
              {(filters.status || filters.urgency || filters.skill || filters.assignedTeam || filters.startDate || filters.endDate) && (
                <div className="flex justify-end pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() => setFilters({ status: "", urgency: "", skill: "", assignedTeam: "", startDate: "", endDate: "" })}
                    size="sm"
                  >
                    Clear All Filters
                  </Button>
                </div>
              )}
            </div>

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
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted border-b border-border">
                          <tr>
                            <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '15%' }}>Client</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '15%' }}>Company</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '10%' }}>Date</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '10%' }}>Status</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '10%' }}>Urgency</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '15%' }}>Team Member</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '10%' }}>Skill</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">AI Summary</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[...Array(5)].map((_, i) => (
                            <tr key={i}>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-24" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-4 py-4"><Skeleton className="h-4 w-48" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
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
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted border-b border-border">
                      <tr>
                        <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '15%' }}>Client</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '15%' }}>Company</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '10%' }}>Date</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '10%' }}>Status</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '10%' }}>Urgency</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '15%' }}>Team Member</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground" style={{ width: '10%' }}>Skill</th>
                        <th className="px-4 py-3 text-left font-semibold text-foreground">AI Summary</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAndSortedOpportunities.map((opp) => {
                        const skills = Array.isArray(opp.requiredSkill) ? opp.requiredSkill : [opp.requiredSkill]
                        return (
                          <tr
                            key={opp.id}
                            onClick={() => setSelectedOpportunity(opp)}
                            className="hover:bg-muted/50 cursor-pointer transition-colors"
                          >
                            <td className="px-4 py-4 font-medium text-foreground text-sm">{opp.clientName}</td>
                            <td className="px-4 py-4 text-card-foreground text-sm">{opp.company}</td>
                            <td className="px-4 py-4 text-muted-foreground text-sm">{opp.createdDate}</td>
                            <td className="px-4 py-4">
                              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(opp.status)}`}>
                                {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`px-3 py-1 rounded-full text-sm font-medium ${getUrgencyColor(opp.urgency)}`}
                              >
                                {opp.urgency.charAt(0).toUpperCase() + opp.urgency.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-sm text-foreground">
                              {opp.assignee ? (
                                <span className="font-medium">{opp.assignee}</span>
                              ) : (
                                <span className="text-muted-foreground italic">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap gap-1.5">
                                {skills.length > 0 ? (
                                  skills.map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground text-xs">No skills</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-4 text-sm text-muted-foreground">
                              <p className="line-clamp-1 truncate">{opp.aiSummary || opp.summary || 'No summary available'}</p>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      <NewOpportunityModal 
        open={showNewOpportunityModal} 
        onOpenChange={setShowNewOpportunityModal} 
      />

      {selectedOpportunity && (
        <OpportunityDetailsModal
          opportunity={selectedOpportunity}
          onClose={() => setSelectedOpportunity(null)}
          onAssignClick={() => {
            // For history page, we can close the modal and let user navigate if needed
            setSelectedOpportunity(null)
            toast.info('Use the Kanban board to assign opportunities')
          }}
          onSaveEdits={(updatedOpportunity) => {
            // Update the opportunity in the list
            setOpportunities((prev) =>
              prev.map((opp) => (opp.id === updatedOpportunity.id ? updatedOpportunity : opp))
            )
            setSelectedOpportunity(updatedOpportunity)
            toast.success('Opportunity updated successfully')
          }}
          onCancel={async (opportunityId) => {
            try {
              await updateOpportunityStatus(opportunityId, 'cancelled')
              setOpportunities((prev) =>
                prev.map((opp) => (opp.id === opportunityId ? { ...opp, status: 'cancelled' as const } : opp))
              )
              setSelectedOpportunity(null)
              toast.success('Opportunity cancelled successfully')
            } catch (error: any) {
              toast.error(`Failed to cancel opportunity: ${error.message || 'Unknown error'}`)
            }
          }}
        />
      )}
    </div>
  )
}
