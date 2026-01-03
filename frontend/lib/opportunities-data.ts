export interface Opportunity {
  id: string
  clientName: string
  company: string
  summary: string
  requiredSkill: string | string[]
  assignee: string
  status: "new" | "assigned" | "done"
  urgency: "high" | "medium" | "low"
  aiSummary: string
  createdDate: string
}

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "1",
    clientName: "John Smith",
    company: "TechCorp Inc",
    summary: "E-commerce platform with payment integration needed",
    requiredSkill: ["React", "TypeScript"],
    assignee: "",
    status: "new",
    urgency: "high",
    aiSummary:
      "Enterprise client seeking a custom e-commerce solution with stripe payment integration and inventory management",
    createdDate: "2024-01-15",
  },
  {
    id: "2",
    clientName: "Emma Watson",
    company: "CloudBase Ltd",
    summary: "Dashboard redesign for SaaS analytics platform",
    requiredSkill: ["React", "Design"],
    assignee: "Alex Rodriguez",
    status: "assigned",
    urgency: "medium",
    aiSummary: "Mid-market SaaS company needs modern dashboard redesign with real-time data visualization",
    createdDate: "2024-01-14",
  },
  {
    id: "3",
    clientName: "David Lee",
    company: "InnovateLabs",
    summary: "Backend API development for mobile app",
    requiredSkill: ["Python", "DevOps"],
    assignee: "Sarah Chen",
    status: "done",
    urgency: "high",
    aiSummary: "Startup completed backend API implementation with microservices architecture",
    createdDate: "2024-01-13",
  },
]
