import { supabase } from '@/lib/supabase'

export interface Skill {
  id: string
  name: string
}

/**
 * Obtiene todas las skills desde la tabla Skills
 */
export async function getSkills(): Promise<Skill[]> {
  try {
    const { data: skills, error } = await supabase
      .from("Skills")
      .select('id, name')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error completo:', error)
      throw error
    }

    return skills || []
  } catch (error) {
    console.error('Error completo:', error)
    throw error
  }
}

