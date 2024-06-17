const axios = require('axios')
const { Reclaim } = require('@reclaimprotocol/js-sdk')
const {
  RECLAIM_PROVIDER_ID,
  RECLAIM_APP_ID,
  PROVIDER_ID,
} = require('../utils/constants')
const { processTwitterData } = require('./twitterService')
const { processGitHubData } = require('./githubService')

exports.signWithProviderID = async (userId, providerId) => {
  const providerName = RECLAIM_PROVIDER_ID[providerId]
  const reclaimAppID = RECLAIM_APP_ID[providerName]
  const reclaimAppSecret =
    '0xc1690de050bdd299923b7a94aa274dfccbd0fcb5cf69b33df3f114f9a40bc736'

  console.log(
    `Sending signature request to Reclaim for userId: ${userId} with providerName: ${providerName}`
  )

  try {
    const reclaimClient = new Reclaim.ProofRequest(reclaimAppID)
    await reclaimClient.buildProofRequest(PROVIDER_ID[providerId])
    console.log('appSecret', reclaimAppSecret)
    reclaimClient.setSignature(
      await reclaimClient.generateSignature(reclaimAppSecret)
    )
    const { requestUrl: signedUrl } =
      await reclaimClient.createVerificationRequest()

    await handleReclaimSession(userId, reclaimClient, providerName)
    return signedUrl
  } catch (error) {
    console.error(
      `Failed to process Reclaim request for userId: ${userId}`,
      error
    )
  }
}

const handleReclaimSession = async (userId, reclaimClient, providerName) => {
  await reclaimClient.startSession({
    onSuccessCallback: async proof => {
      console.log(
        `Successful reclaim callback with proof: ${JSON.stringify(proof)}`
      )

      try {
        let processedData
        switch (providerName) {
          case 'TWITTER_ANALYTICS_VIEWS':
            processedData = await processTwitterData(proof, providerName)
            break
          case 'GITHUB_ACCOUNT_VERIFICATION':
            processedData = await processGitHubData(proof, providerName)
            console.log(`Processed data: ${JSON.stringify(processedData)}`)
            break
          default:
            throw new Error(`No handler for provider: ${providerName}`)
        }

        console.log(`Processed data: ${JSON.stringify(processedData)}`)
      } catch (error) {
        console.error(
          `Failed to process Reclaim proof for userId: ${userId}`,
          error
        )
      }
    },
    onFailureCallback: error => {
      console.error(`Verification failed for userId: ${userId}`, error)
    },
  })
}
