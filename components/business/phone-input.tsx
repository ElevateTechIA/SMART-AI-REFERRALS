'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface PhoneInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  error?: string
  onValidation?: (isValid: boolean) => void
  className?: string
}

export function PhoneInput({
  value,
  onChange,
  placeholder,
  required,
  error: externalError,
  onValidation,
  className,
}: PhoneInputProps) {
  const { t } = useTranslation()
  const [touched, setTouched] = useState(false)
  const [internalError, setInternalError] = useState('')

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value
    const formatter = new AsYouType('US')
    const formatted = formatter.input(raw)
    onChange(formatted)

    // Clear error while typing
    if (internalError) {
      setInternalError('')
    }
  }

  const handleBlur = () => {
    setTouched(true)
    if (!value) {
      setInternalError('')
      onValidation?.(true)
      return
    }

    const valid = isValidPhoneNumber(value, 'US')
    if (!valid) {
      setInternalError(t('validation.invalidPhone'))
      onValidation?.(false)
    } else {
      setInternalError('')
      onValidation?.(true)
    }
  }

  const displayError = externalError || (touched ? internalError : '')

  return (
    <div>
      <Input
        type="tel"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        required={required}
        className={cn(displayError && 'border-red-500', className)}
      />
      {displayError ? (
        <p className="text-xs text-red-500 mt-1">{displayError}</p>
      ) : (
        <p className="text-xs text-muted-foreground mt-1">
          {t('validation.phoneHint')}
        </p>
      )}
    </div>
  )
}
