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
      .from('Opportunities')
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
        .from('Opportunities')
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
          clientIds.length > 0 ? supabase.from('Clients').select('id, name, company').in('id', clientIds) : { data: [], error: null },
          userIds.length > 0 ? supabase.from('Profiles').select('id, full_name').in('id', userIds) : { data: [], error: null }
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
        .from('Opportunities')
        .select('id, required_skill_id')
        .in('id', opportunityIds)

      if (opportunitiesWithSkillId) {
        const skillIds = opportunitiesWithSkillId
          .map(opp => opp.required_skill_id)
          .filter((id): id is string => id !== null)

        if (skillIds.length > 0) {
          const { data: skills } = await supabase
            .from('Skills')
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
      
      return {
        id: opp.id,
        clientName: client?.name || 'Unknown Client',
        company: client?.company || 'Unknown Company',
        summary: opp.original_message || '',
        requiredSkill: skillNames.length > 0 ? (skillNames.length === 1 ? skillNames[0] : skillNames) : [],
        assignee: assignedUser?.full_name || '',
        status: (opp.status?.toLowerCase() || 'new') as "new" | "assigned" | "done",
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

