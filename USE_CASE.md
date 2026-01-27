# Caso de Uso: Flujo Completo de Referidos y Conversión

## Descripción General
Smart AI Referrals es una plataforma de marketing de referidos que conecta negocios locales con referidores y consumidores. El sistema rastrea todo el flujo desde que una persona es referida hasta que se convierte en cliente del negocio, distribuye comisiones y recompensas automáticamente.

---

## Actores del Sistema

### 1. **Negocio (Business Owner)**
- Dueño del establecimiento que quiere adquirir nuevos clientes
- Paga una tarifa por cada nuevo cliente adquirido
- Configura ofertas y recompensas

### 2. **Referidor (Referrer)**
- Persona que promociona el negocio a su red de contactos
- Gana comisiones por cada conversión exitosa
- Comparte links de referidos o códigos QR

### 3. **Consumidor (Consumer)**
- Cliente final que visita el negocio
- Recibe recompensas por ser referido
- Puede convertirse en referidor después

### 4. **Plataforma**
- Sistema Smart AI Referrals
- Rastrea atribución y anti-fraude
- Facilita pagos y comisiones

---

## Flujo Completo del Usuario

### **FASE 1: Configuración del Negocio** 🏪

#### Paso 1.1: Registro del Negocio
```
Archivo: app/auth/register/page.tsx
```

El dueño del negocio:
1. Visita la plataforma Smart AI Referrals
2. Crea una cuenta seleccionando "Get Customers" (Conseguir Clientes)
3. Completa su perfil de negocio:
   - Nombre del negocio
   - Categoría (restaurante, retail, servicios, etc.)
   - Descripción
   - Dirección física
   - Teléfono
   - Sitio web (opcional)
   - Imágenes del negocio

**Estado inicial:** `status: 'pending'`

#### Paso 1.2: Creación de Oferta de Referidos
```
Archivo: app/api/offers/route.ts
Componente: app/dashboard/business/page.tsx
```

El negocio configura su oferta:
- **Precio por nuevo cliente:** $100 USD (ejemplo)
- **Comisión para referidor:** $30 USD (30%)
- **Recompensa para consumidor:**
  - Tipo: efectivo, puntos, descuento, o ninguno
  - Valor: $10 USD de cashback (ejemplo)
- **Permitir atribución de plataforma:** Sí/No
- **Estado:** Activa

**Ejemplo de configuración:**
```typescript
{
  pricePerNewCustomer: 100,        // Negocio paga $100
  referrerCommissionAmount: 30,    // Referidor gana $30
  consumerRewardType: 'cash',      // Tipo de recompensa
  consumerRewardValue: 10,         // Consumidor recibe $10
  allowPlatformAttribution: true,  // Plataforma puede atribuir
  active: true
}
```

#### Paso 1.3: Aprobación por Admin
```
Archivo: app/api/admin/businesses/[id]/approve/route.ts
```

Un administrador de la plataforma:
1. Revisa el perfil del negocio
2. Verifica autenticidad
3. Aprueba el negocio

**Estado final:** `status: 'active'` ✅

---

### **FASE 2: Activación del Referidor** 👥

#### Paso 2.1: Registro del Referidor
```
Archivo: app/auth/register/page.tsx
```

Una persona decide ganar dinero refiriendo:
1. Crea cuenta seleccionando "Earn Money" (Ganar Dinero)
2. Completa su perfil básico
3. Recibe rol: `roles: ['referrer']`

#### Paso 2.2: Selección de Negocio para Referir
```
Archivo: app/dashboard/referrals/page.tsx
API: app/api/referrals/route.ts
```

El referidor:
1. Navega a su dashboard de referidos
2. Ve lista de negocios activos con ofertas activas
3. Selecciona un negocio para promocionar
4. Ve información clave:
   - Nombre del negocio
   - Comisión que ganará: $30 USD
   - Recompensa para el consumidor: $10 USD

#### Paso 2.3: Generación de Link de Referido
```
Función: lib/utils.ts -> generateReferralUrl()
```

La plataforma genera automáticamente:

**Link único:**
```
https://smartai.app/r/[businessId]?ref=[referrerId]
```

**Ejemplo real:**
```
https://smartai.app/r/abc123?ref=xyz789
```

**Código QR:**
- Se genera automáticamente usando la librería `qrcode`
- Contiene el mismo URL del link
- Descargable en formato PNG
- Tamaño: 300x300px

#### Paso 2.4: Compartir el Referido
```
Componente: app/dashboard/referrals/page.tsx (líneas 136-154)
```

