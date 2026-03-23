import { getAdminDb } from '@/lib/firebase/admin'

export type AdminAction =
  | 'CHARGE_PAYMENT'
  | 'CHARGE_VOID'
  | 'CHARGE_PAY_ALL'
  | 'EARNINGS_APPROVED'
  | 'PAYOUT_COMPLETED'
  | 'PAYOUT_REJECTED'

export async function logAdminAction(params: {
  action: AdminAction
  adminUid: string
  details: Record<string, unknown>
}) {
  try {
    await getAdminDb().collection('admin_logs').add({
      action: params.action,
      adminUid: params.adminUid,
      details: params.details,
      createdAt: new Date(),
    })
  } catch (error) {
    console.error('Failed to log admin action:', error)
  }
}
