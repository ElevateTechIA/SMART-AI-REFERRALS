import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { buildSystemPrompt, getStatePrompt, getErrorMessage } from '@/lib/chatbot/prompts'
import { sanitizeInput, validateEmail, validateName, validatePassword, validatePhone, validateAddress, validateBusinessName, validateWebsite, validateDescription } from '@/lib/chatbot/validators'
import { getNextState, getQuickActions, isOptionalState } from '@/lib/chatbot/conversation-flow'
import type { ChatRequest, ChatResponse, RegistrationState, RegistrationData, ValidationError, QuickAction } from '@/lib/chatbot/types'

export const dynamic = 'force-dynamic'

// Rate limiting (simple in-memory)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 30
const WINDOW_MS = 60000

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = rateLimitMap.get(ip)

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + WINDOW_MS })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

// Initialize Gemini
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_GEMINI_API_KEY not configured')
  }
  return new GoogleGenerativeAI(apiKey)
}

// Process user message with Gemini
async function processWithGemini(
  message: string,
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<{
  message: string
  extractedData?: Partial<RegistrationData>
  validationErrors?: ValidationError[]
  shouldAdvance?: boolean
}> {
  const genAI = getGeminiClient()
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })

  // Build conversation for Gemini
  const history = conversationHistory.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }))

  const chat = model.startChat({
    history,
    generationConfig: {
      maxOutputTokens: 500,
      temperature: 0.7,
    },
  })

  const fullPrompt = `${systemPrompt}\n\nUser message: "${message}"\n\nRespond with JSON only:`

  const result = await chat.sendMessage(fullPrompt)
  const responseText = result.response.text()

  // Parse JSON response
  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = responseText
    const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (jsonMatch) {
      jsonStr = jsonMatch[1]
    }

    const parsed = JSON.parse(jsonStr.trim())
    return {
      message: parsed.message || '',
      extractedData: parsed.extractedData,
      validationErrors: parsed.validationErrors || [],
      shouldAdvance: parsed.shouldAdvance ?? true,
    }
  } catch {
    // If parsing fails, use the text as the message
    return {
      message: responseText.replace(/```[\s\S]*?```/g, '').trim() || 'I understand. Let me help you continue.',
      shouldAdvance: true,
    }
  }
}

// Validate field based on current state
function validateCurrentField(
  state: RegistrationState,
  value: string,
  language: 'en' | 'es'
): { valid: boolean; error?: string } {
  switch (state) {
    case 'collect_name':
      return validateName(value)
    case 'collect_email':
      return validateEmail(value)
    case 'collect_password':
      return validatePassword(value)
    case 'collect_business_name':
      return validateBusinessName(value)
    case 'collect_phone':
      return validatePhone(value)
    case 'collect_address':
      return validateAddress(value)
    case 'collect_website':
      return validateWebsite(value)
    case 'collect_description':
      return validateDescription(value)
    default:
      return { valid: true }
  }
}

// Get field to extract based on state
function extractFieldFromState(state: RegistrationState): keyof RegistrationData['user'] | keyof RegistrationData['business'] | null {
  const mapping: Record<string, string> = {
    collect_name: 'name',
    collect_email: 'email',
    collect_password: 'password',
    collect_business_name: 'name',
    collect_category: 'category',
    collect_phone: 'phone',
    collect_address: 'address',
    collect_website: 'website',
    collect_description: 'description',
  }
  return mapping[state] as keyof RegistrationData['user'] | keyof RegistrationData['business'] | null
}

