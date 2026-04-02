'use client'

import { useState, useRef, useEffect } from 'react'
import { Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ChatInputProps {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  maxLength?: number
}

export function ChatInput({
  onSend,
  disabled = false,
  placeholder = 'Type your message...',
  maxLength = 500,
}: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() && !disabled) {
      onSend(message.trim())
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="flex items-end gap-2 p-3 bg-[var(--theme-cardBg,#ffffff)] border-t border-[var(--theme-cardBorder,#e5e7eb)]">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value.slice(0, maxLength))}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className={cn(
              'w-full px-4 py-2.5 pr-12 text-sm rounded-2xl border border-[var(--theme-cardBorder,#e5e7eb)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:border-transparent',
              'resize-none transition-all',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          />
          {/* Character count */}
          {message.length > maxLength * 0.8 && (
            <span
              className={cn(
                'absolute right-12 bottom-2.5 text-xs',
                message.length >= maxLength ? 'text-red-500' : 'text-gray-400'
              )}
            >
              {message.length}/{maxLength}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={disabled || !message.trim()}
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
            'bg-theme-primary text-[var(--theme-primaryForeground,#111827)] transition-all',
            'hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--theme-primary)] focus:ring-offset-2',
            (disabled || !message.trim()) && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </form>
  )
}
