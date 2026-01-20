"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { CheckCircle2, AlertCircle, Search } from "lucide-react"
import { getTeamMembers, type TeamMember } from "@/services/members"

interface Opportunity {
  id: string
  clientName: string
  company: string
  summary: string
  requiredSkill: string | string[]
  requiredSkillIds?: string[] // Array of skill IDs for matching
  assignee: string
  status: "new" | "assigned" | "done" | "cancelled" | "archived"
  urgency: "high" | "medium" | "low"
  aiSummary: string
}

interface TeamRecommendationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opportunity: Opportunity
  onAssignTeamMember: (memberId: string) => void
}

export default function TeamRecommendationModal({
  open,
  onOpenChange,
  opportunity,
  onAssignTeamMember,
}: TeamRecommendationModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

  // Load team members from Supabase
  useEffect(() => {
    async function loadTeamMembers() {
      if (!open) return // Only load when the modal is open
      
      try {
        setIsLoading(true)
        const data = await getTeamMembers()
        setTeamMembers(data)
      } catch (error) {
        console.error('Error loading team members:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadTeamMembers()
  }, [open])

  // Get required skill IDs from opportunity (prefer IDs over names for accurate matching)
  const PENDING_OPTION = "Pending / No specific skill"
  const requiredSkillIds = opportunity.requiredSkillIds || []
  
  // Convert requiredSkill to array and filter out PENDING_OPTION
  const requiredSkills = Array.isArray(opportunity.requiredSkill)
    ? opportunity.requiredSkill.filter(s => s && s !== PENDING_OPTION)
    : opportunity.requiredSkill && opportunity.requiredSkill !== PENDING_OPTION
      ? [opportunity.requiredSkill]
      : []
  
  // Check if only PENDING_OPTION is selected (by name)
  const hasOnlyPending = Array.isArray(opportunity.requiredSkill)
    ? opportunity.requiredSkill.length === 1 && opportunity.requiredSkill[0] === PENDING_OPTION
    : opportunity.requiredSkill === PENDING_OPTION

  // Calculate match type for each member based on skill IDs
  type MatchType = 'perfect' | 'partial' | 'none'
  
  interface MemberWithScore extends TeamMember {
    matchType: MatchType
    matchingSkillIds: string[]
    matchingSkills: string[]
  }

  const membersWithScores = teamMembers.map((member) => {
    // If only PENDING_OPTION is selected or no skills, show all members as neutral
    if (hasOnlyPending || requiredSkillIds.length === 0) {
      return { ...member, matchType: 'none' as MatchType, matchingSkillIds: [], matchingSkills: [] } as MemberWithScore
    }
    
    // Compare skill IDs directly (more accurate than name comparison)
    const matchingSkillIds = member.skillIds.filter(skillId => 
      requiredSkillIds.includes(skillId)
    )
    
    // Determine match type
    let matchType: MatchType = 'none'
    if (matchingSkillIds.length === requiredSkillIds.length && requiredSkillIds.length > 0) {
      matchType = 'perfect' // Has ALL required skills
    } else if (matchingSkillIds.length > 0) {
      matchType = 'partial' // Has SOME required skills
    } else {
      matchType = 'none' // Has NO required skills
    }
    
    // Get matching skill names for display
    const matchingSkills = member.skills.filter((skillName, index) => 
      matchingSkillIds.includes(member.skillIds[index])
    )
    
    return { ...member, matchType, matchingSkillIds, matchingSkills } as MemberWithScore
  })

  // Filter members by search query
  const filteredMembers = membersWithScores.filter((member) => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase().trim()
    const nameMatch = member.name.toLowerCase().includes(query)
    const emailMatch = member.email?.toLowerCase().includes(query) || false
    const skillsMatch = member.skills.some(skill => skill.toLowerCase().includes(query))
    
    return nameMatch || emailMatch || skillsMatch
  })

  // Sort members: perfect matches first, then partial, then none
  const sortByMatchType = (a: MemberWithScore, b: MemberWithScore): number => {
    const order: Record<MatchType, number> = { perfect: 0, partial: 1, none: 2 }
    if (order[a.matchType] !== order[b.matchType]) {
      return order[a.matchType] - order[b.matchType]
    }
    // If same type, sort alphabetically
    return a.name.localeCompare(b.name)
  }

  // Filter and sort members by match type
  const sortedMembers: MemberWithScore[] = hasOnlyPending || requiredSkillIds.length === 0
    ? filteredMembers.sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically if no skills
    : filteredMembers.sort(sortByMatchType)
  
  // Separate members by match type for display
  const perfectMatches = sortedMembers.filter(m => m.matchType === 'perfect')
  const partialMatches = sortedMembers.filter(m => m.matchType === 'partial')
  const noMatches = sortedMembers.filter(m => m.matchType === 'none')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-[0_20px_60px_0_rgba(31,38,135,0.15)]">
        <DialogHeader className="px-10 pt-10 pb-6">
          <DialogTitle className="text-2xl font-bold text-slate-800">Assign Opportunity to Team Member</DialogTitle>
          <DialogDescription className="text-slate-600">
            Select a team member for: <span className="font-semibold text-slate-800">{opportunity.clientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="px-10 pb-10 space-y-8">
          {/* Opportunity Summary */}
          <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/40">
            <div className="space-y-3">
              <p className="text-sm text-slate-600 font-medium">Required Skill{requiredSkills.length > 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {hasOnlyPending ? (
                  <>
                    <span className="text-sm px-4 py-2 bg-slate-200/80 rounded-full text-slate-600 font-medium shadow-md border border-slate-300/60">
                      Pending / No specific skill
                    </span>
                    <span className="text-sm text-slate-600">
                      Showing all {sortedMembers.length} team member{sortedMembers.length !== 1 ? "s" : ""}
                    </span>
                  </>
                ) : requiredSkills.length > 0 ? (
                  <>
                    {requiredSkills.map((skill, idx) => (
                      <span key={idx} className="text-sm px-4 py-2 bg-white rounded-full text-slate-700 font-medium shadow-md border border-white/60">
                        {skill}
                      </span>
                    ))}
                    <span className="text-sm text-slate-600">
                      {perfectMatches.length + partialMatches.length} team member{(perfectMatches.length + partialMatches.length) !== 1 ? "s" : ""} with {requiredSkillIds.length > 1 ? 'these skills' : 'this skill'}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-slate-600 italic">No specific skills required</span>
                )}
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-border bg-card">
                  <Skeleton className="h-5 w-32 mb-2" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          ) : teamMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No team members available</p>
            </div>
          ) : (
            <>
              {/* Search Bar - Always visible */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 rounded-xl border-white/40 bg-white/50 backdrop-blur-sm focus:bg-white/80"
                />
              </div>

              {/* No matches found message */}
              {!hasOnlyPending && requiredSkills.length > 0 && perfectMatches.length === 0 && partialMatches.length === 0 ? (
                <div className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 space-y-2 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <p className="text-sm font-semibold text-slate-800">No exact matches found</p>
                    </div>
                    <p className="text-xs text-slate-600">
                      No team members have the required skill{requiredSkills.length > 1 ? 's' : ''}: {requiredSkills.join(', ')}. Showing all available members below.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* List of members */}
              <div className="space-y-4">
                {/* Lista con scroll fijo */}
                <div className="max-h-[500px] overflow-y-auto space-y-4 pr-2">
                    {/* Perfect Matches - Verde */}
                    {perfectMatches.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10">
                          <div className="w-2 h-2 rounded-full bg-green-500"></div>
                          PERFECT MATCHES
                        </h3>
                        <div className="space-y-2">
                          {perfectMatches.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 bg-white/70 backdrop-blur-xl border-l-4 border-green-500 rounded-xl shadow-sm hover:shadow-md transition-all"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-slate-800 text-sm">{member.name}</p>
                                </div>
                                {member.email && (
                                  <p className="text-xs text-slate-500">{member.email}</p>
                                )}
                                {member.skills.length > 0 && (
                                  <div className="flex gap-1.5 mt-2 flex-wrap">
                                    {member.skills.map((skill, index) => {
                                      const skillId = member.skillIds[index]
                                      const isMatching = skillId && member.matchingSkillIds.includes(skillId)
                                      return (
                                        <span
                                          key={skill}
                                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            isMatching
                                              ? "bg-green-100 text-green-700 border border-green-300"
                                              : "bg-slate-100 text-slate-600 border border-slate-200"
                                          }`}
                                        >
                                          {skill}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Current</p>
                                  <p className="font-semibold text-slate-800 text-sm">{member.activeOpportunities}</p>
                                </div>
                                <Button
                                  onClick={() => {
                                    onAssignTeamMember(member.id)
                                    onOpenChange(false)
                                  }}
                                  className="rounded-xl text-xs px-4 py-1.5"
                                  size="sm"
                                >
                                  Assign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Partial Matches - Amarillo/Naranja */}
                    {partialMatches.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10">
                          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                          PARTIAL MATCHES
                        </h3>
                        <div className="space-y-2">
                          {partialMatches.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 bg-white/70 backdrop-blur-xl border-l-4 border-yellow-500 rounded-xl shadow-sm hover:shadow-md transition-all"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-slate-800 text-sm">{member.name}</p>
                                </div>
                                {member.email && (
                                  <p className="text-xs text-slate-500">{member.email}</p>
                                )}
                                {member.skills.length > 0 && (
                                  <div className="flex gap-1.5 mt-2 flex-wrap">
                                    {member.skills.map((skill, index) => {
                                      const skillId = member.skillIds[index]
                                      const isMatching = skillId && member.matchingSkillIds.includes(skillId)
                                      return (
                                        <span
                                          key={skill}
                                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                            isMatching
                                              ? "bg-yellow-100 text-yellow-700 border border-yellow-300"
                                              : "bg-slate-100 text-slate-600 border border-slate-200"
                                          }`}
                                        >
                                          {skill}
                                        </span>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Current</p>
                                  <p className="font-semibold text-slate-800 text-sm">{member.activeOpportunities}</p>
                                </div>
                                <Button
                                  onClick={() => {
                                    onAssignTeamMember(member.id)
                                    onOpenChange(false)
                                  }}
                                  className="rounded-xl text-xs px-4 py-1.5"
                                  size="sm"
                                >
                                  Assign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* No Matches - Gris */}
                    {noMatches.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10">
                          <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                          AVAILABLE MEMBERS
                        </h3>
                        <div className="space-y-2">
                          {noMatches.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 bg-white/70 backdrop-blur-xl border-l-4 border-slate-300 rounded-xl shadow-sm hover:shadow-md transition-all opacity-75 hover:opacity-100"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-slate-800 text-sm">{member.name}</p>
                                </div>
                                {member.email && (
                                  <p className="text-xs text-slate-500">{member.email}</p>
                                )}
                                {member.skills.length > 0 && (
                                  <div className="flex gap-1.5 mt-2 flex-wrap">
                                    {member.skills.map((skill) => (
                                      <span
                                        key={skill}
                                        className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-medium opacity-60"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Current</p>
                                  <p className="font-semibold text-slate-800 text-sm">{member.activeOpportunities}</p>
                                </div>
                                <Button
                                  onClick={() => {
                                    onAssignTeamMember(member.id)
                                    onOpenChange(false)
                                  }}
                                  className="rounded-xl text-xs px-4 py-1.5"
                                  size="sm"
                                  variant="outline"
                                >
                                  Assign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Si no hay skills requeridas, mostrar todos */}
                    {(hasOnlyPending || requiredSkillIds.length === 0) && sortedMembers.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 sticky top-0 bg-white/80 backdrop-blur-sm py-2 z-10">
                          <CheckCircle2 className="h-3 w-3 text-slate-500" />
                          ALL TEAM MEMBERS
                        </h3>
                        <div className="space-y-2">
                          {sortedMembers.map((member) => (
                            <div
                              key={member.id}
                              className="flex items-center justify-between p-3 bg-white/70 backdrop-blur-xl border-l-4 border-slate-300 rounded-xl shadow-sm hover:shadow-md transition-all"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-slate-800 text-sm">{member.name}</p>
                                </div>
                                {member.email && (
                                  <p className="text-xs text-slate-500">{member.email}</p>
                                )}
                                {member.skills.length > 0 && (
                                  <div className="flex gap-1.5 mt-2 flex-wrap">
                                    {member.skills.map((skill) => (
                                      <span
                                        key={skill}
                                        className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-full font-medium"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Current</p>
                                  <p className="font-semibold text-slate-800 text-sm">{member.activeOpportunities}</p>
                                </div>
                                <Button
                                  onClick={() => {
                                    onAssignTeamMember(member.id)
                                    onOpenChange(false)
                                  }}
                                  className="rounded-xl text-xs px-4 py-1.5"
                                  size="sm"
                                >
                                  Assign
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex gap-4 justify-end pt-8 border-t border-white/30 -mx-10 -mb-10 px-10 pb-10">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-2xl border-white/40 bg-white/50">
              Cancel
            </Button>
            <Button onClick={() => onOpenChange(false)} className="rounded-2xl">Close</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
