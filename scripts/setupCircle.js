// ============================================================
// Verity — Circle Wallet Setup
// Run once to register entity secret and create the agent wallet
// ============================================================

const {
  initiateDeveloperControlledWalletsClient,
  registerEntitySecretCiphertext,
} = require('@circle-fin/developer-controlled-wallets')

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const API_KEY       = process.env.CIRCLE_API_KEY
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET

if (!API_KEY || !ENTITY_SECRET) {
  console.error('Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env')
  process.exit(1)
}

const client = initiateDeveloperControlledWalletsClient({
  apiKey      : API_KEY,
  entitySecret: ENTITY_SECRET,
})

async function main() {

  // Step 1 — Register entity secret ciphertext
  console.log('Registering entity secret...')
  const regResponse = await registerEntitySecretCiphertext({
    apiKey      : API_KEY,
    entitySecret: ENTITY_SECRET,
  })
  console.log('✅ Entity secret registered')
  console.log('Recovery file saved to disk automatically')
  console.log('Recovery data:', regResponse.data?.recoveryFile ? '(received)' : '(none)')

  // Step 2 — Create a wallet set
  console.log('\nCreating wallet set...')
  const { data: walletSetData } = await client.createWalletSet({
    name: 'verity-agent',
  })
  const walletSetId = walletSetData?.walletSet?.id
  console.log('✅ Wallet set created:', walletSetId)

  // Step 3 — Create the agent wallet on ETH-SEPOLIA testnet
  console.log('\nCreating agent wallet...')
  const { data: walletData } = await client.createWallets({
    accountType : 'EOA',
    blockchains : ['ETH-SEPOLIA'],
    count       : 1,
    walletSetId,
  })

  const wallet = walletData?.wallets?.[0]
  console.log('✅ Wallet created!')
  console.log('Wallet ID     :', wallet?.id)
  console.log('Wallet Address:', wallet?.address)

  console.log('\n--- Add these to your .env ---')
  console.log(`CIRCLE_WALLET_SET_ID=${walletSetId}`)
  console.log(`CIRCLE_WALLET_ID=${wallet?.id}`)
  console.log(`VERITY_PAYMENT_ADDRESS=${wallet?.address}`)
}

main().catch(err => {
  console.error('Setup failed:', err?.response?.data ?? err?.message ?? err)
  process.exit(1)
})