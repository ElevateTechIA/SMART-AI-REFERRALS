'use client'

import Link from 'next/link'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '@/components/language-switcher'
import { ElivBrand } from '@/components/eliv-logo'
import { Shield, QrCode, Receipt, DollarSign, AlertTriangle, Search, Scale, Lock, RefreshCw } from 'lucide-react'

export default function TermsPage() {
  const { t } = useTranslation()

  const sections = [
    {
      icon: Shield,
      title: t('terms.agreementTitle'),
      content: t('terms.agreementText'),
    },
    {
      icon: Shield,
      title: t('terms.eligibilityTitle'),
      content: t('terms.eligibilityText'),
    },
    {
      icon: QrCode,
      title: t('terms.referralProcessTitle'),
      content: t('terms.referralProcessIntro'),
      steps: [
        { title: t('terms.referralStep1Title'), text: t('terms.referralStep1Text'), icon: QrCode },
        { title: t('terms.referralStep2Title'), text: t('terms.referralStep2Text'), icon: Receipt },
      ],
      footer: t('terms.referralApproval'),
    },
    {
      icon: DollarSign,
      title: t('terms.commissionsTitle'),
      bullets: [
        { label: t('terms.commissionsRates') },
        { label: t('terms.commissionsModify') },
        { label: t('terms.commissionsPayout') },
      ],
    },
    {
      icon: AlertTriangle,
      title: t('terms.antiFraudTitle'),
      content: t('terms.antiFraudIntro'),
      bullets: [
        { label: t('terms.antiFraudSelfRefer') },
        { label: t('terms.antiFraudBots') },
        { label: t('terms.antiFraudMisrepresent') },
        { label: t('terms.antiFraudBypass') },
      ],
      footer: t('terms.antiFraudPenalty'),
      footerType: 'warning' as const,
    },
    {
      icon: Search,
      title: t('terms.auditTitle'),
      content: t('terms.auditText'),
    },
    {
      icon: Scale,
      title: t('terms.liabilityTitle'),
      content: t('terms.liabilityText'),
    },
    {
      icon: Lock,
      title: t('terms.privacyTitle'),
      content: t('terms.privacyText'),
    },
    {
      icon: RefreshCw,
      title: t('terms.modificationsTitle'),
      content: t('terms.modificationsText'),
    },
  ]

  return (
    <div className="min-h-screen bg-white">
      <div className="min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="px-6 py-6 border-b border-gray-200">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <ElivBrand responsive="md/lg" forceDark />
            </Link>
            <LanguageSwitcher />
          </div>
        </nav>

        {/* Content */}
        <main className="flex-1 px-4 py-12">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-3 text-gray-900">
                {t('terms.pageTitle')}
              </h1>
              <p className="text-sm text-gray-500">
                {t('terms.lastUpdated')}
              </p>
            </div>

            {/* Sections */}
            <div className="space-y-8">
              {sections.map((section, index) => (
                <section
                  key={index}
                  className="rounded-2xl p-6 md:p-8 bg-gray-50 border border-gray-200"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: `linear-gradient(to bottom right, var(--theme-gradientFrom), var(--theme-gradientTo))` }}
                    >
                      <section.icon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold pt-1.5 text-gray-900">
                      {section.title}
                    </h2>
                  </div>

                  {section.content && (
                    <p className="leading-relaxed ml-0 sm:ml-14 text-gray-600">
                      {section.content}
                    </p>
                  )}

                  {section.steps && (
                    <div className="ml-0 sm:ml-14 mt-4 space-y-3">
                      {section.steps.map((step, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 rounded-xl p-4 bg-white border border-gray-200"
                        >
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: 'color-mix(in srgb, var(--theme-primary) 15%, transparent)' }}
                          >
                            <step.icon className="w-4 h-4" style={{ color: 'var(--theme-primary)' }} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {step.title}
                            </p>
                            <p className="text-sm text-gray-600">
                              {step.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.bullets && (
                    <ul className="ml-0 sm:ml-14 mt-4 space-y-2">
                      {section.bullets.map((bullet, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-gray-600"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0"
                            style={{ background: 'var(--theme-primary)' }}
                          />
                          <span>{bullet.label}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.footer && (
                    <div
                      className="ml-0 sm:ml-14 mt-4 p-4 rounded-xl"
                      style={{
                        background: section.footerType === 'warning'
                          ? 'color-mix(in srgb, var(--theme-error, #ef4444) 10%, transparent)'
                          : 'color-mix(in srgb, var(--theme-primary) 10%, transparent)',
                        border: section.footerType === 'warning'
                          ? '1px solid color-mix(in srgb, var(--theme-error, #ef4444) 25%, transparent)'
                          : '1px solid color-mix(in srgb, var(--theme-primary) 25%, transparent)',
                      }}
                    >
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: section.footerType === 'warning'
                            ? 'var(--theme-error, #ef4444)'
                            : 'var(--theme-primary)',
                        }}
                      >
                        {section.footer}
                      </p>
                    </div>
                  )}
                </section>
              ))}
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-8 border-t border-gray-200">
          <div className="max-w-4xl mx-auto px-6 text-center">
            <p className="text-gray-400">
              {t('landing.allRightsReserved')}
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
