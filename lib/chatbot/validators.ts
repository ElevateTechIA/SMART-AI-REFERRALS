// Validation functions for registration chatbot

import type { ValidationError, UserRegistrationData, BusinessRegistrationData } from './types'

// Sanitize input - remove HTML and limit length
export function sanitizeInput(input: string, maxLength = 1000): string {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .slice(0, maxLength)
}

// Email validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateEmail(email: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(email, 254)
  if (!sanitized) {
    return { valid: false, error: 'Email is required' }
  }
  if (!EMAIL_REGEX.test(sanitized)) {
    return { valid: false, error: 'Invalid email format' }
  }
  return { valid: true }
}

// Name validation
export function validateName(name: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(name, 100)
  if (!sanitized) {
    return { valid: false, error: 'Name is required' }
  }
  if (sanitized.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' }
  }
  if (sanitized.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' }
  }
  return { valid: true }
}

// Password validation
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' }
  }
  return { valid: true }
}

// Phone validation
export function validatePhone(phone: string): { valid: boolean; error?: string } {
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned) {
    return { valid: false, error: 'Phone number is required' }
  }
  if (cleaned.length < 7) {
    return { valid: false, error: 'Phone number must be at least 7 digits' }
  }
  if (cleaned.length > 20) {
    return { valid: false, error: 'Phone number must be less than 20 digits' }
  }
  return { valid: true }
}

// Address validation
export function validateAddress(address: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(address, 500)
  if (!sanitized) {
    return { valid: false, error: 'Address is required' }
  }
  if (sanitized.length < 5) {
    return { valid: false, error: 'Address must be at least 5 characters' }
  }
  if (sanitized.length > 500) {
    return { valid: false, error: 'Address must be less than 500 characters' }
  }
  return { valid: true }
}

// Business name validation
export function validateBusinessName(name: string): { valid: boolean; error?: string } {
  const sanitized = sanitizeInput(name, 100)
  if (!sanitized) {
    return { valid: false, error: 'Business name is required' }
  }
  if (sanitized.length < 2) {
    return { valid: false, error: 'Business name must be at least 2 characters' }
  }
  if (sanitized.length > 100) {
    return { valid: false, error: 'Business name must be less than 100 characters' }
  }
  return { valid: true }
}

// Website validation (optional field)
export function validateWebsite(website: string): { valid: boolean; error?: string } {
  if (!website) {
    return { valid: true } // Optional field
  }
  const sanitized = sanitizeInput(website, 500)
  try {
    new URL(sanitized.startsWith('http') ? sanitized : `https://${sanitized}`)
    return { valid: true }
  } catch {
    return { valid: false, error: 'Invalid website URL' }
  }
}

// Description validation (optional field)
export function validateDescription(description: string): { valid: boolean; error?: string } {
  if (!description) {
    return { valid: true } // Optional field
  }
  const sanitized = sanitizeInput(description, 1000)
  if (sanitized.length > 1000) {
    return { valid: false, error: 'Description must be less than 1000 characters' }
  }
  return { valid: true }
}

// Validate all user data
export function validateUserData(data: Partial<UserRegistrationData>): ValidationError[] {
  const errors: ValidationError[] = []

  if (data.name !== undefined) {
    const nameResult = validateName(data.name)
    if (!nameResult.valid) {
      errors.push({ field: 'name', message: nameResult.error! })
    }
  }

  if (data.email !== undefined) {
    const emailResult = validateEmail(data.email)
    if (!emailResult.valid) {
      errors.push({ field: 'email', message: emailResult.error! })
    }
  }

  if (data.password !== undefined) {
    const passwordResult = validatePassword(data.password)
    if (!passwordResult.valid) {
      errors.push({ field: 'password', message: passwordResult.error! })
    }
  }

  return errors
}

// Validate all business data
export function validateBusinessData(data: Partial<BusinessRegistrationData>): ValidationError[] {
  const errors: ValidationError[] = []

  if (data.name !== undefined) {
    const nameResult = validateBusinessName(data.name)
    if (!nameResult.valid) {
      errors.push({ field: 'businessName', message: nameResult.error! })
    }
  }

  if (data.phone !== undefined) {
    const phoneResult = validatePhone(data.phone)
    if (!phoneResult.valid) {
      errors.push({ field: 'phone', message: phoneResult.error! })
    }
  }

  if (data.address !== undefined) {
    const addressResult = validateAddress(data.address)
    if (!addressResult.valid) {
      errors.push({ field: 'address', message: addressResult.error! })
    }
  }

  if (data.website !== undefined) {
    const websiteResult = validateWebsite(data.website)
    if (!websiteResult.valid) {
      errors.push({ field: 'website', message: websiteResult.error! })
    }
  }

  if (data.description !== undefined) {
    const descriptionResult = validateDescription(data.description)
    if (!descriptionResult.valid) {
      errors.push({ field: 'description', message: descriptionResult.error! })
    }
  }

  return errors
}

// Extract email from text
export function extractEmail(text: string): string | null {
  const match = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/)
  return match ? match[0].toLowerCase() : null
}

// Extract phone from text
export function extractPhone(text: string): string | null {
  const cleaned = text.replace(/[^\d+()-\s]/g, '').trim()
  const digits = cleaned.replace(/\D/g, '')
  if (digits.length >= 7 && digits.length <= 20) {
    return cleaned
  }
  return null
}
