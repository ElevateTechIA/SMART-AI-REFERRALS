import { getAdminDb } from '@/lib/firebase/admin'
import { DEFAULT_COMMISSION_SPLIT, type CommissionSplit } from '@/lib/commission-config'

const CONFIG_DOC_PATH = 'config/commissionSplit'

/** Fetch commission split from Firestore, fallback to defaults */
export async function getCommissionSplit(): Promise<CommissionSplit> {
  try {
    const doc = await getAdminDb().doc(CONFIG_DOC_PATH).get()
    if (doc.exists) {
      const data = doc.data()!
      const split: CommissionSplit = {
        promoterPercent: data.promoterPercent ?? DEFAULT_COMMISSION_SPLIT.promoterPercent,
        consumerPercent: data.consumerPercent ?? DEFAULT_COMMISSION_SPLIT.consumerPercent,
        platformPercent: data.platformPercent ?? DEFAULT_COMMISSION_SPLIT.platformPercent,
      }
      const total = split.promoterPercent + split.consumerPercent + split.platformPercent
      if (total !== 100) {
        console.error(`Commission split must sum to 100, got ${total}. Using defaults.`)
        return DEFAULT_COMMISSION_SPLIT
      }
      return split
    }
  } catch (error) {
    console.error('Error fetching commission config, using defaults:', error)
  }
  return DEFAULT_COMMISSION_SPLIT
}

/** Save commission split to Firestore */
export async function saveCommissionSplit(split: CommissionSplit): Promise<void> {
  const total = split.promoterPercent + split.consumerPercent + split.platformPercent
  if (total !== 100) {
    throw new Error(`Commission split must sum to 100, got ${total}`)
  }
  await getAdminDb().doc(CONFIG_DOC_PATH).set({
    promoterPercent: split.promoterPercent,
    consumerPercent: split.consumerPercent,
    platformPercent: split.platformPercent,
    updatedAt: new Date(),
  }, { merge: true })
}
