'use client'

import { Check, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RegistrationData, RegistrationType } from '@/lib/chatbot/types'
import { getCategoryLabel } from '@/lib/chatbot/prompts'

interface ChatSummaryCardProps {
  data: Partial<RegistrationData>
  registrationType: RegistrationType
  language: 'en' | 'es'
  onConfirm: () => void
  onEdit: () => void
}

export function ChatSummaryCard({
  data,
  registrationType,
  language,
  onConfirm,
  onEdit,
}: ChatSummaryCardProps) {
  const labels = {
    en: {
      title: 'Account Summary',
      personalInfo: 'Personal Information',
      businessInfo: 'Business Information',
      name: 'Name',
      email: 'Email',
      businessName: 'Business Name',
      category: 'Category',
      address: 'Address',
      phone: 'Phone',
      website: 'Website',
      description: 'Description',
      confirm: 'Looks good!',
      edit: 'Edit',
      notProvided: 'Not provided',
    },
    es: {
      title: 'Resumen de Cuenta',
      personalInfo: 'Información Personal',
      businessInfo: 'Información del Negocio',
      name: 'Nombre',
      email: 'Correo',
      businessName: 'Nombre del Negocio',
      category: 'Categoría',
      address: 'Dirección',
      phone: 'Teléfono',
      website: 'Sitio Web',
      description: 'Descripción',
      confirm: '¡Se ve bien!',
      edit: 'Editar',
      notProvided: 'No proporcionado',
    },
  }

  const t = labels[language]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-indigo-500 to-indigo-600">
        <h3 className="text-white font-medium">{t.title}</h3>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Personal Info */}
        <div>
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
            {t.personalInfo}
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t.name}</span>
              <span className="text-sm font-medium text-gray-900">
                {data.user?.name || t.notProvided}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">{t.email}</span>
              <span className="text-sm font-medium text-gray-900">
                {data.user?.email || t.notProvided}
              </span>
            </div>
          </div>
        </div>

        {/* Business Info (only for business registration) */}
        {registrationType === 'business' && data.business && (
          <div className="pt-3 border-t border-gray-100">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              {t.businessInfo}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t.businessName}</span>
                <span className="text-sm font-medium text-gray-900">
                  {data.business.name || t.notProvided}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t.category}</span>
                <span className="text-sm font-medium text-gray-900">
                  {data.business.category
                    ? getCategoryLabel(data.business.category, language)
                    : t.notProvided}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t.address}</span>
                <span className="text-sm font-medium text-gray-900 text-right max-w-[60%]">
                  {data.business.address || t.notProvided}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">{t.phone}</span>
                <span className="text-sm font-medium text-gray-900">
                  {data.business.phone || t.notProvided}
                </span>
              </div>
              {data.business.website && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">{t.website}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {data.business.website}
                  </span>
                </div>
              )}
              {data.business.description && (
                <div>
                  <span className="text-sm text-gray-600">{t.description}</span>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {data.business.description}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-gray-50 flex gap-2">
        <button
          onClick={onEdit}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2',
            'text-sm font-medium text-gray-700 bg-white',
            'border border-gray-300 rounded-lg',
            'hover:bg-gray-50 transition-colors'
          )}
        >
          <Pencil className="w-4 h-4" />
          {t.edit}
        </button>
        <button
          onClick={onConfirm}
          className={cn(
            'flex-1 flex items-center justify-center gap-2 px-4 py-2',
            'text-sm font-medium text-white bg-indigo-600',
            'rounded-lg',
            'hover:bg-indigo-700 transition-colors'
          )}
        >
          <Check className="w-4 h-4" />
          {t.confirm}
        </button>
      </div>
    </div>
  )
}
