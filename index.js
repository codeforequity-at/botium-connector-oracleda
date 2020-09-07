const util = require('util')
const crypto = require('crypto')
const mime = require('mime-types')
const _ = require('lodash')
const debug = require('debug')('botium-connector-oracleda')

const SimpleRestContainer = require('botium-core/src/containers/plugins/SimpleRestContainer')
const { Capabilities: CoreCapabilities } = require('botium-core')

const Capabilities = {
  ORACLE_WEBHOOK_URL: 'ORACLE_WEBHOOK_URL',
  ORACLE_WEBHOOK_SECRET: 'ORACLE_WEBHOOK_SECRET'
}

class BotiumConnectorOracle {
  constructor ({ queueBotSays, caps }) {
    this.queueBotSays = queueBotSays
    this.caps = caps
    this.delegateContainer = null
    this.delegateCaps = null
  }

  Validate () {
    debug('Validate called')

    this.caps = Object.assign({}, this.caps)

    if (!this.caps[Capabilities.ORACLE_WEBHOOK_URL]) throw new Error('ORACLE_WEBHOOK_URL capability required')
    if (!this.caps[Capabilities.ORACLE_WEBHOOK_SECRET]) throw new Error('ORACLE_WEBHOOK_SECRET capability required')

    if (!this.delegateContainer) {
      this.delegateCaps = {
        [CoreCapabilities.SIMPLEREST_URL]: this.caps[Capabilities.ORACLE_WEBHOOK_URL],
        [CoreCapabilities.SIMPLEREST_METHOD]: 'POST',
        [CoreCapabilities.SIMPLEREST_BODY_TEMPLATE]:
          `{
            "userId": "{{botium.conversationId}}",
            "messagePayload": {
            }
          }`,
        [CoreCapabilities.SIMPLEREST_REQUEST_HOOK]: ({ requestOptions, msg, context }) => {
          const messagePayload = requestOptions.body.messagePayload
          if (msg.buttons && msg.buttons.length > 0 && (msg.buttons[0].text || msg.buttons[0].payload)) {
            const payload = msg.buttons[0].payload || msg.buttons[0].text
            try {
              messagePayload.postback = JSON.parse(payload)
              messagePayload.type = 'postback'
            } catch (err) {
              messagePayload.postback = payload
              messagePayload.type = 'postback'
            }
          } else if (msg.media && msg.media.length > 0) {
            const media = msg.media[0]
            if (!media.mimeType) {
              debug('Mime-type is missing.')
            }
            messagePayload.attachment = {
              type: media.mimeType,
              url: media.mediaUri
            }
            messagePayload.type = 'attachment'
          } else {
            messagePayload.text = msg.messageText
            messagePayload.type = 'text'
          }

          const xHubSignature = this._buildSignatureHeader(Buffer.from(JSON.stringify(requestOptions.body), 'utf8'), this.caps[Capabilities.ORACLE_WEBHOOK_SECRET])
          requestOptions.headers = Object.assign(requestOptions.headers || {}, { 'X-Hub-Signature': xHubSignature })
        },
        [CoreCapabilities.SIMPLEREST_RESPONSE_HOOK]: ({ botMsg }) => {
          debug(`Response Body: ${util.inspect(botMsg.sourceData, false, null, true)}`)
          const mapButtonPayload = (p) => {
            let payload
            try {
              payload = JSON.parse(p)
            } catch (err) {
              payload = p
            }
            if (_.isObject(payload)) {
              delete payload['system.botId']
            }
            return payload
          }
          const mapButton = (b) => ({
            text: _.isString(b) ? b : b.title || b.text || b.label,
            payload: !_.isString(b) ? mapButtonPayload(b.postback || b.data) : null
          })
          const mapMedia = (m) => ({
            mediaUri: _.isString(m) ? m : m.url,
            mimeType: (_.isString(m) ? mime.lookup(m) : mime.lookup(m.url)) || 'application/unknown',
            altText: !_.isString(m) ? m.profile : false
          })
          const mapCard = (c) => ({
            text: c.title,
            content: c.content || c.description,
            media: c.imageUrl ? [mapMedia(c.imageUrl)] : null
          })

          const messagePayload = botMsg.sourceData.messagePayload
          botMsg.buttons = botMsg.buttons || []
          botMsg.media = botMsg.media || []
          botMsg.cards = botMsg.cards || []

          if (messagePayload.type === 'text') {
            botMsg.messageText = messagePayload.text
            if (messagePayload.actions && messagePayload.actions.length > 0) {
              for (const action of messagePayload.actions) {
                if (action.type === 'postback') {
                  botMsg.buttons.push(mapButton(action))
                } else {
                  debug(`The '${action.type}' action type is not supported yet.`)
                }
              }
            }
          } else if (messagePayload.type === 'card') {
            for (const card of messagePayload.cards) {
              const botiumCard = mapCard(card)
              if (card.actions && card.actions.length > 0) {
                botiumCard.buttons = []
                for (const action of card.actions) {
                  if (action.type === 'postback') {
                    botiumCard.buttons.push(mapButton(action))
                  } else {
                    debug(`The '${action.type}' action type is not supported yet.`)
                  }
                }
              }

              botMsg.cards.push(botiumCard)
            }
          } else if (messagePayload.type === 'attachment') {
            botMsg.media.push(mapMedia(messagePayload.attachment))
          } else {
            debug(`The '${messagePayload.type}' message type is not supported yet.`)
          }
        },
        [CoreCapabilities.SIMPLEREST_INBOUND_SELECTOR_JSONPATH]: '$.body.userId',
        [CoreCapabilities.SIMPLEREST_INBOUND_SELECTOR_VALUE]: '{{botium.conversationId}}'
      }
      for (const capKey of Object.keys(this.caps).filter(c => c.startsWith('SIMPLEREST'))) {
        if (!this.delegateCaps[capKey]) this.delegateCaps[capKey] = this.caps[capKey]
      }

      debug(`Validate delegateCaps ${util.inspect(this.delegateCaps)}`)
      this.delegateContainer = new SimpleRestContainer({ queueBotSays: this.queueBotSays, caps: this.delegateCaps })
    }

    debug('Validate delegate')
    return this.delegateContainer.Validate()
  }

  _deepFilter (item, selectFn, filterFn) {
    let result = []
    if (_.isArray(item)) {
      item.filter(selectFn).forEach(subItem => {
        result = result.concat(this._deepFilter(subItem, selectFn, filterFn))
      })
    } else if (selectFn(item)) {
      if (filterFn(item)) {
        result.push(item)
      } else {
        Object.getOwnPropertyNames(item).forEach(key => {
          result = result.concat(this._deepFilter(item[key], selectFn, filterFn))
        })
      }
    }
    return result
  }

  _buildSignatureHeader (buf, channelSecretKey) {
    return 'sha256=' + this._buildSignature(buf, channelSecretKey)
  }

  _buildSignature (buf, channelSecretKey) {
    const hmac = crypto.createHmac('sha256', Buffer.from(channelSecretKey, 'utf8'))
    hmac.update(buf)
    return hmac.digest('hex')
  }

  async Build () {
    return this.delegateContainer.Build()
  }

  async Start () {
    await this.delegateContainer.Start()
  }

  async UserSays (msg) {
    return this.delegateContainer.UserSays(msg)
  }

  async Stop () {
    return this.delegateContainer.Stop()
  }

  async Clean () {
    return this.delegateContainer.Clean()
  }
}

module.exports = {
  PluginVersion: 1,
  PluginClass: BotiumConnectorOracle
}
