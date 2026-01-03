export interface TeamMember {
  id: string
  name: string
  email: string
  skills: string[]
  activeOpportunities: number
  completedOpportunities: number
}

export const TEAM_MEMBERS: TeamMember[] = [
  {
    id: "1",
    name: "Alex Rodriguez",
    email: "alex@linkops.com",
    skills: ["React", "TypeScript", "Node.js"],
    activeOpportunities: 3,
    completedOpportunities: 12,
  },
  {
    id: "2",
    name: "Sarah Chen",
    email: "sarah@linkops.com",
    skills: ["Python", "Django", "PostgreSQL"],
    activeOpportunities: 2,
    completedOpportunities: 8,
  },
  {
    id: "3",
    name: "Mike Davis",
    email: "mike@linkops.com",
    skills: ["React", "Vue.js", "Tailwind CSS"],
    activeOpportunities: 4,
    completedOpportunities: 15,
  },
]
