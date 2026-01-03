"use client"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X } from "lucide-react"
import { SKILLS } from "@/lib/skills"
import { TEAM_MEMBERS } from "@/lib/team-data"

interface FilterBarProps {
  filters: {
    urgency: string
    skill: string
    assignedTeam: string
  }
  sortBy?: string
  setFilters: (filters: any) => void
  setSortBy?: (sort: string) => void
}

export default function FilterBar({ filters, sortBy = "recent", setFilters, setSortBy }: FilterBarProps) {
  const urgencyOptions = ["High", "Medium", "Low"]
  const skillOptions = SKILLS
  const teamOptions = TEAM_MEMBERS.map((member) => member.name)
  const sortOptions = [
    { value: "recent", label: "Most Recent" },
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
        <span className="text-sm font-medium text-foreground">Filters:</span>
        <div className="flex flex-wrap gap-3">
          <Select value={filters.urgency || "all"} onValueChange={(v) => setFilters({ ...filters, urgency: v })}>
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

          <Select value={filters.skill || "all"} onValueChange={(v) => setFilters({ ...filters, skill: v })}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Required Skill" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Skills</SelectItem>
              {skillOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={filters.assignedTeam || "all"}
            onValueChange={(v) => setFilters({ ...filters, assignedTeam: v })}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Team Member" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Team Members</SelectItem>
              {teamOptions.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
