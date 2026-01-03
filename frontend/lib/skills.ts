export const SKILLS = [
  "React",
  "TypeScript",
  "Python",
  "DevOps",
  "Design",
  "Product",
  "Sales",
  "Legal",
  "Backend",
] as const
export type Skill = (typeof SKILLS)[number]
