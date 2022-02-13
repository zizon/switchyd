/* eslint-disable no-unused-vars */
import { resolveStorage } from './chrome.js'
import { Switchyd } from './switchyd.js'

declare const chrome: {
    webRequest:any
    proxy:any
    runtime: {
        onInstalled : {
            addListener(callback:()=>void):void
        }
    }
}

if (chrome && chrome.runtime) {
  chrome.runtime.onInstalled.addListener(():void => {
    new Switchyd(chrome.webRequest, chrome.proxy, resolveStorage()).plug()
  })
} else {
  new Switchyd(chrome.webRequest, chrome.proxy, resolveStorage()).plug()
}
