"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
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
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]) // Array of skill names
  const [urgency, setUrgency] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [skills, setSkills] = useState<Skill[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [aiSuggestedSkills, setAiSuggestedSkills] = useState<string[]>([])
  const [skillInput, setSkillInput] = useState("") // For manual skill input

  // Load skills from the DB
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

  // Process email with real AI
  useEffect(() => {
    async function processEmailWithAI() {
      if (!clientText || clientText.trim().length === 0) {
        setIsProcessing(false)
        return
      }

      try {
        setIsProcessing(true)
        
        // Call the API to process the email
        const response = await fetch('/api/ai/process-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emailContent: clientText,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          console.error('API Error Response:', errorText)
          let errorData
          try {
            errorData = JSON.parse(errorText)
          } catch {
            errorData = { error: errorText || 'Error processing email' }
          }
          throw new Error(errorData.error || 'Error processing email')
        }

        // Get the response text before parsing
        const responseText = await response.text()
        console.log('API Response (raw):', responseText)
        
        // Parse the JSON
        let aiResult
        try {
          aiResult = JSON.parse(responseText)
        } catch (parseError: any) {
          console.error('Error parsing JSON from server. Raw response:', responseText)
          console.error('Parse error:', parseError.message)
          throw new Error(`Error parsing server response: ${parseError.message}`)
        }
        
        console.log('API Response (parsed):', aiResult)

        // Auto-fill fields with AI results
        setSummary(aiResult.summary || '')
        
        // Map priority to urgency (priority comes as "Low", "Medium", "High")
        const priorityToUrgency: Record<string, string> = {
          'Low': 'Low',
          'Medium': 'Medium',
          'High': 'High',
        }
        setUrgency(priorityToUrgency[aiResult.priority] || 'Medium')

        // Ensure required_skills is always an array
        const aiSkills = Array.isArray(aiResult.required_skills) 
          ? aiResult.required_skills 
          : aiResult.required_skills 
            ? [aiResult.required_skills] 
            : []
        
        // Save skills suggested by AI
        setAiSuggestedSkills(aiSkills)

        // Match AI skills with database skills (case-insensitive)
        const matchedSkillNames: string[] = []
        if (aiSkills.length > 0) {
          aiSkills.forEach((aiSkill: string) => {
            // Try exact match first
            const exactMatch = skills.find(skill => 
              skill.name.toLowerCase() === aiSkill.toLowerCase()
            )
            if (exactMatch) {
              matchedSkillNames.push(exactMatch.name)
            } else {
              // Try partial match
              const partialMatch = skills.find(skill => 
                skill.name.toLowerCase().includes(aiSkill.toLowerCase()) ||
                aiSkill.toLowerCase().includes(skill.name.toLowerCase())
              )
              if (partialMatch) {
                matchedSkillNames.push(partialMatch.name)
              } else {
                // If no match in DB, use the AI suggestion as-is
                matchedSkillNames.push(aiSkill)
              }
            }
          })
        }
        
        setSelectedSkills(matchedSkillNames)

      setShowResults(true)
      setIsProcessing(false)
      } catch (error: any) {
        console.error('Error processing email with AI:', error)
        toast.error(`Error processing email: ${error.message || 'Unknown error'}`)
        setIsProcessing(false)
        // Show empty results so user can complete manually
        setShowResults(true)
      }
    }

    // Only process if skills are loaded
    if (skills.length > 0) {
      processEmailWithAI()
    }
  }, [clientText, skills])

  const handleAddSkill = (skillName: string) => {
    const trimmed = skillName.trim()
    if (trimmed && !selectedSkills.includes(trimmed)) {
      setSelectedSkills([...selectedSkills, trimmed])
      setSkillInput("")
    }
  }

  const handleRemoveSkill = (skillName: string) => {
    setSelectedSkills(selectedSkills.filter(s => s !== skillName))
  }

  const handleSkillInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault()
      handleAddSkill(skillInput)
    }
  }

  const handleConfirm = async () => {
    if (!summary || !urgency) {
      toast.error('Please fill in summary and urgency')
      return
    }

    try {
      setIsSaving(true)

      // 1. Find or create the client
      const client = await findOrCreateClient(clientName, company)

      // 2. Create the opportunity in Supabase with array of skill names
      const newOpportunity = await createOpportunity(
        client.id,
        clientText,
        summary,
        urgency.toLowerCase() as "high" | "medium" | "low",
        selectedSkills.length > 0 ? selectedSkills : null
      )

      // 3. Dispatch event to update the Kanban
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
                    <Label htmlFor="skills" className="text-xs font-semibold">
                      Required Skills
                    </Label>
                    {isEditing ? (
                      <div className="mt-1 space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {selectedSkills.map((skillName) => (
                            <span
                              key={skillName}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                            >
                              {skillName}
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(skillName)}
                                className="hover:text-destructive"
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            id="skill-input"
                            placeholder="Type skill and press Enter"
                            value={skillInput}
                            onChange={(e) => setSkillInput(e.target.value)}
                            onKeyDown={handleSkillInputKeyDown}
                            className="h-9 text-sm"
                          />
                          <Select
                            value=""
                            onValueChange={(value) => {
                              if (value && value !== "none") {
                                const skill = skills.find(s => s.id === value)
                                if (skill) {
                                  handleAddSkill(skill.name)
                                }
                              }
                            }}
                          >
                            <SelectTrigger className="h-9 text-sm w-32">
                              <SelectValue placeholder="Add from DB" />
                            </SelectTrigger>
                            <SelectContent>
                              {skills
                                .filter(skill => !selectedSkills.includes(skill.name))
                                .map((skill) => (
                                  <SelectItem key={skill.id} value={skill.id}>
                                    {skill.name}
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {aiSuggestedSkills.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            AI suggested: {aiSuggestedSkills.join(', ')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="mt-1">
                        {selectedSkills.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedSkills.map((skillName) => (
                              <span
                                key={skillName}
                                className="inline-flex items-center px-2 py-1 bg-primary/10 text-primary text-xs rounded-full border border-primary/20"
                              >
                                {skillName}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm font-medium text-foreground">No skills</p>
                        )}
                        {aiSuggestedSkills.length > 0 && selectedSkills.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            AI suggested: {aiSuggestedSkills.join(', ')}
                          </p>
                        )}
                      </div>
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
                disabled={!summary || !urgency || isSaving} 
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
