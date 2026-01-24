'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore'
import type { Business, Visit, Earning } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Gift,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Share2,
  ArrowRight,
  Building2,
} from 'lucide-react'

export default function VisitsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [visits, setVisits] = useState<(Visit & { business?: Business })[]>([])
  const [rewards, setRewards] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return

      try {
        // Fetch visits as consumer
        const visitsQuery = query(
          collection(db, 'visits'),
          where('consumerUserId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const visitsSnapshot = await getDocs(visitsQuery)
        const visitsList: (Visit & { business?: Business })[] = []

        for (const visitDoc of visitsSnapshot.docs) {
          const data = visitDoc.data()
          const visit: Visit = {
            id: visitDoc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Visit

          // Fetch business details
          const businessDoc = await getDoc(doc(db, 'businesses', visit.businessId))
          if (businessDoc.exists()) {
            const businessData = businessDoc.data()
            visitsList.push({
              ...visit,
              business: {
                id: businessDoc.id,
                ...businessData,
                createdAt: businessData.createdAt?.toDate(),
                updatedAt: businessData.updatedAt?.toDate(),
              } as Business,
            })
          } else {
            visitsList.push(visit)
          }
        }

        setVisits(visitsList)

        // Fetch consumer rewards
        const rewardsQuery = query(
          collection(db, 'earnings'),
          where('userId', '==', user.id),
          where('type', '==', 'CONSUMER_REWARD'),
          orderBy('createdAt', 'desc')
        )
        const rewardsSnapshot = await getDocs(rewardsQuery)
        const rewardsList: Earning[] = []
        rewardsSnapshot.forEach((doc) => {
          const data = doc.data()
          rewardsList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Earning)
        })
        setRewards(rewardsList)
      } catch (error) {
        console.error('Error fetching data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load visit data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, toast])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const stats = {
    totalVisits: visits.length,
    converted: visits.filter((v) => v.status === 'CONVERTED').length,
    pending: visits.filter((v) => v.status === 'CREATED' || v.status === 'CHECKED_IN').length,
    totalRewards: rewards
      .filter((r) => r.status === 'PAID' || r.status === 'APPROVED')
      .reduce((sum, r) => sum + r.amount, 0),
    pendingRewards: rewards
      .filter((r) => r.status === 'PENDING')
      .reduce((sum, r) => sum + r.amount, 0),
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Visits</h1>
          <p className="text-muted-foreground">
            Track your visits and rewards from referrals
          </p>
        </div>
        <Link href="/dashboard/referrals">
          <Button className="gap-2">
            <Share2 className="h-4 w-4" />
            Start Referring
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">Places you&apos;ve visited</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmed</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.converted}</div>
            <p className="text-xs text-muted-foreground">{stats.pending} pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRewards)}</div>
            <p className="text-xs text-muted-foreground">Earned from visits</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Rewards</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingRewards)}</div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>
      </div>

      {/* Become a Referrer CTA */}
      <Card className="bg-primary/5 border-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            Share & Earn More
          </CardTitle>
          <CardDescription>
            Loved a business? Share it with friends and earn commissions when they visit!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/dashboard/referrals">
            <Button className="gap-2">
              Get Referral Links <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </CardContent>
      </Card>

      {/* Visit History */}
      <Card>
        <CardHeader>
          <CardTitle>Visit History</CardTitle>
          <CardDescription>All your visits and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {visits.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No Visits Yet</h3>
              <p className="text-muted-foreground mb-4">
                Scan a referral QR code or use a referral link to get started!
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {visits.map((visit) => (
                <div
                  key={visit.id}
                  className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {visit.business?.name || 'Unknown Business'}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {visit.business?.category}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Visited {formatDate(visit.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 ml-16 md:ml-0">
                    <div className="text-right">
                      <Badge
                        variant={
                          visit.status === 'CONVERTED'
                            ? 'success'
                            : visit.status === 'REJECTED'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {visit.status === 'CONVERTED'
                          ? 'Confirmed'
                          : visit.status === 'REJECTED'
                          ? 'Rejected'
                          : 'Pending'}
                      </Badge>
                      {visit.attributionType === 'REFERRER' && (
                        <p className="text-xs text-muted-foreground mt-1">Via referral</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards History */}
      {rewards.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Rewards History</CardTitle>
            <CardDescription>Rewards earned from your visits</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {rewards.map((reward) => {
                const visit = visits.find((v) => v.id === reward.visitId)
                return (
                  <div
                    key={reward.id}
                    className="py-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <Gift className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium">Reward from Visit</p>
                        <p className="text-sm text-muted-foreground">
                          {visit?.business?.name} • {formatDate(reward.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold text-green-600">
                        +{formatCurrency(reward.amount)}
                      </span>
                      <Badge
                        variant={
                          reward.status === 'PAID'
                            ? 'success'
                            : reward.status === 'APPROVED'
                            ? 'default'
                            : 'secondary'
                        }
                      >
                        {reward.status}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
