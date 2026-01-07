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
  assignee: string
  status: "new" | "assigned" | "done"
  urgency: "high" | "medium" | "low"
  aiSummary: string
  createdDate: string
}

/**
 * Obtiene todas las oportunidades de la base de datos con sus relaciones
 */
export async function getOpportunities(): Promise<Opportunity[]> {
  try {
    // Obtener oportunidades con JOINs a Clients y Profiles
    // Nota: La sintaxis de Supabase para relaciones depende de cómo estén configuradas las foreign keys
    // Intentamos primero con la sintaxis estándar, si falla, haremos queries separadas
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

    // Si hay error con la sintaxis de relación, intentamos sin JOINs y hacemos queries separadas
    let opportunitiesData = opportunities
    if (opportunitiesError) {
      console.warn('Error with relation syntax, trying separate queries:', opportunitiesError.message)
      
      // Query sin relaciones
      const { data: oppsWithoutRelations, error: simpleError } = await supabase
        .from("Opportunities")
        .select('id, client_id, assigned_user_id, status, original_message, ai_summary, urgency, created_at')
        .order('created_at', { ascending: false })

      if (simpleError) {
        console.error('Error fetching opportunities:', simpleError)
        throw simpleError
      }

      opportunitiesData = oppsWithoutRelations || []

      // Obtener clients y profiles por separado
      if (opportunitiesData.length > 0) {
        const clientIds = [...new Set(opportunitiesData.map((opp: any) => opp.client_id).filter(Boolean))]
        const userIds = [...new Set(opportunitiesData.map((opp: any) => opp.assigned_user_id).filter(Boolean))]

        const [clientsResult, profilesResult] = await Promise.all([
          clientIds.length > 0 ? supabase.from("Clients").select('id, name, company').in('id', clientIds) : { data: [], error: null },
          userIds.length > 0 ? supabase.from("Profiles").select('id, full_name').in('id', userIds) : { data: [], error: null }
        ])

        const clientsMap = new Map((clientsResult.data || []).map((c: any) => [c.id, c]))
        const profilesMap = new Map((profilesResult.data || []).map((p: any) => [p.id, p]))

        // Agregar datos relacionados
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

    // Obtener las skills para cada oportunidad
    // Primero, intentamos obtener las skills desde una tabla de relación
    // Si no existe, usaremos required_skill_id directamente
    const opportunityIds = opportunitiesData.map((opp: any) => opp.id)
    
    // Intentar obtener skills desde una tabla de relación (si existe)
    // Por ahora, asumimos que hay una tabla opportunity_skills o similar
    // Si no existe, usaremos required_skill_id directamente
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

    // Si no hay tabla de relación, intentamos obtener skills directamente desde required_skill_id
    let skillsMap: Record<string, { id: string; name: string }[]> = {}
    
    if (skillsError || !opportunitySkills || opportunitySkills.length === 0) {
      // Intentar obtener skills desde el campo required_skill_id
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
            // Crear un mapa de skills por oportunidad
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
      // Mapear skills desde la tabla de relación
      opportunitySkills.forEach((os: any) => {
        if (os.skill) {
          if (!skillsMap[os.opportunity_id]) {
            skillsMap[os.opportunity_id] = []
          }
          skillsMap[os.opportunity_id].push(os.skill)
        }
      })
    }

    // Transformar los datos al formato esperado por el frontend
    const transformedOpportunities: Opportunity[] = opportunitiesData.map((opp: any) => {
      const skills = skillsMap[opp.id] || []
      const skillNames = skills.map((s: any) => s.name)
      
      // Manejar tanto la sintaxis con relación como sin relación
      const client = opp.Clients || opp.client || null
      const assignedUser = opp.Profiles || opp.assigned_user || null
      
      // Determinar el status inicial
      let status = (opp.status?.toLowerCase() || 'new') as "new" | "assigned" | "done"
      
      // Lógica de limpieza: Si hay un miembro asignado pero el status es 'new', cambiar a 'assigned'
      // Esto corrige inconsistencias en los datos de la DB
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
        assignee: assignedUser?.full_name || '',
        status: status,
        urgency: (opp.urgency?.toLowerCase() || 'medium') as "high" | "medium" | "low",
        aiSummary: opp.ai_summary || '',
        createdDate: new Date(opp.created_at).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        })
      }
    })

    return transformedOpportunities
  } catch (error) {
    console.error('Error in getOpportunities:', error)
    throw error
  }
}

/**
 * Actualiza el estado de una oportunidad en la base de datos
 * @param id - ID de la oportunidad
 * @param newStatus - Nuevo estado: "new", "assigned", o "done"
 * @returns La oportunidad actualizada o null si hay error
 */
