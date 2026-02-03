'use client'

import { Bot } from 'lucide-react'

interface ChatTypingIndicatorProps {
  message?: string
}

export function ChatTypingIndicator({ message }: ChatTypingIndicatorProps) {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Avatar */}
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-indigo-100 text-indigo-600">
        <Bot className="w-5 h-5" />
      </div>

      {/* Typing indicator */}
      <div className="flex flex-col gap-2">
        <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-gray-100">
          {message ? (
            <span className="text-sm text-gray-600">{message}</span>
          ) : (
            <div className="flex gap-1.5">
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '0ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '150ms' }}
              />
              <span
                className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                style={{ animationDelay: '300ms' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
