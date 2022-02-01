import { Config } from './config'

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

interface WebHook {
    // handlerBehaviorChanged : (callback? :Function) => void
    onErrorOccurred : Listener
}

 interface ProxyHook {
    settings : {
        set : (
            details: {
                value : {
                    mode:string,
                    pacScript:string,
                }
            }
        ) => Promise<void>
    }
}

 interface Storage{
    setItem:(key:string, value:string)=>void
    getItem:(key:string)=>string|null
}

class SwitchydWorker {
  protected proxyhook : ProxyHook
  protected storage : Storage

  constructor (proxyhook : ProxyHook, storage:Storage) {
    this.proxyhook = proxyhook
    this.storage = storage
  }

  public applyPAC (config?: Config):Promise<void> {
    const generator = config ? config.createGeneartor() : this.loadConfig().createGeneartor()
    const script = generator.compile()
    return this.proxyhook.settings.set(
      {
        value: {
          mode: 'pac_script',
          pacScript: script
        }
      })
      .then((_) => {
        console.log(`apply ${script}`)
      }).catch((reason:any) => {
        console.warn(`fail to apply pac script:${reason}`)
      })
  }

  public assignProxyFor (error:string, url:string, maybeConfig?:Config):Promise<void> {
    const config = maybeConfig || this.loadConfig()
    config.assignProxyFor(error, url)
    this.storage.setItem('switchyd.config', config.jsonify())
    return this.applyPAC(config)
  }

  protected loadConfig ():Config {
    const raw = this.storage.getItem('switchyd.config')
    return new Config(raw)
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
