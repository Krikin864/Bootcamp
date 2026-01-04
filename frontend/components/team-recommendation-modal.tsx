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
  status: "new" | "assigned" | "done"
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

  // Cargar miembros del equipo desde Supabase
  useEffect(() => {
    async function loadTeamMembers() {
      if (!open) return // Solo cargar cuando el modal esté abierto
      
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

  // Normalizar requiredSkill a array para comparación
  const requiredSkills = Array.isArray(opportunity.requiredSkill) 
    ? opportunity.requiredSkill 
    : [opportunity.requiredSkill]

  // Filtrar miembros que tienen al menos una de las skills requeridas
  const matchingMembers = teamMembers.filter((member) =>
    requiredSkills.some(skill => member.skills.includes(skill))
  )
  
  const allOtherMembers = teamMembers.filter((member) =>
    !requiredSkills.some(skill => member.skills.includes(skill))
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Assign Opportunity to Team Member</DialogTitle>
          <DialogDescription>
            Select a team member for: <span className="font-semibold text-foreground">{opportunity.clientName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Opportunity Summary */}
          <div className="bg-secondary/50 p-4 rounded-lg border border-border">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Required Skill{requiredSkills.length > 1 ? 's' : ''}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {requiredSkills.map((skill, idx) => (
                  <Badge key={idx} className="text-base">{skill}</Badge>
                ))}
                <span className="text-sm text-muted-foreground">
                  {matchingMembers.length} team member{matchingMembers.length !== 1 ? "s" : ""} with {requiredSkills.length > 1 ? 'these skills' : 'this skill'}
                </span>
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
              {matchingMembers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Recommended Matches
                  </h3>
                  <div className="space-y-2">
                    {matchingMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => {
                          onAssignTeamMember(member.id)
                          onOpenChange(false)
                        }}
                        className="w-full p-4 rounded-lg border border-border bg-card hover:border-primary hover:bg-secondary/50 transition-all text-left group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-foreground group-hover:text-primary">{member.name}</p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground mt-1">{member.email}</p>
                            )}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {member.skills.length > 0 ? (
                                member.skills.map((skill) => (
                                  <Badge
                                    key={skill}
                                    variant={requiredSkills.includes(skill) ? "default" : "secondary"}
                                    className="text-xs"
                                  >
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No skills assigned</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xs text-muted-foreground">Current</p>
                            <p className="font-semibold text-foreground">{member.activeOpportunities} tasks</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Alternative Team Members */}
              {allOtherMembers.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-yellow-500" />
                    Alternative Options
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    These team members don't have the required skill{requiredSkills.length > 1 ? 's' : ''} but can be assigned if needed.
                  </p>
                  <div className="space-y-2">
                    {allOtherMembers.map((member) => (
                      <button
                        key={member.id}
                        onClick={() => {
                          onAssignTeamMember(member.id)
                          onOpenChange(false)
                        }}
                        className="w-full p-4 rounded-lg border border-border/50 bg-card hover:border-primary hover:bg-secondary/30 transition-all text-left opacity-75 hover:opacity-100 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-foreground group-hover:text-primary">{member.name}</p>
                            {member.email && (
                              <p className="text-xs text-muted-foreground mt-1">{member.email}</p>
                            )}
                            <div className="flex gap-2 mt-2 flex-wrap">
                              {member.skills.length > 0 ? (
                                member.skills.map((skill) => (
                                  <Badge key={skill} variant="secondary" className="text-xs">
                                    {skill}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-xs text-muted-foreground italic">No skills assigned</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <p className="text-xs text-muted-foreground">Current</p>
                            <p className="font-semibold text-foreground">{member.activeOpportunities} tasks</p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
