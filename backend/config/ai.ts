import OpenAI from 'openai'
import dotenv from 'dotenv'
import path from 'path'

// Cargar variables de entorno desde backend/.env
// Intentar cargar desde la ruta relativa al archivo actual primero
// Si falla, usar process.cwd() como fallback
let envPath: string
try {
  // Intentar usar __dirname (disponible en CommonJS)
  if (typeof __dirname !== 'undefined') {
    envPath = path.join(__dirname, '../.env')
  } else {
    // Fallback para ESM o cuando __dirname no está disponible
    envPath = path.join(process.cwd(), 'backend/.env')
  }
} catch {
  // Si todo falla, usar process.cwd()
  envPath = path.join(process.cwd(), 'backend/.env')
}

dotenv.config({ path: envPath })

const openaiApiKey = process.env.OPENAI_API_KEY

if (!openaiApiKey) {
  throw new Error('Missing OPENAI_API_KEY environment variable. Please set it in backend/.env')
}

export const openai = new OpenAI({
  apiKey: openaiApiKey,
})

