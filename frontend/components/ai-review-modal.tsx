"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sparkles, Loader2 } from "lucide-react"

interface AIReviewModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientName: string
  company: string
  clientText: string
  onClose: () => void
}

export default function AIReviewModal({
  open,
  onOpenChange,
  clientName,
  company,
  clientText,
  onClose,
}: AIReviewModalProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [summary, setSummary] = useState("")
  const [skill, setSkill] = useState("")
  const [urgency, setUrgency] = useState("")
  const [showResults, setShowResults] = useState(false)

  useEffect(() => {
    if (open && !showResults) {
      // Start AI processing
      setIsProcessing(true)

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
  }, [open, showResults])

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

    onOpenChange(false)
    onClose()
  }

  const handleClose = () => {
    onOpenChange(false)
    setShowResults(false)
    setSummary("")
    setSkill("")
    setUrgency("")
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            AI Analysis Review
          </DialogTitle>
          <DialogDescription>
            {isProcessing
              ? "AI is analyzing the client request..."
              : "Review and confirm the AI-generated opportunity details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client Info Display */}
          <div className="p-4 bg-secondary rounded-lg space-y-2 border border-border">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-sm text-muted-foreground">Client Name</p>
                <p className="font-semibold text-foreground">{clientName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Company</p>
                <p className="font-semibold text-foreground">{company}</p>
              </div>
            </div>
          </div>

          {isProcessing ? (
            // AI Processing State
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 text-accent animate-spin" />
              <p className="text-muted-foreground">AI analyzing client request…</p>
            </div>
          ) : showResults ? (
            // AI Results Display
            <div className="space-y-4 p-4 bg-secondary rounded-lg border border-accent/20">
              <div>
                <Label htmlFor="summary" className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  Summary (Editable)
                </Label>
                <Textarea
                  id="summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={3}
                  className="mt-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="skill" className="text-sm font-semibold">
                    Required Skill (Editable)
                  </Label>
                  <Select value={skill} onValueChange={setSkill}>
                    <SelectTrigger id="skill" className="mt-2">
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
                </div>

                <div>
                  <Label htmlFor="urgency" className="text-sm font-semibold">
                    Urgency (Editable)
                  </Label>
                  <Select value={urgency} onValueChange={setUrgency}>
                    <SelectTrigger id="urgency" className="mt-2">
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
                </div>
              </div>
            </div>
          ) : null}

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={handleClose}>
              {isProcessing ? "Cancel" : "Close"}
            </Button>
            {showResults && (
              <Button onClick={handleConfirm} disabled={!summary || !skill || !urgency} className="gap-2">
                <Sparkles className="h-4 w-4" />
                Confirm & Create Opportunity
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
