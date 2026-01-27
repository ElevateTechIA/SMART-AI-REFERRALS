#!/usr/bin/env node
/**
 * Script para obtener userId por email
 * Uso: node scripts/get-user-by-email.js email@example.com
 */

require('dotenv').config({ path: '.env.local' })
const admin = require('firebase-admin')

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

async function getUserByEmail(email) {
  if (!email) {
    console.log('❌ Por favor proporciona un email')
    console.log('Uso: node scripts/get-user-by-email.js email@example.com')
    process.exit(1)
  }

  try {
    console.log(`🔍 Buscando usuario con email: ${email}\n`)

    // Buscar en Firebase Auth
    const userRecord = await admin.auth().getUserByEmail(email)

    console.log('✅ Usuario encontrado en Firebase Auth:')
    console.log('='.repeat(60))
    console.log(`User ID (UID): ${userRecord.uid}`)
    console.log(`Email: ${userRecord.email}`)
    console.log(`Email Verified: ${userRecord.emailVerified}`)
    console.log(`Display Name: ${userRecord.displayName || 'N/A'}`)
    console.log(`Photo URL: ${userRecord.photoURL || 'N/A'}`)
    console.log(`Created: ${new Date(userRecord.metadata.creationTime).toLocaleString()}`)
    console.log(`Last Sign In: ${new Date(userRecord.metadata.lastSignInTime).toLocaleString()}`)

    // Buscar en Firestore
    const db = admin.firestore()
    const userDoc = await db.collection('users').doc(userRecord.uid).get()

    if (userDoc.exists) {
      const userData = userDoc.data()
      console.log('\n✅ Datos en Firestore:')
      console.log('='.repeat(60))
      console.log(`Name: ${userData.name}`)
      console.log(`Roles: ${userData.roles?.join(', ') || 'none'}`)
      console.log(`Created: ${userData.createdAt?.toDate().toLocaleString()}`)
    } else {
      console.log('\n⚠️  El usuario no tiene documento en Firestore')
    }

    console.log('\n💡 Para ver las visitas de este usuario, ejecuta:')
    console.log(`   node scripts/check-visits.js ${userRecord.uid}`)

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`❌ No se encontró ningún usuario con el email: ${email}`)
    } else {
      console.error('❌ Error:', error.message)
    }
  }

  process.exit(0)
}

const email = process.argv[2]
getUserByEmail(email)
