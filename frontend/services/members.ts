import { supabase } from '@/lib/supabase'

export interface TeamMember {
  id: string
  name: string
  email: string
  role?: string
  skills: string[] // Skill names for display
  skillIds: string[] // Skill IDs for matching
  activeOpportunities: number
  completedOpportunities: number
}

/**
 * Gets all team members from the database with their skills
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("Profiles")
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return []
    }

    // Get all skills associated with users
    const profileIds = profiles.map(p => p.id)
    
    // Try to get skills from the user_skills table
    const { data: userSkills, error: userSkillsError } = await supabase
      .from('user_skills')
      .select(`
        user_id,
        skill:skill_id (
          id,
          name
        )
      `)
      .in('user_id', profileIds)

    // Create maps of skill names and IDs per user
    const skillsMap: Record<string, string[]> = {}
    const skillIdsMap: Record<string, string[]> = {}
    
    if (!userSkillsError && userSkills && userSkills.length > 0) {
      userSkills.forEach((us: any) => {
        if (us.skill && us.user_id) {
          if (!skillsMap[us.user_id]) {
            skillsMap[us.user_id] = []
            skillIdsMap[us.user_id] = []
          }
          skillsMap[us.user_id].push(us.skill.name)
          skillIdsMap[us.user_id].push(us.skill.id)
        }
      })
    }

    // Get opportunity statistics for each member
    const { data: opportunities, error: oppError } = await supabase
      .from("Opportunities")
      .select('id, assigned_user_id, status')
      .in('assigned_user_id', profileIds)

    // Calculate active and completed opportunities per user
    const activeOppsMap: Record<string, number> = {}
    const completedOppsMap: Record<string, number> = {}

    if (!oppError && opportunities) {
      opportunities.forEach((opp: any) => {
        if (opp.assigned_user_id) {
          if (opp.status === 'assigned' || opp.status === 'Assigned') {
            activeOppsMap[opp.assigned_user_id] = (activeOppsMap[opp.assigned_user_id] || 0) + 1
          } else if (opp.status === 'done' || opp.status === 'Done') {
            completedOppsMap[opp.assigned_user_id] = (completedOppsMap[opp.assigned_user_id] || 0) + 1
          }
        }
      })
    }

    // Transform data to the format expected by the frontend
    const teamMembers: TeamMember[] = profiles.map((profile: any) => ({
      id: profile.id,
      name: profile.full_name || 'Unknown',
      email: profile.email || '',
      role: profile.role || undefined,
      skills: skillsMap[profile.id] || [],
      skillIds: skillIdsMap[profile.id] || [],
      activeOpportunities: activeOppsMap[profile.id] || 0,
      completedOpportunities: completedOppsMap[profile.id] || 0,
    }))

    return teamMembers
  } catch (error) {
    console.error('Error in getTeamMembers:', error)
    throw error
  }
}

/**
 * Gets the total count of team members
 */
export async function getTeamMembersCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("Profiles")
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error fetching count:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getTeamMembersCount:', error)
    throw error
  }
}

/**
 * Calculates the percentage of team members without assigned opportunities
 */
export async function getTeamAvailabilityPercentage(): Promise<number> {
  try {
    // Get all team members
    const { data: allMembers, error: membersError } = await supabase
      .from("Profiles")
      .select('id')

    if (membersError) {
      console.error('Error fetching team members:', membersError)
      throw membersError
    }

    if (!allMembers || allMembers.length === 0) {
      return 100 // If no members, consider 100% available
    }

    // Get all members with assigned opportunities (status 'new' or 'assigned')
    const { data: opportunities, error: oppError } = await supabase
      .from("Opportunities")
      .select('assigned_user_id')
      .in('status', ['new', 'assigned'])
      .not('assigned_user_id', 'is', null)

    if (oppError) {
      console.error('Error fetching opportunities:', oppError)
      throw oppError
    }

    // Get unique member IDs with assigned opportunities
    const assignedMemberIds = new Set(
      (opportunities || [])
        .map(opp => opp.assigned_user_id)
        .filter((id): id is string => id !== null)
    )

    // Calculate percentage
    const totalMembers = allMembers.length
    const availableMembers = totalMembers - assignedMemberIds.size
    const percentage = totalMembers > 0 ? Math.round((availableMembers / totalMembers) * 100) : 100

    return percentage
  } catch (error) {
    console.error('Error in getTeamAvailabilityPercentage:', error)
    return 0
  }
}

/**
 * Creates a new team member
 * @param memberData - Member data to create
 * @returns The created member
 */
