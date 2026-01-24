'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs } from 'firebase/firestore'
import type { Business } from '@/lib/types'
import { Building2, Loader2, ArrowLeft } from 'lucide-react'

const CATEGORIES = [
  'Restaurant',
  'Retail',
  'Health & Beauty',
  'Automotive',
  'Entertainment',
  'Professional Services',
  'Home Services',
  'Fitness',
  'Travel & Tourism',
  'Other',
]

export default function BusinessSettingsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    description: '',
    address: '',
    phone: '',
    website: '',
  })

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!user) return

      try {
        const businessQuery = query(
          collection(db, 'businesses'),
          where('ownerUserId', '==', user.id)
        )
        const snapshot = await getDocs(businessQuery)

        if (snapshot.empty) {
          router.push('/dashboard/business/setup')
          return
        }

        const doc = snapshot.docs[0]
        const data = doc.data()
        const fetchedBusiness: Business = {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate(),
          updatedAt: data.updatedAt?.toDate(),
        } as Business

        setBusiness(fetchedBusiness)
        setFormData({
          name: fetchedBusiness.name,
          category: fetchedBusiness.category,
          description: fetchedBusiness.description || '',
          address: fetchedBusiness.address,
          phone: fetchedBusiness.phone,
          website: fetchedBusiness.website || '',
        })
      } catch (error) {
        console.error('Error fetching business:', error)
        toast({
          title: 'Error',
          description: 'Failed to load business data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBusiness()
  }, [user, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !business) return

    setSaving(true)
    try {
      const response = await fetch('/api/businesses', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          businessId: business.id,
          ownerUserId: user.id,
          ...formData,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update business')
      }

      toast({
        title: 'Success',
        description: 'Business information updated',
      })

      router.push('/dashboard/business')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update business'
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!business) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link
          href="/dashboard/business"
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Dashboard
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Business Settings</h1>
            <p className="text-muted-foreground">
              Update your business information
            </p>
          </div>
          <Badge
            variant={
              business.status === 'active'
                ? 'success'
                : business.status === 'pending'
                ? 'warning'
                : 'destructive'
            }
          >
            {business.status}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Information
          </CardTitle>
          <CardDescription>
            This information will be shown to potential customers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter your business name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Tell customers about your business"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="123 Main St, City, State 12345"
                required
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="website">Website</Label>
                <Input
                  id="website"
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://yourbusiness.com"
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Offer Settings Link */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Referral Offer</CardTitle>
          <CardDescription>
            Configure how much you pay for referrals and what rewards consumers get
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/business/offer">
            <Button variant="outline" className="w-full">
              Configure Offer Settings
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
