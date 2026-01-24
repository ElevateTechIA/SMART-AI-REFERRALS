'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/lib/auth/context'
import { db } from '@/lib/firebase/client'
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore'
import type { Business, Visit, Earning } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2,
  Users,
  DollarSign,
  TrendingUp,
  ArrowRight,
  Share2,
  Gift,
  QrCode,
} from 'lucide-react'

export default function DashboardPage() {
  const { user } = useAuth()
  const [stats, setStats] = useState({
    totalReferrals: 0,
    totalEarnings: 0,
    pendingEarnings: 0,
    totalVisits: 0,
  })
  const [recentVisits, setRecentVisits] = useState<Visit[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return

      try {
        // Fetch user's earnings
        const earningsQuery = query(
          collection(db, 'earnings'),
          where('userId', '==', user.id),
          orderBy('createdAt', 'desc')
        )
        const earningsSnapshot = await getDocs(earningsQuery)
        const earnings: Earning[] = []
        let totalEarnings = 0
        let pendingEarnings = 0

        earningsSnapshot.forEach((doc) => {
          const data = doc.data()
          earnings.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Earning)

          if (data.status === 'PAID' || data.status === 'APPROVED') {
            totalEarnings += data.amount
          }
          if (data.status === 'PENDING') {
            pendingEarnings += data.amount
          }
        })

        // Fetch user's visits (as consumer)
        const visitsQuery = query(
          collection(db, 'visits'),
          where('consumerUserId', '==', user.id),
          orderBy('createdAt', 'desc'),
          limit(5)
        )
        const visitsSnapshot = await getDocs(visitsQuery)
        const visits: Visit[] = []
        visitsSnapshot.forEach((doc) => {
          const data = doc.data()
          visits.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Visit)
        })

        // Fetch referrals (visits where user is referrer)
        const referralsQuery = query(
          collection(db, 'visits'),
          where('referrerUserId', '==', user.id)
        )
        const referralsSnapshot = await getDocs(referralsQuery)

        // Fetch active businesses for referral
        const businessesQuery = query(
          collection(db, 'businesses'),
          where('status', '==', 'active'),
          limit(6)
        )
        const businessesSnapshot = await getDocs(businessesQuery)
        const businessList: Business[] = []
        businessesSnapshot.forEach((doc) => {
          const data = doc.data()
          businessList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Business)
        })

        setStats({
          totalReferrals: referralsSnapshot.size,
          totalEarnings,
          pendingEarnings,
          totalVisits: visits.length,
        })
        setRecentVisits(visits)
        setBusinesses(businessList)
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [user])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded" />
                <div className="h-8 w-32 bg-gray-200 animate-pulse rounded" />
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {user?.name?.split(' ')[0]}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your referral activity
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              +{formatCurrency(stats.pendingEarnings)} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <p className="text-xs text-muted-foreground">People you&apos;ve referred</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Visits</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalVisits}</div>
            <p className="text-xs text-muted-foreground">Places you&apos;ve visited</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payout</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.pendingEarnings)}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {user?.roles.includes('business') && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Dashboard
              </CardTitle>
              <CardDescription>
                Manage your business profile, offers, and view conversions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/dashboard/business">
                <Button className="w-full gap-2">
                  Manage Business <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Start Referring
            </CardTitle>
            <CardDescription>
              Share referral links and earn commissions when friends visit
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/referrals">
              <Button className="w-full gap-2">
                Get Referral Links <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-5 w-5" />
              My Visit History
            </CardTitle>
            <CardDescription>
              View your visits, rewards, and conversion status
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/dashboard/visits">
              <Button variant="outline" className="w-full gap-2">
                View History <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Available Businesses */}
      {businesses.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">Businesses to Refer</h2>
              <p className="text-sm text-muted-foreground">
                Share these businesses and earn commissions
              </p>
            </div>
            <Link href="/dashboard/referrals">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {businesses.map((business) => (
              <Card key={business.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{business.name}</CardTitle>
                      <CardDescription>{business.category}</CardDescription>
                    </div>
                    <Badge variant="secondary">{business.status}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {business.description}
                  </p>
                  <Link href={`/dashboard/referrals?business=${business.id}`}>
                    <Button size="sm" className="w-full gap-2">
                      <QrCode className="h-4 w-4" />
                      Get Referral Link
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      {recentVisits.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Visits</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {recentVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Visit #{visit.id.slice(-6)}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(visit.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        visit.status === 'CONVERTED'
                          ? 'success'
                          : visit.status === 'REJECTED'
                          ? 'destructive'
                          : 'secondary'
                      }
                    >
                      {visit.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