export async function createTeamMember(memberData: {
  name: string
  email: string
  role: "Sales" | "Tech" | "Admin"
  skillIds: string[]
}): Promise<TeamMember> {
  try {
    // Validate and trim data before sending
    const trimmedName = memberData.name?.trim() || ''
    const trimmedEmail = memberData.email?.trim() || ''
    
    // Validate required fields after trimming
    if (!trimmedName) {
      throw new Error('Name is required and cannot be empty')
    }
    
    if (!trimmedEmail) {
      throw new Error('Email is required and cannot be empty')
    }
    
    if (!memberData.role) {
      throw new Error('Role is required')
    }

    // Validate that skillIds is an array
    if (!Array.isArray(memberData.skillIds)) {
      throw new Error('skillIds must be an array')
    }

    // Call the Next.js API route
    let response: Response
    try {
      response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          role: memberData.role,
          skillIds: memberData.skillIds || [],
        }),
      })
    } catch (fetchError: any) {
      // Handle network errors (TypeError: fetch failed)
      console.error('Network error in createTeamMember:', fetchError)
      throw new Error(`Failed to connect to server: ${fetchError.message || 'Network error'}`)
    }

    if (!response.ok) {
      // Check if response has JSON content-type before parsing
      const contentType = response.headers.get('content-type')
      let errorMessage = `Server error: ${response.status} ${response.statusText}`
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          // If JSON parsing fails, use status text
          console.error('Error parsing error response as JSON:', jsonError)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
      }
      
      throw new Error(errorMessage)
    }

    // Verify response is JSON before parsing
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but received: ${contentType || 'unknown content type'}`)
    }

    const result = await response.json()

    // Get skills for the newly created member
    const { data: userSkills, error: skillsError } = await supabase
      .from('user_skills')
      .select(`
        skill:skill_id (
          id,
          name
        )
      `)
      .eq('user_id', result.id)

    const skills: string[] = []
    const skillIds: string[] = []
    if (!skillsError && userSkills) {
      userSkills.forEach((us: any) => {
        if (us.skill) {
          skills.push(us.skill.name)
          skillIds.push(us.skill.id)
        }
      })
    }

    // Return in the format expected by the frontend
    return {
      id: result.id,
      name: result.full_name,
      email: result.email,
      role: result.role,
      skills: skills,
      skillIds: skillIds,
      activeOpportunities: 0,
      completedOpportunities: 0,
    }
  } catch (error: any) {
    console.error('Error in createTeamMember:', error)
    throw error
  }
}

/**
 * Updates an existing team member
 * @param memberId - ID of the member to update
 * @param memberData - Updated member data
 * @returns The updated member
 */
export async function updateTeamMember(
  memberId: string,
  memberData: {
    name: string
    email: string
    role: "Sales" | "Tech" | "Admin"
    skillIds: string[]
  }
): Promise<TeamMember> {
  try {
    // Validate and trim data before sending
    const trimmedName = memberData.name?.trim() || ''
    const trimmedEmail = memberData.email?.trim() || ''
    
    // Validate required fields after trimming
    if (!trimmedName) {
      throw new Error('Name is required and cannot be empty')
    }
    
    if (!trimmedEmail) {
      throw new Error('Email is required and cannot be empty')
    }
    
    if (!memberData.role) {
      throw new Error('Role is required')
    }

    // Validate that skillIds is an array
    if (!Array.isArray(memberData.skillIds)) {
      throw new Error('skillIds must be an array')
    }

    // Validate memberId
    if (!memberId || memberId.trim() === '') {
      throw new Error('Member ID is required')
    }

    // Call the Next.js API route
    let response: Response
    try {
      response = await fetch('/api/members', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: memberId,
          name: trimmedName,
          email: trimmedEmail,
          role: memberData.role,
          skillIds: memberData.skillIds || [],
        }),
      })
    } catch (fetchError: any) {
      // Handle network errors (TypeError: fetch failed)
      console.error('Network error in updateTeamMember:', fetchError)
      throw new Error(`Failed to connect to server: ${fetchError.message || 'Network error'}`)
    }

    if (!response.ok) {
      // Check if response has JSON content-type before parsing
      const contentType = response.headers.get('content-type')
      let errorMessage = `Server error: ${response.status} ${response.statusText}`
      
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorData = await response.json()
          errorMessage = errorData.error || errorMessage
        } catch (jsonError) {
          // If JSON parsing fails, use status text
          console.error('Error parsing error response as JSON:', jsonError)
          errorMessage = `Server error: ${response.status} ${response.statusText}`
        }
      }
      
      throw new Error(errorMessage)
    }

    // Verify response is JSON before parsing
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected JSON response but received: ${contentType || 'unknown content type'}`)
    }

    const result = await response.json()

    // Get skills for the updated member
    const { data: userSkills, error: skillsError } = await supabase
      .from('user_skills')
      .select(`
        skill:skill_id (
          id,
          name
        )
      `)
      .eq('user_id', result.id)

    const skills: string[] = []
    const skillIds: string[] = []
    if (!skillsError && userSkills) {
      userSkills.forEach((us: any) => {
        if (us.skill) {
          skills.push(us.skill.name)
          skillIds.push(us.skill.id)
        }
      })
    }

    // Return in the format expected by the frontend
    return {
      id: result.id,
      name: result.full_name,
      email: result.email,
      role: result.role,
      skills: skills,
      skillIds: skillIds,
      activeOpportunities: 0, // These will be recalculated when the list is refreshed
      completedOpportunities: 0,
    }
  } catch (error: any) {
    console.error('Error in updateTeamMember:', error)
    throw error
  }
}

