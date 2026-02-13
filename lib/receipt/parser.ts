import type { ReceiptData } from '@/lib/types'

export interface ParsedReceiptResult {
  data: ReceiptData | null
  confidence: number
  error: string | null
}

export function parseGeminiReceiptResponse(responseText: string): ParsedReceiptResult {
  // Strip markdown code blocks (same pattern as chat/registration)
  let jsonStr = responseText
  const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonMatch) {
    jsonStr = jsonMatch[1]
  }

  try {
    const parsed = JSON.parse(jsonStr.trim())

    if (parsed.error) {
      return { data: null, confidence: 0, error: parsed.error }
    }

    return {
      data: {
        storeName: parsed.storeName ?? undefined,
        storeAddress: parsed.storeAddress ?? undefined,
        date: parsed.date ?? undefined,
        totalAmount: typeof parsed.totalAmount === 'number' ? parsed.totalAmount : undefined,
        subtotal: typeof parsed.subtotal === 'number' ? parsed.subtotal : undefined,
        tax: typeof parsed.tax === 'number' ? parsed.tax : undefined,
        tip: typeof parsed.tip === 'number' ? parsed.tip : undefined,
        paymentMethod: parsed.paymentMethod ?? undefined,
        lastFourDigits: parsed.lastFourDigits ?? undefined,
        items: Array.isArray(parsed.items) ? parsed.items.map((item: Record<string, unknown>) => ({
          name: String(item.name || ''),
          quantity: typeof item.quantity === 'number' ? item.quantity : undefined,
          price: typeof item.price === 'number' ? item.price : undefined,
        })) : undefined,
        currency: parsed.currency || 'USD',
        receiptNumber: parsed.receiptNumber ?? undefined,
      },
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
      error: null,
    }
  } catch {
    return {
      data: null,
      confidence: 0,
      error: 'PARSE_ERROR',
    }
  }
}
