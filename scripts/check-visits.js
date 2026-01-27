#!/usr/bin/env node
/**
 * Script para verificar visitas/referrals en Firestore
 * Uso: node scripts/check-visits.js [userId]
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

const db = admin.firestore()

async function checkVisits(userId) {
  console.log('🔍 Buscando visitas en Firestore...\n')

  try {
    // 1. Buscar todas las visitas
    console.log('📊 TODAS LAS VISITAS:')
    console.log('=' .repeat(80))
    const allVisitsSnapshot = await db.collection('visits')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    if (allVisitsSnapshot.empty) {
      console.log('❌ No se encontraron visitas en la base de datos\n')
    } else {
      allVisitsSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`\nVisit ID: ${doc.id}`)
        console.log(`  Status: ${data.status}`)
        console.log(`  Consumer: ${data.consumerUserId}`)
        console.log(`  Referrer: ${data.referrerUserId || 'PLATFORM'}`)
        console.log(`  Business: ${data.businessId}`)
        console.log(`  New Customer: ${data.isNewCustomer ? '✅' : '❌'}`)
        console.log(`  Attribution: ${data.attributionType}`)
        console.log(`  Created: ${data.createdAt?.toDate().toLocaleString()}`)
        if (data.ipAddress) console.log(`  IP: ${data.ipAddress}`)
      })
      console.log(`\nTotal visitas encontradas: ${allVisitsSnapshot.size}\n`)
    }

    // 2. Si se proporciona userId, buscar sus visitas específicas
    if (userId) {
      console.log('\n' + '='.repeat(80))
      console.log(`👤 VISITAS DEL USUARIO: ${userId}`)
      console.log('='.repeat(80))

      // Como consumidor
      console.log('\n📥 Como CONSUMIDOR (visitó negocios):')
      const asConsumerSnapshot = await db.collection('visits')
        .where('consumerUserId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get()

      if (asConsumerSnapshot.empty) {
        console.log('  ❌ No tiene visitas como consumidor')
      } else {
        asConsumerSnapshot.forEach((doc) => {
          const data = doc.data()
          console.log(`\n  Visit ID: ${doc.id}`)
          console.log(`    Status: ${data.status}`)
          console.log(`    Business: ${data.businessId}`)
          console.log(`    Referred by: ${data.referrerUserId || 'PLATFORM'}`)
          console.log(`    Created: ${data.createdAt?.toDate().toLocaleString()}`)
        })
        console.log(`\n  Total: ${asConsumerSnapshot.size} visitas`)
      }

      // Como referidor
      console.log('\n📤 Como REFERIDOR (refirió a otros):')
      const asReferrerSnapshot = await db.collection('visits')
        .where('referrerUserId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get()

      if (asReferrerSnapshot.empty) {
        console.log('  ❌ No ha referido a nadie aún')
      } else {
        asReferrerSnapshot.forEach((doc) => {
          const data = doc.data()
          console.log(`\n  Visit ID: ${doc.id}`)
          console.log(`    Status: ${data.status}`)
          console.log(`    Consumer: ${data.consumerUserId}`)
          console.log(`    Business: ${data.businessId}`)
          console.log(`    Created: ${data.createdAt?.toDate().toLocaleString()}`)
        })
        console.log(`\n  Total: ${asReferrerSnapshot.size} referidos`)
      }
    }

    // 3. Buscar fraud flags
    console.log('\n' + '='.repeat(80))
    console.log('⚠️  FRAUD FLAGS (Intentos bloqueados):')
    console.log('='.repeat(80))
    const fraudSnapshot = await db.collection('fraudFlags')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get()

    if (fraudSnapshot.empty) {
      console.log('✅ No hay fraud flags\n')
    } else {
      fraudSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`\nFlag ID: ${doc.id}`)
        console.log(`  Reason: ${data.reason}`)
        console.log(`  Consumer: ${data.consumerUserId}`)
        console.log(`  Business: ${data.businessId}`)
        console.log(`  Visit: ${data.visitId}`)
        console.log(`  Resolved: ${data.resolved ? '✅' : '❌'}`)
        console.log(`  Created: ${data.createdAt?.toDate().toLocaleString()}`)
      })
      console.log(`\nTotal fraud flags: ${fraudSnapshot.size}\n`)
    }

    // 4. Buscar negocios
    console.log('='.repeat(80))
    console.log('🏪 NEGOCIOS ACTIVOS:')
    console.log('='.repeat(80))
    const businessSnapshot = await db.collection('businesses')
      .where('status', '==', 'active')
      .get()

    if (businessSnapshot.empty) {
      console.log('❌ No hay negocios activos\n')
    } else {
      businessSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`\nBusiness ID: ${doc.id}`)
        console.log(`  Name: ${data.name}`)
        console.log(`  Category: ${data.category}`)
        console.log(`  Owner: ${data.ownerUserId}`)
        console.log(`  Status: ${data.status}`)
      })
      console.log(`\nTotal negocios activos: ${businessSnapshot.size}\n`)
    }

    // 5. Si se proporciona userId, buscar su información
    if (userId) {
      console.log('='.repeat(80))
      console.log(`👤 INFORMACIÓN DEL USUARIO: ${userId}`)
      console.log('='.repeat(80))
      const userDoc = await db.collection('users').doc(userId).get()

      if (!userDoc.exists) {
        console.log('❌ Usuario no encontrado\n')
      } else {
        const userData = userDoc.data()
        console.log(`\nEmail: ${userData.email}`)
        console.log(`Name: ${userData.name}`)
        console.log(`Roles: ${userData.roles?.join(', ') || 'none'}`)
        console.log(`Created: ${userData.createdAt?.toDate().toLocaleString()}\n`)
      }

      // Buscar ganancias
      console.log('💰 EARNINGS (Ganancias):')
      const earningsSnapshot = await db.collection('earnings')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .get()

      if (earningsSnapshot.empty) {
        console.log('  ❌ No tiene ganancias registradas\n')
      } else {
        earningsSnapshot.forEach((doc) => {
          const data = doc.data()
          console.log(`\n  Earning ID: ${doc.id}`)
          console.log(`    Type: ${data.type}`)
          console.log(`    Amount: $${data.amount}`)
          console.log(`    Status: ${data.status}`)
          console.log(`    Business: ${data.businessId}`)
          console.log(`    Visit: ${data.visitId}`)
          console.log(`    Created: ${data.createdAt?.toDate().toLocaleString()}`)
        })
        console.log(`\n  Total earnings: ${earningsSnapshot.size}\n`)
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    if (error.code === 9) {
      console.error('\n⚠️  SOLUCIÓN: Este error ocurre porque necesitas un índice compuesto.')
      console.error('   Firebase te proporcionó un link para crearlo.')
      console.error('   Copia el link del error y ábrelo en tu navegador.')
    }
  }

  process.exit(0)
}

// Obtener userId de los argumentos
const userId = process.argv[2]

if (!userId) {
  console.log('💡 Uso: node scripts/check-visits.js [userId]')
  console.log('   Sin userId: muestra todas las visitas')
  console.log('   Con userId: muestra visitas específicas del usuario\n')
}

checkVisits(userId)
