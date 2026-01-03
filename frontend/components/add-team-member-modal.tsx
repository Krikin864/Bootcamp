"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { X } from "lucide-react"

const AVAILABLE_SKILLS = [
  "React",
  "Vue.js",
  "Python",
  "TypeScript",
  "Node.js",
  "Django",
  "PostgreSQL",
  "Tailwind CSS",
  "DevOps",
  "Design",
  "Product",
  "Sales",
  "Legal",
  "Backend",
  "Frontend",
]

interface AddTeamMemberModalProps {
  onClose: () => void
  onAdd: (member: any) => void
}

export default function AddTeamMemberModal({ onClose, onAdd }: AddTeamMemberModalProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [selectedSkills, setSelectedSkills] = useState<string[]>([])

  const handleAddSkill = (skill: string) => {
    if (!selectedSkills.includes(skill)) {
      setSelectedSkills([...selectedSkills, skill])
    }
  }

  const handleRemoveSkill = (skill: string) => {
    setSelectedSkills(selectedSkills.filter((s) => s !== skill))
  }

  const handleSubmit = () => {
    if (name.trim() && email.trim() && selectedSkills.length > 0) {
      const newMember = {
        id: Date.now().toString(),
        name,
        email,
        skills: selectedSkills,
        activeOpportunities: 0,
        completedOpportunities: 0,
      }
      onAdd(newMember)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Add Team Member</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-secondary">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          {/* Name Input */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Name</label>
            <Input
              type="text"
              placeholder="Enter full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Email Input */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Email</label>
            <Input
              type="email"
              placeholder="Enter email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          {/* Skills Selection */}
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Skills</label>

            {/* Selected Skills */}
            {selectedSkills.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2 p-3 bg-secondary rounded-lg">
                {selectedSkills.map((skill) => (
                  <div
                    key={skill}
                    className="px-3 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold flex items-center gap-2"
                  >
                    {skill}
                    <button onClick={() => handleRemoveSkill(skill)} className="hover:opacity-70">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Available Skills */}
            <div className="flex flex-wrap gap-2 p-3 bg-secondary rounded-lg max-h-40 overflow-y-auto">
              {AVAILABLE_SKILLS.filter((skill) => !selectedSkills.includes(skill)).map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleAddSkill(skill)}
                  className="px-3 py-1 bg-muted text-foreground rounded-full text-xs font-medium hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  {skill}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || !email.trim() || selectedSkills.length === 0}
            className="flex-1"
          >
            Add Member
          </Button>
        </div>
      </div>
    </div>
  )
}
