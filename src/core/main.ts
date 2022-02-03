/* eslint-disable no-unused-vars */
import { chrome, ChromeStorage } from './chrome.js'
import { RawConfig } from './config.js'
import { Switchyd } from './switchyd.js'

new Switchyd(chrome.webRequest, chrome.proxy, ChromeStorage).plug()
