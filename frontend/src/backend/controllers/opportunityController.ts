import { supabase } from '../config/db'

export interface CreateOpportunityInput {
  clientName: string
  company: string
  originalMessage: string
  aiSummary?: string
  urgency?: 'high' | 'medium' | 'low'
  requiredSkillId?: string | null
  assignedUserId?: string | null
}

export interface OpportunityFromDB {
  id: string
  client_id: string
  assigned_user_id: string | null
  status: string
  original_message: string
  ai_summary: string
  urgency: string
  required_skill_id: string | null
  created_at: string
  Clients?: {
    name: string
    company: string
  } | null
  Profiles?: {
    full_name: string
  } | null
}

/**
 * Creates a new opportunity in the database
 * @param input - Opportunity data to create
 * @returns The created opportunity or null if there's an error
 */
export async function createOpportunity(input: CreateOpportunityInput): Promise<OpportunityFromDB | null> {
  try {
    // Validate required fields
    if (!input.clientName || !input.company || !input.originalMessage) {
      throw new Error('clientName, company, and originalMessage are required fields')
    }

    // 1. Find or create the client
    let clientId: string

    // Search for existing client by name and company
    const { data: existingClient, error: clientSearchError } = await supabase
      .from('Clients')
      .select('id')
      .eq('name', input.clientName)
      .eq('company', input.company)
      .single()

    if (clientSearchError && clientSearchError.code !== 'PGRST116') {
      // PGRST116 is "no rows returned", which is expected if it doesn't exist
      console.error('Error searching for client:', clientSearchError)
      throw clientSearchError
    }

    if (existingClient) {
      clientId = existingClient.id
    } else {
      // Create new client
      const { data: newClient, error: clientCreateError } = await supabase
        .from('Clients')
        .insert({
          name: input.clientName,
          company: input.company,
        })
        .select('id')
        .single()

      if (clientCreateError) {
        console.error('Error creating client:', clientCreateError)
        throw clientCreateError
      }

      if (!newClient) {
        throw new Error('Could not create client')
      }

      clientId = newClient.id
    }

    // 2. Determine initial status
    // Rule: If there's an assigned user, the status must be 'assigned'
    let status: string = 'new'
    if (input.assignedUserId) {
      status = 'assigned'
    }

    // 3. Create the opportunity
    const opportunityData: any = {
      client_id: clientId,
      original_message: input.originalMessage,
      status: status,
      urgency: (input.urgency || 'medium').toLowerCase(),
      assigned_user_id: input.assignedUserId || null,
    }

    // Add optional fields if present
    if (input.aiSummary) {
      opportunityData.ai_summary = input.aiSummary
    }

    if (input.requiredSkillId) {
      opportunityData.required_skill_id = input.requiredSkillId
    }

    const { data: opportunity, error: opportunityError } = await supabase
      .from('Opportunities')
      .insert(opportunityData)
      .select(`
        id,
        client_id,
        assigned_user_id,
        status,
        original_message,
        ai_summary,
        urgency,
        required_skill_id,
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

    if (!opportunity) {
      throw new Error('Could not create opportunity')
    }

    return opportunity as unknown as OpportunityFromDB
  } catch (error: any) {
    console.error('Error in createOpportunity:', error)
    throw error
  }
}
