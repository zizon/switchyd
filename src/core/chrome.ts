import { RawConfig } from './config.js'
import { ProxyHook, Storage, WebHook } from './switchyd.js'

/* eslint-disable no-unused-vars */
declare type saveConfig = {
  'switchyd.config':RawConfig
}

declare const chrome:{
  webRequest :WebHook
  proxy : ProxyHook
  storage : {
      local : {
          set:(items:saveConfig)=>Promise<void>,
          get:(key:string)=>Promise<saveConfig>
      }
  }
}

export function resolveStorage ():Storage {
  if (chrome && chrome.storage) {
    return {
      get: async ():Promise<RawConfig> => {
        const save = await chrome.storage.local.get('switchyd.config')
        if (save['switchyd.config']) {
          return save['switchyd.config']
        }
        // try local storage
        const defaultConfig = {
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
            server: 'SOCKS5 127.0.0.1:10086'
          }]
        }
        await chrome.storage.local.set({ 'switchyd.config': defaultConfig })
        const config = await chrome.storage.local.get('switchyd.config')
        return config['switchyd.config']
      },

      set: (config:RawConfig):Promise<void> => {
        return chrome.storage.local.set({ 'switchyd.config': config })
      }
    }
  }

  let mockConfig:RawConfig = {
    version: 3,
    servers: [
      {
        accepts: ['www.google.com', 'www.facebook.com'],
        denys: ['www.weibo.com', 'www.baidu.com'],
        listen: [
          'net::ERR_CONNECTION_RESET',
          'net::ERR_CONNECTION_TIMED_OUT',
          'net::ERR_SSL_PROTOCOL_ERROR',
          'net::ERR_TIMED_OUT'
        ],
        server: 'SOCKS5:127.0.0.1:10086'
      },
      {
        accepts: ['twitter.com', 'github.com'],
        denys: ['www.douban.com'],
        listen: [
          'net::ERR_CONNECTION_RESET',
          'net::ERR_CONNECTION_TIMED_OUT',
          'net::ERR_SSL_PROTOCOL_ERROR',
          'net::ERR_TIMED_OUT'
        ],
        server: 'SOCKS5:127.0.0.2:10086'
      }
    ]
  }
  return {
    get: ():Promise<RawConfig> => {
      return Promise.resolve(mockConfig)
    },
    set: (config:RawConfig):Promise<void> => {
      mockConfig = config
      return Promise.resolve()
    }
  }
}
