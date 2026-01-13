import { supabase } from '@/lib/supabase'

export interface OpportunityFromDB {
  id: string
  client_id: string
  assigned_user_id: string | null
  status: string
  original_message: string
  ai_summary: string
  urgency: string
  created_at: string
  client: {
    name: string
    company: string
  } | null
  assigned_user: {
    full_name: string
  } | null
  skills: {
    id: string
    name: string
  }[]
}

export interface Opportunity {
  id: string
  clientName: string
  company: string
  summary: string
  requiredSkill: string | string[]
  requiredSkillId: string | null // ID of the required skill
  assignee: string
  assigneeId: string | null // ID of the assigned user
  status: "new" | "assigned" | "done" | "cancelled" | "archived"
  urgency: "high" | "medium" | "low"
  aiSummary: string
  createdDate: string
  created_at: string // ISO timestamp from database
}

/**
 * Gets all opportunities from the database with their relations
 */
export async function getOpportunities(): Promise<Opportunity[]> {
  try {
    // Get opportunities with JOINs to Clients and Profiles
    // Note: Supabase relation syntax depends on how foreign keys are configured
    // We try the standard syntax first, if it fails, we'll do separate queries
    const { data: opportunities, error: opportunitiesError } = await supabase
      .from("Opportunities")
      .select(`
        id,
        client_id,
        assigned_user_id,
        status,
        original_message,
        ai_summary,
        urgency,
        created_at,
        Clients!client_id (
          name,
          company
        ),
        Profiles!assigned_user_id (
          full_name
        )
      `)
      .order('created_at', { ascending: false })

    // If there's an error with relation syntax, try without JOINs and do separate queries
    let opportunitiesData = opportunities
    if (opportunitiesError) {
      console.warn('Error with relation syntax, trying separate queries:', opportunitiesError.message)
      
      // Query without relations
      const { data: oppsWithoutRelations, error: simpleError } = await supabase
        .from("Opportunities")
        .select('id, client_id, assigned_user_id, status, original_message, ai_summary, urgency, created_at')
        .order('created_at', { ascending: false })

      if (simpleError) {
        console.error('Error fetching opportunities:', simpleError)
        throw simpleError
      }

      opportunitiesData = oppsWithoutRelations || []

      // Get clients and profiles separately
      if (opportunitiesData.length > 0) {
        const clientIds = [...new Set(opportunitiesData.map((opp: any) => opp.client_id).filter(Boolean))]
        const userIds = [...new Set(opportunitiesData.map((opp: any) => opp.assigned_user_id).filter(Boolean))]

        const [clientsResult, profilesResult] = await Promise.all([
          clientIds.length > 0 ? supabase.from("Clients").select('id, name, company').in('id', clientIds) : { data: [], error: null },
          userIds.length > 0 ? supabase.from("Profiles").select('id, full_name').in('id', userIds) : { data: [], error: null }
        ])

        const clientsMap = new Map((clientsResult.data || []).map((c: any) => [c.id, c]))
        const profilesMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p]))

        // Add related data
        opportunitiesData = opportunitiesData.map((opp: any) => ({
          ...opp,
          Clients: clientsMap.get(opp.client_id) || null,
          Profiles: profilesMap.get(opp.assigned_user_id) || null
        }))
      }
    }

    if (!opportunitiesData || opportunitiesData.length === 0) {
      return []
    }

    // Get skills for each opportunity
    // First, try to get skills from a relation table
    // If it doesn't exist, we'll use required_skill_id directly
    const opportunityIds = opportunitiesData.map((opp: any) => opp.id)
    
    // Try to get skills from a relation table (if it exists)
    // For now, we assume there's an opportunity_skills table or similar
    // If it doesn't exist, we'll use required_skill_id directly
    const { data: opportunitySkills, error: skillsError } = await supabase
      .from('opportunity_skills')
      .select(`
        opportunity_id,
        skill:skill_id (
          id,
          name
        )
      `)
      .in('opportunity_id', opportunityIds)

    // If there's no relation table, try to get skills directly from required_skill_id
    let skillsMap: Record<string, { id: string; name: string }[]> = {}
    
    if (skillsError || !opportunitySkills || opportunitySkills.length === 0) {
      // Try to get skills from the required_skill_id field
      const { data: opportunitiesWithSkillId } = await supabase
        .from("Opportunities")
        .select('id, required_skill_id')
        .in('id', opportunityIds)

      if (opportunitiesWithSkillId) {
        const skillIds = opportunitiesWithSkillId
          .map(opp => opp.required_skill_id)
          .filter((id): id is string => id !== null)

        if (skillIds.length > 0) {
          const { data: skills } = await supabase
            .from("Skills")
            .select('id, name')
            .in('id', skillIds)

          if (skills) {
            // Create a map of skills per opportunity
            opportunitiesWithSkillId.forEach(opp => {
              if (opp.required_skill_id) {
                const skill = skills.find(s => s.id === opp.required_skill_id)
                if (skill) {
                  if (!skillsMap[opp.id]) {
                    skillsMap[opp.id] = []
                  }
                  skillsMap[opp.id].push(skill)
                }
              }
            })
          }
        }
      }
    } else {
      // Map skills from the relation table
      opportunitySkills.forEach((os: any) => {
        if (os.skill) {
          if (!skillsMap[os.opportunity_id]) {
            skillsMap[os.opportunity_id] = []
          }
          skillsMap[os.opportunity_id].push(os.skill)
        }
      })
    }

    // Transform data to the format expected by the frontend
    const transformedOpportunities: Opportunity[] = opportunitiesData.map((opp: any) => {
      const skills = skillsMap[opp.id] || []
      const skillNames = skills.map((s: any) => s.name)
      
      // Handle both relation syntax and non-relation syntax
      const client = opp.Clients || opp.client || null
      const assignedUser = opp.Profiles || opp.assigned_user || null
      
      // Determine initial status
      let status = (opp.status?.toLowerCase() || 'new') as "new" | "assigned" | "done" | "cancelled" | "archived"
      
      // Cleanup logic: If there's an assigned member but status is 'new', change to 'assigned'
      // This fixes inconsistencies in the DB data
      const hasAssignedUser = opp.assigned_user_id !== null && opp.assigned_user_id !== undefined
      if (hasAssignedUser && status === 'new') {
        status = 'assigned'
      }
      
      return {
        id: opp.id,
        clientName: client?.name || 'Unknown Client',
        company: client?.company || 'Unknown Company',
        summary: opp.original_message || '',
        requiredSkill: skillNames.length > 0 ? (skillNames.length === 1 ? skillNames[0] : skillNames) : [],
        requiredSkillId: opp.required_skill_id || null,
        assignee: assignedUser?.full_name || '',
        assigneeId: opp.assigned_user_id || null,
        status: status,
        urgency: (opp.urgency?.toLowerCase() || 'medium') as "high" | "medium" | "low",
        aiSummary: opp.ai_summary || '',
        createdDate: new Date(opp.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        }),
        created_at: opp.created_at // Include raw timestamp for filtering
      }
    })

    return transformedOpportunities
  } catch (error) {
    console.error('Error in getOpportunities:', error)
    throw error
  }
}

