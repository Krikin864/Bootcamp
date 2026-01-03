"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import AIReviewOverlay from "./ai-review-overlay"

interface NewOpportunityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NewOpportunityModal({ open, onOpenChange }: NewOpportunityModalProps) {
  const [clientName, setClientName] = useState("")
  const [company, setCompany] = useState("")
  const [clientText, setClientText] = useState("")
  const [showAIReview, setShowAIReview] = useState(false)

  const handleAnalyzeWithAI = () => {
    if (clientName && company && clientText) {
      setShowAIReview(true)
    }
  }

  const handleCloseAll = () => {
    onOpenChange(false)
    setShowAIReview(false)
    setClientName("")
    setCompany("")
    setClientText("")
  }

  return (
    <Dialog open={open} onOpenChange={handleCloseAll}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Opportunity</DialogTitle>
          <DialogDescription>Enter client information to get started</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="client-name">Client Name</Label>
            <Input
              id="client-name"
              placeholder="e.g., John Smith"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              placeholder="e.g., TechCorp Inc"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="client-text">Client Communication / Requirements</Label>
            <Textarea
              id="client-text"
              placeholder="Paste the client's email, message, or requirements here..."
              rows={8}
              value={clientText}
              onChange={(e) => setClientText(e.target.value)}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={handleCloseAll}>
              Cancel
            </Button>
            <Button onClick={handleAnalyzeWithAI} disabled={!clientName || !company || !clientText} className="gap-2">
              <Plus className="h-4 w-4" />
              Analyze with AI
            </Button>
          </div>
        </div>

        {showAIReview && (
          <AIReviewOverlay
            clientName={clientName}
            company={company}
            clientText={clientText}
            onBack={() => setShowAIReview(false)}
            onComplete={handleCloseAll}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