El referidor puede:
1. **Copiar link** → Pegarlo en WhatsApp, redes sociales, email
2. **Descargar QR** → Imprimirlo o enviarlo como imagen
3. **Compartir directo** → Usar API nativa de compartir del navegador

---

### **FASE 3: El Consumidor es Referido** 🎯

#### Paso 3.1: Consumidor Recibe el Link
```
Escenario típico:
```

María recibe un mensaje de WhatsApp de su amigo Juan:
```
"¡Hola María! 👋

Te recomiendo este restaurante nuevo "La Pizzería".
La comida es deliciosa 🍕

Usa mi link y recibe $10 de descuento en tu primera visita:
https://smartai.app/r/abc123?ref=xyz789
```

#### Paso 3.2: Visita la Página de Referidos
```
Archivo: app/r/[businessId]/page.tsx
```

María hace clic en el link y ve:

**Pantalla de bienvenida:**
- Badge: "You were referred by a friend" 🎁
- Información del negocio:
  - Nombre: "La Pizzería"
  - Categoría: Restaurante
  - Descripción
  - Dirección, teléfono, sitio web
- Oferta especial destacada:
  - "**$10 Cash Back** on your first visit"
- Botón: "Sign Up to Claim Your Offer"

**Datos capturados del URL:**
- `businessId`: abc123
- `ref` (referrerId): xyz789

#### Paso 3.3: Registro del Consumidor
```
Archivo: app/r/[businessId]/page.tsx (líneas 137-179)
```

María debe crear cuenta para continuar:

**Opción 1: Google Sign-In** (Recomendado)
- Un clic
- Rápido y seguro

**Opción 2: Email/Password**
- Nombre completo
- Email
- Contraseña (mínimo 6 caracteres)

**Sistema de autenticación:**
```typescript
await signUp(email, password, name)
// Firebase Auth crea el usuario
```

**Datos creados:**
```typescript
{
  id: "user123",
  email: "maria@example.com",
  name: "María González",
  roles: [],  // Vacío inicialmente
  createdAt: new Date()
}
```

#### Paso 3.4: Creación Automática de la Visita
```
API: app/api/visits/route.ts (POST)
Trigger: Automático después del registro (línea 148)
```

El sistema crea una visita inmediatamente:

**Request:**
```typescript
POST /api/visits
Headers: { Authorization: "Bearer [firebase-token]" }
Body: {
  businessId: "abc123",
  offerId: "abc123",
  referrerUserId: "xyz789"  // ID de Juan
}
```

**Validaciones anti-fraude:**
```typescript
// 1. Verificar que el negocio existe y está activo
businessDoc.data()?.status === 'active'

// 2. Prevenir auto-referidos
if (referrerUserId === consumerUserId) {
  return error('Cannot refer yourself')
}

// 3. Detectar clientes repetidos
const existingVisits = await db
  .collection('visits')
  .where('businessId', '==', businessId)
  .where('consumerUserId', '==', consumerUserId)
  .get()

const isNewCustomer = existingVisits.empty
```

**Visita creada:**
```typescript
{
  id: "visit456",
  businessId: "abc123",
  offerId: "abc123",
  consumerUserId: "user123",      // María
  referrerUserId: "xyz789",       // Juan
  attributionType: "REFERRER",    // Atribuido a referidor
  status: "CREATED",              // Estado inicial
  isNewCustomer: true,            // Primera visita
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  createdAt: new Date(),
  updatedAt: new Date()
}
```

**Si NO es cliente nuevo:**
```typescript
// Sistema crea flag de fraude automáticamente
{
  visitId: "visit456",
  consumerUserId: "user123",
  businessId: "abc123",
  reason: "Repeat visit from same consumer",
  resolved: false,
  createdAt: new Date()
}
```

**Rol de consumidor asignado:**
```typescript
// El usuario recibe el rol 'consumer' automáticamente
transaction.update(userRef, {
  roles: FieldValue.arrayUnion('consumer')
})
```

#### Paso 3.5: Confirmación en Pantalla
```
Componente: app/r/[businessId]/page.tsx (líneas 209-245)
```

María ve pantalla de éxito:
- ✅ Ícono de check verde
- "Visit Recorded!"
- Mensaje: "Your visit to La Pizzería has been recorded"
- **Tu recompensa:** $10 Cash back
  - "Applied after your purchase is confirmed"
- Botón: "Go to Dashboard"

**Estado actual de la visita:** `CREATED`

---

### **FASE 4: Visita Física al Negocio** 🏪

