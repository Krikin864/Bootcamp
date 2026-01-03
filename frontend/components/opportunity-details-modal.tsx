"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Sparkles, Zap, Edit2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SKILLS } from "@/lib/skills"

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

interface OpportunityDetailsModalProps {
  opportunity: Opportunity | null
  onClose: () => void
  onAssignClick: () => void
  onSaveEdits?: (updates: Partial<Opportunity>) => void
}

export default function OpportunityDetailsModal({
  opportunity,
  onClose,
  onAssignClick,
  onSaveEdits,
}: OpportunityDetailsModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedValues, setEditedValues] = useState({
    summary: "",
    skills: [] as string[],
    urgency: "",
  })

  if (!opportunity) return null

  const urgencyColors = {
    high: "bg-red-500/20 text-red-600",
    medium: "bg-yellow-500/20 text-yellow-600",
    low: "bg-green-500/20 text-green-600",
  }

  const handleEditStart = () => {
    setEditedValues({
      summary: opportunity.aiSummary,
      skills: Array.isArray(opportunity.requiredSkill) ? opportunity.requiredSkill : [opportunity.requiredSkill],
      urgency: opportunity.urgency,
    })
    setIsEditing(true)
  }

  const handleAddSkill = (skill: string) => {
    setEditedValues((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill) ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
    }))
  }

  const handleSaveEdits = () => {
    if (onSaveEdits) {
      onSaveEdits({
        summary: editedValues.summary,
        requiredSkill: editedValues.skills,
        urgency: editedValues.urgency as "high" | "medium" | "low",
      })
    }
    setIsEditing(false)
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
                    {currentSkills.map((skill) => (
                      <Badge key={skill} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
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
                  <Label className="text-xs font-medium mb-2 block">Required Skills (multi-select)</Label>
                  <div className="bg-secondary/50 border border-border rounded-lg p-3 space-y-2">
                    {SKILLS.map((skill) => (
                      <label key={skill} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editedValues.skills.includes(skill)}
                          onChange={() => handleAddSkill(skill)}
                          className="w-4 h-4 rounded border-border"
                        />
                        <span className="text-sm text-foreground">{skill}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <Label htmlFor="modal-edit-urgency" className="text-xs font-medium">
                    Urgency
                  </Label>
                  <Select
                    value={editedValues.urgency}
                    onValueChange={(v) => setEditedValues((prev) => ({ ...prev, urgency: v }))}
                  >
                    <SelectTrigger id="modal-edit-urgency">
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
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdits}>Save Changes</Button>
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
