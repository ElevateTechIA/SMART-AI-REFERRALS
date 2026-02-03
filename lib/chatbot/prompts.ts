// System prompts for registration chatbot

import type { RegistrationState, RegistrationType, RegistrationData } from './types'

// Build system prompt for Gemini
export function buildSystemPrompt(
  language: 'en' | 'es',
  registrationType: RegistrationType | null,
  currentState: RegistrationState,
  collectedData: Partial<RegistrationData>
): string {
  const langInstructions = language === 'es'
    ? 'Responde siempre en español de manera amigable y profesional.'
    : 'Always respond in English in a friendly and professional manner.'

  return `You are a helpful registration assistant for Smart AI Referrals, a platform that connects businesses with referrers who bring new customers.

${langInstructions}

CONTEXT:
- Registration Type: ${registrationType || 'Not selected yet'}
- Current Step: ${currentState}
- Language: ${language}
- Collected Data: ${JSON.stringify(collectedData, null, 2)}

YOUR ROLE:
You are helping a user create their account through natural conversation. Be conversational but efficient.

RULES:
1. Keep responses concise (1-2 sentences max)
2. Extract relevant data from user messages even if not perfectly formatted
3. Validate data and provide helpful feedback if invalid
4. If user provides multiple pieces of info, extract all of them
5. Stay on topic - gently redirect off-topic messages back to registration
6. Never ask for sensitive info beyond what's needed for registration
7. Be encouraging and positive

REGISTRATION FLOWS:

Referrer Flow (earn money by referring customers):
- Name → Email → Password → Confirm → Done

Business Flow (get new customers):
- Name → Email → Password → Business Name → Category → Address → Phone → Description (optional) → Website (optional) → Confirm → Done

VALIDATION RULES:
- Name: 2-100 characters
- Email: Valid email format
- Password: Minimum 6 characters
- Phone: 7-20 digits
- Address: 5-500 characters
- Business Name: 2-100 characters
- Website: Valid URL (optional)
- Description: Max 1000 characters (optional)

RESPONSE FORMAT:
You must respond with valid JSON only, no additional text:
{
  "message": "Your conversational response to the user",
  "extractedData": {
    "user": { "name": "...", "email": "...", "password": "..." },
    "business": { "name": "...", "category": "...", "address": "...", "phone": "...", "description": "...", "website": "..." }
  },
  "validationErrors": [
    { "field": "fieldName", "message": "Error description" }
  ],
  "shouldAdvance": true
}

IMPORTANT:
- "extractedData" should only include fields that were actually provided in the user's message
- "validationErrors" should be empty if all provided data is valid
- "shouldAdvance" should be true if the current step is complete and valid
- For optional fields, if user says "skip" or "no", set shouldAdvance to true`
}