#### Paso 4.1: María Visita el Negocio

María va físicamente a "La Pizzería":
1. Hace su pedido
2. Disfruta su comida
3. Paga la cuenta: $50 USD
4. Menciona al mesero que tiene un referido registrado

---

### **FASE 5: Conversión y Confirmación** 💰

#### Paso 5.1: Negocio Verifica la Visita
```
Archivo: app/dashboard/business/page.tsx
```

El dueño de "La Pizzería":
1. Inicia sesión en su dashboard de negocio
2. Ve sección "Pending Conversions" (Conversiones Pendientes)
3. Ve la visita de María:
   - Nombre: María González
   - Fecha: Hoy
   - Estado: CREATED
   - Referidor: Juan Pérez
   - Es cliente nuevo: ✓
4. Verifica que María efectivamente hizo una compra

#### Paso 5.2: Confirmación de Conversión
```
API: app/api/visits/[visitId]/convert/route.ts
```

El negocio hace clic en "Confirm Conversion":

**Request:**
```typescript
POST /api/visits/visit456/convert
Headers: { Authorization: "Bearer [business-owner-token]" }
```

**Validaciones de seguridad:**
```typescript
// 1. Solo el dueño del negocio puede confirmar
if (businessData.ownerUserId !== authenticatedUserId) {
  return error('Unauthorized')
}

// 2. Negocio debe estar activo
if (businessData.status !== 'active') {
  return error('Business is not active')
}

// 3. No se puede convertir dos veces
if (visit.status === 'CONVERTED') {
  return error('Already converted')
}

// 4. Solo clientes nuevos son elegibles
if (!visit.isNewCustomer) {
  return error('Repeat customer - not eligible')
}
```

#### Paso 5.3: Transacción Atómica
```
Archivo: app/api/visits/[visitId]/convert/route.ts (líneas 118-204)
```

El sistema ejecuta TODO en una transacción atómica:

**1. Actualizar estado de visita:**
```typescript
{
  status: "CONVERTED",  // CREATED → CONVERTED
  convertedAt: new Date(),
  updatedAt: new Date()
}
```

**2. Crear ganancia para el referidor (Juan):**
```typescript
// Colección: earnings
{
  id: "earn001",
  userId: "xyz789",              // Juan (referidor)
  businessId: "abc123",
  visitId: "visit456",
  offerId: "abc123",
  amount: 30,                    // $30 USD comisión
  type: "REFERRER_COMMISSION",
  status: "PENDING",             // Esperando aprobación
  createdAt: new Date()
}
```

**3. Crear ganancia para el consumidor (María):**
```typescript
// Colección: earnings
{
  id: "earn002",
  userId: "user123",            // María (consumidor)
  businessId: "abc123",
  visitId: "visit456",
  offerId: "abc123",
  amount: 10,                   // $10 USD cashback
  type: "CONSUMER_REWARD",
  status: "PENDING",
  createdAt: new Date()
}
```

**4. Crear cargo para el negocio:**
```typescript
// Colección: charges
{
  id: "charge001",
  businessId: "abc123",
  visitId: "visit456",
  offerId: "abc123",
  amount: 100,                  // $100 total
  platformAmount: 60,           // $60 para plataforma
  referrerAmount: 30,           // $30 para Juan
  consumerRewardAmount: 10,     // $10 para María
  status: "OWED",               // Pendiente de pago
  createdAt: new Date()
}
```

**Matemática de distribución:**
```
Precio total por cliente nuevo: $100
├─ Referidor (Juan):     $30  (30%)
├─ Consumidor (María):   $10  (10%)
└─ Plataforma:          $60  (60%)
```

**5. Actualizar rol del referidor:**
```typescript
// Si es su primera conversión
user.roles = ['referrer']  // Confirma su rol
```

---

### **FASE 6: Visualización en Dashboards** 📊

#### Dashboard del Referidor (Juan)
```
Ruta: /dashboard/referrals
```

Juan ve en su dashboard:

**Estadísticas:**
- Total Referrals: 1
- Conversions: 1 (100% conversion rate)
- Pending Earnings: $30.00
- Total Earned: $0.00

**Historial de Referidos:**
| Negocio | Fecha | Estado |
|---------|-------|---------|
| La Pizzería | Hoy | ✅ CONVERTED |

**Ledger de Ganancias:**
| Descripción | Fecha | Monto | Estado |
|-------------|-------|-------|---------|
| Commission Earned | Hoy | $30.00 | ⏳ PENDING |

