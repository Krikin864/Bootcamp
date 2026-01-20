"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Search, Plus, LayoutGrid, LayoutList, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import OpportunityCard from "@/components/opportunity-card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getOpportunities, updateOpportunityStatus, deleteOpportunity, type Opportunity } from "@/services/opportunities"
import { getSkills, type Skill } from "@/services/skills"
import { getTeamMembers, type TeamMember } from "@/services/members"
import NewOpportunityModal from "@/components/new-opportunity-modal"
import OpportunityDetailsModal from "@/components/opportunity-details-modal"
import { useSidebarState } from "@/hooks/use-sidebar-state"
import { toast } from "sonner"

export default function OpportunitiesPage() {
  const { isOpen: sidebarOpen } = useSidebarState(true)
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
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set())

  // Load opportunities from database
  useEffect(() => {
    async function loadOpportunities() {
      try {
        setIsLoading(true)
        setError(null)
        const data = await getOpportunities()
        
        // Debug: Log first opportunity to verify requiredSkillId is loaded
        if (process.env.NODE_ENV === 'development' && data.length > 0) {
          console.log('Loaded opportunities sample:', {
            total: data.length,
            firstOpp: {
              id: data[0].id,
              clientName: data[0].clientName,
              requiredSkill: data[0].requiredSkill,
              requiredSkillId: data[0].requiredSkillId,
              hasRequiredSkillId: !!data[0].requiredSkillId
            },
            oppsWithSkillId: data.filter(opp => opp.requiredSkillId).length
          })
        }
        
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
        return "bg-primary/10 text-primary"
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

  const handleDeleteOpportunity = async (opportunityId: string, e: React.MouseEvent) => {
    // Prevent row click event from firing
    e.stopPropagation()
    
    const confirmed = window.confirm('¿Estás seguro de que deseas eliminar esta oportunidad?')
    if (!confirmed) return

    try {
      setDeletingIds((prev) => new Set(prev).add(opportunityId))
      
      // Optimistic update: remove from state immediately
      setOpportunities((prev) => prev.filter((opp) => opp.id !== opportunityId))
      
      // Delete from database
      await deleteOpportunity(opportunityId)
      
      toast.success('Opportunity deleted successfully')
    } catch (error: any) {
      // Revert optimistic update on error
      const data = await getOpportunities()
      setOpportunities(data)
      
      const errorMessage = error?.message || 'Unknown error occurred'
      toast.error(`Failed to delete opportunity: ${errorMessage}`)
      console.error('Error deleting opportunity:', error)
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(opportunityId)
        return next
      })
    }
  }

  const filteredAndSortedOpportunities = opportunities.filter((opp) => {
    // Omni-search filter: matches Client Name, Company, Team Member Name, or Skill Required
    if (searchTerm.trim() !== "") {
      const searchLower = searchTerm.toLowerCase()
      const matchesClient = opp.clientName.toLowerCase().includes(searchLower)
      const matchesCompany = opp.company.toLowerCase().includes(searchLower)
      const matchesTeamMember = opp.assignee.toLowerCase().includes(searchLower)
      
      // Check if search matches any skill
      const skills = Array.isArray(opp.requiredSkill) ? opp.requiredSkill : [opp.requiredSkill]
      const matchesSkill = skills.some(skill => 
        skill && skill.toLowerCase().includes(searchLower)
      )
      
      const matchesSearch = matchesClient || matchesCompany || matchesTeamMember || matchesSkill
      
      if (!matchesSearch) return false
    }

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
      // If opportunity has no requiredSkillId, exclude it when filtering by skill
      // Compare as strings to ensure proper matching
      const filterSkillId = String(filters.skill).trim()
      const oppSkillId = opp.requiredSkillId ? String(opp.requiredSkillId).trim() : null
      
      // Debug logging for ALL opportunities when filter is active
      if (process.env.NODE_ENV === 'development') {
        console.log('🔍 Skill filter check:', {
          oppIndex: opportunities.indexOf(opp),
          oppId: opp.id,
          oppClientName: opp.clientName,
          filterSkillId,
          oppSkillId,
          oppRequiredSkillId_raw: opp.requiredSkillId,
          oppRequiredSkillId_type: typeof opp.requiredSkillId,
          oppRequiredSkill: opp.requiredSkill,
          matches: oppSkillId === filterSkillId,
          willInclude: oppSkillId === filterSkillId
        })
      }
      
      // If opportunity has no requiredSkillId, exclude it
      if (!oppSkillId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Excluding (no requiredSkillId):', opp.id, opp.clientName)
        }
        return false
      }
      
      // Compare IDs
      if (oppSkillId !== filterSkillId) {
        if (process.env.NODE_ENV === 'development') {
          console.log('❌ Excluding (ID mismatch):', opp.id, 'oppSkillId:', oppSkillId, 'filterSkillId:', filterSkillId)
        }
        return false
      }
      
      // If we get here, the IDs match
      if (process.env.NODE_ENV === 'development') {
        console.log('✅ Including (ID match):', opp.id, opp.clientName)
      }
    }

    // Assigned team member filter - filter by member ID (from database)
    if (filters.assignedTeam && filters.assignedTeam !== "" && filters.assignedTeam !== "all") {
      if (opp.assigneeId !== filters.assignedTeam) return false
    }

    // Date range filter - use created_at timestamp directly from database
    if (filters.startDate || filters.endDate) {
      try {
        // Use the raw created_at timestamp from database
        const oppDate = new Date(opp.created_at)
        if (isNaN(oppDate.getTime())) {
          // If parsing fails, include the opportunity to avoid filtering out valid data
          return true
        }
        
        if (filters.startDate) {
          // Parse date as YYYY-MM-DD to avoid timezone issues
          const startDateStr = typeof filters.startDate === 'string' 
            ? filters.startDate.split('T')[0] 
            : filters.startDate.toISOString().split('T')[0]
          const startDate = new Date(startDateStr + 'T00:00:00.000Z')
          // Filter for created_at >= startDate (start of day in UTC)
          if (oppDate < startDate) return false
        }
        
        if (filters.endDate) {
          // Parse date as YYYY-MM-DD to avoid timezone issues
          const endDateStr = typeof filters.endDate === 'string' 
            ? filters.endDate.split('T')[0] 
            : filters.endDate.toISOString().split('T')[0]
          const endDate = new Date(endDateStr + 'T23:59:59.999Z')
          // Filter for created_at <= endDate (end of day in UTC, inclusive)
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
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      case "urgency-high":
        return a.urgency === "high" ? -1 : a.urgency === "medium" ? 1 : 2
      case "urgency-low":
        return a.urgency === "low" ? -1 : a.urgency === "medium" ? 1 : 2
      case "status":
        return a.status.localeCompare(b.status)
      case "recent":
      default:
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    }
  })

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#d1d8e6] via-[#eef2f7] to-[#e2e8f0] text-foreground">
      <Sidebar open={sidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="h-16 mt-4 mx-4 bg-white/70 backdrop-blur-md border border-white/40 rounded-[2rem] shadow-sm px-6 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Opportunities History</h1>
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="flex items-center gap-2 flex-1 relative">
                <Search className="absolute left-3 h-4 w-4 text-slate-500 pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search opportunities..."
                  className="pl-10 border-0 bg-white/50 backdrop-blur-sm placeholder:text-slate-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <Button className="gap-2 rounded-2xl bg-gradient-to-r from-primary to-accent text-white hover:from-primary/90 hover:to-accent/90 shadow-lg hover:shadow-xl transition-all" size="sm" onClick={() => setShowNewOpportunityModal(true)}>
              <Plus className="h-4 w-4" />
              New Opportunity
            </Button>
          </div>

          <div className="p-6 pt-4 space-y-4 px-4">
            {/* History Page Filters - Organized in responsive grid */}
            <div className="p-6 bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
              <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filters</h2>
                <div className="flex items-center gap-3">
                  {/* Clear Filters Button */}
                  {(filters.status || filters.urgency || filters.skill || filters.assignedTeam || filters.startDate || filters.endDate) && (
                    <Button
                      variant="outline"
                      onClick={() => setFilters({ status: "", urgency: "", skill: "", assignedTeam: "", startDate: "", endDate: "" })}
                      size="sm"
                      className="rounded-full border-white/40 bg-white/50 text-xs h-8 px-3"
                    >
                      Clear Filters
                    </Button>
                  )}
                  {/* View Switcher - Switch Style */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-600">View:</span>
                    <div className="relative flex items-center bg-white/60 backdrop-blur-sm rounded-full p-1 border border-white/40 shadow-sm">
                      <button
                        onClick={() => setViewMode("table")}
                        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all z-10 ${
                          viewMode === "table"
                            ? "bg-gradient-to-r from-primary to-accent text-white shadow-md"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        <LayoutList className="h-4 w-4" />
                        <span>List</span>
                      </button>
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all z-10 ${
                          viewMode === "grid"
                            ? "bg-gradient-to-r from-primary to-accent text-white shadow-md"
                            : "text-slate-600 hover:text-slate-800"
                        }`}
                      >
                        <LayoutGrid className="h-4 w-4" />
                        <span>Grid</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
                    onValueChange={(value) => {
                      const newSkillValue = value === "all" ? "" : value
                      if (process.env.NODE_ENV === 'development') {
                        console.log('Skill filter changed:', { oldValue: filters.skill, newValue: newSkillValue, selectedValue: value })
                      }
                      setFilters({ ...filters, skill: newSkillValue })
                    }}
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
                      <div key={i} className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] p-6 space-y-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-6 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                    <div className="overflow-x-auto">
                      <table className="w-full table-fixed">
                        <thead className="bg-white/50 backdrop-blur-sm border-b border-white/30">
                          <tr>
                            <th className="pl-4 pr-2 py-2 text-left font-semibold text-slate-800 text-xs" style={{ width: '12%' }}>Client</th>
                            <th className="pl-4 pr-2 py-2 text-left font-semibold text-slate-800 text-xs" style={{ width: '12%' }}>Company</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-800 text-xs" style={{ width: '8%' }}>Date</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-800 text-xs" style={{ width: '20%' }}>AI Summary</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-800 text-xs" style={{ width: '11%' }}>Urgency</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-800 text-xs" style={{ width: '15%' }}>Team Member</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-800 text-xs" style={{ width: '11%' }}>Skill</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-800 text-xs" style={{ width: '11%' }}>Status</th>
                            <th className="px-4 py-2 text-left font-semibold text-slate-800 text-xs" style={{ width: '5%' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {[...Array(5)].map((_, i) => (
                            <tr key={i}>
                              <td className="pl-4 pr-2 py-2"><Skeleton className="h-4 w-20" /></td>
                              <td className="pl-4 pr-2 py-2"><Skeleton className="h-4 w-24" /></td>
                              <td className="px-4 py-2"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-4 py-2"><Skeleton className="h-4 w-32" /></td>
                              <td className="px-4 py-2"><Skeleton className="h-5 w-16 rounded-full" /></td>
                              <td className="px-4 py-2"><Skeleton className="h-4 w-24" /></td>
                              <td className="px-4 py-2"><Skeleton className="h-4 w-20" /></td>
                              <td className="px-4 py-2"><Skeleton className="h-5 w-16 rounded-full" /></td>
                              <td className="px-4 py-2"><Skeleton className="h-4 w-8" /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            ) : filteredAndSortedOpportunities.length === 0 ? (
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] p-12 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-6xl mb-4">📋</div>
                  <h3 className="text-xl font-semibold text-slate-800">No opportunities yet</h3>
                  <p className="text-slate-600">
                    Get started by creating your first opportunity. Add client information and let AI help you analyze their needs.
                  </p>
                  <Button className="gap-2 mt-4" onClick={() => setShowNewOpportunityModal(true)}>
                    <Plus className="h-4 w-4" />
                    Create First Opportunity
                  </Button>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 w-full">
                {filteredAndSortedOpportunities.map((opp, index) => (
                  <OpportunityCard
                    key={opp.id}
                    opportunity={{
                      ...opp,
                      isProcessing: false,
                    }}
                    onClick={() => setSelectedOpportunity(opp)}
                    isDraggable={false}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] overflow-hidden shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                <div className="overflow-x-auto">
                  <table className="w-full table-fixed">
                    <thead className="bg-white/50 backdrop-blur-sm border-b border-white/30">
                      <tr>
                        <th className="pl-4 pr-2 py-2 text-left font-semibold text-foreground text-xs" style={{ width: '12%' }}>Client</th>
                        <th className="pl-4 pr-2 py-2 text-left font-semibold text-foreground text-xs" style={{ width: '12%' }}>Company</th>
                        <th className="px-4 py-2 text-left font-semibold text-foreground text-xs" style={{ width: '8%' }}>Date</th>
                        <th className="px-4 py-2 text-left font-semibold text-foreground text-xs" style={{ width: '20%' }}>AI Summary</th>
                        <th className="px-4 py-2 text-left font-semibold text-foreground text-xs" style={{ width: '11%' }}>Urgency</th>
                        <th className="px-4 py-2 text-left font-semibold text-foreground text-xs" style={{ width: '15%' }}>Team Member</th>
                        <th className="px-4 py-2 text-left font-semibold text-foreground text-xs" style={{ width: '11%' }}>Skill</th>
                        <th className="px-4 py-2 text-left font-semibold text-foreground text-xs" style={{ width: '11%' }}>Status</th>
                        <th className="px-4 py-2 text-left font-semibold text-foreground text-xs" style={{ width: '5%' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredAndSortedOpportunities.map((opp) => {
                        const skills = Array.isArray(opp.requiredSkill) ? opp.requiredSkill : [opp.requiredSkill]
                        const isDeleting = deletingIds.has(opp.id)
                        return (
                          <tr
                            key={opp.id}
                            onClick={() => !isDeleting && setSelectedOpportunity(opp)}
                            className={`hover:bg-muted/50 transition-colors ${isDeleting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <td className="pl-4 pr-2 py-2 font-medium text-foreground text-sm">
                              <p className="truncate">{opp.clientName}</p>
                            </td>
                            <td className="pl-4 pr-2 py-2 text-card-foreground text-sm">
                              <p className="truncate">{opp.company}</p>
                            </td>
                            <td className="px-4 py-2 text-muted-foreground text-sm">{opp.createdDate}</td>
                            <td className="px-4 py-2 text-sm text-muted-foreground">
                              <p className="truncate">{opp.aiSummary || opp.summary || 'No summary available'}</p>
                            </td>
                            <td className="px-4 py-2">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(opp.urgency)}`}
                              >
                                {opp.urgency.charAt(0).toUpperCase() + opp.urgency.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-foreground">
                              {opp.assignee ? (
                                <span className="font-medium">{opp.assignee}</span>
                              ) : (
                                <span className="text-muted-foreground italic text-xs">Unassigned</span>
                              )}
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex flex-wrap gap-1">
                                {skills.length > 0 ? (
                                  skills.map((skill) => (
                                    <Badge key={skill} variant="secondary" className="text-xs px-1.5 py-0">
                                      {skill}
                                    </Badge>
                                  ))
                                ) : (
                                  <span className="text-muted-foreground text-xs">No skills</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(opp.status)}`}>
                                {opp.status.charAt(0).toUpperCase() + opp.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => handleDeleteOpportunity(opp.id, e)}
                                disabled={isDeleting}
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Delete opportunity"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
