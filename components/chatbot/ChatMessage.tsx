'use client'

import { cn } from '@/lib/utils'
import type { Message, QuickAction } from '@/lib/chatbot/types'
import { Bot, User } from 'lucide-react'

interface ChatMessageProps {
  message: Message
  onQuickAction?: (action: QuickAction) => void
}

export function ChatMessage({ message, onQuickAction }: ChatMessageProps) {
  const isAssistant = message.role === 'assistant'

  return (
    <div
      className={cn(
        'flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isAssistant ? 'flex-row' : 'flex-row-reverse'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
          isAssistant
            ? 'bg-indigo-100 text-indigo-600'
            : 'bg-gray-100 text-gray-600'
        )}
      >
        {isAssistant ? (
          <Bot className="w-5 h-5" />
        ) : (
          <User className="w-5 h-5" />
        )}
      </div>

      {/* Message content */}
      <div
        className={cn(
          'flex flex-col gap-2 max-w-[80%]',
          isAssistant ? 'items-start' : 'items-end'
        )}
      >
        <div
          className={cn(
            'px-4 py-2.5 rounded-2xl text-sm',
            isAssistant
              ? 'bg-gray-100 text-gray-900 rounded-tl-sm'
              : 'bg-indigo-600 text-white rounded-tr-sm'
          )}
        >
          {message.content}
        </div>

        {/* Quick actions */}
        {message.quickActions && message.quickActions.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.quickActions.map((action, index) => (
              <button
                key={index}
                onClick={() => onQuickAction?.(action)}
                className={cn(
                  'px-3 py-1.5 text-sm rounded-full border transition-colors',
                  action.type === 'confirm'
                    ? 'border-green-500 text-green-600 hover:bg-green-50'
                    : action.type === 'cancel'
                    ? 'border-gray-300 text-gray-600 hover:bg-gray-50'
                    : action.type === 'auth'
                    ? 'border-indigo-500 text-indigo-600 hover:bg-indigo-50'
                    : 'border-indigo-300 text-indigo-600 hover:bg-indigo-50'
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <span className="text-xs text-gray-400">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>
    </div>
  )
}