/**
 * Updates the status of an opportunity in the database
 * @param id - Opportunity ID
 * @param newStatus - New status: "new", "assigned", "done", "cancelled", or "archived"
 * @returns The updated opportunity or null if there's an error
 */
export async function updateOpportunityStatus(
  id: string,
  newStatus: "new" | "assigned" | "done" | "cancelled" | "archived"
): Promise<Opportunity | null> {
  try {
    const { data, error } = await supabase
      .from("Opportunities")
      .update({ status: newStatus })
      .eq('id', id)
      .select(`
        id,
        client_id,
        assigned_user_id,
        status,
        original_message,
        ai_summary,
        urgency,
        created_at,
        Clients!client_id (
          name,
          company
        ),
        Profiles!assigned_user_id (
          full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error fetching count:', error)
      throw error
    }

    if (!data) {
      return null
    }

    // Obtener skills para esta oportunidad
    const { data: opportunitiesWithSkillId } = await supabase
      .from("Opportunities")
      .select('id, required_skill_id')
      .eq('id', id)

    let skills: { id: string; name: string }[] = []
    if (opportunitiesWithSkillId && opportunitiesWithSkillId[0]?.required_skill_id) {
      const { data: skillData } = await supabase
        .from('Skills')
        .select('id, name')
        .eq('id', opportunitiesWithSkillId[0].required_skill_id)

      if (skillData && skillData.length > 0) {
        skills = skillData
      }
    }

    // Try also from relation table
    if (skills.length === 0) {
      const { data: opportunitySkills } = await supabase
        .from('opportunity_skills')
        .select(`
          skill:skill_id (
            id,
            name
          )
        `)
        .eq('opportunity_id', id)

      if (opportunitySkills && opportunitySkills.length > 0) {
        skills = opportunitySkills.map((os: any) => os.skill).filter(Boolean)
      }
    }

    const skillNames = skills.map(s => s.name)
    const client = (data as any).Clients || (data as any).client || null
    const assignedUser = (data as any).Profiles || (data as any).assigned_user || null

    return {
      id: data.id,
      clientName: client?.name || 'Unknown Client',
      company: client?.company || 'Unknown Company',
      summary: data.original_message || '',
      requiredSkill: skillNames.length > 0 ? (skillNames.length === 1 ? skillNames[0] : skillNames) : [],
      requiredSkillId: data.required_skill_id || null,
      assignee: assignedUser?.full_name || '',
      assigneeId: data.assigned_user_id || null,
      status: (data.status?.toLowerCase() || 'new') as "new" | "assigned" | "done" | "cancelled" | "archived",
      urgency: (data.urgency?.toLowerCase() || 'medium') as "high" | "medium" | "low",
      aiSummary: data.ai_summary || '',
      createdDate: new Date(data.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      created_at: data.created_at
    }
  } catch (error) {
    console.error('Error in updateOpportunityStatus:', error)
    throw error
  }
}

/**
 * Gets the total count of opportunities
 */
export async function getTotalOpportunitiesCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("Opportunities")
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error fetching count:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getTotalOpportunitiesCount:', error)
    throw error
  }
}

/**
 * Updates the assignment of an opportunity (assigned_user_id and status)
 * @param id - Opportunity ID
 * @param assignedUserId - Assigned user ID (UUID from Profiles)
 * @returns The updated opportunity or null if there's an error
 */
export async function updateOpportunityAssignment(
  id: string,
  assignedUserId: string
): Promise<Opportunity | null> {
  try {
    // Validate that the ID is not empty
    if (!id || id.trim() === '') {
      throw new Error('Opportunity ID is required')
    }

    // Validate that assignedUserId is not empty
    if (!assignedUserId || assignedUserId.trim() === '') {
      throw new Error('Assigned user ID is required')
    }

    console.log(`[updateOpportunityAssignment] Updating opportunity:`, {
      opportunityId: id,
      assignedUserId,
      newStatus: 'assigned',
      table: 'Opportunities',
      columns: ['assigned_user_id', 'status'],
    })

    // Update assigned_user_id and status to 'assigned' in a single operation
    const { data, error } = await supabase
      .from("Opportunities")
      .update({ 
        assigned_user_id: assignedUserId,
        status: 'assigned'
      })
      .eq('id', id)
      .select(`
        id,
        client_id,
        assigned_user_id,
        status,
        original_message,
        ai_summary,
        urgency,
        created_at,
        Clients!client_id (
          name,
          company
        ),
        Profiles!assigned_user_id (
          full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error fetching count:', error)
      throw error
    }

    if (!data) {
      return null
    }

    // Obtener skills para esta oportunidad
    const { data: opportunitiesWithSkillId } = await supabase
      .from("Opportunities")
      .select('id, required_skill_id')
      .eq('id', id)

    let skills: { id: string; name: string }[] = []
    if (opportunitiesWithSkillId && opportunitiesWithSkillId[0]?.required_skill_id) {
      const { data: skillData } = await supabase
        .from('Skills')
        .select('id, name')
        .eq('id', opportunitiesWithSkillId[0].required_skill_id)

      if (skillData && skillData.length > 0) {
        skills = skillData
      }
    }

    // Try also from relation table
    if (skills.length === 0) {
      const { data: opportunitySkills } = await supabase
        .from('opportunity_skills')
        .select(`
          skill:skill_id (
            id,
            name
          )
        `)
        .eq('opportunity_id', id)

      if (opportunitySkills && opportunitySkills.length > 0) {
        skills = opportunitySkills.map((os: any) => os.skill).filter(Boolean)
      }
    }

    const skillNames = skills.map(s => s.name)
    const client = (data as any).Clients || (data as any).client || null
    const assignedUser = (data as any).Profiles || (data as any).assigned_user || null

    return {
      id: data.id,
      clientName: client?.name || 'Unknown Client',
      company: client?.company || 'Unknown Company',
      summary: data.original_message || '',
      requiredSkill: skillNames.length > 0 ? (skillNames.length === 1 ? skillNames[0] : skillNames) : [],
      requiredSkillId: data.required_skill_id || null,
      assignee: assignedUser?.full_name || '',
      assigneeId: data.assigned_user_id || null,
      status: (data.status?.toLowerCase() || 'new') as "new" | "assigned" | "done" | "cancelled" | "archived",
      urgency: (data.urgency?.toLowerCase() || 'medium') as "high" | "medium" | "low",
      aiSummary: data.ai_summary || '',
      createdDate: new Date(data.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      created_at: data.created_at
    }
  } catch (error: any) {
    console.error('Error completo:', error)
    throw error
  }
}

/**
 * Updates the details of an opportunity (ai_summary, urgency, required_skill_id)
 * @param id - Opportunity ID (UUID)
 * @param updates - Object with fields to update
 * @returns The updated opportunity or null if there's an error
 */
export async function updateOpportunityDetails(
  id: string,
  updates: {
    ai_summary?: string
    urgency?: string
    required_skill_id?: string | null
  }
): Promise<Opportunity | null> {
  try {
    // Validate that the ID is not empty
    if (!id || id.trim() === '') {
      throw new Error('Opportunity ID is required')
    }

    // Build update object only with provided fields
    const updateData: Record<string, any> = {}
    
    if (updates.ai_summary !== undefined) {
      updateData.ai_summary = updates.ai_summary
    }
    
    if (updates.urgency !== undefined) {
      // Normalize urgency to lowercase
      updateData.urgency = updates.urgency.toLowerCase()
    }
    
    if (updates.required_skill_id !== undefined) {
      // If it's null, set as null
      if (updates.required_skill_id === null) {
        updateData.required_skill_id = null
      } else if (updates.required_skill_id.trim() !== '') {
        // Validate that required_skill_id is a valid UUID (not a name like 'React')
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(updates.required_skill_id)) {
          throw new Error(`required_skill_id must be a valid UUID, not a name. Received value: ${updates.required_skill_id}`)
        }
        updateData.required_skill_id = updates.required_skill_id
      } else {
        updateData.required_skill_id = null
      }
    }

    console.log(`[updateOpportunityDetails] Updating opportunity:`, {
      opportunityId: id,
      updates: updateData,
    })

    const { data, error } = await supabase
      .from("Opportunities")
      .update(updateData)
      .eq('id', id)
      .select(`
        id,
        client_id,
        assigned_user_id,
        status,
        original_message,
        ai_summary,
        urgency,
        created_at,
        required_skill_id,
        Clients!client_id (
          name,
          company
        ),
        Profiles!assigned_user_id (
          full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error fetching count:', error)
      throw error
    }

    if (!data) {
      return null
    }

    // Get skills for this opportunity using UUID
    let skills: { id: string; name: string }[] = []
    
    if (data.required_skill_id) {
      const { data: skillData } = await supabase
        .from('Skills')
        .select('id, name')
        .eq('id', data.required_skill_id)

      if (skillData && skillData.length > 0) {
        skills = skillData
      }
    }

    // Try also from relation table
    if (skills.length === 0) {
      const { data: opportunitySkills } = await supabase
        .from('opportunity_skills')
        .select(`
          skill:skill_id (
            id,
            name
          )
        `)
        .eq('opportunity_id', id)

      if (opportunitySkills && opportunitySkills.length > 0) {
        skills = opportunitySkills.map((os: any) => os.skill).filter(Boolean)
      }
    }

    const skillNames = skills.map(s => s.name)
    const client = (data as any).Clients || (data as any).client || null
    const assignedUser = (data as any).Profiles || (data as any).assigned_user || null

    return {
      id: data.id,
      clientName: client?.name || 'Unknown Client',
      company: client?.company || 'Unknown Company',
      summary: data.original_message || '',
      requiredSkill: skillNames.length > 0 ? (skillNames.length === 1 ? skillNames[0] : skillNames) : [],
      requiredSkillId: data.required_skill_id || null,
      assignee: assignedUser?.full_name || '',
      assigneeId: data.assigned_user_id || null,
      status: (data.status?.toLowerCase() || 'new') as "new" | "assigned" | "done" | "cancelled" | "archived",
      urgency: (data.urgency?.toLowerCase() || 'medium') as "high" | "medium" | "low",
      aiSummary: data.ai_summary || '',
      createdDate: new Date(data.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  } catch (error: any) {
    console.error('Error completo:', error)
    throw error
  }
}

/**
 * Creates a new opportunity
 * @param clientId - Client ID (UUID)
 * @param originalMessage - Original client message
 * @param aiSummary - AI-generated summary
 * @param urgency - Urgency: "high", "medium", or "low"
 * @param requiredSkillId - Required skill ID (UUID) or null
 * @returns The created opportunity
 */
export async function createOpportunity(
  clientId: string,
  originalMessage: string,
  aiSummary: string,
  urgency: "high" | "medium" | "low" = "medium",
  requiredSkillId: string | null = null
): Promise<Opportunity> {
  try {
    // Validate that clientId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      throw new Error(`Invalid UUID format for client_id: ${clientId}`)
    }

    // Validate requiredSkillId if provided
    if (requiredSkillId && !uuidRegex.test(requiredSkillId)) {
      throw new Error(`Invalid UUID format for required_skill_id: ${requiredSkillId}`)
    }

    const { data, error } = await supabase
      .from("Opportunities")
      .insert({
        client_id: clientId,
        original_message: originalMessage.trim(),
        ai_summary: aiSummary.trim(),
        urgency: urgency.toLowerCase(),
        status: 'New',
        required_skill_id: requiredSkillId,
        created_at: new Date().toISOString(),
      })
      .select(`
        id,
        client_id,
        assigned_user_id,
        status,
        original_message,
        ai_summary,
        urgency,
        created_at,
        required_skill_id,
        Clients!client_id (
          name,
          company
        ),
        Profiles!assigned_user_id (
          full_name
        )
      `)
      .single()

    if (error) {
      console.error('Error fetching count:', error)
      throw error
    }

    if (!data) {
      throw new Error('Failed to create opportunity')
    }

    // Get skills for this opportunity
    let skills: { id: string; name: string }[] = []
    
    if (data.required_skill_id) {
      const { data: skillData } = await supabase
        .from("Skills")
        .select('id, name')
        .eq('id', data.required_skill_id)

      if (skillData && skillData.length > 0) {
        skills = skillData
      }
    }

    const skillNames = skills.map(s => s.name)
    const client = (data as any).Clients || (data as any).client || null
    const assignedUser = (data as any).Profiles || (data as any).assigned_user || null

    return {
      id: data.id,
      clientName: client?.name || 'Unknown Client',
      company: client?.company || 'Unknown Company',
      summary: data.original_message || '',
      requiredSkill: skillNames.length > 0 ? (skillNames.length === 1 ? skillNames[0] : skillNames) : [],
      requiredSkillId: data.required_skill_id || null,
      assignee: assignedUser?.full_name || '',
      assigneeId: data.assigned_user_id || null,
      status: (data.status?.toLowerCase() || 'new') as "new" | "assigned" | "done" | "cancelled" | "archived",
      urgency: (data.urgency?.toLowerCase() || 'medium') as "high" | "medium" | "low",
      aiSummary: data.ai_summary || '',
      createdDate: new Date(data.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      created_at: data.created_at
    }
  } catch (error: any) {
    console.error('Error completo:', error)
    throw error
  }
}

/**
 * Gets the count of active opportunities (status = 'assigned')
 */
export async function getActiveOpportunitiesCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("Opportunities")
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned')

    if (error) {
      console.error('Error fetching count:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getActiveOpportunitiesCount:', error)
    throw error
  }
}

/**
 * Gets the count of opportunities with 'new' status (pending action)
 * @param startDate - Optional start date filter (ISO string or Date)
 * @param endDate - Optional end date filter (ISO string or Date)
 */
export async function getPendingActionCount(
  startDate?: string | Date,
  endDate?: string | Date
): Promise<number> {
  try {
    let query = supabase
      .from("Opportunities")
      .select('*', { count: 'exact', head: true })
      .eq('status', 'new')

    // Apply date filters if provided
    if (startDate) {
      const start = typeof startDate === 'string' ? startDate : startDate.toISOString()
      const startDateObj = new Date(start)
      startDateObj.setHours(0, 0, 0, 0)
      query = query.gte('created_at', startDateObj.toISOString())
    }

    if (endDate) {
      const end = typeof endDate === 'string' ? endDate : endDate.toISOString()
      const endDateObj = new Date(end)
      endDateObj.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDateObj.toISOString())
    }

    const { count, error } = await query

    if (error) {
      console.error('Error fetching pending action count:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getPendingActionCount:', error)
    throw error
  }
}

/**
 * Gets the count of high priority opportunities that can appear in the kanban board
 * Specifically counts opportunities with urgency === 'high', status === 'new', and unassigned (assigned_user_id IS NULL)
 * @returns The count of high priority, new, and unassigned opportunities
 */
export async function getHighPriorityCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("Opportunities")
      .select('*', { count: 'exact', head: true })
      .eq('urgency', 'high')
      .eq('status', 'new')
      .is('assigned_user_id', null)

    if (error) {
      console.error('Error fetching high priority count:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getHighPriorityCount:', error)
    throw error
  }
}

/**
 * Gets the most frequent skill in open opportunities (status 'new' or 'assigned')
 */
export async function getTopNeededSkill(): Promise<string> {
  try {
    // Get all open opportunities (new or assigned)
    const { data: opportunities, error } = await supabase
      .from("Opportunities")
      .select('required_skill_id')
      .in('status', ['new', 'assigned'])

    if (error) {
      console.error('Error fetching opportunities for top skill:', error)
      throw error
    }

    if (!opportunities || opportunities.length === 0) {
      return 'None'
    }

    // Count occurrences of each skill_id
    const skillCounts: Record<string, number> = {}
    opportunities.forEach((opp) => {
      if (opp.required_skill_id) {
        skillCounts[opp.required_skill_id] = (skillCounts[opp.required_skill_id] || 0) + 1
      }
    })

    if (Object.keys(skillCounts).length === 0) {
      return 'None'
    }

    // Find the most frequent skill_id
    const topSkillId = Object.entries(skillCounts).reduce((a, b) => 
      skillCounts[a[0]] > skillCounts[b[0]] ? a : b
    )[0]

    // Get the skill name
    const { data: skill, error: skillError } = await supabase
      .from('Skills')
      .select('name')
      .eq('id', topSkillId)
      .single()

    if (skillError || !skill) {
      console.error('Error fetching skill name:', skillError)
      return 'Unknown'
    }

    return skill.name
  } catch (error) {
    console.error('Error in getTopNeededSkill:', error)
    return 'Error'
  }
}

