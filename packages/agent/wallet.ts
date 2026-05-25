// ============================================================
// Verity — Circle Wallet Integration
// ============================================================

import axios        from 'axios'
import crypto, { randomUUID } from 'crypto'
import { logger }   from './logger'

const CIRCLE_API_URL = 'https://api.circle.com/v1/w3s'
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY    ?? ''
const WALLET_ID      = process.env.CIRCLE_WALLET_ID  ?? ''
const ENTITY_SECRET  = process.env.CIRCLE_ENTITY_SECRET ?? ''

const circleClient = axios.create({
  baseURL : CIRCLE_API_URL,
  headers : {
    'Authorization': `Bearer ${CIRCLE_API_KEY}`,
    'Content-Type' : 'application/json',
  },
})

async function getEntitySecretCiphertext(): Promise<string> {
  const res       = await circleClient.get('/config/entity/publicKey')
  const publicKey = res.data?.data?.publicKey as string

  const encrypted = crypto.publicEncrypt(
    {
      key     : publicKey,
      padding : crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(ENTITY_SECRET, 'hex')
  )

  return encrypted.toString('base64')
}

export async function getWalletBalance(): Promise<number> {
  try {
    const res      = await circleClient.get(`/wallets/${WALLET_ID}/balances`)
    const balances = res.data?.data?.tokenBalances ?? []
    const usdc     = balances.find((b: any) => b.token?.symbol === 'USDC')
    return usdc ? parseFloat(usdc.amount) : 0
  } catch (err) {
    logger.error('Failed to fetch wallet balance', err)
    return 0
  }
}

export async function payForQuery(
  recipientAddress : string,
  amountUsdc       : number,
  queryDescription : string
): Promise<{ success: boolean; txHash?: string }> {
  try {
    const entitySecretCiphertext = await getEntitySecretCiphertext()

    const requestBody = {
      idempotencyKey        : randomUUID(),
      walletId              : WALLET_ID,
      tokenId               : process.env.CIRCLE_USDC_TOKEN_ID,
      destinationAddress    : recipientAddress,
      amounts               : [amountUsdc.toFixed(6)],
      blockchain            : 'ETH-SEPOLIA',
      feeLevel              : 'MEDIUM',
      entitySecretCiphertext,
    }

    logger.payment(`Paying ${amountUsdc} USDC for: ${queryDescription}`)

    const res    = await circleClient.post('/developer/transactions/transfer', requestBody)
    const txHash = res.data?.data?.txHash

    logger.payment(`Payment successful`, { txHash, amountUsdc, queryDescription })

    return { success: true, txHash }
  } catch (err: any) {
    const errData = err?.response?.data
    logger.error('Payment failed', JSON.stringify(errData ?? err?.message ?? err))
    return { success: false }
  }
}

export async function hasSufficientBalance(
  requiredUsdc: number
): Promise<boolean> {
  const balance    = await getWalletBalance()
  const sufficient = balance >= requiredUsdc
  if (!sufficient) {
    logger.warn(`Insufficient balance: ${balance} USDC available, ${requiredUsdc} USDC required`)
  }
  return sufficient
}