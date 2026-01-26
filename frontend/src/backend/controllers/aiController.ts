import { openai } from '../config/ai'

export interface ProcessOpportunityEmailOutput {
  summary: string
  priority: 'Low' | 'Medium' | 'High'
  required_skills: string[]
}

/**
 * Processes an opportunity email using AI to extract structured information
 * @param emailContent - Email content as plain text
 * @returns Structured object with summary, priority, and required skills
 */
export async function processOpportunityEmail(emailContent: string): Promise<ProcessOpportunityEmailOutput> {
  try {
    // Validate that the API key is configured
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not configured. Please verify your .env.local file')
    }

    // Validate that the email content is not empty
    if (!emailContent || emailContent.trim().length === 0) {
      throw new Error('Email content cannot be empty')
    }

    // Get available skills from the database for matching
    let availableSkills: string[] = []
    try {
      // Conditionally import supabase to avoid errors if not configured
      const { supabase } = await import('../config/db')
      const { data: dbSkills, error: skillsError } = await supabase
        .from('Skills')
        .select('id, name')
        .order('name', { ascending: true })

      if (skillsError) {
        console.warn('Error fetching skills from DB, continuing without matching:', skillsError.message)
      } else {
        availableSkills = dbSkills?.map(skill => skill.name) || []
      }
    } catch (dbError: any) {
      // If there's no Supabase connection, continue without skill matching
      if (dbError.message?.includes('Missing Supabase')) {
        console.warn('Supabase variables not configured, continuing without DB skill matching')
      } else {
        console.warn('Could not connect to database to fetch skills, continuing without matching:', dbError.message)
      }
    }
    const skillsList = availableSkills.length > 0 
      ? `The available skills in our database are: ${availableSkills.join(', ')}. Try to match with these when possible.`
      : ''

    // Build the prompt for OpenAI
    const systemPrompt = `You are an expert assistant for analyzing client emails for technical projects. Your task is to analyze the email content and extract structured information.

CRITICAL LANGUAGE REQUIREMENT: 
- You MUST respond in English ONLY, regardless of the input email language.
- All summaries, priority explanations, and skill names must be in English.
- Even if the input email is in Spanish, French, or any other language, your entire response must be in English.

REQUIREMENTS:
1. Summary: Generate a concise project summary in EXACTLY 1 sentence. The summary must be in English.
2. Priority: Determine the priority based on:
   - Mentioned urgency (deadlines, due dates, "urgent", "asap", etc.)
   - Mentioned budget (larger budgets = higher priority)
   - Client or project importance
   - Must be one of: "Low", "Medium", or "High"
3. Required Skills: Identify the technical skills necessary mentioned in the email.
   ${skillsList}
   - If they mention specific technologies, try to match with the database skills when possible.
   - If there's no exact match, use the closest name or the name mentioned in the email.
   - Return an array of strings with skill names in English.
   - All skill names must be in English, even if mentioned in another language in the email.

IMPORTANT: You must respond ONLY with a valid JSON object with this exact structure:
{
  "summary": "summary in one sentence (in English)",
  "priority": "Low|Medium|High",
  "required_skills": ["skill1", "skill2", ...]
}

Remember: ALL output must be in English, regardless of the input language.`

    const userPrompt = `Analyze the following client email and extract the requested information. Remember: respond in English only, regardless of the email language.\n\n${emailContent}`

    // Call OpenAI API with forced JSON format
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
      temperature: 0.3, // Lower temperature for more consistent and structured responses
    })

    // Extract the JSON response
    let responseContent = completion.choices[0]?.message?.content

    if (!responseContent) {
      throw new Error('Could not process email. OpenAI response is empty.')
    }

    // Clean any markdown code blocks that OpenAI might add
    // Remove ```json at the start and ``` at the end, and any other markdown format
    responseContent = responseContent.trim()
    
    // Remove markdown code blocks if they exist
    if (responseContent.startsWith('```')) {
      // Remove the first ```json or ``` and the last ```
      responseContent = responseContent.replace(/^```(?:json)?\s*/i, '')
      responseContent = responseContent.replace(/\s*```\s*$/, '')
      responseContent = responseContent.trim()
    }

    // Log for debugging
    console.log('OpenAI raw response:', responseContent)

    // Parse the JSON
    let parsedResponse: ProcessOpportunityEmailOutput
    try {
      parsedResponse = JSON.parse(responseContent)
    } catch (parseError: any) {
      console.error('Error parsing JSON from OpenAI. Raw content:', responseContent)
      console.error('Parse error:', parseError.message)
      throw new Error(`OpenAI response is not valid JSON: ${parseError.message}`)
    }

    // Validate the structure of the returned object
    if (!parsedResponse.summary || typeof parsedResponse.summary !== 'string') {
      throw new Error('Response does not contain a valid summary.')
    }

    if (!parsedResponse.priority || !['Low', 'Medium', 'High'].includes(parsedResponse.priority)) {
      throw new Error('Priority must be "Low", "Medium", or "High".')
    }

    if (!Array.isArray(parsedResponse.required_skills)) {
      throw new Error('required_skills must be an array.')
    }

    // Normalize skills: match with DB skills when possible
    const normalizedSkills = parsedResponse.required_skills.map((skill: string) => {
      const skillLower = skill.trim().toLowerCase()
      
      // Find exact match (case-insensitive)
      const exactMatch = availableSkills.find(
        dbSkill => dbSkill.toLowerCase() === skillLower
      )
      if (exactMatch) return exactMatch

      // Find partial match (contains)
      const partialMatch = availableSkills.find(
        dbSkill => dbSkill.toLowerCase().includes(skillLower) || skillLower.includes(dbSkill.toLowerCase())
      )
      if (partialMatch) return partialMatch

      // If no match, return the original skill (capitalized)
      return skill.trim()
    })

    // Remove duplicates
    const uniqueSkills = [...new Set(normalizedSkills)]

    return {
      summary: parsedResponse.summary.trim(),
      priority: parsedResponse.priority as 'Low' | 'Medium' | 'High',
      required_skills: uniqueSkills,
    }
  } catch (error: any) {
    // Specific error handling
    if (error instanceof Error) {
      // If it's an API key error
      if (error.message.includes('API key') || error.message.includes('OPENAI_API_KEY')) {
        console.error('OpenAI configuration error:', error.message)
        throw new Error('Configuration error: OpenAI API key is not available or invalid.')
      }

      // If it's an OpenAI API error
      if (error.message.includes('OpenAI') || (error as any).status) {
        console.error('OpenAI API error:', error.message)
        throw new Error('Error communicating with OpenAI service. Please try again later.')
      }

      // Other errors
      console.error('Error processing email:', error.message)
      throw error
    }

    // Unknown error
    console.error('Unknown error processing email:', error)
    throw new Error('An unexpected error occurred while processing the email.')
  }
}