// Prompt templates for each state
export const STATE_PROMPTS: Record<RegistrationState, { en: string; es: string }> = {
  idle: {
    en: "Hi! I'm here to help you get started with Smart AI Referrals. Would you like to earn money by referring customers to local businesses, or are you a business owner looking to get more customers?",
    es: "¡Hola! Estoy aquí para ayudarte a comenzar con Smart AI Referrals. ¿Te gustaría ganar dinero refiriendo clientes a negocios locales, o eres dueño de un negocio buscando conseguir más clientes?",
  },
  choose_type: {
    en: "Great! Are you here to earn money as a referrer, or do you want to get new customers for your business?",
    es: "¡Genial! ¿Estás aquí para ganar dinero como referidor, o quieres conseguir nuevos clientes para tu negocio?",
  },
  collect_name: {
    en: "Perfect! Let's start with your name. What should I call you?",
    es: "¡Perfecto! Empecemos con tu nombre. ¿Cómo te llamas?",
  },
  collect_email: {
    en: "Nice to meet you, {{name}}! What's your email address?",
    es: "¡Mucho gusto, {{name}}! ¿Cuál es tu correo electrónico?",
  },
  collect_password: {
    en: "Great! Now create a secure password (at least 6 characters).",
    es: "¡Genial! Ahora crea una contraseña segura (mínimo 6 caracteres).",
  },
  collect_business_name: {
    en: "Now let's set up your business. What's your business name?",
    es: "Ahora configuremos tu negocio. ¿Cuál es el nombre de tu negocio?",
  },
  collect_category: {
    en: "What category best describes {{businessName}}?",
    es: "¿Qué categoría describe mejor a {{businessName}}?",
  },
  collect_address: {
    en: "What's the address where customers can find you?",
    es: "¿Cuál es la dirección donde los clientes pueden encontrarte?",
  },
  collect_phone: {
    en: "What phone number should customers use to reach you?",
    es: "¿Qué número de teléfono deben usar los clientes para contactarte?",
  },
  collect_description: {
    en: "Briefly describe your business (optional - you can skip this).",
    es: "Describe brevemente tu negocio (opcional - puedes saltar este paso).",
  },
  collect_website: {
    en: "Do you have a website? (optional - you can skip this)",
    es: "¿Tienes un sitio web? (opcional - puedes saltar este paso)",
  },
  confirm_data: {
    en: "Here's a summary of your information. Does everything look correct?",
    es: "Aquí está un resumen de tu información. ¿Todo se ve correcto?",
  },
  auth_method: {
    en: "How would you like to sign up?",
    es: "¿Cómo te gustaría registrarte?",
  },
  processing: {
    en: "Setting up your account...",
    es: "Configurando tu cuenta...",
  },
  complete: {
    en: "All done! Your account is ready. Redirecting you to your dashboard...",
    es: "¡Listo! Tu cuenta está preparada. Redirigiéndote a tu panel...",
  },
  error: {
    en: "Something went wrong. Please try again.",
    es: "Algo salió mal. Por favor intenta de nuevo.",
  },
}

// Get prompt for state with variable substitution
export function getStatePrompt(
  state: RegistrationState,
  language: 'en' | 'es',
  variables: Record<string, string> = {}
): string {
  let prompt = STATE_PROMPTS[state][language]

  // Replace variables like {{name}} with actual values
  for (const [key, value] of Object.entries(variables)) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), value)
  }

  return prompt
}

// Error messages
export const ERROR_MESSAGES = {
  invalidEmail: {
    en: "That doesn't look like a valid email. Can you try again?",
    es: "Ese no parece ser un correo válido. ¿Puedes intentar de nuevo?",
  },
  passwordTooShort: {
    en: "Your password needs to be at least 6 characters.",
    es: "Tu contraseña necesita tener al menos 6 caracteres.",
  },
  nameTooShort: {
    en: "Could you give me a longer name? At least 2 characters.",
    es: "¿Podrías darme un nombre más largo? Al menos 2 caracteres.",
  },
  invalidPhone: {
    en: "That phone number doesn't look right. Please use 7-20 digits.",
    es: "Ese número de teléfono no parece correcto. Por favor usa 7-20 dígitos.",
  },
  invalidAddress: {
    en: "The address seems too short. Please provide a more complete address.",
    es: "La dirección parece muy corta. Por favor proporciona una dirección más completa.",
  },
  invalidWebsite: {
    en: "That doesn't look like a valid website URL.",
    es: "Eso no parece ser una URL de sitio web válida.",
  },
  generic: {
    en: "I didn't quite understand that. Could you try again?",
    es: "No entendí bien. ¿Podrías intentar de nuevo?",
  },
}

// Get error message
export function getErrorMessage(
  errorKey: keyof typeof ERROR_MESSAGES,
  language: 'en' | 'es'
): string {
  return ERROR_MESSAGES[errorKey]?.[language] || ERROR_MESSAGES.generic[language]
}

// Category labels
export const CATEGORY_LABELS: Record<string, { en: string; es: string }> = {
  restaurant: { en: 'Restaurant', es: 'Restaurante' },
  retail: { en: 'Retail', es: 'Tienda' },
  health_beauty: { en: 'Health & Beauty', es: 'Salud y Belleza' },
  automotive: { en: 'Automotive', es: 'Automotriz' },
  professional_services: { en: 'Professional Services', es: 'Servicios Profesionales' },
  entertainment: { en: 'Entertainment', es: 'Entretenimiento' },
  fitness: { en: 'Fitness', es: 'Fitness' },
  other: { en: 'Other', es: 'Otro' },
}

// Get category label
export function getCategoryLabel(category: string, language: 'en' | 'es'): string {
  return CATEGORY_LABELS[category]?.[language] || category
}
