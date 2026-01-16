"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import { getSkills, type Skill } from "@/services/skills"
import { getTeamMembers, type TeamMember } from "@/services/members"

interface FilterBarProps {
  filters: {
    urgency: string
    skill: string // Will store skill ID
    assignedTeam: string // Will store member ID
  }
  sortBy?: string
  setFilters: (filters: any) => void
  setSortBy?: (sort: string) => void
  hideSortBy?: boolean
}

export default function FilterBar({ filters, sortBy = "recent", setFilters, setSortBy, hideSortBy = false }: FilterBarProps) {
  const [skills, setSkills] = useState<Skill[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoadingSkills, setIsLoadingSkills] = useState(true)
  const [isLoadingMembers, setIsLoadingMembers] = useState(true)

  // Load skills from database
  useEffect(() => {
    async function loadSkills() {
      try {
        setIsLoadingSkills(true)
        const skillsData = await getSkills()
        setSkills(skillsData)
      } catch (error) {
        console.error('Error loading skills:', error)
      } finally {
        setIsLoadingSkills(false)
      }
    }
    loadSkills()
  }, [])

  // Load team members from database
  useEffect(() => {
    async function loadTeamMembers() {
      try {
        setIsLoadingMembers(true)
        const membersData = await getTeamMembers()
        setTeamMembers(membersData)
      } catch (error) {
        console.error('Error loading team members:', error)
      } finally {
        setIsLoadingMembers(false)
      }
    }
    loadTeamMembers()
  }, [])

  const urgencyOptions = ["High", "Medium", "Low"]
  const sortOptions = [
    { value: "oldest", label: "Oldest First" },
    { value: "urgency-high", label: "Highest Urgency" },
    { value: "urgency-low", label: "Lowest Urgency" },
    { value: "status", label: "By Status" },
  ]

  const hasActiveFilters = Object.values(filters).some((f) => f !== "")

  const handleClearFilters = () => {
    setFilters({ urgency: "", skill: "", assignedTeam: "" })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-slate-800">Filters:</span>
        <div className="flex flex-wrap gap-3">
          <Select 
            value={filters.urgency === "" ? "all" : filters.urgency} 
            onValueChange={(v) => setFilters({ ...filters, urgency: v === "all" ? "" : v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Urgencies</SelectItem>
              {urgencyOptions.map((opt) => (
                <SelectItem key={opt} value={opt.toLowerCase()}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select 
            value={filters.skill || "all"} 
            onValueChange={(v) => setFilters({ ...filters, skill: v === "all" ? "" : v })}
            disabled={isLoadingSkills}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={isLoadingSkills ? "Loading..." : "Required Skill"} />
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

          <Select
            value={filters.assignedTeam || "all"}
            onValueChange={(v) => setFilters({ ...filters, assignedTeam: v === "all" ? "" : v })}
            disabled={isLoadingMembers}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={isLoadingMembers ? "Loading..." : "Team Member"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Team Members</SelectItem>
              {teamMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!hideSortBy && (
            <Select value={sortBy || "recent"} onValueChange={(v) => setSortBy?.(v)}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Sort By" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {hasActiveFilters && (
          <Button variant="outline" size="sm" onClick={handleClearFilters} className="gap-1 bg-transparent">
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}
