# Cómo Desplegar las Reglas de Firestore

Las reglas de Firestore han sido actualizadas para permitir que usuarios NO autenticados puedan ver información de negocios y ofertas (necesario para que funcionen los links de referral).

## Opción 1: Desde Firebase Console (Más Fácil)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Firestore Database** en el menú izquierdo
4. Haz clic en la pestaña **Rules** (Reglas)
5. Copia y pega el contenido de `firestore.rules` del proyecto
6. Haz clic en **Publish** (Publicar)

## Opción 2: Usando Firebase CLI

Si tienes Firebase CLI instalado:

```bash
# Instalar Firebase CLI (si no lo tienes)
npm install -g firebase-tools

# Login a Firebase
firebase login

# Inicializar proyecto (solo primera vez)
firebase init firestore

# Desplegar reglas
firebase deploy --only firestore:rules
```

## Cambios Realizados

### Antes (Bloqueaba usuarios no autenticados):
```javascript
// Businesses collection
match /businesses/{businessId} {
  allow read: if resource.data.status == 'active' ||
    isOwner(resource.data.ownerUserId) ||
    isAdmin();
}

// Offers collection
match /offers/{offerId} {
  allow read: if resource.data.active == true || isAdmin();
}
```

### Después (Permite lectura pública):
```javascript
// Businesses collection
match /businesses/{businessId} {
  // Anyone can read active businesses (even non-authenticated users for referral pages)
  allow read: if true; // Public read for referral links to work
}

// Offers collection
match /offers/{offerId} {
  // Anyone can read offers (needed for referral pages)
  allow read: if true;
}
```

## ¿Por qué este cambio?

### Problema Original:
Cuando un usuario NO autenticado escaneaba un QR code de referral, el sistema intentaba leer la información del negocio desde Firestore pero las reglas lo bloqueaban, mostrando el error:
```
Error: Failed to load business information
Business Not Found
```

### Solución:
Permitir lectura pública de businesses y offers para que los links de referral funcionen sin requerir autenticación previa.

## Seguridad

✅ **SEGURO**: Solo permite **LEER** información
❌ **PROTEGIDO**: Crear, actualizar y eliminar siguen protegidos:
```javascript
// Managed by server only
allow create, update, delete: if false;
```

Los negocios y ofertas son información pública de cualquier forma (se muestran en links de referral), así que permitir lectura pública es apropiado.

## Verificación

Después de desplegar, verifica que funciona:

1. Abre modo incógnito (sin autenticación)
2. Escanea un QR code de referral
3. ✅ Deberías ver la información del negocio
4. ✅ Deberías ver el botón "Get Started" para registrarte
5. ❌ NO deberías ver "Error: Failed to load business information"

## Troubleshooting

Si después de desplegar aún ves el error:

1. Espera 1-2 minutos (las reglas tardan en propagarse)
2. Limpia la caché del browser
3. Verifica en Firebase Console que las reglas se desplegaron correctamente
4. Revisa la consola del browser (F12) para ver errores específicos

## Contacto

Si tienes problemas desplegando las reglas, contacta al equipo de desarrollo.
