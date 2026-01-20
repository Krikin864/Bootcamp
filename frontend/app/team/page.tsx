"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, Search } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getTeamMembers, createTeamMember, updateTeamMember, type TeamMember } from "@/services/members"
import { getSkills, type Skill } from "@/services/skills"
import MemberForm, { type MemberFormData } from "@/components/member-form"
import SkillsManagementModal from "@/components/skills-management-modal"
import { toast } from "sonner"
import { useSidebarState } from "@/hooks/use-sidebar-state"
import { Settings } from "lucide-react"

export default function TeamPage() {
  const { isOpen: sidebarOpen } = useSidebarState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [showSkillsModal, setShowSkillsModal] = useState(false)
  const [activeSkillFilters, setActiveSkillFilters] = useState<string[]>([])

  // Load skills from the database when the page loads
  useEffect(() => {
    async function loadSkills() {
      try {
        const skillsData = await getSkills()
        setAvailableSkills(skillsData)
      } catch (error) {
        console.error('Error loading skills:', error)
        toast.error('Failed to load skills. Please try again later.')
      }
    }

    loadSkills()
  }, [])

  // Load team members from Supabase
  useEffect(() => {
    async function loadTeamMembers() {
      try {
        setIsLoading(true)
        const data = await getTeamMembers()
        setTeamMembers(data)
      } catch (error) {
        console.error('Error loading team members:', error)
        toast.error('Failed to load team members. Please try again later.')
      } finally {
        setIsLoading(false)
      }
    }

    loadTeamMembers()
  }, [])

  // Use all available skills from the database (not just from current members)
  const allUniqueSkills = availableSkills.map(skill => skill.name).sort()

  // Toggle skill filter
  const toggleSkillFilter = (skill: string) => {
    setActiveSkillFilters(prev => 
      prev.includes(skill) 
        ? prev.filter(s => s !== skill)
        : [...prev, skill]
    )
  }

  // Clear all skill filters
  const clearSkillFilters = () => {
    setActiveSkillFilters([])
  }

  // Filter team members based on search term and skill filters
  const filteredTeamMembers = teamMembers.filter((member) => {
    // Apply skill filters (OR logic: member must have at least one of the selected skills)
    if (activeSkillFilters.length > 0) {
      const hasMatchingSkill = activeSkillFilters.some(filterSkill =>
        member.skills.includes(filterSkill)
      )
      if (!hasMatchingSkill) return false
    }

    // Apply search term filter
    if (searchTerm.trim() === "") return true
    
    const searchLower = searchTerm.toLowerCase()
    const matchesName = member.name.toLowerCase().includes(searchLower)
    const matchesEmail = member.email.toLowerCase().includes(searchLower)
    
    // Check if search matches any skill
    const matchesSkill = member.skills.some(skill => 
      skill && skill.toLowerCase().includes(searchLower)
    )
    
    return matchesName || matchesEmail || matchesSkill
  })

  // Function to handle creating a new member
  const handleCreateMember = async (formData: MemberFormData) => {
    try {
      const newMember = await createTeamMember({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        skillIds: formData.skillIds,
      })

      // Update the member list
      setTeamMembers([...teamMembers, newMember])
      toast.success('Team member added successfully')
      setShowAddModal(false)
    } catch (error: any) {
      console.error('Error creating team member:', error)
      const errorMessage = error?.message || 'Error creating team member'
      toast.error(errorMessage)
      throw error // Re-throw so the form can handle the error
    }
  }

  // Function to handle updating an existing member
  const handleUpdateMember = async (formData: MemberFormData) => {
    if (!selectedMember) return

    try {
      const updatedMember = await updateTeamMember(selectedMember.id, {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        skillIds: formData.skillIds,
      })

      // Reload team members to get updated statistics
      const refreshedMembers = await getTeamMembers()
      setTeamMembers(refreshedMembers)
      
      toast.success('Team member updated successfully')
      setSelectedMember(null)
    } catch (error: any) {
      console.error('Error updating team member:', error)
      const errorMessage = error?.message || 'Error updating team member'
      toast.error(errorMessage)
      throw error // Re-throw so the form can handle the error
    }
  }

  // Function to handle member card click
  const handleMemberClick = (member: TeamMember) => {
    setSelectedMember(member)
  }

  // Function to close edit modal
  const handleCloseEditModal = () => {
    setSelectedMember(null)
  }

  // Function to refresh skills list
  const handleSkillsUpdated = async () => {
    try {
      const refreshedSkills = await getSkills()
      setAvailableSkills(refreshedSkills)
    } catch (error) {
      console.error('Error refreshing skills:', error)
    }
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-[#d1d8e6] via-[#eef2f7] to-[#e2e8f0] text-foreground">
      <Sidebar open={sidebarOpen} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <main className="flex-1 overflow-auto">
          <div className="h-16 mt-4 mx-4 bg-white/70 backdrop-blur-md border border-white/40 rounded-[2rem] shadow-sm px-6 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Team Members</h1>
            <div className="flex items-center gap-4 flex-1 max-w-md">
              <div className="flex items-center gap-2 flex-1 relative">
                <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  type="search"
                  placeholder="Search team members..."
                  className="pl-10 border-0 bg-white/50 backdrop-blur-sm placeholder:text-slate-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                onClick={() => setShowSkillsModal(true)} 
                variant="outline"
                className="gap-2" 
                size="sm"
              >
                <Settings className="h-4 w-4" />
                Manage Skills
              </Button>
              <Button onClick={() => setShowAddModal(true)} className="gap-2 rounded-2xl" size="sm">
                <Plus className="h-4 w-4" />
                Add Team Member
              </Button>
            </div>
          </div>

          {/* Skills Filter Bar */}
          {allUniqueSkills.length > 0 ? (
            <div className="mx-4 mt-4 p-4 bg-white/60 backdrop-blur-xl border border-white/40 rounded-[2rem] flex flex-wrap gap-2 shadow-sm">
              {allUniqueSkills.map((skill) => {
                const isActive = activeSkillFilters.includes(skill)
                return (
                  <button
                    key={skill}
                    onClick={() => toggleSkillFilter(skill)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                      isActive
                        ? "bg-primary text-white border-primary shadow-primary/20 shadow-lg scale-105"
                        : "bg-white/50 text-slate-600 border-slate-200 hover:border-primary/40"
                    }`}
                  >
                    {skill}
                  </button>
                )
              })}
              {activeSkillFilters.length > 0 && (
                <button
                  onClick={clearSkillFilters}
                  className="text-xs text-slate-400 underline hover:text-slate-600 transition-colors ml-auto self-center"
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : null}

          <div className="p-6 pt-4 space-y-6 px-4">

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] p-6 space-y-3 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-14 rounded-full" />
                    </div>
                    <div className="pt-2 border-t border-white/30 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <div className="flex gap-4 pt-1">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTeamMembers.length === 0 ? (
              <div className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] p-12 text-center shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {teamMembers.length === 0 
                      ? "No team members yet" 
                      : activeSkillFilters.length > 0
                      ? "No members with these skills"
                      : "No matching team members"}
                  </h3>
                  <p className="text-muted-foreground">
                    {teamMembers.length === 0 
                      ? "Get started by adding your first team member to the system."
                      : activeSkillFilters.length > 0
                      ? "Try adjusting the skill filters to see more results."
                      : "Try adjusting your search criteria."}
                  </p>
                  {teamMembers.length === 0 ? (
                    <Button className="gap-2 mt-4" onClick={() => setShowAddModal(true)}>
                      <Plus className="h-4 w-4" />
                      Add First Team Member
                    </Button>
                  ) : activeSkillFilters.length > 0 ? (
                    <Button 
                      variant="outline" 
                      className="gap-2 mt-4 rounded-2xl border-white/40 bg-white/50" 
                      onClick={clearSkillFilters}
                    >
                      Reset Filters
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeamMembers.map((member) => (
                  <div
                    key={member.id}
                    onClick={() => handleMemberClick(member)}
                    className="bg-white/70 backdrop-blur-xl border border-white/40 rounded-[2rem] p-6 hover:shadow-xl hover:scale-[1.02] hover:border-white/20 transition-all duration-300 ease-in-out cursor-pointer space-y-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]"
                  >
                    <div className="flex flex-wrap gap-2">
                      {member.skills.length > 0 ? (
                        member.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1.5 bg-white rounded-full text-slate-700 font-medium shadow-md border border-white/60 text-xs"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No skills assigned</span>
                      )}
                    </div>

                    <div className="pt-2 border-t border-border/50">
                      <p className="font-semibold text-foreground text-sm">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                      {member.role && (
                        <p className="text-xs text-muted-foreground mt-1">{member.role}</p>
                      )}
                    </div>

                    <div className="flex gap-4 text-xs pt-1">
                      <div>
                        <span className="text-muted-foreground">Active:</span>
                        <span className="font-semibold text-foreground ml-1">{member.activeOpportunities}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Completed:</span>
                        <span className="font-semibold text-foreground ml-1">{member.completedOpportunities}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>

      <MemberForm
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSubmit={handleCreateMember}
        availableSkills={availableSkills}
      />

      {selectedMember && (
        <MemberForm
          open={!!selectedMember}
          onOpenChange={handleCloseEditModal}
          onSubmit={handleUpdateMember}
          availableSkills={availableSkills}
          memberId={selectedMember.id}
          initialData={{
            name: selectedMember.name,
            email: selectedMember.email,
            role: selectedMember.role as "Sales" | "Tech" | "Admin",
            skillIds: availableSkills
              .filter(skill => selectedMember.skills.includes(skill.name))
              .map(skill => skill.id),
          }}
        />
      )}

      <SkillsManagementModal
        open={showSkillsModal}
        onOpenChange={setShowSkillsModal}
        onSkillsUpdated={handleSkillsUpdated}
      />
    </div>
  )
}
