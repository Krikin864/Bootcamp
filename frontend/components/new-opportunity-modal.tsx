"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Plus } from "lucide-react"
import AIReviewOverlay from "./ai-review-overlay"
import { getAllClients, type Client } from "@/services/clients"

interface NewOpportunityModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function NewOpportunityModal({ open, onOpenChange }: NewOpportunityModalProps) {
  const [clientName, setClientName] = useState("")
  const [company, setCompany] = useState("")
  const [clientText, setClientText] = useState("")
  const [showAIReview, setShowAIReview] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [clientSuggestions, setClientSuggestions] = useState<Client[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Cargar clientes cuando se abre el modal
  useEffect(() => {
    async function loadClients() {
      if (!open) return
      
      try {
        const clientsData = await getAllClients()
        setClients(clientsData)
      } catch (error) {
        console.error('Error loading clients:', error)
      }
    }

    loadClients()
  }, [open])

  // Filtrar sugerencias basadas en el input
  useEffect(() => {
    if (clientName.trim() === '') {
      setClientSuggestions([])
      setShowSuggestions(false)
      return
    }

    const filtered = clients.filter(client => 
      client.name.toLowerCase().includes(clientName.toLowerCase()) ||
      client.company.toLowerCase().includes(clientName.toLowerCase())
    )
    
    setClientSuggestions(filtered.slice(0, 5)) // Mostrar máximo 5 sugerencias
    setShowSuggestions(filtered.length > 0)
  }, [clientName, clients])

  const handleClientNameChange = (value: string) => {
    setClientName(value)
  }

  const handleSelectClient = (client: Client) => {
    setClientName(client.name)
    setCompany(client.company)
    setShowSuggestions(false)
  }

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
    setClientSuggestions([])
    setShowSuggestions(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleCloseAll}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Opportunity</DialogTitle>
          <DialogDescription>Enter client information to get started</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Label htmlFor="client-name">Client Name</Label>
            <Input
              id="client-name"
              placeholder="e.g., John Smith"
              value={clientName}
              onChange={(e) => handleClientNameChange(e.target.value)}
              onFocus={() => {
                if (clientSuggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              onBlur={() => {
                // Delay para permitir el click en las sugerencias
                setTimeout(() => setShowSuggestions(false), 200)
              }}
            />
            {showSuggestions && clientSuggestions.length > 0 && (
              <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-auto">
                {clientSuggestions.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    className="w-full text-left px-4 py-2 hover:bg-secondary focus:bg-secondary focus:outline-none"
                    onClick={() => handleSelectClient(client)}
                  >
                    <div className="font-medium text-foreground">{client.name}</div>
                    <div className="text-sm text-muted-foreground">{client.company}</div>
                  </button>
                ))}
              </div>
            )}
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
