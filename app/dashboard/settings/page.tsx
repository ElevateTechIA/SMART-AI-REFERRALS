'use client'

import { useAuth } from '@/lib/auth/context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { formatDate } from '@/lib/utils'
import { User, Mail, Calendar, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function SettingsPage() {
  const { user } = useAuth()
  const { t } = useTranslation()

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('accountSettings.title')}</h1>
        <p className="text-muted-foreground">
          {t('accountSettings.subtitle')}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {t('accountSettings.profileInfo')}
          </CardTitle>
          <CardDescription>
            {t('accountSettings.profileInfoDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{user.name}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <Separator />

          <div className="grid gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('accountSettings.email')}</p>
                <p className="font-medium">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('accountSettings.memberSince')}</p>
                <p className="font-medium">{formatDate(user.createdAt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">{t('accountSettings.roles')}</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.roles.map((role) => (
                    <Badge
                      key={role}
                      variant={role === 'admin' ? 'default' : 'secondary'}
                    >
                      {t('roles.' + role)}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('accountSettings.accountActions')}</CardTitle>
          <CardDescription>
            {t('accountSettings.accountActionsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('accountSettings.contactSupport')}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