#### Dashboard del Consumidor (María)
```
Ruta: /dashboard/visits
```

María ve:

**Mis Visitas:**
| Negocio | Fecha | Estado | Recompensa |
|---------|-------|--------|------------|
| La Pizzería | Hoy | ✅ CONVERTED | $10.00 |

**Ganancias:**
| Descripción | Monto | Estado |
|-------------|-------|---------|
| Cash Reward | $10.00 | ⏳ PENDING |

**Banner:**
"Want to earn more? Become a referrer and share businesses with your network!"

#### Dashboard del Negocio
```
Ruta: /dashboard/business
```

El dueño de "La Pizzería" ve:

**Estadísticas:**
- Total Visits: 1
- Total Conversions: 1
- Pending Charges Owed: $100.00
- Conversion Rate: 100%

**Visitas Recientes:**
| Cliente | Fecha | Referidor | Estado |
|---------|-------|-----------|---------|
| María G. | Hoy | Juan P. | ✅ CONVERTED |

**Cargos Pendientes:**
| Fecha | Cliente | Monto | Estado |
|-------|---------|-------|---------|
| Hoy | María G. | $100.00 | ⏳ OWED |

---

### **FASE 7: Procesamiento de Pagos** 💳

#### Paso 7.1: Negocio Paga a la Plataforma

El negocio realiza pago (actualmente manual, futuro: Stripe):
- Método: Transferencia / Stripe
- Monto: $100.00

#### Paso 7.2: Admin Marca Cargo como Pagado
```
API: app/api/admin/charges/[id]/paid
```

Administrador:
1. Verifica recepción del pago
2. Marca cargo como PAID:

```typescript
{
  status: "PAID",  // OWED → PAID
  paidAt: new Date()
}
```

#### Paso 7.3: Aprobación de Ganancias

Admin aprueba las ganancias:

**Para Juan (referidor):**
```typescript
{
  status: "APPROVED",  // PENDING → APPROVED
  updatedAt: new Date()
}
```

**Para María (consumidor):**
```typescript
{
  status: "APPROVED",
  updatedAt: new Date()
}
```

#### Paso 7.4: Procesamiento de Pagos

Plataforma procesa pagos:

**A Juan:**
- Método: Transferencia bancaria / PayPal
- Monto: $30.00
- Estado final: `PAID`

**A María:**
- Método: Cashback en app / Transferencia
- Monto: $10.00
- Estado final: `PAID`

**Actualización en dashboards:**

Juan ahora ve:
- Pending Earnings: $0.00
- Total Earned: $30.00 ✅

María ve:
- Status: PAID ✅
- Dinero disponible para retiro

---

## Casos Especiales

### Caso 1: Visita Sin Referidor (Atribución a Plataforma)
```
URL: https://smartai.app/r/abc123
(Sin parámetro ?ref=)
```

**Flujo:**
1. Consumidor llega directo (sin referidor)
2. Sistema crea visita con:
   ```typescript
   {
     referrerUserId: null,
     attributionType: "PLATFORM"
   }
   ```
3. En conversión:
   - No se crea ganancia para referidor
   - Plataforma recibe: $90 (90%)
   - Consumidor recibe: $10 (si aplica)

**Distribución:**
```
Precio total: $100
├─ Consumidor: $10
└─ Plataforma: $90
```

### Caso 2: Cliente Repetido (Anti-Fraude)
```
María intenta registrar segunda visita
```

**Detección:**
```typescript
const existingVisits = await db
  .collection('visits')
  .where('businessId', '==', 'abc123')
  .where('consumerUserId', '==', 'user123')
  .get()

isNewCustomer = false  // ❌
```

**Resultado:**
1. Visita se crea pero con `isNewCustomer: false`
2. Se genera flag de fraude automáticamente
3. En conversión, sistema rechaza:
   ```
   Error: "Repeat customer - not eligible for rewards"
   ```
4. Admin puede revisar en dashboard de fraude

### Caso 3: Auto-Referido (Prevención)
```
Juan intenta usar su propio link de referido
```

**Validación:**
```typescript
if (referrerUserId === consumerUserId) {
  return error('Cannot refer yourself')
}
```

Visita no se crea. ❌

### Caso 4: Negocio Suspendido

Si el negocio es suspendido:
```typescript
businessData.status = 'suspended'
```

**Efectos:**
1. No puede crear nuevas visitas
2. No puede confirmar conversiones
3. Link de referidos muestra error
4. Conversiones pendientes quedan congeladas

---

## Métricas y Analytics

