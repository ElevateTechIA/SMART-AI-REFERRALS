# Smart AI Referrals

A production-ready referral marketing platform built with Next.js 14, TypeScript, Firebase, and Tailwind CSS. Deploy to Vercel with zero configuration.

## Features

- **Multi-role system**: Businesses, Referrers, Consumers, and Admins
- **QR Code & Link Referrals**: Generate unique referral links and QR codes
- **Automatic Attribution**: Track referrer vs platform-driven conversions
- **Commission Management**: Configurable commissions for referrers and rewards for consumers
- **Anti-fraud Protection**: Automatic detection of repeat customers
- **Real-time Dashboards**: Role-specific dashboards with live data
- **Firebase Integration**: Auth, Firestore, and Storage

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Authentication**: Firebase Auth (Email/Password + Google OAuth)
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Deployment**: Vercel

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project
- Vercel account (for deployment)

### 1. Clone and Install

```bash
cd SMART-AI-REFERRALS
npm install
```

### 2. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project (or use existing)
3. Enable Authentication:
   - Go to Authentication > Sign-in method
   - Enable Email/Password
   - Enable Google Sign-in
4. Create Firestore Database:
   - Go to Firestore Database
   - Create database in production mode
   - Deploy the security rules from `firestore.rules`
5. Enable Storage:
   - Go to Storage
   - Get started
   - Deploy the storage rules from `storage.rules`
6. Get your credentials:
   - Go to Project Settings > General
   - Scroll to "Your apps" and click Web icon (</>)
   - Register app and copy the config
   - Go to Project Settings > Service Accounts
   - Generate new private key (for Admin SDK)

### 3. Environment Variables

Create a `.env.local` file:

```env
# Firebase Client SDK (Public)
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Firebase Admin SDK (Server-side)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY\n-----END PRIVATE KEY-----\n"

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_EMAIL=admin@example.com
```

**Important**: The `ADMIN_EMAIL` will automatically be granted admin role on first sign-in.

### 4. Deploy Firestore Rules

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase (select Firestore and Storage)
firebase init

# Deploy rules
firebase deploy --only firestore:rules,storage
```

### 5. Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/smart-ai-referrals.git
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to [Vercel](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Add Environment Variables:
   - Add all variables from `.env.local`
   - Make sure `NEXT_PUBLIC_APP_URL` points to your Vercel domain
5. Deploy

### 3. Update Firebase

After deployment, update Firebase settings:
1. Add your Vercel domain to Firebase Auth authorized domains
2. Update `NEXT_PUBLIC_APP_URL` in Vercel environment variables

## Project Structure

```
├── app/
│   ├── api/                    # API routes (server-side)
│   │   ├── admin/              # Admin-only endpoints
│   │   ├── businesses/         # Business CRUD
│   │   ├── offers/             # Offer management
│   │   └── visits/             # Visit tracking & conversion
│   ├── auth/                   # Authentication pages
│   │   ├── login/
│   │   └── register/
│   ├── dashboard/              # Protected dashboard routes
│   │   ├── admin/              # Admin dashboard
│   │   ├── business/           # Business dashboard & setup
│   │   ├── referrals/          # Referrer dashboard
│   │   └── visits/             # Consumer visits
│   ├── r/[businessId]/         # Referral landing page
│   ├── layout.tsx
│   ├── page.tsx                # Homepage
│   └── globals.css
├── components/
│   ├── dashboard/              # Dashboard components
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── auth/                   # Auth context
│   ├── firebase/               # Firebase client & admin
│   ├── types.ts                # TypeScript types
│   └── utils.ts                # Utility functions
├── firestore.rules             # Firestore security rules
├── storage.rules               # Storage security rules
└── README.md
```

## User Flows

### Business Owner Flow
1. Register account (select "Get Customers")
2. Complete business profile
3. Create referral offer (set prices & commissions)
4. Wait for admin approval
5. Share referral link or let referrers promote
6. Confirm customer conversions in dashboard

### Referrer Flow
1. Register account (select "Earn Money")
2. Browse available businesses
3. Generate referral links/QR codes
4. Share with network
5. Earn commissions on conversions

### Consumer Flow
1. Scan QR code or click referral link
2. Sign up (or sign in)
3. Confirm visit
4. Make purchase at business
5. Receive rewards after business confirms
6. Option to become a referrer

### Admin Flow
1. Sign in with admin email
2. Approve/suspend businesses
3. Monitor conversions and fraud flags
4. View platform-wide analytics

## Data Model

### Collections

- **users**: User profiles with roles
- **businesses**: Business listings
- **offers**: Referral offer configurations
- **visits**: Visit records with attribution
- **earnings**: User earnings ledger
- **charges**: Business charges to platform
- **fraudFlags**: Anti-fraud alerts

## API Reference

### Visits
- `POST /api/visits` - Create visit record
- `GET /api/visits` - List visits (filtered)
- `POST /api/visits/[id]/convert` - Confirm conversion

### Businesses
- `POST /api/businesses` - Register business
- `GET /api/businesses` - List businesses
- `PUT /api/businesses` - Update business

### Offers
- `POST /api/offers` - Create/update offer
- `GET /api/offers` - Get offer(s)

### Admin
- `GET /api/admin/stats` - Platform statistics
- `POST /api/admin/businesses/[id]/approve` - Approve/suspend business

## Security

- All sensitive writes go through API routes with Firebase Admin SDK
- Firestore security rules enforce read permissions
- Role-based access control on client and server
- Anti-fraud checks on repeat visits

## Future Enhancements

- [ ] Stripe integration for payments
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Tiered commission structures
- [ ] Referral campaigns with expiry
- [ ] Multi-language support

## License

MIT License

## Support

For issues or feature requests, please open a GitHub issue.
