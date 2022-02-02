import { Config, RawConfig } from './config.js'

interface Listener {
    addListener : (
        callback :(details:{
            error:string,
            url:string,
        }) => void,
        filter: {
            urls :string[],
        },
        extraInfoSpec?: any
    ) => void
}

export interface WebHook {
    // handlerBehaviorChanged : (callback? :Function) => void
    onErrorOccurred : Listener
}

export interface ProxyHook {
    settings : {
        set : (
            details: {
                value : {
                    mode:string,
                    pacScript: {
                      data: string
                    },
                }
            }
        ) => Promise<void>
    }
}

export interface Storage{
    set:(config:RawConfig)=>Promise<void>
    get:() => Promise<RawConfig>
}

class SwitchydWorker {
  protected proxyhook : ProxyHook
  protected storage : Storage

  constructor (proxyhook : ProxyHook, storage:Storage) {
    this.proxyhook = proxyhook
    this.storage = storage
  }

  public applyPAC ():Promise<void> {
    return this.loadConfig().then((config) => this.applyPACWithConfig(config))
  }

  public assignProxyFor (error:string, url:string):Promise<void> {
    console.log(`try add ${url} for ${error}`)
    return this.loadConfig()
      .then((config) => config.assignProxyFor(error, url))
      .then((changed:boolean):Promise<void> => {
        if (changed) {
          return this.loadConfig()
            .then((config:Config) => this.applyPACWithConfig(config))
        }
        return Promise.resolve()
      })
  }

  protected applyPACWithConfig (config:Config):Promise<void> {
    const script = config.createGeneartor().compile()
    return this.proxyhook.settings.set(
      {
        value: {
          mode: 'pac_script',
          pacScript: {
            data: script
          }
        }
      }
    ).then((_:void):void => {
      console.log(`apply ${script}`)
    }).catch((reason:any):void => {
      console.warn(`fail to apply pac script:${reason}`)
    })
  }

  protected loadConfig ():Promise<Config> {
    return this.storage.get()
      .then((raw:RawConfig) => new Config(raw, (config:RawConfig) => this.storage.set(config)))
  }
}

export class Switchyd {
    protected webhook : WebHook
    protected proxyhook : ProxyHook
    protected storage : Storage

    constructor (webhook:WebHook, proxyhook:ProxyHook, storage:Storage) {
      this.webhook = webhook
      this.proxyhook = proxyhook
      this.storage = storage
    }

    public newWorker ():SwitchydWorker {
      return new SwitchydWorker(this.proxyhook, this.storage)
    }

    public plug ():Promise<void> {
      return new Promise<void>((resolve):void => {
        this.webhook.onErrorOccurred.addListener(
          (details):void => {
            // it is run in a service worker
            const worker = this.newWorker()
            if (details.error === 'net::ERR_NETWORK_CHANGED') {
              console.log('network changed,regen PAC script')
              resolve(worker.applyPAC())
              return
            }

            // find host start
            const start = details.url.indexOf('://') + 3
            let end = details.url.indexOf('/', start)
            if (end === -1) {
              end = details.url.length
            }
            const url = details.url.substring(start, end)
            resolve(worker.assignProxyFor(details.error, url))
          },
          {
            urls: [
              'http://*/*',
              'https://*/*',
              'ws://*/*',
              'wss://*/*'
            ]
          },
          ['extraHeaders'])
      })
    }
}
