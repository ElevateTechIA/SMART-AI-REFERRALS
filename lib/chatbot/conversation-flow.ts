// Conversation flow configuration for registration chatbot

import type { RegistrationState, RegistrationType, QuickAction, BUSINESS_CATEGORIES } from './types'

// State configuration
export interface StateConfig {
  promptKey: string
  nextState: RegistrationState | ((type: RegistrationType) => RegistrationState)
  quickActions?: QuickAction[]
  optional?: boolean
  validationField?: string
}

// Quick action presets
export const QUICK_ACTIONS = {
  chooseType: [
    { label: '💰 Earn Money', value: 'referrer', type: 'text' as const },
    { label: '📈 Get Customers', value: 'business', type: 'text' as const },
  ],
  confirm: [
    { label: '✓ Looks good!', value: 'confirm', type: 'confirm' as const },
    { label: '✎ Edit', value: 'edit', type: 'cancel' as const },
  ],
  authMethod: [
    { label: 'Continue with Google', value: 'google', type: 'auth' as const },
    { label: 'Use email & password', value: 'email', type: 'auth' as const },
  ],
  skip: [
    { label: 'Skip', value: 'skip', type: 'skip' as const },
  ],
  categories: [
    { label: '🍽️ Restaurant', value: 'restaurant', type: 'text' as const },
    { label: '🛍️ Retail', value: 'retail', type: 'text' as const },
    { label: '💇 Health & Beauty', value: 'health_beauty', type: 'text' as const },
    { label: '🚗 Automotive', value: 'automotive', type: 'text' as const },
  ],
}

// State machine configuration
export const STATE_FLOW: Record<RegistrationState, StateConfig> = {
  idle: {
    promptKey: 'greeting',
    nextState: 'choose_type',
    quickActions: [],
  },
  choose_type: {
    promptKey: 'chooseType',
    nextState: 'collect_name',
    quickActions: QUICK_ACTIONS.chooseType,
  },
  collect_name: {
    promptKey: 'askName',
    nextState: 'collect_email',
    validationField: 'name',
  },
  collect_email: {
    promptKey: 'askEmail',
    nextState: 'collect_password',
    validationField: 'email',
  },
  collect_password: {
    promptKey: 'askPassword',
    nextState: (type) => type === 'business' ? 'collect_business_name' : 'confirm_data',
    validationField: 'password',
  },
  collect_business_name: {
    promptKey: 'askBusinessName',
    nextState: 'collect_category',
    validationField: 'businessName',
  },
  collect_category: {
    promptKey: 'askCategory',
    nextState: 'collect_address',
    quickActions: QUICK_ACTIONS.categories,
    validationField: 'category',
  },
  collect_address: {
    promptKey: 'askAddress',
    nextState: 'collect_phone',
    validationField: 'address',
  },
  collect_phone: {
    promptKey: 'askPhone',
    nextState: 'collect_description',
    validationField: 'phone',
  },
  collect_description: {
    promptKey: 'askDescription',
    nextState: 'collect_website',
    optional: true,
    quickActions: QUICK_ACTIONS.skip,
    validationField: 'description',
  },
  collect_website: {
    promptKey: 'askWebsite',
    nextState: 'confirm_data',
    optional: true,
    quickActions: QUICK_ACTIONS.skip,
    validationField: 'website',
  },
  confirm_data: {
    promptKey: 'confirmData',
    nextState: 'auth_method',
    quickActions: QUICK_ACTIONS.confirm,
  },
  auth_method: {
    promptKey: 'authMethod',
    nextState: 'processing',
    quickActions: QUICK_ACTIONS.authMethod,
  },
  processing: {
    promptKey: 'processing',
    nextState: 'complete',
  },
  complete: {
    promptKey: 'complete',
    nextState: 'complete',
  },
  error: {
    promptKey: 'error',
    nextState: 'error',
  },
}

// Get next state based on registration type
export function getNextState(
  currentState: RegistrationState,
  registrationType: RegistrationType
): RegistrationState {
  const config = STATE_FLOW[currentState]
  if (typeof config.nextState === 'function') {
    return config.nextState(registrationType)
  }
  return config.nextState
}

// Get state configuration
export function getStateConfig(state: RegistrationState): StateConfig {
  return STATE_FLOW[state]
}

// Check if current state is optional
export function isOptionalState(state: RegistrationState): boolean {
  return STATE_FLOW[state]?.optional ?? false
}

// Get quick actions for state
export function getQuickActions(state: RegistrationState): QuickAction[] {
  return STATE_FLOW[state]?.quickActions ?? []
}

// State flow for referrer
export const REFERRER_FLOW: RegistrationState[] = [
  'choose_type',
  'collect_name',
  'collect_email',
  'collect_password',
  'confirm_data',
  'auth_method',
  'processing',
  'complete',
]

// State flow for business
export const BUSINESS_FLOW: RegistrationState[] = [
  'choose_type',
  'collect_name',
  'collect_email',
  'collect_password',
  'collect_business_name',
  'collect_category',
  'collect_address',
  'collect_phone',
  'collect_description',
  'collect_website',
  'confirm_data',
  'auth_method',
  'processing',
  'complete',
]

// Get progress percentage
export function getProgress(
  currentState: RegistrationState,
  registrationType: RegistrationType | null
): number {
  if (!registrationType) return 0

  const flow = registrationType === 'referrer' ? REFERRER_FLOW : BUSINESS_FLOW
  const currentIndex = flow.indexOf(currentState)

  if (currentIndex === -1) return 0

  return Math.round((currentIndex / (flow.length - 1)) * 100)
}
