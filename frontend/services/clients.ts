import { supabase } from '@/lib/supabase'

export interface Client {
  id: string
  name: string
  company: string
}

/**
 * Busca un cliente por nombre y company
 * @param name - Nombre del cliente
 * @param company - Nombre de la compañía
 * @returns El cliente si existe, null si no existe
 */
export async function findClientByNameAndCompany(
  name: string,
  company: string
): Promise<Client | null> {
  try {
    const { data, error } = await supabase
      .from("Clients")
      .select('id, name, company')
      .eq('name', name.trim())
      .eq('company', company.trim())
      .maybeSingle()

    if (error) {
      console.error('Error completo:', error)
      throw error
    }

    return data || null
  } catch (error) {
    console.error('Error completo:', error)
    throw error
  }
}

/**
 * Crea un nuevo cliente
 * @param name - Nombre del cliente
 * @param company - Nombre de la compañía
 * @returns El cliente creado
 */
export async function createClient(
  name: string,
  company: string
): Promise<Client> {
  try {
    const { data, error } = await supabase
      .from("Clients")
      .insert({
        name: name.trim(),
        company: company.trim(),
      })
      .select('id, name, company')
      .single()

    if (error) {
      console.error('Error completo:', error)
      throw error
    }

    if (!data) {
      throw new Error('Failed to create client')
    }

    return data
  } catch (error) {
    console.error('Error completo:', error)
    throw error
  }
}

/**
 * Busca o crea un cliente
 * @param name - Nombre del cliente
 * @param company - Nombre de la compañía
 * @returns El cliente (existente o recién creado)
 */
export async function findOrCreateClient(
  name: string,
  company: string
): Promise<Client> {
  try {
    // Primero buscar si existe
    const existingClient = await findClientByNameAndCompany(name, company)
    
    if (existingClient) {
      return existingClient
    }

    // Si no existe, crearlo
    return await createClient(name, company)
  } catch (error) {
    console.error('Error completo:', error)
    throw error
  }
}

/**
 * Obtiene todos los clientes para sugerencias
 * @returns Lista de clientes
 */
export async function getAllClients(): Promise<Client[]> {
  try {
    const { data, error } = await supabase
      .from("Clients")
      .select('id, name, company')
      .order('name', { ascending: true })

    if (error) {
      console.error('Error completo:', error)
      throw error
    }

    return data || []
  } catch (error) {
    console.error('Error completo:', error)
    throw error
  }
}

