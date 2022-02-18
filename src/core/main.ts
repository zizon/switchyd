/* eslint-disable no-unused-vars */
import { resolveStorage } from './chrome.js'
import { Switchyd } from './switchyd.js'

declare const chrome: {
  webRequest:any
  proxy:any
}

declare type ExtendableEvent = {
  waitUntil:(promise:Promise<any>)=>void
}

declare const self:{
  onactivate:(event:ExtendableEvent)=>void
}

// kick init register
new Switchyd(chrome.webRequest, chrome.proxy, resolveStorage()).plug()

if(self){
  await new Promise(()=>{})
}