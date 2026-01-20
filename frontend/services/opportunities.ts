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
  requiredSkillId: string | null // ID of the first required skill (for backward compatibility)
  requiredSkillIds: string[] // Array of all required skill IDs (for many-to-many matching)
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
    // Note: required_skill_id removed - skills are now in opportunity_skill table (many-to-many)
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
      
      // Query without relations (removed required_skill_id as it's now in opportunity_skill table)
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
    
    // Get skills from the opportunity_skill relation table (many-to-many)
    const { data: opportunitySkills, error: skillsError } = await supabase
      .from('opportunity_skill')
      .select(`
        opportunity_id,
        skill:skill_id (
          id,
          name
        )
      `)
      .in('opportunity_id', opportunityIds)

    // Map skills from the opportunity_skill relation table
    let skillsMap: Record<string, { id: string; name: string }[]> = {}
    
    if (skillsError) {
      console.warn('Error fetching skills from opportunity_skill:', skillsError)
      // If there's an error, skillsMap will remain empty
    } else if (opportunitySkills && opportunitySkills.length > 0) {
      // Map skills from the relation table
      opportunitySkills.forEach((os: any) => {
        if (os.skill && os.opportunity_id) {
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
      
      // Get requiredSkillId: use the first skill's ID from the relation table (required_skill_id no longer exists in Opportunities)
      const requiredSkillId = skills.length > 0 && skills[0]?.id ? skills[0].id : null
      
      // Debug: Log first opportunity to verify skills are loaded
      if (process.env.NODE_ENV === 'development' && opportunitiesData.indexOf(opp) === 0) {
        console.log('getOpportunities - First opportunity raw data:', {
          id: opp.id,
          allKeys: Object.keys(opp),
          skillsFromMap: skillsMap[opp.id],
          skillNames: skillNames,
          finalRequiredSkillId: requiredSkillId
        })
      }
      
      const skillIds = skills.map((s: any) => s.id)
      
      const transformed = {
        id: opp.id,
        clientName: client?.name || 'Unknown Client',
        company: client?.company || 'Unknown Company',
        summary: opp.original_message || '',
        requiredSkill: skillNames.length > 0 ? (skillNames.length === 1 ? skillNames[0] : skillNames) : [],
        requiredSkillId: requiredSkillId,
        requiredSkillIds: skillIds, // Array of all skill IDs for matching
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
      
      // Debug: Log first transformed opportunity
      if (process.env.NODE_ENV === 'development' && opportunitiesData.indexOf(opp) === 0) {
        console.log('getOpportunities - First opportunity transformed:', {
          id: transformed.id,
          requiredSkillId: transformed.requiredSkillId,
          requiredSkillId_type: typeof transformed.requiredSkillId,
          requiredSkill: transformed.requiredSkill
        })
      }
      
      return transformed
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

    // Get skills for this opportunity from opportunity_skill table (many-to-many)
    const { data: opportunitySkills, error: skillsError } = await supabase
      .from('opportunity_skill')
      .select(`
        skill:skill_id (
          id,
          name
        )
      `)
      .eq('opportunity_id', id)

    let skills: { id: string; name: string }[] = []
    if (!skillsError && opportunitySkills && opportunitySkills.length > 0) {
      skills = opportunitySkills.map((os: any) => os.skill).filter(Boolean)
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
      requiredSkillId: skills.length > 0 ? skills[0].id : null,
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

    // Get skills for this opportunity from opportunity_skill table (many-to-many)
    const { data: opportunitySkills, error: skillsError } = await supabase
      .from('opportunity_skill')
      .select(`
        skill:skill_id (
          id,
          name
        )
      `)
      .eq('opportunity_id', id)

    let skills: { id: string; name: string }[] = []
    if (!skillsError && opportunitySkills && opportunitySkills.length > 0) {
      skills = opportunitySkills.map((os: any) => os.skill).filter(Boolean)
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
      requiredSkillId: skills.length > 0 ? skills[0].id : null,
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
 * Updates the details of an opportunity (ai_summary, urgency, skills via opportunity_skill)
 * @param id - Opportunity ID (UUID)
 * @param updates - Object with fields to update
 * @param skillIds - Optional array of skill IDs to update (many-to-many relationship)
 * @returns The updated opportunity or null if there's an error
 */
export async function updateOpportunityDetails(
  id: string,
  updates: {
    ai_summary?: string
    urgency?: string
    assigned_user_id?: string | null
    original_message?: string
  },
  skillIds?: string[]
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
    
    if (updates.original_message !== undefined) {
      updateData.original_message = updates.original_message
    }
    
    // Note: required_skill_id is kept for backward compatibility but we use opportunity_skill for many-to-many
    // If skillIds is provided, update the opportunity_skill table
    if (skillIds !== undefined) {
      // Delete existing skill relationships
      const { error: deleteError } = await supabase
        .from('opportunity_skill')
        .delete()
        .eq('opportunity_id', id)

      if (deleteError) {
        console.error('Error deleting existing skill relationships:', deleteError)
        // Continue anyway - we'll try to insert new ones
      }

      // Insert new skill relationships
      if (skillIds.length > 0) {
        const opportunitySkillRecords = skillIds.map(skillId => ({
          opportunity_id: id,
          skill_id: skillId,
        }))

        const { error: insertError } = await supabase
          .from('opportunity_skill')
          .insert(opportunitySkillRecords)

        if (insertError) {
          console.error('Error creating skill relationships:', insertError)
          // Don't throw - opportunity update might still succeed
        }
      } else {
        // If no skills provided, try to find "Pending" skill
        const { data: pendingSkill, error: pendingError } = await supabase
          .from("Skills")
          .select('id, name')
          .eq('name', 'Pending')
          .single()

        if (!pendingError && pendingSkill) {
          const { error: insertError } = await supabase
            .from('opportunity_skill')
            .insert([{
              opportunity_id: id,
              skill_id: pendingSkill.id,
            }])

          if (insertError) {
            console.error('Error creating Pending skill relationship:', insertError)
          }
        }
      }
    }

    // Note: We no longer update required_skill_id in Opportunities table
    // All skills are managed through opportunity_skill table (many-to-many)
    
    if (updates.assigned_user_id !== undefined) {
      // If it's null, set as null (unassign)
      if (updates.assigned_user_id === null) {
        updateData.assigned_user_id = null
        // Automatically change status to 'new' when unassigning
        updateData.status = 'new'
      } else if (updates.assigned_user_id.trim() !== '') {
        // Validate that assigned_user_id is a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(updates.assigned_user_id)) {
          throw new Error(`assigned_user_id must be a valid UUID, not a name. Received value: ${updates.assigned_user_id}`)
        }
        updateData.assigned_user_id = updates.assigned_user_id
        // If assigning a user and status is 'new', change to 'assigned'
        // We'll get the current opportunity first to check its status
      } else {
        updateData.assigned_user_id = null
        // Automatically change status to 'new' when unassigning
        updateData.status = 'new'
      }
    }
    
    // If we're assigning a user, check if we need to update status
    if (updates.assigned_user_id !== undefined && updates.assigned_user_id !== null && updates.assigned_user_id.trim() !== '') {
      // Get current opportunity to check status
      const { data: currentOpp } = await supabase
        .from("Opportunities")
        .select('status')
        .eq('id', id)
        .single()
      
      // If status is 'new' and we're assigning a user, change to 'assigned'
      if (currentOpp && currentOpp.status?.toLowerCase() === 'new') {
        updateData.status = 'assigned'
      }
    }

    console.log(`[updateOpportunityDetails] Updating opportunity:`, {
      opportunityId: id,
      updates: updateData,
      skillIds: skillIds
    })

    // Only update if there are fields to update
    if (Object.keys(updateData).length === 0) {
      console.log('No fields to update, skipping database update')
    } else {
      const { data: updateResult, error: updateError } = await supabase
        .from("Opportunities")
        .update(updateData)
        .eq('id', id)
        .select()

      if (updateError) {
        console.error('Error updating opportunity:', updateError)
        console.error('Update details:', {
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          code: updateError.code,
          updateData: updateData
        })
        throw updateError
      }
    }

    // Fetch the updated opportunity with relations
    const { data, error } = await supabase
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
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching updated opportunity:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      throw error
    }

    if (!data) {
      return null
    }

    // Get skills for this opportunity from opportunity_skill table (many-to-many)
    const { data: opportunitySkills, error: skillsError } = await supabase
      .from('opportunity_skill')
      .select(`
        skill:skill_id (
          id,
          name
        )
      `)
      .eq('opportunity_id', id)

    let skills: { id: string; name: string }[] = []
    if (!skillsError && opportunitySkills && opportunitySkills.length > 0) {
      skills = opportunitySkills.map((os: any) => os.skill).filter(Boolean)
    }

    const skillNames = skills.map(s => s.name)
    const returnedSkillIds = skills.map(s => s.id)
    const client = (data as any).Clients || (data as any).client || null
    const assignedUser = (data as any).Profiles || (data as any).assigned_user || null

    return {
      id: data.id,
      clientName: client?.name || 'Unknown Client',
      company: client?.company || 'Unknown Company',
      summary: data.original_message || '',
      requiredSkill: skillNames.length > 0 ? (skillNames.length === 1 ? skillNames[0] : skillNames) : [],
      requiredSkillId: returnedSkillIds.length > 0 ? returnedSkillIds[0] : null,
      requiredSkillIds: returnedSkillIds, // Array of all skill IDs for matching
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
 * Creates a new opportunity with many-to-many skills relationship
 * @param clientId - Client ID (UUID)
 * @param originalMessage - Original client message
 * @param aiSummary - AI-generated summary
 * @param urgency - Urgency: "high", "medium", or "low"
 * @param skillIds - Array of skill IDs (UUIDs) to associate with the opportunity
 * @returns The created opportunity
 */
export async function createOpportunity(
  clientId: string,
  originalMessage: string,
  aiSummary: string,
  urgency: "high" | "medium" | "low" = "medium",
  skillIds: string[] = []
): Promise<Opportunity> {
  try {
    // Validate that clientId is a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      throw new Error(`Invalid UUID format for client_id: ${clientId}`)
    }

    // Validate all skillIds if provided
    if (skillIds.length > 0) {
      for (const skillId of skillIds) {
        if (!uuidRegex.test(skillId)) {
          throw new Error(`Invalid UUID format for skill_id: ${skillId}`)
        }
      }
    }

    // 1. Create the opportunity (without required_skill_id)
    const { data: opportunityData, error: opportunityError } = await supabase
      .from("Opportunities")
      .insert({
        client_id: clientId,
        original_message: originalMessage.trim(),
        ai_summary: aiSummary.trim(),
        urgency: urgency.toLowerCase(),
        status: 'New',
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
        Clients!client_id (
          name,
          company
        ),
        Profiles!assigned_user_id (
          full_name
        )
      `)
      .single()

    if (opportunityError) {
      console.error('Error creating opportunity:', opportunityError)
      throw opportunityError
    }

    if (!opportunityData) {
      throw new Error('Failed to create opportunity')
    }

    if (!opportunityData.id) {
      throw new Error('Opportunity created but ID is missing')
    }

    // Validate opportunity ID format
    if (!uuidRegex.test(opportunityData.id)) {
      throw new Error(`Invalid opportunity ID format: ${opportunityData.id}`)
    }

    // 2. Handle skills: if no skills provided, find "Pending" skill
    let finalSkillIds = skillIds
    
    if (finalSkillIds.length === 0) {
      // Find "Pending" skill in the database
      const { data: pendingSkill, error: pendingError } = await supabase
        .from("Skills")
        .select('id, name')
        .eq('name', 'Pending')
        .single()

      if (pendingError && pendingError.code !== 'PGRST116') {
        console.warn('Error finding Pending skill:', pendingError)
        // Continue without skills if Pending doesn't exist
      } else if (pendingSkill) {
        finalSkillIds = [pendingSkill.id]
      }
    }

    // 3. Create skill relationships in opportunity_skill table
    if (finalSkillIds.length > 0) {
      // Validate all skill IDs before inserting
      const validSkillIds = finalSkillIds.filter(skillId => {
        if (!uuidRegex.test(skillId)) {
          console.warn(`Invalid skill ID format: ${skillId}, skipping`)
          return false
        }
        return true
      })

      if (validSkillIds.length === 0) {
        console.warn('No valid skill IDs to insert')
      } else {
        const opportunitySkillRecords = validSkillIds.map(skillId => ({
          opportunity_id: opportunityData.id,
          skill_id: skillId,
        }))

        console.log('Attempting to insert skill relationships:', {
          opportunityId: opportunityData.id,
          skillIds: validSkillIds,
          records: opportunitySkillRecords
        })

        const { data: insertedRecords, error: skillRelationError } = await supabase
          .from('opportunity_skill')
          .insert(opportunitySkillRecords)
          .select()

        if (skillRelationError) {
          console.error('Error creating skill relationships:', skillRelationError)
          console.error('Error details:', {
            message: skillRelationError.message,
            details: skillRelationError.details,
            hint: skillRelationError.hint,
            code: skillRelationError.code,
            attemptedRecords: opportunitySkillRecords
          })
          // Don't throw - opportunity is already created, just log the error
          console.warn('Opportunity created but skill relationships failed')
        } else {
          console.log(`Successfully created ${insertedRecords?.length || 0} skill relationships`)
        }
      }
    }

    // 4. Get skills for this opportunity from opportunity_skill
    const { data: opportunitySkills, error: skillsError } = await supabase
      .from('opportunity_skill')
      .select(`
        skill:skill_id (
          id,
          name
        )
      `)
      .eq('opportunity_id', opportunityData.id)

    let skills: { id: string; name: string }[] = []
    if (!skillsError && opportunitySkills && opportunitySkills.length > 0) {
      skills = opportunitySkills
        .map((os: any) => os.skill)
        .filter(Boolean)
    }

    const skillNames = skills.map(s => s.name)
    const client = (opportunityData as any).Clients || (opportunityData as any).client || null
    const assignedUser = (opportunityData as any).Profiles || (opportunityData as any).assigned_user || null

    const returnedSkillIds = skills.map(s => s.id)
    
    return {
      id: opportunityData.id,
      clientName: client?.name || 'Unknown Client',
      company: client?.company || 'Unknown Company',
      summary: opportunityData.original_message || '',
      requiredSkill: skillNames.length > 0 ? (skillNames.length === 1 ? skillNames[0] : skillNames) : [],
      requiredSkillId: skills.length > 0 ? skills[0].id : null, // Keep for backward compatibility
      requiredSkillIds: returnedSkillIds, // Array of all skill IDs for matching
      assignee: assignedUser?.full_name || '',
      assigneeId: opportunityData.assigned_user_id || null,
      status: (opportunityData.status?.toLowerCase() || 'new') as "new" | "assigned" | "done" | "cancelled" | "archived",
      urgency: (opportunityData.urgency?.toLowerCase() || 'medium') as "high" | "medium" | "low",
      aiSummary: opportunityData.ai_summary || '',
      createdDate: new Date(opportunityData.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      created_at: opportunityData.created_at
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

    // Apply date filters if provided (using YYYY-MM-DD format to avoid timezone issues)
    if (startDate) {
      const start = typeof startDate === 'string' ? startDate : startDate.toISOString()
      const startDateStr = start.split('T')[0] // Extract YYYY-MM-DD
      const startDateObj = new Date(startDateStr + 'T00:00:00.000Z')
      query = query.gte('created_at', startDateObj.toISOString())
    }

    if (endDate) {
      const end = typeof endDate === 'string' ? endDate : endDate.toISOString()
      const endDateStr = end.split('T')[0] // Extract YYYY-MM-DD
      const endDateObj = new Date(endDateStr + 'T23:59:59.999Z')
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
 * Uses opportunity_skill table (many-to-many relationship)
 */
export async function getTopNeededSkill(): Promise<string> {
  try {
    // Get all open opportunities (new or assigned)
    const { data: opportunities, error: oppError } = await supabase
      .from("Opportunities")
      .select('id')
      .in('status', ['new', 'assigned', 'New', 'Assigned'])

    if (oppError) {
      console.error('Error fetching opportunities for top skill:', oppError)
      throw oppError
    }

    if (!opportunities || opportunities.length === 0) {
      return 'None'
    }

    const opportunityIds = opportunities.map(opp => opp.id)

    // Get skills from opportunity_skill table for open opportunities
    const { data: opportunitySkills, error: skillsError } = await supabase
      .from('opportunity_skill')
      .select(`
        opportunity_id,
        skill:skill_id (
          id,
          name
        )
      `)
      .in('opportunity_id', opportunityIds)

    if (skillsError) {
      console.error('Error fetching skills from opportunity_skill:', skillsError)
      throw skillsError
    }

    if (!opportunitySkills || opportunitySkills.length === 0) {
      return 'None'
    }

    // Count occurrences of each skill_id (excluding "Pending")
    const skillCounts: Record<string, { count: number; name: string }> = {}
    opportunitySkills.forEach((os: any) => {
      if (os.skill && os.skill.name && os.skill.name !== 'Pending') {
        const skillId = os.skill.id
        if (!skillCounts[skillId]) {
          skillCounts[skillId] = { count: 0, name: os.skill.name }
        }
        skillCounts[skillId].count += 1
      }
    })

    if (Object.keys(skillCounts).length === 0) {
      return 'None'
    }

    // Find the most frequent skill_id
    const topSkillEntry = Object.entries(skillCounts).reduce((a, b) => 
      (a[1] as { count: number; name: string }).count > (b[1] as { count: number; name: string }).count ? a : b
    )

    return (topSkillEntry[1] as { count: number; name: string }).name
  } catch (error) {
    console.error('Error in getTopNeededSkill:', error)
    return 'Error'
  }
}

/**
 * Deletes an opportunity from the database
 * @param id - Opportunity ID to delete
 * @returns true if successful, false otherwise
 */
export async function deleteOpportunity(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("Opportunities")
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting opportunity:', error)
      throw error
    }

    return true
  } catch (error) {
    console.error('Error in deleteOpportunity:', error)
    throw error
  }
}

