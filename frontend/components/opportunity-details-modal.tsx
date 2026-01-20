"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Zap, Edit2, Loader2, AlertTriangle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MultiSelect } from "@/components/ui/multi-select"
import { getSkills, type Skill } from "@/services/skills"
import { getTeamMembers, type TeamMember } from "@/services/members"
import { updateOpportunityDetails, updateOpportunityStatus, deleteOpportunity, type Opportunity } from "@/services/opportunities"
import { toast } from "sonner"
import { motion } from "framer-motion"

interface OpportunityDetailsModalProps {
  opportunity: Opportunity | null
  onClose: () => void
  onAssignClick: () => void
  onSaveEdits?: (updatedOpportunity: Opportunity) => void
  onCancel?: (opportunityId: string) => void
  onDelete?: (opportunityId: string) => void
}

export default function OpportunityDetailsModal({
  opportunity,
  onClose,
  onAssignClick,
  onSaveEdits,
  onCancel,
  onDelete,
}: OpportunityDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoadingSkills, setIsLoadingSkills] = useState(false)
  const [isLoadingMembers, setIsLoadingMembers] = useState(false)
  const [summaryError, setSummaryError] = useState<string>("")
  const [skillError, setSkillError] = useState<string>("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDangerZonePopover, setShowDangerZonePopover] = useState(false)
  const dangerZoneRef = useRef<HTMLDivElement>(null)
  const [editedValues, setEditedValues] = useState({
    summary: "",
    selectedSkills: [] as string[], // Array of skill names
    skillId: "none", // Keep for backward compatibility (first skill ID)
    urgency: "",
    assignedMemberId: "none", // Use "none" instead of "" to avoid Select component error
  })

  // Reset danger zone popover visibility when modal opens/closes
  useEffect(() => {
    setShowDangerZonePopover(false)
  }, [opportunity])

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dangerZoneRef.current && !dangerZoneRef.current.contains(event.target as Node)) {
        setShowDangerZonePopover(false)
      }
    }

    if (showDangerZonePopover) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showDangerZonePopover])

  // Load skills and team members from database when modal opens in edit mode
  useEffect(() => {
    async function loadSkillsAndMembers() {
      if (!opportunity || !isEditing) return
      
      try {
        setIsLoadingSkills(true)
        setIsLoadingMembers(true)
        
        const [skillsData, membersData] = await Promise.all([
          getSkills(),
          getTeamMembers()
        ])
        
        setSkills(skillsData)
        setTeamMembers(membersData)
        
        // If the opportunity has skills, convert to array of skill names
        const currentSkills = Array.isArray(opportunity.requiredSkill) 
          ? opportunity.requiredSkill.filter(s => s && s !== '')
          : (opportunity.requiredSkill && opportunity.requiredSkill !== '' ? [opportunity.requiredSkill] : [])
        
        // Set selected skills (array of names)
        setEditedValues(prev => ({ ...prev, selectedSkills: currentSkills }))
        
        // Find the ID of the first skill for backward compatibility
        if (currentSkills.length > 0 && currentSkills[0] && skillsData.length > 0) {
          const firstSkill = skillsData.find(s => s.name === currentSkills[0])
          if (firstSkill) {
            setEditedValues(prev => ({ ...prev, skillId: firstSkill.id }))
          } else {
            setEditedValues(prev => ({ ...prev, skillId: "none" }))
          }
        } else {
          setEditedValues(prev => ({ ...prev, skillId: "none" }))
        }
        
        // Set the current assigned member ID
        if (opportunity.assigneeId && membersData.length > 0) {
          const currentMember = membersData.find(m => m.id === opportunity.assigneeId)
          if (currentMember) {
            setEditedValues(prev => ({ ...prev, assignedMemberId: currentMember.id }))
          } else {
            setEditedValues(prev => ({ ...prev, assignedMemberId: "none" }))
          }
        } else {
          setEditedValues(prev => ({ ...prev, assignedMemberId: "none" }))
        }
      } catch (error) {
        console.error('Error loading skills/members:', error)
        toast.error('Failed to load skills or team members')
      } finally {
        setIsLoadingSkills(false)
        setIsLoadingMembers(false)
      }
    }

    loadSkillsAndMembers()

    // Listen for skills updates
    const handleSkillsUpdated = () => {
      if (opportunity && isEditing) {
        loadSkillsAndMembers()
      }
    }

    window.addEventListener('skillsUpdated', handleSkillsUpdated)

    return () => {
      window.removeEventListener('skillsUpdated', handleSkillsUpdated)
    }
  }, [opportunity, isEditing])

  const urgencyColors = {
    high: "bg-red-500/20 text-red-600",
    medium: "bg-yellow-500/20 text-yellow-600",
    low: "bg-green-500/20 text-green-600",
  }

  const handleEditStart = () => {
    if (!opportunity) return
    const currentSkills = Array.isArray(opportunity.requiredSkill) 
      ? opportunity.requiredSkill.filter(s => s && s !== '')
      : (opportunity.requiredSkill && opportunity.requiredSkill !== '' ? [opportunity.requiredSkill] : [])
    setEditedValues({
      summary: opportunity.aiSummary,
      selectedSkills: currentSkills,
      skillId: "none", // Will be set when skills are loaded
      urgency: opportunity.urgency,
      assignedMemberId: opportunity.assigneeId || "none", // Will be set when members are loaded
    })
    setSummaryError("") // Reset error when starting to edit
    setSkillError("") // Reset skill error when starting to edit
    setIsEditing(true)
  }

  // Validate summary field
  const validateSummary = (summary: string): boolean => {
    const trimmedSummary = summary.trim()
    if (trimmedSummary === "") {
      setSummaryError("Summary cannot be empty")
      return false
    }
    setSummaryError("")
    return true
  }

  // Validate skill field
  const validateSkill = (selectedSkills: string[]): boolean => {
    if (selectedSkills.length === 0) {
      setSkillError("At least one skill is required")
      return false
    }
    setSkillError("")
    return true
  }

  const handleSaveEdits = async () => {
    if (!opportunity) return

    // Validate summary before saving
    const trimmedSummary = editedValues.summary.trim()
    if (!validateSummary(trimmedSummary)) {
      return // Stop if validation fails
    }

    // Validate skills before saving
    if (!validateSkill(editedValues.selectedSkills)) {
      return // Stop if validation fails
    }

    try {
      setIsSaving(true)

      // Prepare data for update
      const updates: {
        ai_summary?: string
        urgency?: string
      } = {}

      // Only include fields that have changed (using trimmed value)
      if (trimmedSummary !== opportunity.aiSummary) {
        updates.ai_summary = trimmedSummary // Use trimmed value
      }

      if (editedValues.urgency !== opportunity.urgency) {
        updates.urgency = editedValues.urgency
      }

      // Handle skill update - convert selected skill names to IDs
      const PENDING_OPTION = "Pending / No specific skill"
      const realSkills = editedValues.selectedSkills.filter(s => s !== PENDING_OPTION)
      const skillIds: string[] = []
      
      for (const skillName of realSkills) {
        const skill = skills.find(s => s.name.toLowerCase() === skillName.toLowerCase())
        if (skill) {
          skillIds.push(skill.id)
        }
      }
      
      // Compare with current skills
      const currentSkillIds = opportunity.requiredSkillIds || []
      const skillIdsChanged = skillIds.length !== currentSkillIds.length || 
        skillIds.some(id => !currentSkillIds.includes(id))
      
      // Store skillIds to pass to updateOpportunityDetails
      const skillIdsToUpdate = skillIdsChanged ? skillIds : undefined
      
      // Update assigned_user_id
      const selectedMember = teamMembers.find(m => m.id === editedValues.assignedMemberId)
      
      if (editedValues.assignedMemberId === "none") {
        // If "none" was selected, unassign (set as null)
        if (opportunity.assigneeId) {
          updates.assigned_user_id = null
        }
      } else if (selectedMember) {
        // Use the UUID of the selected member
        if (selectedMember.id !== opportunity.assigneeId) {
          updates.assigned_user_id = selectedMember.id // UUID
        }
      }

      // Only update if there are changes
      if (Object.keys(updates).length > 0 || skillIdsToUpdate !== undefined) {
        const updatedOpportunity = await updateOpportunityDetails(opportunity.id, updates, skillIdsToUpdate)
        
        if (updatedOpportunity && onSaveEdits) {
          // Preserve selectedSkills including Pending in the returned opportunity
          const PENDING_OPTION = "Pending / No specific skill"
          const opportunityWithFullSkills = {
            ...updatedOpportunity,
            requiredSkill: editedValues.selectedSkills.length > 0 
              ? (editedValues.selectedSkills.length === 1 ? editedValues.selectedSkills[0] : editedValues.selectedSkills)
              : []
          }
          // Pass the complete updated opportunity so Kanban can update
          onSaveEdits(opportunityWithFullSkills)
          toast.success('Opportunity updated successfully')
          setIsEditing(false)
        } else {
          throw new Error('Failed to update opportunity')
        }
      } else {
        // No changes, just close edit mode
        setIsEditing(false)
      }
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error occurred'
      toast.error(`Failed to update opportunity: ${errorMessage}`)
      console.error('Error saving edits:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!opportunity) return null

  const currentSkills = Array.isArray(opportunity.requiredSkill)
    ? opportunity.requiredSkill
    : [opportunity.requiredSkill]

  return (
    <Dialog open={!!opportunity} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-white/80 backdrop-blur-xl border border-white/40 rounded-[2rem] shadow-[0_20px_60px_0_rgba(31,38,135,0.15)]">
        <DialogHeader className="px-10 pt-10 pb-6">
          <DialogTitle className="text-2xl font-bold text-slate-800">Opportunity Details</DialogTitle>
        </DialogHeader>

        <div className="px-10 pb-10 space-y-8">
          {/* Client Info */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">CLIENT INFORMATION</h3>
            <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/40 space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Name</label>
                <p className="text-foreground font-semibold mt-1">{opportunity.clientName}</p>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Company</label>
                <p className="text-foreground font-semibold mt-1">{opportunity.company}</p>
              </div>
            </div>
          </div>

          {/* AI Summary - View and Edit Modes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                SUMMARY
                {!isEditing && <span className="text-xs font-normal text-slate-400 normal-case">(AI-generated)</span>}
              </h3>
              {!isEditing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditStart}
                  className="gap-1 text-primary hover:text-primary/80"
                >
                  <Edit2 className="h-3 w-3" />
                  Edit
                </Button>
              )}
            </div>

            {!isEditing ? (
              <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/40">
                <p className="text-slate-800 leading-relaxed text-base">{opportunity.aiSummary}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <Textarea
                  value={editedValues.summary}
                  onChange={(e) => {
                    const newValue = e.target.value
                    setEditedValues((prev) => ({ ...prev, summary: newValue }))
                    // Clear error when user starts typing
                    if (summaryError && newValue.trim() !== "") {
                      setSummaryError("")
                    }
                  }}
                  onBlur={() => {
                    // Validate on blur
                    validateSummary(editedValues.summary)
                  }}
                  rows={4}
                  className={`bg-white/50 backdrop-blur-sm text-base rounded-2xl border border-white/40 ${
                    summaryError 
                      ? "border-destructive focus-visible:ring-destructive" 
                      : ""
                  }`}
                  disabled={isSaving}
                />
                {summaryError && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {summaryError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Zap className="h-3 w-3" />
              REQUIREMENTS
              {!isEditing && <span className="text-xs font-normal text-slate-400 normal-case">(Editable)</span>}
            </h3>
            {!isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">Required Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {currentSkills.length > 0 ? (
                      currentSkills.map((skill) => (
                        <span 
                          key={skill} 
                          className="text-sm px-4 py-2 bg-white rounded-full text-slate-700 font-medium shadow-md border border-white/60"
                        >
                          {skill}
                        </span>
                      ))
                    ) : (
                      <span className="text-base text-slate-600 italic">No skills assigned</span>
                    )}
                  </div>
                </div>
                <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/40">
                  <label className="text-sm font-medium text-slate-600 block mb-2">Urgency</label>
                  <div>
                    <Badge className={`${urgencyColors[opportunity.urgency]} text-sm`}>
                      {opportunity.urgency.charAt(0).toUpperCase() + opportunity.urgency.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="modal-edit-skill" className="text-xs font-medium mb-2 block">
                    Required Skills
                  </Label>
                  {isLoadingSkills ? (
                    <div className="flex items-center gap-2 p-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading skills...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <MultiSelect
                        options={skills}
                        selected={editedValues.selectedSkills}
                        onSelectionChange={(newSkills) => {
                          setEditedValues((prev) => {
                            // Update selected skills
                            const updated = { ...prev, selectedSkills: newSkills }
                            // Update skillId to first skill for backward compatibility (skip PENDING_OPTION)
                            const PENDING_OPTION = "Pending / No specific skill"
                            const realSkills = newSkills.filter(s => s !== PENDING_OPTION)
                            if (realSkills.length > 0) {
                              const firstSkill = skills.find(s => s.name === realSkills[0])
                              updated.skillId = firstSkill ? firstSkill.id : "none"
                            } else {
                              updated.skillId = "none"
                            }
                            return updated
                          })
                          // Clear error when user adds a skill
                          if (skillError && newSkills.length > 0) {
                            setSkillError("")
                          }
                        }}
                        placeholder="Select skills..."
                        disabled={isSaving}
                        showPendingOption={true}
                        className={skillError ? "ring-2 ring-destructive" : ""}
                      />
                      {skillError && (
                        <p className="text-sm text-destructive flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {skillError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="modal-edit-urgency" className="text-xs font-medium">
                    Urgency
                  </Label>
                  <Select
                    value={editedValues.urgency}
                    onValueChange={(v) => setEditedValues((prev) => ({ ...prev, urgency: v }))}
                    disabled={isSaving}
                  >
                    <SelectTrigger id="modal-edit-urgency" className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {/* Assignee */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              ASSIGNED TO
              {!isEditing && <span className="text-xs font-normal text-slate-400 normal-case">(Editable)</span>}
            </h3>
            {!isEditing ? (
              opportunity.assignee ? (
                <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/40 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-sm">
                    <span className="text-sm font-bold text-primary">{opportunity.assignee.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-slate-800 font-semibold text-base">{opportunity.assignee}</p>
                    <p className="text-xs text-slate-600">Team Member</p>
                  </div>
                </div>
              ) : (
                <div className="bg-white/50 backdrop-blur-sm p-6 rounded-2xl border border-white/40">
                  <p className="text-slate-600 italic">No team member assigned</p>
                </div>
              )
            ) : (
              <div>
                <Label htmlFor="modal-edit-assigned-member" className="text-xs font-medium mb-2 block">
                  Team Member
                </Label>
                {isLoadingMembers ? (
                  <div className="flex items-center gap-2 p-4 bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading team members...</span>
                  </div>
                ) : (
                  <Select
                    value={editedValues.assignedMemberId}
                    onValueChange={(value) => setEditedValues((prev) => ({ ...prev, assignedMemberId: value }))}
                    disabled={isSaving}
                  >
                    <SelectTrigger 
                      id="modal-edit-assigned-member" 
                      className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/40"
                    >
                      <SelectValue placeholder="Select a team member" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No team member</SelectItem>
                      {teamMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div className="flex gap-6 justify-between items-center pt-8 border-t border-white/30 -mx-10 -mb-10 px-10 pb-10">
            {/* Danger Zone button on the left - Only show for active opportunities */}
            {!isEditing && opportunity && ['new', 'assigned', 'done'].includes(opportunity.status) && (onCancel || onDelete) && (
              <div className="relative" ref={dangerZoneRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDangerZonePopover(!showDangerZonePopover)}
                  className="text-muted-foreground hover:text-destructive/80 hover:bg-transparent"
                >
                  <span className="text-sm">Advanced Settings</span>
                </Button>

                {/* Popover menu - opens upward */}
                {showDangerZonePopover && (
                  <div className="absolute bottom-full left-0 mb-2 w-80 bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] z-50">
                    <div className="p-3 border-b border-white/30">
                      <h4 className="font-semibold text-foreground text-sm">Advanced Settings</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        These actions cannot be undone. Cancelling an opportunity will remove it from the active pipeline. Deleting will permanently remove it.
                      </p>
                    </div>
                    <div className="p-3 space-y-2">
                      {onCancel && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!opportunity) return
                            setShowDangerZonePopover(false)
                            try {
                              await updateOpportunityStatus(opportunity.id, 'cancelled')
                              toast.success('Opportunity cancelled successfully')
                              onCancel(opportunity.id)
                              onClose()
                            } catch (error: any) {
                              toast.error(`Failed to cancel opportunity: ${error.message || 'Unknown error'}`)
                            }
                          }}
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start"
                        >
                          Cancel Opportunity
                        </Button>
                      )}
                      {onDelete && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={async () => {
                            if (!opportunity) return
                            
                            const confirmed = window.confirm('Are you sure you want to permanently delete this opportunity?')
                            if (!confirmed) return

                            setShowDangerZonePopover(false)

                            try {
                              setIsDeleting(true)
                              await deleteOpportunity(opportunity.id)
                              toast.success('Opportunity deleted successfully')
                              
                              // Call onDelete callback to update parent state
                              if (onDelete) {
                                onDelete(opportunity.id)
                              }
                              
                              // Close modal immediately after successful deletion
                              onClose()
                            } catch (error: any) {
                              const errorMessage = error?.message || 'Unknown error occurred'
                              toast.error(`Failed to delete opportunity: ${errorMessage}`)
                              console.error('Error deleting opportunity:', error)
                            } finally {
                              setIsDeleting(false)
                            }
                          }}
                          disabled={isDeleting}
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            'Delete Opportunity'
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons on the right */}
            <div className="flex gap-3 ml-auto">
              {isEditing ? (
                <>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                  >
                    Cancel
                  </Button>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button 
                      onClick={handleSaveEdits}
                      disabled={isSaving || editedValues.summary.trim() === "" || editedValues.selectedSkills.length === 0}
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </Button>
                  </motion.div>
                </>
              ) : (
                <>
                  {!opportunity.assignee && <Button onClick={onAssignClick} className="rounded-2xl">Assign to Team Member</Button>}
                  <Button onClick={onClose} className="rounded-2xl">Close</Button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
