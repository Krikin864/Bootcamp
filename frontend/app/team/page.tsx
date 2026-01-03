"use client"

import { useState } from "react"
import Sidebar from "@/components/sidebar"
import { Button } from "@/components/ui/button"
import { Plus, Menu } from "lucide-react"
import { TEAM_MEMBERS } from "@/lib/team-data"
import AddTeamMemberModal from "@/components/add-team-member-modal"

export default function TeamPage() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [teamMembers, setTeamMembers] = useState(TEAM_MEMBERS)

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
                  onClick={() => setSidebarOpen(!sidebarOpen)}
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow space-y-3"
                >
                  <div className="flex flex-wrap gap-2">
                    {member.skills.map((skill) => (
                      <span
                        key={skill}
                        className="px-2.5 py-1 bg-primary text-primary-foreground rounded-full text-xs font-semibold"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-border/50">
                    <p className="font-semibold text-foreground text-sm">{member.name}</p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
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
