"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { getTeamMembers, type TeamMember } from "@/services/members"

interface Opportunity {
  id: string
  clientName: string
  company: string
  summary: string
  requiredSkill: string | string[]
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

  // Normalize requiredSkill to array for comparison
  const requiredSkills = Array.isArray(opportunity.requiredSkill) 
    ? opportunity.requiredSkill 
    : [opportunity.requiredSkill].filter(skill => skill && skill !== '')

  // Calculate skill matches for each member and sort by match count (not workload)
  const membersWithScores = teamMembers.map((member) => {
    const matchCount = requiredSkills.length > 0
      ? requiredSkills.filter(skill => member.skills.includes(skill)).length
      : 0
    return {
      member,
      matchCount,
      hasHighWorkload: member.activeOpportunities >= 3
    }
  })

  // Sort by match count (descending), then by name
  membersWithScores.sort((a, b) => {
    if (b.matchCount !== a.matchCount) {
      return b.matchCount - a.matchCount
    }
    return a.member.name.localeCompare(b.member.name)
  })

  // Filter members who have at least one of the required skills
  const matchingMembers = membersWithScores
    .filter(item => item.matchCount > 0)
    .map(item => item.member)
  
  // Only show alternative members if no skills were extracted by AI
  // If skills were extracted, only show matching members
  const shouldShowAlternatives = requiredSkills.length === 0 || requiredSkills.every(skill => !skill || skill === '')
  const allOtherMembers = shouldShowAlternatives 
    ? teamMembers.filter((member) =>
    !requiredSkills.some(skill => member.skills.includes(skill))
  )
    : []

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
                {requiredSkills.length > 0 ? (
                  <>
                {requiredSkills.map((skill, idx) => (
                  <span key={idx} className="text-sm px-4 py-2 bg-white rounded-full text-slate-700 font-medium shadow-md border border-white/60">
                    {skill}
                  </span>
                ))}
                <span className="text-sm text-slate-600">
                  {matchingMembers.length} team member{matchingMembers.length !== 1 ? "s" : ""} with {requiredSkills.length > 1 ? 'these skills' : 'this skill'}
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
              {/* Recommended Team Members (Matching Skills) */}
              {requiredSkills.length > 0 && matchingMembers.length === 0 ? (
                <div className="space-y-4">
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-4 space-y-2 backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <p className="text-sm font-semibold text-slate-800">No exact matches found</p>
                    </div>
                    <p className="text-xs text-slate-600">
                      No team members have the required skill{requiredSkills.length > 1 ? 's' : ''}: {requiredSkills.join(', ')}. Showing all available members.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-5 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.12)] transition-all opacity-75 hover:opacity-100"
                      >
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 text-base">{member.name}</p>
                          {member.email && (
                            <p className="text-xs text-slate-600 mt-1">{member.email}</p>
                          )}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {member.skills.length > 0 ? (
                              member.skills.map((skill) => (
                                <span 
                                  key={skill} 
                                  className="text-xs px-3 py-1.5 bg-white rounded-full text-slate-700 font-medium shadow-md border border-white/60 opacity-60"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-600 italic">No skills assigned</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 ml-6">
                          <div className="text-right">
                            <p className="text-xs text-slate-600">Current</p>
                            <p className="font-semibold text-slate-800">{member.activeOpportunities} tasks</p>
                          </div>
                          <Button
                            onClick={() => {
                              onAssignTeamMember(member.id)
                              onOpenChange(false)
                            }}
                            className="rounded-2xl"
                          >
                            Assign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : matchingMembers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    RECOMMENDED MATCHES
                  </h3>
                  <div className="space-y-3">
                    {membersWithScores
                      .filter(item => item.matchCount > 0)
                      .map(({ member, matchCount, hasHighWorkload }) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-5 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.12)] transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-bold text-slate-800 text-base">{member.name}</p>
                            {hasHighWorkload && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 text-yellow-600 text-xs rounded-full border border-yellow-500/20">
                                ⚠️ High Workload
                              </span>
                            )}
                            <span className="text-xs text-slate-500">
                              ({matchCount} match{matchCount !== 1 ? 'es' : ''})
                            </span>
                          </div>
                          {member.email && (
                            <p className="text-xs text-slate-600 mt-1">{member.email}</p>
                          )}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {member.skills.length > 0 ? (
                              member.skills.map((skill) => (
                                <span
                                  key={skill}
                                  className={`text-xs px-3 py-1.5 rounded-full font-medium shadow-md border border-white/60 ${
                                    requiredSkills.includes(skill)
                                      ? "bg-white text-slate-800"
                                      : "bg-white/70 text-slate-700"
                                  }`}
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-600 italic">No skills assigned</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 ml-6">
                          <div className="text-right">
                            <p className="text-xs text-slate-600">Current</p>
                            <p className="font-semibold text-slate-800">{member.activeOpportunities} tasks</p>
                          </div>
                          <Button
                            onClick={() => {
                              onAssignTeamMember(member.id)
                              onOpenChange(false)
                            }}
                            className="rounded-2xl"
                          >
                            Assign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Team Members - Only show if there are matching members and alternatives exist */}
              {matchingMembers.length > 0 && allOtherMembers.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                    <AlertCircle className="h-3 w-3 text-yellow-500" />
                    ALTERNATIVE OPTIONS
                  </h3>
                  <p className="text-sm text-slate-600">
                    These team members don't have the required skill{requiredSkills.length > 1 ? 's' : ''} but can be assigned if needed.
                  </p>
                  <div className="space-y-3">
                    {allOtherMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-5 bg-white/70 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:shadow-[0_12px_40px_0_rgba(31,38,135,0.12)] transition-all opacity-75 hover:opacity-100"
                      >
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 text-base">{member.name}</p>
                          {member.email && (
                            <p className="text-xs text-slate-600 mt-1">{member.email}</p>
                          )}
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {member.skills.length > 0 ? (
                              member.skills.map((skill) => (
                                <span 
                                  key={skill} 
                                  className="text-xs px-3 py-1.5 bg-white rounded-full text-slate-700 font-medium shadow-md border border-white/60 opacity-60"
                                >
                                  {skill}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-slate-600 italic">No skills assigned</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-6 ml-6">
                          <div className="text-right">
                            <p className="text-xs text-slate-600">Current</p>
                            <p className="font-semibold text-slate-800">{member.activeOpportunities} tasks</p>
                          </div>
                          <Button
                            onClick={() => {
                              onAssignTeamMember(member.id)
                              onOpenChange(false)
                            }}
                            className="rounded-2xl"
                          >
                            Assign
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
