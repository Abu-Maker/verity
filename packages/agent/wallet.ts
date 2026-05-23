// ============================================================
// Verity — Circle Wallet Integration
// Handles USDC payments from the agent's Circle wallet.
// Migrated and generalised from ArcSense Lite's agentWallet.ts
// and circlePayment.ts — Arc-specific code removed.
// ============================================================

import axios from 'axios'
import { logger } from './logger'

const CIRCLE_API_URL = 'https://api.circle.com/v1/w3s'
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY ?? ''
const WALLET_ID      = process.env.CIRCLE_WALLET_ID ?? ''

// ---- Circle API client ------------------------------------

const circleClient = axios.create({
  baseURL : CIRCLE_API_URL,
  headers : {
    'Authorization': `Bearer ${CIRCLE_API_KEY}`,
    'Content-Type' : 'application/json',
  },
})

// ---- Get wallet balance ------------------------------------

export async function getWalletBalance(): Promise<number> {
  try {
    const res = await circleClient.get(`/wallets/${WALLET_ID}/balances`)
    const balances = res.data?.data?.tokenBalances ?? []

    const usdc = balances.find(
      (b: any) => b.token?.symbol === 'USDC'
    )

    return usdc ? parseFloat(usdc.amount) : 0
  } catch (err) {
    logger.error('Failed to fetch wallet balance', err)
    return 0
  }
}

// ---- Pay for a query ---------------------------------------

export async function payForQuery(
  recipientAddress : string,
  amountUsdc       : number,
  queryDescription : string
): Promise<{ success: boolean; txHash?: string }> {
  try {
    logger.payment(`Paying ${amountUsdc} USDC for: ${queryDescription}`)

    const res = await circleClient.post('/transactions/transfer', {
      idempotencyKey    : `verity-agent-${Date.now()}`,
      walletId          : WALLET_ID,
      tokenId           : process.env.CIRCLE_USDC_TOKEN_ID,
      destinationAddress: recipientAddress,
      amounts           : [amountUsdc.toFixed(6)],
    })

    const txHash = res.data?.data?.txHash

    logger.payment(`Payment successful`, { txHash, amountUsdc, queryDescription })

    return { success: true, txHash }
  } catch (err: any) {
    logger.error('Payment failed', err?.response?.data ?? err?.message)
    return { success: false }
  }
}

// ---- Check if agent has enough balance ---------------------

export async function hasSufficientBalance(
  requiredUsdc: number
): Promise<boolean> {
  const balance = await getWalletBalance()
  const sufficient = balance >= requiredUsdc

  if (!sufficient) {
    logger.warn(`Insufficient balance: ${balance} USDC available, ${requiredUsdc} USDC required`)
  }

  return sufficient
}