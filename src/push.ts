import {
  Plugins,
  PushNotification,
  PushNotificationToken,
  PushNotificationActionPerformed
} from '@capacitor/core'
import { fetchText } from './http'
import challengesApi from './lichess/challenges'
import router from './router'
import session from './session'
import settings from './settings'
import { handleXhrError } from './utils'
import { isForeground } from './utils/appMode'

const { PushNotifications } = Plugins

export default {
  init() {
    PushNotifications.addListener('registration',
      (token: PushNotificationToken) => {

        console.debug('Push registration success, token: ' + token.value)

        fetchText(`/mobile/register/firebase/${token.value}`, {
          method: 'POST'
        })
        .catch(handleXhrError)

      }
    )

    PushNotifications.addListener('registrationError',
      (error: any) => {
        console.error('Error on registration: ' + JSON.stringify(error))
      }
    )

    PushNotifications.addListener('pushNotificationReceived',
      (notification: PushNotification) => {
        if (isForeground()) {
          switch (notification.data.type) {
            case 'challengeAccept':
              session.refresh()
              break
            case 'corresAlarm':
            case 'gameTakebackOffer':
            case 'gameDrawOffer':
            case 'gameFinish':
              session.refresh()
              break
            case 'gameMove':
              session.refresh()
              break
          }
        }
      }
    )

    PushNotifications.addListener('pushNotificationActionPerformed',
      (action: PushNotificationActionPerformed) => {
        if (action.actionId === 'tap') {
          switch (action.notification.data.type) {
            case 'challengeAccept':
              challengesApi.refresh()
              router.set(`/game/${action.notification.data.challengeId}`)
              break
            case 'challengeCreate':
              router.set(`/challenge/${action.notification.data.challengeId}`)
              break
            case 'corresAlarm':
            case 'gameMove':
            case 'gameFinish':
            case 'gameTakebackOffer':
            case 'gameDrawOffer':
              router.set(`/game/${action.notification.data.fullId}`)
              break
            case 'newMessage':
              router.set(`/inbox/${action.notification.data.threadId}`)
              break
          }
        }
      }
    )

    register()
  },

  register,

  unregister(): Promise<string> {
    return fetchText('/mobile/unregister', { method: 'POST' })
  }
}

function register(): Promise<void> {
  if (settings.general.notifications.allow()) {
    return PushNotifications.register()
  }

  return Promise.resolve()
}
