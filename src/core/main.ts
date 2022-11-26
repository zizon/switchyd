import { resolveStorage } from './chrome.js'
import { Switchyd } from './switchyd.js'

declare const chrome: {
  webRequest:any
  proxy:any
}

new Switchyd(chrome.webRequest, chrome.proxy, resolveStorage()).plug()
