'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore'
import { apiPost } from '@/lib/api-client'
import type { Business, ConsumerRewardType } from '@/lib/types'
import { formatCurrency } from '@/lib/utils'
import { Gift, Loader2, DollarSign, Users, Building2 } from 'lucide-react'

export default function OfferConfigPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [business, setBusiness] = useState<Business | null>(null)
  const [formData, setFormData] = useState({
    pricePerNewCustomer: 100,
    referrerCommissionAmount: 25,
    consumerRewardType: 'cash' as ConsumerRewardType,
    consumerRewardValue: 10,
    allowPlatformAttribution: true,
    active: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch user's business
        const businessQuery = query(
          collection(db, 'businesses'),
          where('ownerUserId', '==', user.id)
        )
        const businessSnapshot = await getDocs(businessQuery)

        if (businessSnapshot.empty) {
          router.push('/dashboard/business/setup')
          return
        }

        const businessDoc = businessSnapshot.docs[0]
        const businessData = businessDoc.data()
        const fetchedBusiness: Business = {
          id: businessDoc.id,
          ...businessData,
          createdAt: businessData.createdAt?.toDate(),
          updatedAt: businessData.updatedAt?.toDate(),
        } as Business
        setBusiness(fetchedBusiness)

        // Fetch existing offer
        const offerDoc = await getDoc(doc(db, 'offers', fetchedBusiness.id))
        if (offerDoc.exists()) {
          const offerData = offerDoc.data()
          setFormData({
            pricePerNewCustomer: offerData.pricePerNewCustomer || 100,
            referrerCommissionAmount: offerData.referrerCommissionAmount || 25,
            consumerRewardType: offerData.consumerRewardType || 'cash',
            consumerRewardValue: offerData.consumerRewardValue || 10,
            allowPlatformAttribution: offerData.allowPlatformAttribution !== false,
            active: offerData.active !== false,
          })
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, router, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !business) return

    setSaving(true)
    try {
      // API uses auth token to verify ownership - no need to pass ownerUserId
      const result = await apiPost<{ success: boolean; error?: string }>(
        '/api/offers',
        {
          ...formData,
          businessId: business.id,
        }
      )

      if (!result.ok) {
        throw new Error(result.error || 'Failed to save offer')
      }

      toast({
        title: 'Offer Saved',
        description: 'Your referral offer has been updated.',
      })

      router.push('/dashboard/business')
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save offer'
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

  const platformCut =
    formData.pricePerNewCustomer -
    formData.referrerCommissionAmount -
    (formData.consumerRewardType === 'cash' ? formData.consumerRewardValue : 0)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Configure Offer</h1>
        <p className="text-muted-foreground">
          Set up how much you pay per new customer and commission splits
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Pricing
            </CardTitle>
            <CardDescription>
              How much you&apos;re willing to pay for a new customer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pricePerNewCustomer">Price per New Customer ($)</Label>
              <Input
                id="pricePerNewCustomer"
                type="number"
                min="1"
                step="1"
                value={formData.pricePerNewCustomer}
                onChange={(e) =>
                  setFormData({ ...formData, pricePerNewCustomer: Number(e.target.value) })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Total amount you pay when a new customer converts
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Referrer Commission
            </CardTitle>
            <CardDescription>
              How much the referrer earns for bringing you a customer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referrerCommissionAmount">Commission Amount ($)</Label>
              <Input
                id="referrerCommissionAmount"
                type="number"
                min="0"
                max={formData.pricePerNewCustomer}
                step="1"
                value={formData.referrerCommissionAmount}
                onChange={(e) =>
                  setFormData({ ...formData, referrerCommissionAmount: Number(e.target.value) })
                }
                required
              />
              <p className="text-xs text-muted-foreground">
                Fixed amount paid to the referrer per conversion
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              Consumer Reward
            </CardTitle>
            <CardDescription>
              Optional incentive for the customer being referred
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="consumerRewardType">Reward Type</Label>
              <Select
                value={formData.consumerRewardType}
                onValueChange={(value: ConsumerRewardType) =>
                  setFormData({ ...formData, consumerRewardType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reward type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Reward</SelectItem>
                  <SelectItem value="cash">Cash Back</SelectItem>
                  <SelectItem value="points">Reward Points</SelectItem>
                  <SelectItem value="discount">Discount (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.consumerRewardType !== 'none' && (
              <div className="space-y-2">
                <Label htmlFor="consumerRewardValue">
                  Reward Value
                  {formData.consumerRewardType === 'discount' ? ' (%)' : ' ($)'}
                </Label>
                <Input
                  id="consumerRewardValue"
                  type="number"
                  min="0"
                  step="1"
                  value={formData.consumerRewardValue}
                  onChange={(e) =>
                    setFormData({ ...formData, consumerRewardValue: Number(e.target.value) })
                  }
                  required
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className="bg-muted/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Payment Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Price per Customer</span>
                <span className="font-medium">{formatCurrency(formData.pricePerNewCustomer)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Referrer Commission</span>
                <span className="font-medium text-orange-600">
                  -{formatCurrency(formData.referrerCommissionAmount)}
                </span>
              </div>
              {formData.consumerRewardType === 'cash' && formData.consumerRewardValue > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consumer Cash Back</span>
                  <span className="font-medium text-orange-600">
                    -{formatCurrency(formData.consumerRewardValue)}
                  </span>
                </div>
              )}
              <div className="border-t pt-3 flex justify-between">
                <span className="font-medium">Platform Fee</span>
                <span className="font-bold text-primary">{formatCurrency(platformCut)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

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
              'Save Offer'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
