import { openai } from '../config/ai'

export interface GenerateMemberBioInput {
  name: string
  skills: string[]
}

/**
 * Genera una biografía profesional de 2 oraciones para un miembro del equipo
 * usando el modelo gpt-4o-mini de OpenAI
 * @param input - Datos del miembro (nombre y skills)
 * @returns La biografía generada
 */
export async function generateMemberBio(input: GenerateMemberBioInput): Promise<string> {
  try {
    // Validar que el API key esté configurado
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY no está configurado. Por favor, verifica tu archivo backend/.env')
    }

    // Validar campos requeridos
    if (!input.name || !input.skills || input.skills.length === 0) {
      throw new Error('name y skills son campos requeridos para generar la biografía')
    }

    // Construir el prompt
    const skillsList = input.skills.join(', ')
    const prompt = `Genera una biografía profesional de exactamente 2 oraciones para ${input.name}, quien tiene experiencia en: ${skillsList}. La biografía debe ser concisa, profesional y destacar sus habilidades técnicas.`

    // Llamar a la API de OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Eres un asistente que genera biografías profesionales concisas para miembros de equipos técnicos. Siempre responde con exactamente 2 oraciones.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 150,
      temperature: 0.7,
    })

    // Extraer la biografía generada
    const bio = completion.choices[0]?.message?.content

    if (!bio) {
      throw new Error('No se pudo generar la biografía. La respuesta de OpenAI está vacía.')
    }

    return bio.trim()
  } catch (error: any) {
    // Manejo de errores específicos
    if (error instanceof Error) {
      // Si es un error de API key
      if (error.message.includes('API key') || error.message.includes('OPENAI_API_KEY')) {
        console.error('Error de configuración de OpenAI:', error.message)
        throw new Error('Error de configuración: La clave de API de OpenAI no está disponible o es inválida.')
      }

      // Si es un error de la API de OpenAI
      if (error.message.includes('OpenAI') || error.status) {
        console.error('Error de la API de OpenAI:', error.message)
        throw new Error('Error al comunicarse con el servicio de OpenAI. Por favor, intenta nuevamente más tarde.')
      }

      // Otros errores
      console.error('Error generando biografía:', error.message)
      throw error
    }

    // Error desconocido
    console.error('Error desconocido generando biografía:', error)
    throw new Error('Ocurrió un error inesperado al generar la biografía.')
  }
}

