import { supabase } from '@/lib/supabase'

export interface TeamMember {
  id: string
  name: string
  email: string
  role?: string
  skills: string[]
  activeOpportunities: number
  completedOpportunities: number
}

/**
 * Obtiene todos los miembros del equipo desde la base de datos con sus skills
 */
export async function getTeamMembers(): Promise<TeamMember[]> {
  try {
    // Obtener todos los perfiles
    const { data: profiles, error: profilesError } = await supabase
      .from('Profiles')
      .select('id, full_name, email, role')
      .order('full_name', { ascending: true })

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      throw profilesError
    }

    if (!profiles || profiles.length === 0) {
      return []
    }

    // Obtener todas las skills asociadas a los usuarios
    const profileIds = profiles.map(p => p.id)
    
    // Intentar obtener skills desde la tabla user_skills
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

    // Crear un mapa de skills por usuario
    const skillsMap: Record<string, string[]> = {}
    
    if (!userSkillsError && userSkills && userSkills.length > 0) {
      userSkills.forEach((us: any) => {
        if (us.skill && us.user_id) {
          if (!skillsMap[us.user_id]) {
            skillsMap[us.user_id] = []
          }
          skillsMap[us.user_id].push(us.skill.name)
        }
      })
    }

    // Obtener estadísticas de oportunidades para cada miembro
    const { data: opportunities, error: oppError } = await supabase
      .from('Opportunities')
      .select('id, assigned_user_id, status')
      .in('assigned_user_id', profileIds)

    // Calcular oportunidades activas y completadas por usuario
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

    // Transformar los datos al formato esperado por el frontend
    const teamMembers: TeamMember[] = profiles.map((profile: any) => ({
      id: profile.id,
      name: profile.full_name || 'Unknown',
      email: profile.email || '',
      role: profile.role || undefined,
      skills: skillsMap[profile.id] || [],
      activeOpportunities: activeOppsMap[profile.id] || 0,
      completedOpportunities: completedOppsMap[profile.id] || 0,
    }))

    return teamMembers
  } catch (error) {
    console.error('Error in getTeamMembers:', error)
    throw error
  }
}