export async function updateOpportunityStatus(
  id: string,
  newStatus: "new" | "assigned" | "done"
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
      console.error('Error completo:', error)
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

    // Intentar también desde tabla de relación
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
      assignee: assignedUser?.full_name || '',
      status: (data.status?.toLowerCase() || 'new') as "new" | "assigned" | "done",
      urgency: (data.urgency?.toLowerCase() || 'medium') as "high" | "medium" | "low",
      aiSummary: data.ai_summary || '',
      createdDate: new Date(data.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }
  } catch (error) {
    console.error('Error in updateOpportunityStatus:', error)
    throw error
  }
}

/**
 * Obtiene el conteo total de oportunidades
 */
export async function getTotalOpportunitiesCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("Opportunities")
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('Error completo:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getTotalOpportunitiesCount:', error)
    throw error
  }
}

/**
 * Actualiza la asignación de una oportunidad (assigned_user_id y status)
 * @param id - ID de la oportunidad
 * @param assignedUserId - ID del usuario asignado (UUID de Profiles)
 * @returns La oportunidad actualizada o null si hay error
 */
export async function updateOpportunityAssignment(
  id: string,
  assignedUserId: string
): Promise<Opportunity | null> {
  try {
    // Validar que el ID no esté vacío
    if (!id || id.trim() === '') {
      throw new Error('Opportunity ID is required')
    }

    // Validar que el assignedUserId no esté vacío
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

    // Actualizar assigned_user_id y status a 'assigned' en una sola operación
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
      console.error('Error completo:', error)
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

    // Intentar también desde tabla de relación
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
      assignee: assignedUser?.full_name || '',
      status: (data.status?.toLowerCase() || 'new') as "new" | "assigned" | "done",
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
 * Actualiza los detalles de una oportunidad (ai_summary, urgency, required_skill_id)
 * @param id - ID de la oportunidad (UUID)
 * @param updates - Objeto con los campos a actualizar
 * @returns La oportunidad actualizada o null si hay error
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
    // Validar que el ID no esté vacío
    if (!id || id.trim() === '') {
      throw new Error('Opportunity ID is required')
    }

    // Construir objeto de actualización solo con los campos proporcionados
    const updateData: Record<string, any> = {}
    
    if (updates.ai_summary !== undefined) {
      updateData.ai_summary = updates.ai_summary
    }
    
    if (updates.urgency !== undefined) {
      // Normalizar urgency a minúsculas
      updateData.urgency = updates.urgency.toLowerCase()
    }
    
    if (updates.required_skill_id !== undefined) {
      // Si es null, establecer como null
      if (updates.required_skill_id === null) {
        updateData.required_skill_id = null
      } else if (updates.required_skill_id.trim() !== '') {
        // Validar que required_skill_id sea un UUID válido (no un nombre como 'React')
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(updates.required_skill_id)) {
          throw new Error(`required_skill_id debe ser un UUID válido, no un nombre. Valor recibido: ${updates.required_skill_id}`)
        }
        updateData.required_skill_id = updates.required_skill_id
      } else {
        updateData.required_skill_id = null
      }
    }

    console.log(`[updateOpportunityDetails] Actualizando oportunidad:`, {
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
      console.error('Error completo:', error)
      throw error
    }

    if (!data) {
      return null
    }

    // Obtener skills para esta oportunidad usando UUID
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

    // Intentar también desde tabla de relación
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
      assignee: assignedUser?.full_name || '',
      status: (data.status?.toLowerCase() || 'new') as "new" | "assigned" | "done",
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
 * Crea una nueva oportunidad
 * @param clientId - ID del cliente (UUID)
 * @param originalMessage - Mensaje original del cliente
 * @param aiSummary - Resumen generado por AI
 * @param urgency - Urgencia: "high", "medium", o "low"
 * @param requiredSkillId - ID de la skill requerida (UUID) o null
 * @returns La oportunidad creada
 */
export async function createOpportunity(
  clientId: string,
  originalMessage: string,
  aiSummary: string,
  urgency: "high" | "medium" | "low" = "medium",
  requiredSkillId: string | null = null
): Promise<Opportunity> {
  try {
    // Validar que clientId sea un UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(clientId)) {
      throw new Error(`Invalid UUID format for client_id: ${clientId}`)
    }

    // Validar requiredSkillId si se proporciona
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
      console.error('Error completo:', error)
      throw error
    }

    if (!data) {
      throw new Error('Failed to create opportunity')
    }

    // Obtener skills para esta oportunidad
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
      assignee: assignedUser?.full_name || '',
      status: (data.status?.toLowerCase() || 'new') as "new" | "assigned" | "done",
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
 * Obtiene el conteo de oportunidades activas (status = 'assigned')
 */
export async function getActiveOpportunitiesCount(): Promise<number> {
  try {
    const { count, error } = await supabase
      .from("Opportunities")
      .select('*', { count: 'exact', head: true })
      .eq('status', 'assigned')

    if (error) {
      console.error('Error completo:', error)
      throw error
    }

    return count || 0
  } catch (error) {
    console.error('Error in getActiveOpportunitiesCount:', error)
    throw error
  }
}

