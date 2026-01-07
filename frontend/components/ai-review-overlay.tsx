"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Loader2, ArrowLeft, Edit2 } from "lucide-react"
import { getSkills, type Skill } from "@/services/skills"
import { findOrCreateClient } from "@/services/clients"
import { createOpportunity, type Opportunity } from "@/services/opportunities"
import { toast } from "sonner"

interface AIReviewOverlayProps {
  clientName: string
  company: string
  clientText: string
  onBack: () => void
  onComplete: () => void
}

export default function AIReviewOverlay({ clientName, company, clientText, onBack, onComplete }: AIReviewOverlayProps) {
  const [isProcessing, setIsProcessing] = useState(true)
  const [summary, setSummary] = useState("")
  const [skillId, setSkillId] = useState("none")
  const [urgency, setUrgency] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [isSaving, setIsSaving] = useState(false)

  // Cargar skills desde la DB
  useEffect(() => {
    async function loadSkills() {
      try {
        const skillsData = await getSkills()
        setSkills(skillsData)
      } catch (error) {
        console.error('Error loading skills:', error)
      }
    }

    loadSkills()
  }, [])

  // Simular procesamiento de AI
  useEffect(() => {
    const timer = setTimeout(() => {
      setSummary(
        "Client needs expert support to implement a modern frontend solution with React and TypeScript for their upcoming product launch.",
      )
      // Buscar skill "React" por nombre y establecer su ID
      const reactSkill = skills.find(s => s.name.toLowerCase() === "react")
      setSkillId(reactSkill ? reactSkill.id : "none")
      setUrgency("High")
      setShowResults(true)
      setIsProcessing(false)
    }, 2000)

    return () => clearTimeout(timer)
  }, [skills])

  const handleConfirm = async () => {
    if (!summary || skillId === "none" || !urgency) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setIsSaving(true)

      // 1. Buscar o crear el cliente
      const client = await findOrCreateClient(clientName, company)

      // 2. Crear la oportunidad en Supabase
      const newOpportunity = await createOpportunity(
        client.id,
        clientText,
        summary,
        urgency.toLowerCase() as "high" | "medium" | "low",
        skillId !== "none" ? skillId : null
      )

      // 3. Disparar evento para actualizar el Kanban
      window.dispatchEvent(
        new CustomEvent("addOpportunity", {
          detail: newOpportunity,
        }),
      )

      toast.success('Opportunity created successfully!')
      onComplete()
    } catch (error: any) {
      const errorMessage = error?.message || 'Failed to create opportunity'
      toast.error(`Error: ${errorMessage}`)
      console.error('Error creating opportunity:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const selectedSkill = skills.find(s => s.id === skillId)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onBack} />

      <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
        <div className="bg-background border border-border rounded-lg shadow-lg p-6 w-full max-w-md pointer-events-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-accent" />
              <h3 className="font-semibold text-foreground">AI Analysis Review</h3>
            </div>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Client Info Display */}
            <div className="p-3 bg-secondary rounded-lg space-y-2 border border-border">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Client</p>
                  <p className="font-semibold text-foreground">{clientName}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Company</p>
                  <p className="font-semibold text-foreground">{company}</p>
                </div>
              </div>
            </div>

            {isProcessing ? (
              // AI Processing State
              <div className="flex flex-col items-center justify-center py-8 gap-3">
                <Loader2 className="h-8 w-8 text-accent animate-spin" />
                <p className="text-sm text-muted-foreground">AI analyzing client request…</p>
              </div>
            ) : showResults ? (
              // AI Results Display
              <div className="space-y-3 p-3 bg-secondary rounded-lg border border-accent/20">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    Summary
                  </Label>
                  {!isEditing && (
                    <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="gap-2 h-7 px-2">
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </Button>
                  )}
                </div>

                {isEditing ? (
                  <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} rows={3} className="text-sm" />
                ) : (
                  <p className="text-sm text-foreground bg-background p-2 rounded border border-border">{summary}</p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="skill" className="text-xs font-semibold">
                      Required Skill
                    </Label>
                    {isEditing ? (
                      <Select value={skillId} onValueChange={setSkillId}>
                        <SelectTrigger id="skill" className="mt-1 h-9 text-sm">
                          <SelectValue />
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
                    ) : (
                      <p className="text-sm font-medium mt-1 text-foreground">{selectedSkill?.name || 'No skill'}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="urgency" className="text-xs font-semibold">
                      Urgency
                    </Label>
                    {isEditing ? (
                      <Select value={urgency} onValueChange={setUrgency}>
                        <SelectTrigger id="urgency" className="mt-1 h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["Low", "Medium", "High"].map((u) => (
                            <SelectItem key={u} value={u}>
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <p className="text-sm font-medium mt-1 text-foreground">{urgency}</p>
                    )}
                  </div>
                </div>

                {isEditing && (
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="w-full">
                    Done Editing
                  </Button>
                )}
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 pt-4 border-t border-border mt-4">
            <Button variant="outline" onClick={onBack} className="flex-1 bg-transparent" disabled={isSaving}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {showResults && (
              <Button 
                onClick={handleConfirm} 
                disabled={!summary || skillId === "none" || !urgency || isSaving} 
                className="flex-1 gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Confirm & Create
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
