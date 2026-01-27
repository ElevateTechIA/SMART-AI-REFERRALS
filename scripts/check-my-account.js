#!/usr/bin/env node
/**
 * Script para verificar tu cuenta y ver dónde están tus referrals
 * Uso: node scripts/check-my-account.js tu-email@example.com
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

async function checkMyAccount(email) {
  if (!email) {
    console.log('❌ Por favor proporciona tu email')
    console.log('Uso: node scripts/check-my-account.js tu-email@example.com\n')
    process.exit(1)
  }

  try {
    console.log(`🔍 Buscando tu cuenta: ${email}\n`)

    // Buscar usuario en Auth
    const userRecord = await admin.auth().getUserByEmail(email)
    const userId = userRecord.uid

    console.log('✅ INFORMACIÓN DE TU CUENTA')
    console.log('='.repeat(80))
    console.log(`User ID: ${userId}`)
    console.log(`Email: ${userRecord.email}`)
    console.log(`Nombre: ${userRecord.displayName || 'N/A'}`)
    console.log(`Creado: ${new Date(userRecord.metadata.creationTime).toLocaleString()}\n`)

    // Obtener roles de Firestore
    const userDoc = await db.collection('users').doc(userId).get()
    let roles = []
    if (userDoc.exists) {
      const userData = userDoc.data()
      roles = userData.roles || []
      console.log('🎭 TUS ROLES:')
      console.log('='.repeat(80))
      if (roles.length === 0) {
        console.log('❌ No tienes roles asignados aún')
      } else {
        roles.forEach(role => {
          console.log(`✅ ${role.toUpperCase()}`)
        })
      }
      console.log()
    }

    // Mostrar dónde ver tus referrals según tus roles
    console.log('📍 DÓNDE VER TUS REFERRALS:')
    console.log('='.repeat(80))

    if (roles.includes('consumer')) {
      console.log('👤 Como CONSUMER (visitaste negocios):')
      console.log('   URL: https://smart-ai-referrals.vercel.app/dashboard/visits')
      console.log('   Local: http://localhost:3000/dashboard/visits\n')
    }

    if (roles.includes('referrer')) {
      console.log('🎯 Como REFERRER (referiste a otros):')
      console.log('   URL: https://smart-ai-referrals.vercel.app/dashboard/referrals')
      console.log('   Local: http://localhost:3000/dashboard/referrals\n')
    }

    if (roles.includes('business')) {
      console.log('🏪 Como BUSINESS OWNER (tu negocio):')
      console.log('   URL: https://smart-ai-referrals.vercel.app/dashboard/business')
      console.log('   Local: http://localhost:3000/dashboard/business\n')
    }

    if (roles.includes('admin')) {
      console.log('👑 Como ADMIN (todos los datos):')
      console.log('   URL: https://smart-ai-referrals.vercel.app/dashboard/admin')
      console.log('   Local: http://localhost:3000/dashboard/admin\n')
    }

    if (roles.length === 0) {
      console.log('⚠️  No tienes roles aún. Esto puede pasar si:')
      console.log('   - Te acabas de registrar y no has hecho ninguna acción')
      console.log('   - El sistema no te asignó roles correctamente')
      console.log('\n💡 Ve al dashboard principal: /dashboard\n')
    }

    // Buscar visitas como consumer
    console.log('\n📥 VISITAS COMO CONSUMER (tú visitaste):')
    console.log('='.repeat(80))
    const asConsumerSnapshot = await db.collection('visits')
      .where('consumerUserId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    if (asConsumerSnapshot.empty) {
      console.log('❌ No has visitado ningún negocio aún')
    } else {
      console.log(`✅ Encontradas ${asConsumerSnapshot.size} visitas:\n`)

      for (const doc of asConsumerSnapshot.docs) {
        const data = doc.data()

        // Obtener info del negocio
        const businessDoc = await db.collection('businesses').doc(data.businessId).get()
        const businessName = businessDoc.exists ? businessDoc.data().name : 'Unknown'

        // Obtener info del referrer si existe
        let referrerName = 'PLATFORM'
        if (data.referrerUserId) {
          const referrerDoc = await db.collection('users').doc(data.referrerUserId).get()
          referrerName = referrerDoc.exists ? referrerDoc.data().name : data.referrerUserId
        }

        console.log(`Visit ID: ${doc.id}`)
        console.log(`  Negocio: ${businessName}`)
        console.log(`  Status: ${data.status}`)
        console.log(`  Referido por: ${referrerName}`)
        console.log(`  Nuevo cliente: ${data.isNewCustomer ? '✅' : '❌'}`)
        console.log(`  Fecha: ${data.createdAt?.toDate().toLocaleString()}`)

        // Buscar recompensa
        const rewardSnapshot = await db.collection('earnings')
          .where('visitId', '==', doc.id)
          .where('userId', '==', userId)
          .where('type', '==', 'CONSUMER_REWARD')
          .get()

        if (!rewardSnapshot.empty) {
          const reward = rewardSnapshot.docs[0].data()
          console.log(`  💰 Recompensa: $${reward.amount} (${reward.status})`)
        }
        console.log()
      }
    }

    // Buscar visitas como referrer
    console.log('\n📤 REFERIDOS (personas que referiste):')
    console.log('='.repeat(80))
    const asReferrerSnapshot = await db.collection('visits')
      .where('referrerUserId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get()

    if (asReferrerSnapshot.empty) {
      console.log('❌ No has referido a nadie aún')
      console.log('💡 Ve a /dashboard/referrals para obtener tu link de referidos\n')
    } else {
      console.log(`✅ Has referido ${asReferrerSnapshot.size} personas:\n`)

      for (const doc of asReferrerSnapshot.docs) {
        const data = doc.data()

        // Obtener info del negocio
        const businessDoc = await db.collection('businesses').doc(data.businessId).get()
        const businessName = businessDoc.exists ? businessDoc.data().name : 'Unknown'

        // Obtener info del consumer
        const consumerDoc = await db.collection('users').doc(data.consumerUserId).get()
        const consumerName = consumerDoc.exists ? consumerDoc.data().name : data.consumerUserId

        console.log(`Visit ID: ${doc.id}`)
        console.log(`  Cliente: ${consumerName}`)
        console.log(`  Negocio: ${businessName}`)
        console.log(`  Status: ${data.status}`)
        console.log(`  Fecha: ${data.createdAt?.toDate().toLocaleString()}`)

        // Buscar comisión
        const commissionSnapshot = await db.collection('earnings')
          .where('visitId', '==', doc.id)
          .where('userId', '==', userId)
          .where('type', '==', 'REFERRER_COMMISSION')
          .get()

        if (!commissionSnapshot.empty) {
          const commission = commissionSnapshot.docs[0].data()
          console.log(`  💰 Comisión: $${commission.amount} (${commission.status})`)
        }
        console.log()
      }
    }

    // Buscar earnings totales
    console.log('\n💰 RESUMEN DE GANANCIAS:')
    console.log('='.repeat(80))
    const earningsSnapshot = await db.collection('earnings')
      .where('userId', '==', userId)
      .get()

    if (earningsSnapshot.empty) {
      console.log('❌ No tienes ganancias registradas aún\n')
    } else {
      let totalPending = 0
      let totalApproved = 0
      let totalPaid = 0
      let countReferrer = 0
      let countConsumer = 0

      earningsSnapshot.forEach(doc => {
        const data = doc.data()

        if (data.type === 'REFERRER_COMMISSION') countReferrer++
        if (data.type === 'CONSUMER_REWARD') countConsumer++

        if (data.status === 'PENDING') totalPending += data.amount
        if (data.status === 'APPROVED') totalApproved += data.amount
        if (data.status === 'PAID') totalPaid += data.amount
      })

      console.log(`Total ganancias: ${earningsSnapshot.size}`)
      console.log(`  - Como referrer: ${countReferrer}`)
      console.log(`  - Como consumer: ${countConsumer}`)
      console.log()
      console.log(`💵 Pendiente: $${totalPending.toFixed(2)}`)
      console.log(`✅ Aprobado: $${totalApproved.toFixed(2)}`)
      console.log(`💰 Pagado: $${totalPaid.toFixed(2)}`)
      console.log(`📊 Total acumulado: $${(totalPending + totalApproved + totalPaid).toFixed(2)}\n`)
    }

    // Links útiles
    console.log('🔗 LINKS ÚTILES:')
    console.log('='.repeat(80))
    console.log('Dashboard Principal: https://smart-ai-referrals.vercel.app/dashboard')
    console.log('Firebase Console: https://console.firebase.google.com/')
    console.log(`Firestore Users: https://console.firebase.google.com/project/${process.env.FIREBASE_PROJECT_ID}/firestore/data/users/${userId}`)
    console.log()

  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.log(`❌ No se encontró ningún usuario con el email: ${email}`)
      console.log('💡 Verifica que el email sea correcto o regístrate en:')
      console.log('   https://smart-ai-referrals.vercel.app/auth/register\n')
    } else {
      console.error('❌ Error:', error.message)
    }
  }

  process.exit(0)
}

const email = process.argv[2]
checkMyAccount(email)
