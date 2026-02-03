// Registration Chatbot Types

// Message roles
export type MessageRole = 'user' | 'assistant'

// Chat message interface
export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: Date
  quickActions?: QuickAction[]
  showSummary?: boolean
  summaryData?: Partial<RegistrationData>
}

// Quick action buttons
export interface QuickAction {
  label: string
  value: string
  type: 'text' | 'confirm' | 'cancel' | 'skip' | 'auth'
}

// Registration types
export type RegistrationType = 'referrer' | 'business'

// Registration states
export type RegistrationState =
  | 'idle'
  | 'choose_type'
  | 'collect_name'
  | 'collect_email'
  | 'collect_password'
  | 'collect_business_name'
  | 'collect_category'
  | 'collect_address'
  | 'collect_phone'
  | 'collect_description'
  | 'collect_website'
  | 'confirm_data'
  | 'auth_method'
  | 'processing'
  | 'complete'
  | 'error'

// User data collected during registration
export interface UserRegistrationData {
  name: string
  email: string
  password: string
}

// Business data collected during registration
export interface BusinessRegistrationData {
  name: string
  category: string
  description: string
  address: string
  phone: string
  website: string
}

// Combined registration data
export interface RegistrationData {
  user: UserRegistrationData
  business: BusinessRegistrationData
}

// Business categories
export const BUSINESS_CATEGORIES = [
  'restaurant',
  'retail',
  'health_beauty',
  'automotive',
  'professional_services',
  'entertainment',
  'fitness',
  'other',
] as const

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number]

// Validation error
export interface ValidationError {
  field: string
  message: string
}

// API Request
export interface ChatRequest {
  message: string
  conversationHistory: Array<{
    role: MessageRole
    content: string
  }>
  currentState: RegistrationState
  collectedData: Partial<RegistrationData>
  language: 'en' | 'es'
  registrationType?: RegistrationType
}

// API Response actions
export type ChatAction =
  | 'continue'
  | 'confirm_data'
  | 'execute_registration'
  | 'show_google_auth'
  | 'error'

// API Response
export interface ChatResponse {
  message: string
  action: ChatAction
  nextState: RegistrationState
  extractedData?: Partial<RegistrationData>
  validationErrors?: ValidationError[]
  quickActions?: QuickAction[]
}

// Chatbot component state
export interface ChatbotState {
  messages: Message[]
  isLoading: boolean
  registrationType: RegistrationType | null
  currentState: RegistrationState
  userData: UserRegistrationData
  businessData: BusinessRegistrationData
  showGoogleAuth: boolean
  showConfirmation: boolean
  validationErrors: ValidationError[]
}

// Initial state factory
export function createInitialChatbotState(): ChatbotState {
  return {
    messages: [],
    isLoading: false,
    registrationType: null,
    currentState: 'idle',
    userData: {
      name: '',
      email: '',
      password: '',
    },
    businessData: {
      name: '',
      category: '',
      description: '',
      address: '',
      phone: '',
      website: '',
    },
    showGoogleAuth: false,
    showConfirmation: false,
    validationErrors: [],
  }
}

// Generate unique message ID
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
