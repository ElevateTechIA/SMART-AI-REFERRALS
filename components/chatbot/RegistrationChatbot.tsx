'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X, MessageCircle, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/context'
import { apiPost } from '@/lib/api-client'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import { ChatTypingIndicator } from './ChatTypingIndicator'
import { ChatSummaryCard } from './ChatSummaryCard'
import { getProgress } from '@/lib/chatbot/conversation-flow'
import { getStatePrompt } from '@/lib/chatbot/prompts'
import type {
  Message,
  QuickAction,
  RegistrationState,
  RegistrationType,
  RegistrationData,
  ChatRequest,
  ChatResponse,
} from '@/lib/chatbot/types'

interface RegistrationChatbotProps {
  language?: 'en' | 'es'
  defaultType?: RegistrationType
  embedded?: boolean
  onClose?: () => void
  onComplete?: () => void
}

export function RegistrationChatbot({
  language = 'en',
  defaultType,
  embedded = false,
  onClose,
  onComplete,
}: RegistrationChatbotProps) {
  const router = useRouter()
  const { signInWithGoogle } = useAuth()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [isMinimized, setIsMinimized] = useState(false)

  // State
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [registrationType, setRegistrationType] = useState<RegistrationType | null>(defaultType || null)
  const [currentState, setCurrentState] = useState<RegistrationState>('idle')
  const [collectedData, setCollectedData] = useState<Partial<RegistrationData>>({
    user: { name: '', email: '', password: '' },
    business: { name: '', category: '', description: '', address: '', phone: '', website: '' },
  })
  const [showSummary, setShowSummary] = useState(false)

  // Generate unique ID
  const generateId = () => `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  // Add message to chat
  const addMessage = useCallback((
    role: 'user' | 'assistant',
    content: string,
    quickActions?: QuickAction[]
  ) => {
    const newMessage: Message = {
      id: generateId(),
      role,
      content,
      timestamp: new Date(),
      quickActions,
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage
  }, [])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // Initialize chat
  useEffect(() => {
    if (messages.length === 0 && currentState === 'idle') {
      const greeting = getStatePrompt('idle', language)
      addMessage('assistant', greeting, [
        { label: language === 'es' ? '💰 Ganar Dinero' : '💰 Earn Money', value: 'referrer', type: 'text' },
        { label: language === 'es' ? '📈 Conseguir Clientes' : '📈 Get Customers', value: 'business', type: 'text' },
      ])
      setCurrentState('choose_type')
    }
  }, [messages.length, currentState, language, addMessage])

  // Send message to API
  const sendMessage = async (userMessage: string) => {
    if (isLoading) return

    // Add user message
    addMessage('user', userMessage)
    setIsLoading(true)

    try {
      const request: ChatRequest = {
        message: userMessage,
        conversationHistory: messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        currentState,
        collectedData,
        language,
        registrationType: registrationType || undefined,
      }

      const response = await fetch('/api/chat/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      })

      const data: ChatResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send message')
      }

      // Update state
      setCurrentState(data.nextState)

      // Update collected data
      if (data.extractedData) {
        setCollectedData(prev => {
          const newData: Partial<RegistrationData> = { ...prev }
          if (data.extractedData?.user) {
            newData.user = {
              name: data.extractedData.user.name || prev.user?.name || '',
              email: data.extractedData.user.email || prev.user?.email || '',
              password: data.extractedData.user.password || prev.user?.password || '',
            }
          }
          if (data.extractedData?.business) {
            newData.business = {
              name: data.extractedData.business.name || prev.business?.name || '',
              category: data.extractedData.business.category || prev.business?.category || '',
              description: data.extractedData.business.description || prev.business?.description || '',
              address: data.extractedData.business.address || prev.business?.address || '',
              phone: data.extractedData.business.phone || prev.business?.phone || '',
              website: data.extractedData.business.website || prev.business?.website || '',
            }
          }
          return newData
        })
      }

      // Detect registration type from response or user message
      if (currentState === 'choose_type') {
        const lowerMsg = userMessage.toLowerCase()
        if (lowerMsg.includes('earn') || lowerMsg.includes('money') || lowerMsg.includes('referr') || lowerMsg.includes('ganar') || lowerMsg.includes('dinero')) {
          setRegistrationType('referrer')
        } else if (lowerMsg.includes('business') || lowerMsg.includes('customer') || lowerMsg.includes('negocio') || lowerMsg.includes('cliente')) {
          setRegistrationType('business')
        }
      }

      // Handle actions
      if (data.action === 'confirm_data') {
        setShowSummary(true)
      }

      if (data.action === 'execute_registration') {
        await handleRegistration(data.extractedData)
        return
      }

      // Add assistant message
      addMessage('assistant', data.message, data.quickActions)
    } catch (error) {
      console.error('Chat error:', error)
      addMessage(
        'assistant',
        language === 'es'
          ? 'Lo siento, algo salió mal. Por favor intenta de nuevo.'
          : 'Sorry, something went wrong. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle quick actions
  const handleQuickAction = (action: QuickAction) => {
    if (action.type === 'auth') {
      handleGoogleAuth()
    } else if (action.type === 'confirm') {
      handleConfirm()
    } else if (action.type === 'cancel') {
      setShowSummary(false)
      addMessage(
        'assistant',
        language === 'es'
          ? '¿Qué te gustaría cambiar?'
          : 'What would you like to change?'
      )
    } else {
      sendMessage(action.value)
    }
  }

  // Handle confirmation - go straight to Google auth
  const handleConfirm = () => {
    setShowSummary(false)
    setCurrentState('auth_method')
    addMessage('assistant',
      language === 'es'
        ? '¡Perfecto! Vamos a crear tu cuenta con Google.'
        : 'Perfect! Let\'s create your account with Google.',
      [{ label: 'Continue with Google', value: 'google', type: 'auth' }]
    )
  }

  // Handle registration
  const handleRegistration = async (data?: Partial<RegistrationData>) => {
    const finalData = data || collectedData
    setIsLoading(true)

    try {
      addMessage(
        'assistant',
        language === 'es' ? 'Configurando tu cuenta...' : 'Setting up your account...'
      )

      // This is handled by Google Auth or Email Auth handlers
    } catch (error) {
      console.error('Registration error:', error)
      addMessage(
        'assistant',
        language === 'es'
          ? 'Hubo un error al crear tu cuenta. Por favor intenta de nuevo.'
          : 'There was an error creating your account. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Handle Google Auth
  const handleGoogleAuth = async () => {
    setIsLoading(true)
    addMessage(
      'assistant',
      language === 'es' ? 'Abriendo Google Sign-In...' : 'Opening Google Sign-In...'
    )

    try {
      // Pass the correct role based on registration type
      const role = registrationType === 'business' ? 'business' : 'referrer'
      await signInWithGoogle(role)

      // If business registration, try to create business
      if (registrationType === 'business' && collectedData.business?.name) {
        const businessResult = await apiPost('/api/businesses', {
          name: collectedData.business.name,
          category: collectedData.business.category || 'other',
          description: collectedData.business.description || '',
          address: collectedData.business.address,
          phone: collectedData.business.phone,
          website: collectedData.business.website || undefined,
        })

        if (!businessResult.ok && businessResult.error?.includes('already have a business')) {
          // User already has a business - just welcome them back
          addMessage(
            'assistant',
            language === 'es'
              ? '¡Bienvenido de nuevo! Ya tienes un negocio registrado. Redirigiéndote a tu panel...'
              : 'Welcome back! You already have a business registered. Redirecting to your dashboard...'
          )
          setTimeout(() => {
            onComplete?.()
            router.push('/dashboard/business')
          }, 1500)
          return
        }
      }

      addMessage(
        'assistant',
        language === 'es'
          ? '¡Listo! Redirigiéndote a tu panel...'
          : 'All set! Redirecting to your dashboard...'
      )

      setTimeout(() => {
        onComplete?.()
        if (registrationType === 'business') {
          router.push('/dashboard/business/offer')
        } else {
          router.push('/dashboard')
        }
      }, 1500)
    } catch (error) {
      console.error('Google auth error:', error)
      addMessage(
        'assistant',
        language === 'es'
          ? 'No se pudo completar el registro con Google. ¿Quieres intentar con email?'
          : 'Could not complete Google sign-up. Would you like to try with email?'
      )
    } finally {
      setIsLoading(false)
    }
  }

  // Progress percentage
  const progress = getProgress(currentState, registrationType)

  // Minimized state
  if (isMinimized && !embedded) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-all hover:scale-105 z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div
      className={cn(
        'flex flex-col bg-white',
        embedded
          ? 'w-full h-full rounded-xl border border-gray-200 shadow-sm'
          : 'fixed bottom-6 right-6 w-[380px] h-[600px] rounded-2xl shadow-2xl border border-gray-200 z-50'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-t-xl">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-white font-medium text-sm">
              {language === 'es' ? 'Asistente de Registro' : 'Registration Assistant'}
            </h3>
            {registrationType && (
              <p className="text-white/70 text-xs">
                {registrationType === 'business'
                  ? language === 'es' ? 'Registro de Negocio' : 'Business Registration'
                  : language === 'es' ? 'Registro de Referidor' : 'Referrer Registration'
                }
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!embedded && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <Minimize2 className="w-4 h-4 text-white" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {progress > 0 && (
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-indigo-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <ChatMessage
            key={message.id}
            message={message}
            onQuickAction={handleQuickAction}
          />
        ))}

        {/* Summary card */}
        {showSummary && (
          <ChatSummaryCard
            data={collectedData}
            registrationType={registrationType || 'referrer'}
            language={language}
            onConfirm={handleConfirm}
            onEdit={() => {
              setShowSummary(false)
              addMessage(
                'assistant',
                language === 'es'
                  ? '¿Qué te gustaría cambiar?'
                  : 'What would you like to change?'
              )
            }}
          />
        )}

        {/* Loading indicator */}
        {isLoading && <ChatTypingIndicator />}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <ChatInput
        onSend={sendMessage}
        disabled={isLoading || showSummary}
        placeholder={
          language === 'es'
            ? 'Escribe tu mensaje...'
            : 'Type your message...'
        }
      />
    </div>
  )
}
