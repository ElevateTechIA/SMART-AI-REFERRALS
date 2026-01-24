'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth/context'
import { Building2, Users, Gift, ArrowRight, QrCode, DollarSign, TrendingUp } from 'lucide-react'

export default function HomePage() {
  const { user, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold">Smart AI Referrals</span>
          </div>
          <nav className="flex items-center gap-4">
            {loading ? (
              <div className="w-24 h-10 bg-gray-200 animate-pulse rounded-md" />
            ) : user ? (
              <Link href="/dashboard">
                <Button>Go to Dashboard</Button>
              </Link>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/auth/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Turn Your Network Into
          <span className="text-primary block">Passive Income</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Connect businesses with new customers. Share referral links, earn commissions,
          and help local businesses grow while building your income.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/auth/register">
            <Button size="lg" className="gap-2">
              Start Earning <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/auth/register?type=business">
            <Button size="lg" variant="outline">
              List Your Business
            </Button>
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <QrCode className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>1. Get Your Link</CardTitle>
              <CardDescription>
                Sign up and get unique referral links for participating businesses
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>2. Share & Refer</CardTitle>
              <CardDescription>
                Share your link with friends, family, or on social media
              </CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader>
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>3. Earn Money</CardTitle>
              <CardDescription>
                When someone becomes a customer, you earn a commission
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* For Different Users */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Built For Everyone</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <Building2 className="w-10 h-10 text-primary mb-2" />
                <CardTitle>For Businesses</CardTitle>
                <CardDescription>
                  Get new customers through word-of-mouth referrals. Only pay when you get a real customer.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Pay per acquisition model
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Track all referrals and conversions
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Custom reward settings
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-primary mb-2" />
                <CardTitle>For Referrers</CardTitle>
                <CardDescription>
                  Share your favorite local spots and earn money when people visit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Generate QR codes and links
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Track your earnings in real-time
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Get paid for successful referrals
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <Gift className="w-10 h-10 text-primary mb-2" />
                <CardTitle>For Consumers</CardTitle>
                <CardDescription>
                  Discover local businesses and get rewards for trying new places.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Get exclusive rewards and discounts
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Refer friends and earn more
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                    Track your visit history
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Start Earning?</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Join thousands of people already earning through referrals.
          It only takes a minute to get started.
        </p>
        <Link href="/auth/register">
          <Button size="lg" className="gap-2">
            Create Free Account <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <QrCode className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Smart AI Referrals</span>
            </div>
            <p className="text-sm text-muted-foreground">
              2024 Smart AI Referrals. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
