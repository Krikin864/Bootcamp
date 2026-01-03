"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Loader2, ArrowLeft, Edit2 } from "lucide-react"

interface AIReviewPanelProps {
  clientName: string
  company: string
  clientText: string
  onAnalyzeClick?: () => void
  onBack: () => void
  onComplete: () => void
}

export default function AIReviewPanel({ clientName, company, clientText, onBack, onComplete }: AIReviewPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [summary, setSummary] = useState("")
  const [skill, setSkill] = useState("")
  const [urgency, setUrgency] = useState("")
  const [showResults, setShowResults] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  // Now analysis only triggers when user clicks "Analyze with AI" button from left panel

  const performAnalysis = () => {
    setIsProcessing(true)
    setShowResults(false)
    setIsEditing(false)

    // Simulate AI processing with 2 second delay
    const timer = setTimeout(() => {
      // Hardcoded placeholder AI results
      setSummary(
        "Client needs expert support to implement a modern frontend solution with React and TypeScript for their upcoming product launch.",
      )
      setSkill("React")
      setUrgency("High")
      setShowResults(true)
      setIsProcessing(false)
    }, 2000)

    return () => clearTimeout(timer)
  }

  // User can trigger new analysis by changing text and clicking button again
  if (!showResults && !isProcessing) {
    performAnalysis()
  }

  const handleConfirm = () => {
    const newOpportunity = {
      id: Date.now().toString(),
      clientName,
      company,
      summary,
      requiredSkill: skill,
      assignee: "",
      status: "new" as const,
      urgency: urgency.toLowerCase() as "high" | "medium" | "low",
      aiSummary: summary,
      isProcessing: false,
    }

    // Dispatch event to add opportunity to kanban board
    window.dispatchEvent(
      new CustomEvent("addOpportunity", {
        detail: newOpportunity,
      }),
    )

    onComplete()
  }

  return (
    <div className="flex flex-col h-full" data-ai-panel>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent" />
          <h3 className="font-semibold text-foreground">AI Analysis Review</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto pr-4">
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
                  <Select value={skill} onValueChange={setSkill}>
                    <SelectTrigger id="skill" className="mt-1 h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {["React", "Python", "DevOps", "Design", "Product", "Sales", "Legal", "Backend", "Frontend"].map(
                        (s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ),
                      )}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm font-medium mt-1 text-foreground">{skill}</p>
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

        <div className="flex gap-2 pt-4 border-t border-border">
          <Button variant="outline" onClick={onBack} className="flex-1 bg-transparent">
            Back
          </Button>
          {showResults && (
            <Button onClick={handleConfirm} disabled={!summary || !skill || !urgency} className="flex-1 gap-2">
              <Sparkles className="h-4 w-4" />
              Confirm & Create
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
