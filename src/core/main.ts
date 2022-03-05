/* eslint-disable no-unused-vars */
import { resolveStorage } from './chrome.js'
import { Switchyd } from './switchyd.js'

declare const chrome: {
  webRequest:any
  proxy:any
  runtime:{
    onInstalled:{
      addListener:(callback:(event:Event)=>void)=>void
    }
  }
}


if( chrome ){
  chrome.runtime.onInstalled.addListener(()=>{
    // kick init register
    new Switchyd(chrome.webRequest, chrome.proxy, resolveStorage()).plug()
  })
}



