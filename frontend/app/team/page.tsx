"use client"

import { useState, useEffect } from "react"
import Sidebar from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Plus, Menu } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { getTeamMembers, type TeamMember } from "@/services/members"
import AddTeamMemberModal from "@/components/add-team-member-modal"
import { toast } from "sonner"
import { useSidebarState } from "@/hooks/use-sidebar-state"

export default function TeamPage() {
  const { isOpen: sidebarOpen, toggle: toggleSidebar } = useSidebarState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Cargar miembros del equipo desde Supabase
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

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar open={sidebarOpen} />
      <div className="flex flex-col flex-1">
        <main className="flex-1 overflow-auto">
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="text-foreground hover:bg-secondary"
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Team Members</h1>
                  <p className="text-muted-foreground text-sm">Manage your team and their skills</p>
                </div>
              </div>
              <Button onClick={() => setShowAddModal(true)} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Team Member
              </Button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-card border border-border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-16 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-14 rounded-full" />
                    </div>
                    <div className="pt-2 border-t border-border/50 space-y-2">
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
            ) : teamMembers.length === 0 ? (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <div className="max-w-md mx-auto space-y-4">
                  <div className="text-6xl mb-4">👥</div>
                  <h3 className="text-xl font-semibold text-foreground">No team members yet</h3>
                  <p className="text-muted-foreground">
                    Get started by adding your first team member to the system.
                  </p>
                  <Button className="gap-2 mt-4" onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4" />
                    Add First Team Member
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow space-y-3"
                  >
                    <div className="flex flex-wrap gap-2">
                      {member.skills.length > 0 ? (
                        member.skills.map((skill) => (
                          <Badge
                            key={skill}
                            variant="default"
                            className="px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold"
                          >
                            {skill}
                          </Badge>
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

      {showAddModal && (
        <AddTeamMemberModal
          onClose={() => setShowAddModal(false)}
          onAdd={(newMember) => {
            setTeamMembers([...teamMembers, newMember])
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}