### Métricas del Negocio
```typescript
interface BusinessStats {
  totalVisits: number              // Total de visitas registradas
  totalConversions: number         // Conversiones confirmadas
  pendingConversions: number       // Esperando confirmación
  totalChargesOwed: number         // Deuda pendiente
  totalChargesPaid: number         // Ya pagado
}
```

### Métricas del Referidor
```typescript
interface ReferrerStats {
  totalReferrals: number           // Personas referidas
  successfulConversions: number    // Conversiones exitosas
  pendingEarnings: number          // Dinero pendiente
  totalEarnings: number            // Aprobado + Pagado
  paidEarnings: number             // Ya cobrado
}
```

### Métricas de Admin (Plataforma)
```typescript
interface AdminStats {
  totalBusinesses: number          // Negocios registrados
  pendingBusinesses: number        // Esperando aprobación
  totalUsers: number               // Usuarios totales
  totalVisits: number              // Todas las visitas
  totalConversions: number         // Todas las conversiones
  totalRevenue: number             // Ingresos de plataforma
}
```

---

## Arquitectura de Seguridad

### 1. Autenticación
- Firebase Authentication
- JWT tokens en cada request
- Server-side verification en todos los endpoints

### 2. Autorización
```typescript
// Roles y permisos
- Admin: Acceso total
- Business: Solo su negocio
- Referrer: Solo sus referidos
- Consumer: Solo sus visitas
```

### 3. Anti-Fraude
- Detección de clientes repetidos
- Prevención de auto-referidos
- Tracking de IP y User Agent
- Sistema de flags para revisión manual

### 4. Transacciones Atómicas
- Todas las operaciones críticas usan Firestore transactions
- Rollback automático en caso de error
- Garantiza consistencia de datos

---

## Tecnologías Utilizadas

### Frontend
- **Next.js 14** (App Router)
- **React 18** con TypeScript
- **Tailwind CSS** para estilos
- **shadcn/ui** componentes
- **QRCode** librería para códigos QR
- **i18next** para internacionalización

### Backend
- **Next.js API Routes** (serverless)
- **Firebase Admin SDK** (server-side)
- **Firebase Firestore** (base de datos)
- **Firebase Auth** (autenticación)
- **Firebase Storage** (archivos)

### Deployment
- **Vercel** (hosting y serverless)
- **Firebase** (backend services)

---

## Próximos Pasos y Mejoras

### Fase 1: Pagos Automatizados
- [ ] Integración con Stripe Connect
- [ ] Pagos automáticos a referidores
- [ ] Suscripciones para negocios

### Fase 2: Notificaciones
- [ ] Email notifications (SendGrid)
- [ ] SMS notifications (Twilio)
- [ ] Push notifications (Firebase Cloud Messaging)

### Fase 3: Analytics Avanzados
- [ ] Gráficos de conversión por tiempo
- [ ] ROI por referidor
- [ ] Heatmaps de referidos
- [ ] Exportar reportes en CSV/PDF

### Fase 4: Gamificación
- [ ] Badges para referidores top
- [ ] Leaderboards
- [ ] Bonos por metas cumplidas
- [ ] Niveles de referidor (Bronze, Silver, Gold)

### Fase 5: Mobile
- [ ] App nativa React Native
- [ ] Escaneo de QR desde app
- [ ] Notificaciones push nativas

---

## Resumen del Flujo Completo

```
1. NEGOCIO registra → Crea oferta → Admin aprueba
                                    ↓
2. REFERIDOR registra → Selecciona negocio → Obtiene link/QR
                                    ↓
3. CONSUMIDOR recibe link → Registra cuenta → Visita se crea automáticamente
                                    ↓
4. CONSUMIDOR visita físicamente → Hace compra en negocio
                                    ↓
5. NEGOCIO confirma conversión → Sistema crea ganancias y cargos
                                    ↓
6. NEGOCIO paga a plataforma → Admin procesa
                                    ↓
7. PLATAFORMA paga a referidor y consumidor → Todos felices 🎉
```

**Distribución típica de $100:**
- 💰 Plataforma: $60 (60%)
- 👥 Referidor: $30 (30%)
- 🛍️ Consumidor: $10 (10%)

---

## Contacto y Soporte

Para más información sobre el caso de uso o implementación:
- GitHub: [Smart AI Referrals Repository]
- Email: admin@smartaireferrals.com
- Documentación: Ver README.md y código fuente

---

**Última actualización:** 2026-01-27
**Versión:** 1.0
**Autor:** Smart AI Referrals Team
