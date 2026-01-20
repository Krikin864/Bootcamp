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
}

export function TagInput({
  tags,
  onTagsChange,
  availableSkills = [],
  placeholder = "Type a skill and press Enter...",
  className,
  disabled = false,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [suggestions, setSuggestions] = React.useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Filter suggestions based on input
  React.useEffect(() => {
    if (inputValue.trim() === "") {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const filtered = availableSkills
      .map((skill) => skill.name)
      .filter(
        (skillName) =>
          skillName.toLowerCase().includes(inputValue.toLowerCase()) &&
          !tags.includes(skillName)
      )
      .slice(0, 5)

    setSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
  }, [inputValue, availableSkills, tags])

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() !== "") {
      e.preventDefault()
      addTag(inputValue.trim())
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      removeTag(tags.length - 1)
    } else if (e.key === "Escape") {
      setShowSuggestions(false)
      inputRef.current?.blur()
    }
  }

  const addTag = (tag: string) => {
    // Normalize tag: capitalize first letter
    const normalizedTag = tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase()
    
    if (!tags.includes(normalizedTag) && normalizedTag.trim() !== "") {
      onTagsChange([...tags, normalizedTag])
      setInputValue("")
      setShowSuggestions(false)
    }
  }

  const removeTag = (index: number) => {
    onTagsChange(tags.filter((_, i) => i !== index))
  }

  const handleSuggestionClick = (suggestion: string) => {
    addTag(suggestion)
  }

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap gap-2 p-2 min-h-[42px] bg-white/50 backdrop-blur-sm border border-white/40 rounded-2xl focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/40">
        {tags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="bg-white/80 text-slate-700 border-white/60 hover:bg-white/90"
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
        ))}
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
          placeholder={tags.length === 0 ? placeholder : ""}
          disabled={disabled}
          className="flex-1 min-w-[120px] border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 h-auto p-0"
        />
      </div>
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-white/90 backdrop-blur-xl border border-white/40 rounded-2xl shadow-[0_8px_32px_0_rgba(31,38,135,0.12)] max-h-60 overflow-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className="w-full text-left px-4 py-2 hover:bg-secondary focus:bg-secondary focus:outline-none"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <div className="font-medium text-foreground">{suggestion}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

