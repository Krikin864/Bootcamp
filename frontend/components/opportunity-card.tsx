"use client"

import { Draggable } from "@hello-pangea/dnd"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, GripVertical } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface Opportunity {
  id: string
  clientName: string
  company: string
  summary: string
  requiredSkill: string | string[]
  assignee: string
  status: "new" | "assigned" | "done" | "cancelled" | "archived"
  urgency: "high" | "medium" | "low"
  aiSummary: string
  isProcessing?: boolean
  createdDate?: string
}

interface OpportunityCardProps {
  opportunity: Opportunity
  onClick?: () => void
  isUpdating?: boolean
  index?: number
  isDraggable?: boolean
}

export default function OpportunityCard({ 
  opportunity, 
  onClick, 
  isUpdating = false, 
  index = 0,
  isDraggable = false 
}: OpportunityCardProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(typeof window !== 'undefined')
  }, [])
  const urgencyColors = {
    high: "bg-red-500/10 text-red-600 border-red-200",
    medium: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    low: "bg-green-500/10 text-green-600 border-green-200",
  }

  const urgencyLabels = {
    high: "High",
    medium: "Medium",
    low: "Low",
  }

  const skills = Array.isArray(opportunity.requiredSkill) ? opportunity.requiredSkill : [opportunity.requiredSkill]

  // Card content component (reusable)
  const CardContent = ({ provided, snapshot }: { provided?: any; snapshot?: any }) => {
    const [wasDragging, setWasDragging] = useState(false)
    const cardRef = useRef<HTMLDivElement>(null)
    const [cardWidth, setCardWidth] = useState<number | null>(null)
    const isDraggableMode = !!provided

    useEffect(() => {
      if (snapshot?.isDragging) {
        setWasDragging(true)
        // Capture the original width before dragging
        if (cardRef.current) {
          setCardWidth(cardRef.current.offsetWidth)
        }
      } else if (wasDragging) {
        // Just finished dragging, reset after a short delay
        const timer = setTimeout(() => {
          setWasDragging(false)
          setCardWidth(null)
        }, 100)
        return () => clearTimeout(timer)
      }
    }, [snapshot?.isDragging, wasDragging])

    const handleClick = (e: React.MouseEvent) => {
      // Don't trigger click if we just finished dragging (only for draggable mode)
      if (isDraggableMode && (wasDragging || snapshot?.isDragging)) {
        e.preventDefault()
        e.stopPropagation()
        return
      }
      
      // Normal click handling
      if (onClick) {
        onClick()
      }
    }

    const cardStyle = provided?.draggableProps?.style
      ? {
          ...provided.draggableProps.style,
          zIndex: snapshot?.isDragging ? 9999 : 1,
          position: snapshot?.isDragging ? 'fixed' as const : 'relative' as const,
          width: snapshot?.isDragging && cardWidth ? `${cardWidth}px` : undefined,
          cursor: snapshot?.isDragging ? 'grabbing' : 'pointer',
          willChange: snapshot?.isDragging ? 'transform' : undefined,
        }
      : undefined

    const cardElement = (
      <div
        ref={(node) => {
          provided?.innerRef(node)
          if (node) {
            cardRef.current = node
          }
        }}
        {...(provided?.draggableProps || {})}
        style={cardStyle}
        onClick={handleClick}
        className={`group relative p-5 bg-white/80 backdrop-blur-xl border border-white/50 rounded-[2rem] transition-all duration-300 ease-in-out cursor-pointer transform-gpu pointer-events-auto ${
          snapshot?.isDragging
            ? "shadow-2xl opacity-90 rotate-3 scale-105"
            : "shadow-[0_8px_32px_0_rgba(31,38,135,0.07)] hover:shadow-xl hover:scale-[1.02] hover:border-white/20"
        } ${
          isUpdating ? "opacity-60" : ""
        }`}
      >
      
      {/* Drag handle icon - only for draggable cards, hidden when dragging */}
      {provided?.dragHandleProps && !snapshot?.isDragging && (
        <div
          {...provided.dragHandleProps}
          className="absolute top-3 right-3 w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing z-10"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-4 w-4 text-slate-400 hover:text-slate-600" />
        </div>
      )}

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <span 
              key={skill} 
              className="text-xs px-3 py-1.5 bg-white rounded-full text-slate-700 font-medium shadow-md border border-white/60"
            >
              {skill}
            </span>
          ))}
        </div>

        <div className="space-y-1">
          <h4 className="font-semibold text-slate-800 text-sm leading-tight">{opportunity.clientName}</h4>
          <p className="text-xs text-slate-600">{opportunity.company}</p>
        </div>

        <div className="bg-white/50 backdrop-blur-sm p-3 rounded-2xl border border-white/40">
          <div className="flex items-start gap-2">
            <Sparkles className="h-3 w-3 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-700 leading-snug line-clamp-2">
              {opportunity.aiSummary && opportunity.aiSummary.trim() 
                ? opportunity.aiSummary 
                : opportunity.summary && opportunity.summary.trim()
                  ? opportunity.summary
                  : 'Processing summary...'}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/30">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={`text-xs border px-2.5 py-1 rounded-full ${urgencyColors[opportunity.urgency]}`}>
              {urgencyLabels[opportunity.urgency]}
            </Badge>
            <span className="text-xs text-slate-600">{opportunity.createdDate}</span>
          </div>
          {opportunity.assignee && (
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shadow-sm">
                <span className="text-xs font-bold text-primary">{opportunity.assignee.charAt(0)}</span>
              </div>
              <span className="text-xs text-slate-800 font-medium">{opportunity.assignee.split(" ")[0]}</span>
            </div>
          )}
        </div>

        {opportunity.status === "done" && (
          <div className="pt-2 border-t border-white/30 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xs text-emerald-600">✓</span>
            </div>
            <span className="text-xs text-emerald-600 font-medium">Done</span>
          </div>
        )}
      </div>
    </div>
    )

    // Render in portal when dragging
    if (snapshot?.isDragging && isClient && typeof document !== 'undefined') {
      return createPortal(cardElement, document.body)
    }

    return cardElement
  }

  // Render with or without Draggable wrapper
  // Only use Draggable if explicitly set to true and we're on the client
  if (isDraggable === true && isClient) {
    return (
      <Draggable draggableId={opportunity.id} index={index}>
        {(provided, snapshot) => (
          <CardContent provided={provided} snapshot={snapshot} />
        )}
      </Draggable>
    )
  }

  // Render without Draggable (for History view)
  return <CardContent />
}
