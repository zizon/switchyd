import { resolveStorage } from './chrome.js'
import { Switchyd } from './switchyd.js'

declare const chrome: {
  webRequest: any
  proxy: any
  runtime: {
    onInstalled: {
      addListener: (callback: (detail: { reason: string }) => void) => any
    }
  }
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason !== "install" && details.reason !== "update")
    return

  new Switchyd(chrome.webRequest, chrome.proxy, resolveStorage()).plug()
})
