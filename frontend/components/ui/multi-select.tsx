"use client"

import * as React from "react"
import { X, ChevronDown, Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const PENDING_OPTION = "Pending / No specific skill"

interface MultiSelectProps {
  options: { id: string; name: string }[]
  selected: string[]
  onSelectionChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  showPendingOption?: boolean
}

export function MultiSelect({
  options,
  selected,
  onSelectionChange,
  placeholder = "Select skills...",
  className,
  disabled = false,
  showPendingOption = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleToggle = (optionName: string) => {
    if (disabled) return

    const isPending = optionName === PENDING_OPTION
    const isSelected = selected.includes(optionName)

    if (isPending) {
      // If selecting Pending, clear all other selections
      if (!isSelected) {
        onSelectionChange([PENDING_OPTION])
      } else {
        onSelectionChange([])
      }
    } else {
      // If selecting a real skill, remove Pending if present
      const filtered = selected.filter(s => s !== PENDING_OPTION)
      
      if (isSelected) {
        // Remove the option
        onSelectionChange(filtered.filter(s => s !== optionName))
      } else {
        // Add the option
        onSelectionChange([...filtered, optionName])
      }
    }
  }

  // Build options list with Pending at the top if enabled
  const allOptions = React.useMemo(() => {
    const skillOptions = options.map(opt => opt.name)
    if (showPendingOption) {
      return [PENDING_OPTION, ...skillOptions]
    }
    return skillOptions
  }, [options, showPendingOption])

  const selectedOptions = selected.filter(s => s !== "")
  const hasSelection = selectedOptions.length > 0

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          "w-full justify-between h-auto min-h-[48px] bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl hover:bg-white/60 hover:border-primary/40 transition-all",
          isOpen && "border-primary/40 ring-2 ring-primary/20",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex flex-wrap gap-2 flex-1 items-center py-2">
          {hasSelection ? (
            selectedOptions.map((option, index) => {
              const isPending = option === PENDING_OPTION
              return (
                <Badge
                  key={index}
                  variant="secondary"
                  className={cn(
                    "text-xs px-2.5 py-1",
                    isPending
                      ? "bg-slate-200/80 text-slate-600 border-slate-300/60"
                      : "bg-white/80 text-slate-700 border-white/60"
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (!disabled) {
                      handleToggle(option)
                    }
                  }}
                >
                  {option}
                  {!disabled && (
                    <X className="h-3 w-3 ml-1.5 hover:bg-slate-200 rounded-full" />
                  )}
                </Badge>
              )
            })
          ) : (
            <span className="text-sm text-muted-foreground">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
            isOpen && "transform rotate-180"
          )}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] max-h-64 overflow-auto">
          {allOptions.map((optionName, index) => {
            const isPending = optionName === PENDING_OPTION
            const isSelected = selected.includes(optionName)
            const isFirstPending = isPending && index === 0

            return (
              <button
                key={optionName}
                type="button"
                onClick={() => handleToggle(optionName)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-primary/5 focus:bg-primary/5 focus:outline-none transition-colors flex items-center justify-between",
                  isPending && !isFirstPending && "border-t border-white/30",
                  isPending && "bg-slate-50/50"
                )}
              >
                <div className="flex-1">
                  <div className={cn(
                    "font-medium text-sm",
                    isPending ? "text-slate-600" : "text-slate-800"
                  )}>
                    {optionName}
                  </div>
                  {isPending && (
                    <div className="text-xs text-slate-500 mt-1">
                      No specific skill required
                    </div>
                  )}
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary shrink-0" />
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

