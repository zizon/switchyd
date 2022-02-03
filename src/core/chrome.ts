import { RawConfig } from './config.js'
import { WebHook, ProxyHook, Storage } from './switchyd.js'

/* eslint-disable no-unused-vars */
type saveConfig = {
    'switchyd.config':RawConfig
}
export declare namespace chrome{
    const webRequest :WebHook
    const proxy : ProxyHook
    const storage : {
        local : {
            set:(items:saveConfig)=>Promise<void>,
            get:(key:string)=>Promise<saveConfig>
        }
    }
}

export const ChromeStorage:Storage = {
  get: ():Promise<RawConfig> => {
    return chrome.storage.local.get('switchyd.config')
      .then((save:saveConfig) => {
        if (save['switchyd.config']) {
          return save['switchyd.config']
        }

        const defaultConfig:RawConfig = {
          version: 3,
          servers: [{
            accepts: [],
            denys: [],
            listen: [
              'net::ERR_CONNECTION_RESET',
              'net::ERR_CONNECTION_TIMED_OUT',
              'net::ERR_SSL_PROTOCOL_ERROR',
              'net::ERR_TIMED_OUT'
            ],
            server: 'SOCKS 127.0.0.1:10086'
          }]
        }

        return chrome.storage.local.set({ 'switchyd.config': defaultConfig })
          .then((_:void) => chrome.storage.local.get('switchyd.config'))
          .then((save:saveConfig) => {
            return save['switchyd.config']
          })
      })
  },

  set: (config:RawConfig):Promise<void> => {
    return chrome.storage.local.set({ 'switchyd.config': config })
  }
}
