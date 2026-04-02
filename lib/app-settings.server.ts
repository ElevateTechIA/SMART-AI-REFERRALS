import { getAdminDb } from '@/lib/firebase/admin'

const CONFIG_DOC_PATH = 'config/appSettings'

export interface AppSettings {
  autoApproveBusinesses: boolean
  autoApproveReferrers: boolean
}

const DEFAULT_APP_SETTINGS: AppSettings = {
  autoApproveBusinesses: false,
  autoApproveReferrers: false,
}

/** Fetch app settings from Firestore, fallback to defaults */
export async function getAppSettings(): Promise<AppSettings> {
  try {
    const doc = await getAdminDb().doc(CONFIG_DOC_PATH).get()
    if (doc.exists) {
      const data = doc.data()!
      return {
        autoApproveBusinesses: data.autoApproveBusinesses ?? data.autoApproveUsers ?? DEFAULT_APP_SETTINGS.autoApproveBusinesses,
        autoApproveReferrers: data.autoApproveReferrers ?? data.autoApproveUsers ?? DEFAULT_APP_SETTINGS.autoApproveReferrers,
      }
    }
  } catch (error) {
    console.error('Error fetching app settings, using defaults:', error)
  }
  return DEFAULT_APP_SETTINGS
}

/** Save app settings to Firestore */
export async function saveAppSettings(settings: Partial<AppSettings>): Promise<void> {
  await getAdminDb().doc(CONFIG_DOC_PATH).set({
    ...settings,
    updatedAt: new Date(),
  }, { merge: true })
}
