"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Zap, Edit2, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSkills, type Skill } from "@/services/skills"
import { updateOpportunityDetails, type Opportunity } from "@/services/opportunities"
import { toast } from "sonner"

interface OpportunityDetailsModalProps {
  opportunity: Opportunity | null
  onClose: () => void
  onAssignClick: () => void
  onSaveEdits?: (updatedOpportunity: Opportunity) => void
}

export default function OpportunityDetailsModal({
  opportunity,
  onClose,
  onAssignClick,
  onSaveEdits,
}: OpportunityDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [isLoadingSkills, setIsLoadingSkills] = useState(false)
  const [editedValues, setEditedValues] = useState({
    summary: "",
    skillId: "none", // Usar "none" en lugar de "" para evitar el error del Select
    urgency: "",
  })

  // Cargar skills desde la base de datos cuando se abre el modal en modo edición
  useEffect(() => {
    async function loadSkills() {
      if (!opportunity || !isEditing) return
      
      try {
        setIsLoadingSkills(true)
        const skillsData = await getSkills()
        setSkills(skillsData)
        
        // Si la oportunidad tiene una skill, encontrar su ID por nombre
        const currentSkills = Array.isArray(opportunity.requiredSkill) 
          ? opportunity.requiredSkill 
          : [opportunity.requiredSkill]
        
        if (currentSkills.length > 0 && currentSkills[0] && skillsData.length > 0) {
          // Buscar el ID de la skill actual por nombre
          const currentSkill = skillsData.find(s => currentSkills.includes(s.name))
          if (currentSkill) {
            setEditedValues(prev => ({ ...prev, skillId: currentSkill.id }))
          } else {
            setEditedValues(prev => ({ ...prev, skillId: "none" }))
          }
        } else {
          setEditedValues(prev => ({ ...prev, skillId: "none" }))
        }
      } catch (error) {
        console.error('Error loading skills:', error)
        toast.error('Failed to load skills')
      } finally {
        setIsLoadingSkills(false)
      }
    }

    loadSkills()
  }, [opportunity, isEditing])

  if (!opportunity) return null

  const urgencyColors = {
    high: "bg-red-500/20 text-red-600",
    medium: "bg-yellow-500/20 text-yellow-600",
    low: "bg-green-500/20 text-green-600",
  }

  const handleEditStart = () => {
    setEditedValues({
      summary: opportunity.aiSummary,
      skillId: "none", // Se establecerá cuando se carguen las skills
      urgency: opportunity.urgency,
    })
    setIsEditing(true)
  }

  const handleSaveEdits = async () => {
    if (!opportunity) return

    try {
      setIsSaving(true)

      // Preparar los datos para actualizar
      const updates: {
        ai_summary?: string
        urgency?: string
        required_skill_id?: string | null
      } = {}

      // Solo incluir campos que han cambiado
      if (editedValues.summary !== opportunity.aiSummary) {
        updates.ai_summary = editedValues.summary
      }

      if (editedValues.urgency !== opportunity.urgency) {
        updates.urgency = editedValues.urgency
      }

      // Actualizar required_skill_id - IMPORTANTE: usar UUID, no nombre
      const currentSkills = Array.isArray(opportunity.requiredSkill) 
        ? opportunity.requiredSkill 
        : [opportunity.requiredSkill]
      
      const currentSkillName = currentSkills[0] || ""
      const selectedSkill = skills.find(s => s.id === editedValues.skillId)
      
      if (editedValues.skillId === "none") {
        // Si se seleccionó "none", establecer como null
        if (currentSkills.length > 0) {
          updates.required_skill_id = null
        }
      } else if (selectedSkill) {
        // Usar el UUID de la skill seleccionada, no el nombre
        if (selectedSkill.name !== currentSkillName) {
          updates.required_skill_id = selectedSkill.id // UUID, no nombre
        }
      }

      // Solo actualizar si hay cambios
      if (Object.keys(updates).length > 0) {
        const updatedOpportunity = await updateOpportunityDetails(opportunity.id, updates)
        
        if (updatedOpportunity && onSaveEdits) {
          // Pasar la oportunidad completa actualizada para que el Kanban se actualice
          onSaveEdits(updatedOpportunity)
          toast.success('Opportunity updated successfully')
          setIsEditing(false)
        } else {
          throw new Error('Failed to update opportunity')
        }
      } else {
        // No hay cambios, solo cerrar el modo edición
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

  const currentSkills = Array.isArray(opportunity.requiredSkill)
    ? opportunity.requiredSkill
    : [opportunity.requiredSkill]

  return (
    <Dialog open={!!opportunity} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Opportunity Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Client Info */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground">Client Information</h3>
            <div className="bg-secondary/50 p-4 rounded-lg border border-border space-y-2">
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Summary
                {!isEditing && <span className="text-xs font-normal text-muted-foreground">(AI-generated)</span>}
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
              <div className="bg-secondary/50 p-4 rounded-lg border border-border">
                <p className="text-foreground leading-relaxed">{opportunity.aiSummary}</p>
              </div>
            ) : (
              <Textarea
                value={editedValues.summary}
                onChange={(e) => setEditedValues((prev) => ({ ...prev, summary: e.target.value }))}
                rows={3}
                className="bg-secondary/50 border-border"
                disabled={isSaving}
              />
            )}
          </div>

          {/* Requirements */}
          <div className="space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Requirements
              {!isEditing && <span className="text-xs font-normal text-muted-foreground">(Editable)</span>}
            </h3>
            {!isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Required Skills</label>
                  <div className="flex flex-wrap gap-2">
                    {currentSkills.length > 0 ? (
                      currentSkills.map((skill) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-sm text-muted-foreground italic">No skills assigned</span>
                    )}
                  </div>
                </div>
                <div className="bg-secondary/50 p-3 rounded-lg border border-border">
                  <label className="text-xs font-medium text-muted-foreground">Urgency</label>
                  <div className="mt-2">
                    <Badge className={`${urgencyColors[opportunity.urgency]}`}>
                      {opportunity.urgency.charAt(0).toUpperCase() + opportunity.urgency.slice(1)}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="modal-edit-skill" className="text-xs font-medium mb-2 block">
                    Required Skill
                  </Label>
                  {isLoadingSkills ? (
                    <div className="flex items-center gap-2 p-3 bg-secondary/50 border border-border rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Loading skills...</span>
                    </div>
                  ) : (
                    <Select
                      value={editedValues.skillId}
                      onValueChange={(value) => setEditedValues((prev) => ({ ...prev, skillId: value }))}
                      disabled={isSaving}
                    >
                      <SelectTrigger id="modal-edit-skill" className="bg-secondary/50 border-border">
                        <SelectValue placeholder="Select a skill" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No skill</SelectItem>
                        {skills.map((skill) => (
                          <SelectItem key={skill.id} value={skill.id}>
                            {skill.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                    <SelectTrigger id="modal-edit-urgency" className="bg-secondary/50 border-border">
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
          {opportunity.assignee && (
            <div className="space-y-3">
              <h3 className="font-semibold text-foreground">Assigned To</h3>
              <div className="bg-secondary/50 p-4 rounded-lg border border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-primary">{opportunity.assignee.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-foreground font-semibold">{opportunity.assignee}</p>
                  <p className="text-xs text-muted-foreground">Team Member</p>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdits}
                  disabled={isSaving}
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
              </>
            ) : (
              <>
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {!opportunity.assignee && <Button onClick={onAssignClick}>Assign to Team Member</Button>}
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
