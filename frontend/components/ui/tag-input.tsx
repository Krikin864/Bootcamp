"use client"

import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TagInputProps {
  tags: string[]
  onTagsChange: (tags: string[]) => void
  availableSkills?: { id: string; name: string }[]
  placeholder?: string
  className?: string
  disabled?: boolean
  restrictToAvailable?: boolean // If true, only allow selecting from availableSkills
  showPendingOption?: boolean // If true, show "Pending / No specific skill" option
}

const PENDING_OPTION = "Pending / No specific skill"

export function TagInput({
  tags,
  onTagsChange,
  availableSkills = [],
  placeholder = "Type a skill and press Enter...",
  className,
  disabled = false,
  restrictToAvailable = false,
  showPendingOption = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Filter suggestions based on input
  React.useEffect(() => {
    let filtered: string[] = []
    
    // Build list of available options
    const availableNames = availableSkills.map((skill) => skill.name)
    
    // Add pending option at the start if enabled and not already selected
    if (showPendingOption && !tags.includes(PENDING_OPTION)) {
      if (inputValue.trim() === "" || PENDING_OPTION.toLowerCase().includes(inputValue.toLowerCase())) {
        filtered.push(PENDING_OPTION)
      }
    }
    
    // Add matching skills
    const matchingSkills = availableNames.filter(
      (skillName) =>
        skillName.toLowerCase().includes(inputValue.toLowerCase()) &&
        !tags.includes(skillName)
    )
    
    filtered = [...filtered, ...matchingSkills].slice(0, 6) // Show up to 6 options

    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0 && inputValue.trim() !== "")
  }, [inputValue, availableSkills, tags, showPendingOption])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() !== "") {
      e.preventDefault()
      // If restricting to available, only add if it's in suggestions
      if (restrictToAvailable) {
        // Check if there's an exact match in suggestions
        const exactMatch = suggestions.find(
          s => s.toLowerCase() === inputValue.trim().toLowerCase()
        )
        if (exactMatch) {
          addTag(exactMatch)
        }
      } else {
        addTag(inputValue.trim())
      }
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags.length - 1)
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const addTag = (tag: string) => {
    // If restricting to available, validate the tag exists in availableSkills or is PENDING_OPTION
    if (restrictToAvailable) {
      const availableNames = availableSkills.map((skill) => skill.name)
      const isValidTag = tag === PENDING_OPTION || availableNames.includes(tag)
      
      if (!isValidTag) {
        return // Don't add invalid tags
      }
    }
    
    // Normalize tag: capitalize first letter (except for PENDING_OPTION)
    const normalizedTag = tag === PENDING_OPTION 
      ? tag 
      : tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()
    
    // If PENDING_OPTION is selected, clear other tags
    if (normalizedTag === PENDING_OPTION) {
      if (!tags.includes(PENDING_OPTION)) {
        onTagsChange([PENDING_OPTION])
      }
    } else {
      // Remove PENDING_OPTION if selecting a real skill
      const filteredTags = tags.filter(t => t !== PENDING_OPTION)
      if (!filteredTags.includes(normalizedTag) && normalizedTag.trim() !== "") {
        onTagsChange([...filteredTags, normalizedTag])
      }
    }
    
    setInputValue("")
    setShowSuggestions(false)
  }

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index))
  }

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion)
  }

  return (
    <div className={cn("relative w-full", className)}>
      <div className="flex flex-wrap gap-2 p-3 min-h-[48px] bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40 transition-all">
        {tags.map((tag, index) => {
          const isPending = tag === PENDING_OPTION
          return (
            <Badge
              key={index}
              variant="secondary"
              className={
                isPending
                  ? "bg-slate-200/80 text-slate-600 border-slate-300/60 hover:bg-slate-200/90"
                  : "bg-white/80 text-slate-700 border-white/60 hover:bg-white/90"
              }
            >
              {tag}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="ml-1.5 rounded-full hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1"
                  disabled={disabled}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          )
        })}
        <Input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleInputKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true)
            }
          }}
          onBlur={() => {
            // Delay to allow click on suggestions
            setTimeout(() => setShowSuggestions(false), 200)
          }}
          placeholder={tags.length === 0 ? (restrictToAvailable ? "Search skills..." : placeholder) : ""}
          disabled={disabled}
          className="flex-1 min-w-[120px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0 text-sm"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white/95 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.15)] max-h-64 overflow-auto">
          {suggestions.map((suggestion, index) => {
            const isPending = suggestion === PENDING_OPTION
            const isFirst = index === 0
            return (
              <button
                key={index}
                type="button"
                className={`w-full text-left px-4 py-3 hover:bg-primary/5 focus:bg-primary/5 focus:outline-none transition-colors ${
                  isPending && !isFirst ? "border-t border-white/30" : ""
                } ${isPending ? "bg-slate-50/50" : ""}`}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className={`font-medium text-sm ${isPending ? "text-slate-600" : "text-slate-800"}`}>
                  {suggestion}
                </div>
                {isPending && (
                  <div className="text-xs text-slate-500 mt-1">
                    No specific skill required
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

