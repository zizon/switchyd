import { Config, RawConfig } from './config.js'

interface Listener {
  addListener: (
    callback: (details: {
      error: string,
      url: string,
    }) => void,
    filter: {
      urls: string[],
    },
    extraInfoSpec?: any
  ) => void
}

export interface WebHook {
  // handlerBehaviorChanged : (callback? :Function) => void
  onErrorOccurred: Listener
}

export interface ProxyHook {
  settings: {
    set: (
      details: {
        value: {
          mode: string,
          pacScript: {
            data: string
          },
        }
      }
    ) => Promise<void>
  }
}

export interface Storage {
  set: (config: RawConfig) => Promise<void>
  get: () => Promise<RawConfig>
}

export class SwitchydWorker {
  protected proxyhook: ProxyHook
  protected storage: Storage

  constructor (proxyhook: ProxyHook, storage: Storage) {
    this.proxyhook = proxyhook
    this.storage = storage
  }

  public async applyPAC (): Promise<void> {
    const config = await this.loadConfig()
    return await this.applyPACWithConfig(config)
  }

  public async assignProxyFor (error: string, url: string): Promise<void> {
    console.log(`try add ${url} for ${error}`)
    const config = await this.loadConfig()
    const changed = await config.assignProxyFor(error, url)
    if (changed) {
      console.log(`try appply for${error},${url}`)
      return this.loadConfig()
        .then((config: Config) => this.applyPACWithConfig(config))
    }
    console.log(`no appply for${error},${url}`)
    return await Promise.resolve()
  }

  protected async applyPACWithConfig (config: Config): Promise<void> {
    const script = config.createGeneartor().compile()
    try {
      await this.proxyhook.settings.set(
        {
          value: {
            mode: 'pac_script',
            pacScript: {
              data: script
            }
          }
        }
      )
      console.log(`apply ${script}`)
    } catch (reason) {
      console.warn(`fail to apply pac script:${reason}`)
    }
  }

  protected async loadConfig (): Promise<Config> {
    const raw = await this.storage.get()
    return new Config(raw, (config: RawConfig) => this.storage.set(config))
  }
}

export class Switchyd {
  protected webhook: WebHook
  protected proxyhook: ProxyHook
  protected storage: Storage

  constructor (webhook: WebHook, proxyhook: ProxyHook, storage: Storage) {
    this.webhook = webhook
    this.proxyhook = proxyhook
    this.storage = storage
  }

  public newWorker (): SwitchydWorker {
    return new SwitchydWorker(this.proxyhook, this.storage)
  }

  public plug (): void {
    // kick first pac
    this.newWorker().applyPAC()

    // sync register
    this.webhook.onErrorOccurred.addListener(
      (details): void => {
        // it is run in a service worker
        const worker = this.newWorker()
        if (details.error === 'net::ERR_NETWORK_CHANGED') {
          console.log('network changed,regen PAC script')
          worker.applyPAC()
          return
        }

        // find host start
        const start = details.url.indexOf('://') + 3
        let end = details.url.indexOf('/', start)
        if (end === -1) {
          end = details.url.length
        }

        const url = details.url.substring(start, end)
        worker.assignProxyFor(details.error, url)
      },
      {
        urls: [
          'http://*/*',
          'https://*/*',
          'ws://*/*',
          'wss://*/*'
        ]
      },
      ['extraHeaders']
    )
  }
}
