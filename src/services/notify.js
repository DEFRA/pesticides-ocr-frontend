import { config } from '#/config/config.js'
import { NotifyClient } from 'notifications-node-client'

const notifyConfig = config.get('notify')

let client

function getClient() {
  if (!client) {
    if (!notifyConfig.apiKey) {
      const expectedEnvVar =
        notifyConfig.keyMode === 'team'
          ? 'NOTIFY_TEAM_API_KEY'
          : 'NOTIFY_TEST_API_KEY'

      throw new Error(
        `No Notify API key configured. Set ${expectedEnvVar} for NOTIFY_KEY_MODE=${notifyConfig.keyMode}, or NOTIFY_API_KEY directly.`
      )
    }

    client = new NotifyClient(notifyConfig.apiKey)
  }

  return client
}

async function sendEmail(templateName, emailAddress, personalisation) {
  const templateId = notifyConfig.templates[templateName]

  if (!templateId) {
    throw new Error(`Unknown template '${templateName}'`)
  }

  return getClient().sendEmail(templateId, emailAddress, { personalisation })
    .then((response) => {
      if (!config.get('isProduction')) {
        console.log(
          `Email sent to ${emailAddress} using template '${templateName}' (ID: ${templateId}). Response:`,
          response
        )
      }
      return response
    })
    .catch((error) => {
      if (!config.get('isProduction')) {
        console.error(
        `Error sending email to ${emailAddress} using template '${templateName}' (ID: ${templateId}):`
        )
        for (const [key, value] of Object.entries(error.response.data.errors)) {
          console.error(`  ${key}:`, value)
        }
        return error
      }

      throw error
    })
}

export { sendEmail }