// Determine if field belongs to user or business
function isBusinessField(state: RegistrationState): boolean {
  return [
    'collect_business_name',
    'collect_category',
    'collect_phone',
    'collect_address',
    'collect_website',
    'collect_description',
  ].includes(state)
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many requests. Please slow down.' },
        { status: 429 }
      )
    }

    const body: ChatRequest = await request.json()
    const {
      message,
      conversationHistory = [],
      currentState,
      collectedData = {},
      language = 'en',
      registrationType,
    } = body

    // Validate request
    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      )
    }

    const sanitizedMessage = sanitizeInput(message, 500)

    // Handle initial greeting
    if (currentState === 'idle') {
      const greeting = getStatePrompt('idle', language)
      const response: ChatResponse = {
        message: greeting,
        action: 'continue',
        nextState: 'choose_type',
        quickActions: getQuickActions('choose_type'),
      }
      return NextResponse.json(response)
    }

    // Handle registration type selection
    if (currentState === 'choose_type') {
      const lowerMessage = sanitizedMessage.toLowerCase()
      let selectedType: 'referrer' | 'business' | null = null

      if (lowerMessage.includes('earn') || lowerMessage.includes('money') || lowerMessage.includes('referr') || lowerMessage.includes('ganar') || lowerMessage.includes('dinero')) {
        selectedType = 'referrer'
      } else if (lowerMessage.includes('business') || lowerMessage.includes('customer') || lowerMessage.includes('negocio') || lowerMessage.includes('cliente')) {
        selectedType = 'business'
      }

      if (selectedType) {
        const prompt = getStatePrompt('collect_name', language)
        const response: ChatResponse = {
          message: prompt,
          action: 'continue',
          nextState: 'collect_name',
          extractedData: {},
        }
        return NextResponse.json(response)
      }

      // If type not clear, ask again
      const response: ChatResponse = {
        message: getStatePrompt('choose_type', language),
        action: 'continue',
        nextState: 'choose_type',
        quickActions: getQuickActions('choose_type'),
      }
      return NextResponse.json(response)
    }

    // Handle skip for optional fields
    if (isOptionalState(currentState)) {
      const lowerMessage = sanitizedMessage.toLowerCase()
      if (lowerMessage === 'skip' || lowerMessage === 'saltar' || lowerMessage === 'no') {
        const nextState = getNextState(currentState, registrationType || 'referrer')
        const prompt = getStatePrompt(nextState, language, {
          name: collectedData.user?.name || '',
          businessName: collectedData.business?.name || '',
        })

        const response: ChatResponse = {
          message: prompt,
          action: nextState === 'confirm_data' ? 'confirm_data' : 'continue',
          nextState,
          quickActions: getQuickActions(nextState),
        }
        return NextResponse.json(response)
      }
    }

    // Handle confirmation
    if (currentState === 'confirm_data') {
      const lowerMessage = sanitizedMessage.toLowerCase()
      if (lowerMessage.includes('confirm') || lowerMessage.includes('good') || lowerMessage.includes('yes') || lowerMessage.includes('correct') || lowerMessage.includes('sí') || lowerMessage.includes('bien') || lowerMessage.includes('correcto')) {
        const response: ChatResponse = {
          message: getStatePrompt('auth_method', language),
          action: 'show_google_auth',
          nextState: 'auth_method',
          quickActions: getQuickActions('auth_method'),
        }
        return NextResponse.json(response)
      }

      if (lowerMessage.includes('edit') || lowerMessage.includes('change') || lowerMessage.includes('editar') || lowerMessage.includes('cambiar')) {
        const response: ChatResponse = {
          message: language === 'es'
            ? '¿Qué te gustaría cambiar? Puedes decirme el campo y el nuevo valor.'
            : 'What would you like to change? You can tell me the field and the new value.',
          action: 'continue',
          nextState: 'confirm_data',
        }
        return NextResponse.json(response)
      }
    }

    // Handle auth method selection
    if (currentState === 'auth_method') {
      const lowerMessage = sanitizedMessage.toLowerCase()
      if (lowerMessage.includes('google')) {
        const response: ChatResponse = {
          message: getStatePrompt('processing', language),
          action: 'execute_registration',
          nextState: 'processing',
          extractedData: { ...collectedData, authMethod: 'google' } as Partial<RegistrationData>,
        }
        return NextResponse.json(response)
      }

      if (lowerMessage.includes('email') || lowerMessage.includes('password') || lowerMessage.includes('correo') || lowerMessage.includes('contraseña')) {
        const response: ChatResponse = {
          message: getStatePrompt('processing', language),
          action: 'execute_registration',
          nextState: 'processing',
          extractedData: { ...collectedData, authMethod: 'email' } as Partial<RegistrationData>,
        }
        return NextResponse.json(response)
      }

      // Ask again if unclear
      const response: ChatResponse = {
        message: getStatePrompt('auth_method', language),
        action: 'show_google_auth',
        nextState: 'auth_method',
        quickActions: getQuickActions('auth_method'),
      }
      return NextResponse.json(response)
    }

    // For data collection states, use Gemini to extract data
    const systemPrompt = buildSystemPrompt(language, registrationType || null, currentState, collectedData)

    let geminiResult: {
      message: string
      extractedData?: Partial<RegistrationData>
      validationErrors?: ValidationError[]
      shouldAdvance?: boolean
    }

    try {
      geminiResult = await processWithGemini(sanitizedMessage, systemPrompt, conversationHistory)
    } catch (error) {
      console.error('Gemini error:', error)
      // Fallback: try to extract data directly
      geminiResult = {
        message: '',
        extractedData: undefined,
        shouldAdvance: false,
      }
    }

    // Merge extracted data
    const newCollectedData = { ...collectedData }
    if (geminiResult.extractedData) {
      if (geminiResult.extractedData.user) {
        newCollectedData.user = { ...newCollectedData.user, ...geminiResult.extractedData.user }
      }
      if (geminiResult.extractedData.business) {
        newCollectedData.business = { ...newCollectedData.business, ...geminiResult.extractedData.business }
      }
    }

    // Direct extraction fallback for simple fields
    const fieldName = extractFieldFromState(currentState)
    if (fieldName && !geminiResult.extractedData) {
      const validation = validateCurrentField(currentState, sanitizedMessage, language)

      if (validation.valid) {
        if (isBusinessField(currentState)) {
          if (!newCollectedData.business) {
            newCollectedData.business = { name: '', category: '', description: '', address: '', phone: '', website: '' }
          }
          ;(newCollectedData.business as unknown as Record<string, string>)[fieldName] = sanitizedMessage
        } else {
          if (!newCollectedData.user) {
            newCollectedData.user = { name: '', email: '', password: '' }
          }
          ;(newCollectedData.user as unknown as Record<string, string>)[fieldName] = sanitizedMessage
        }
        geminiResult.shouldAdvance = true
      } else {
        // Validation failed
        const errorKey = validation.error?.includes('email') ? 'invalidEmail'
          : validation.error?.includes('password') ? 'passwordTooShort'
          : validation.error?.includes('name') ? 'nameTooShort'
          : validation.error?.includes('phone') ? 'invalidPhone'
          : validation.error?.includes('address') ? 'invalidAddress'
          : 'generic'

        const response: ChatResponse = {
          message: getErrorMessage(errorKey as 'invalidEmail', language),
          action: 'continue',
          nextState: currentState,
          validationErrors: [{ field: fieldName, message: validation.error || 'Invalid input' }],
        }
        return NextResponse.json(response)
      }
    }

    // Determine next state
    let nextState: RegistrationState = currentState
    if (geminiResult.shouldAdvance) {
      nextState = getNextState(currentState, registrationType || 'referrer')
    }

    // Build response message
    let responseMessage = geminiResult.message
    if (!responseMessage || geminiResult.shouldAdvance) {
      responseMessage = getStatePrompt(nextState, language, {
        name: newCollectedData.user?.name || '',
        businessName: newCollectedData.business?.name || '',
      })
    }

    // Determine action
    let action: ChatResponse['action'] = 'continue'
    if (nextState === 'confirm_data') {
      action = 'confirm_data'
    } else if (nextState === 'auth_method') {
      action = 'show_google_auth'
    }

    const response: ChatResponse = {
      message: responseMessage,
      action,
      nextState,
      extractedData: newCollectedData,
      validationErrors: geminiResult.validationErrors,
      quickActions: getQuickActions(nextState),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Chat registration error:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
