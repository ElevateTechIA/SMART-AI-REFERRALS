'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/lib/auth/context'
import { useToast } from '@/components/ui/use-toast'
import { db } from '@/lib/firebase/client'
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore'
import type { Business, User, Visit, FraudFlag } from '@/lib/types'
import { formatCurrency, formatDate } from '@/lib/utils'
import {
  Building2,
  Users,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Shield,
  TrendingUp,
  Clock,
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalBusinesses: number
  pendingBusinesses: number
  totalVisits: number
  totalConversions: number
  totalRevenue: number
  unresolvedFraudFlags: number
}

export default function AdminDashboardPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    // Check if user is admin
    if (user && !user.roles.includes('admin')) {
      router.push('/dashboard')
      return
    }

    const fetchAdminData = async () => {
      if (!user) return

      try {
        // Fetch stats
        const statsResponse = await fetch(`/api/admin/stats?adminUserId=${user.id}`)
        const statsData = await statsResponse.json()
        if (statsData.success) {
          setStats(statsData.data)
        }

        // Fetch businesses
        const businessesQuery = query(
          collection(db, 'businesses'),
          orderBy('createdAt', 'desc')
        )
        const businessesSnapshot = await getDocs(businessesQuery)
        const businessesList: Business[] = []
        businessesSnapshot.forEach((doc) => {
          const data = doc.data()
          businessesList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Business)
        })
        setBusinesses(businessesList)

        // Fetch users
        const usersQuery = query(
          collection(db, 'users'),
          orderBy('createdAt', 'desc')
        )
        const usersSnapshot = await getDocs(usersQuery)
        const usersList: User[] = []
        usersSnapshot.forEach((doc) => {
          const data = doc.data()
          usersList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as User)
        })
        setUsers(usersList)

        // Fetch recent visits
        const visitsQuery = query(
          collection(db, 'visits'),
          orderBy('createdAt', 'desc')
        )
        const visitsSnapshot = await getDocs(visitsQuery)
        const visitsList: Visit[] = []
        visitsSnapshot.forEach((doc) => {
          const data = doc.data()
          visitsList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as Visit)
        })
        setVisits(visitsList)

        // Fetch fraud flags
        const fraudQuery = query(
          collection(db, 'fraudFlags'),
          where('resolved', '==', false),
          orderBy('createdAt', 'desc')
        )
        const fraudSnapshot = await getDocs(fraudQuery)
        const fraudList: FraudFlag[] = []
        fraudSnapshot.forEach((doc) => {
          const data = doc.data()
          fraudList.push({
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
          } as FraudFlag)
        })
        setFraudFlags(fraudList)
      } catch (error) {
        console.error('Error fetching admin data:', error)
        toast({
          title: 'Error',
          description: 'Failed to load admin data',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
  }, [user, router, toast])

  const handleBusinessAction = async (businessId: string, action: 'approve' | 'suspend') => {
    if (!user) return

    setActionLoading(businessId)
    try {
      const response = await fetch(`/api/admin/businesses/${businessId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adminUserId: user.id,
          action,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} business`)
      }

      // Update local state
      setBusinesses((prev) =>
        prev.map((b) =>
          b.id === businessId
            ? { ...b, status: action === 'approve' ? 'active' : 'suspended' }
            : b
        )
      )

      toast({
        title: 'Success',
        description: `Business ${action}d successfully`,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : `Failed to ${action} business`
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user?.roles.includes('admin')) {
    return null
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Manage businesses, users, and monitor platform activity
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Businesses</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalBusinesses}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingBusinesses} pending approval
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalConversions}</div>
              <p className="text-xs text-muted-foreground">
                of {stats.totalVisits} visits
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fraud Alerts */}
      {fraudFlags.length > 0 && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Fraud Alerts ({fraudFlags.length})
            </CardTitle>
            <CardDescription>
              Unresolved potential fraud flags require attention
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {fraudFlags.slice(0, 5).map((flag) => (
                <div
                  key={flag.id}
                  className="py-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{flag.reason}</p>
                    <p className="text-sm text-muted-foreground">
                      Visit #{flag.visitId.slice(-6)} • {formatDate(flag.createdAt)}
                    </p>
                  </div>
                  <Badge variant="destructive">Unresolved</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="businesses">
        <TabsList>
          <TabsTrigger value="businesses">Businesses</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="visits">Recent Visits</TabsTrigger>
        </TabsList>

        <TabsContent value="businesses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Businesses</CardTitle>
              <CardDescription>
                Manage business registrations and approvals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {businesses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No businesses registered yet
                </p>
              ) : (
                <div className="divide-y">
                  {businesses.map((business) => (
                    <div
                      key={business.id}
                      className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-muted-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{business.name}</h4>
                          <p className="text-sm text-muted-foreground">
                            {business.category} • {business.address}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Created {formatDate(business.createdAt)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-16 md:ml-0">
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

                        {business.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleBusinessAction(business.id, 'approve')}
                            disabled={actionLoading === business.id}
                          >
                            {actionLoading === business.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </>
                            )}
                          </Button>
                        )}

                        {business.status === 'active' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleBusinessAction(business.id, 'suspend')}
                            disabled={actionLoading === business.id}
                          >
                            {actionLoading === business.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-1" />
                                Suspend
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>All Users</CardTitle>
              <CardDescription>View and manage platform users</CardDescription>
            </CardHeader>
            <CardContent>
              {users.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No users registered yet
                </p>
              ) : (
                <div className="divide-y">
                  {users.map((u) => (
                    <div
                      key={u.id}
                      className="py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                          <span className="font-semibold">
                            {u.name?.charAt(0).toUpperCase() || 'U'}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold">{u.name}</h4>
                          <p className="text-sm text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {u.roles.map((role) => (
                          <Badge
                            key={role}
                            variant={role === 'admin' ? 'default' : 'secondary'}
                          >
                            {role}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visits" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Visits</CardTitle>
              <CardDescription>
                All visits and conversions across the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              {visits.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No visits yet
                </p>
              ) : (
                <div className="divide-y">
                  {visits.slice(0, 20).map((visit) => {
                    const business = businesses.find((b) => b.id === visit.businessId)
                    return (
                      <div
                        key={visit.id}
                        className="py-3 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">
                            Visit to {business?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {visit.attributionType === 'REFERRER' ? 'Referrer' : 'Platform'} •{' '}
                            {formatDate(visit.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!visit.isNewCustomer && (
                            <Badge variant="destructive">Repeat</Badge>
                          )}
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
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
