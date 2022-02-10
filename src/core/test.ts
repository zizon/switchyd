/* eslint-disable no-unused-vars */
/* eslint-disable require-jsdoc */
import { Config, RawConfig, RawConfigSyncer } from './config.js'
import { Switchyd } from './switchyd.js'
import { Generator, Group } from './pac.js'
import { URLTier } from './trie.js'

function testAddURL () {
  const trie = new URLTier()
  trie.add('www.google.com')
  trie.add('www.facebook.com')
  trie.add('2.toplevel-1.dot.google.com')
  trie.add('1.toplevel-2.dot.google.com')
  trie.add('toplevel-2.dot.google.com')
  trie.add('toplevel-3.dot.google.com')
  trie.compact()

  console.log(trie.unroll())
}

function testPac () {
  const group = new Group(['socks5://127.0.0.1:10086'])
  group.proxyFor('www.google.com')
  group.proxyFor('www.facebook.com')
  group.proxyFor('2.toplevel-1.dot.google.com')
  group.proxyFor('1.toplevel-2.dot.google.com')
  group.proxyFor('toplevel-2.dot.google.com')
  group.proxyFor('toplevel-3.dot.google.com')

  group.bypassFor('*.co.jp')

  const pac = new Generator([group, group])

  console.log(pac.compile())
}

function testConfig () {
  const raw = `
  {"servers":[{"listen":["net::ERR_CONNECTION_RESET","net::ERR_CONNECTION_TIMED_OUT","net::ERR_SSL_PROTOCOL_ERROR","net::ERR_TIMED_OUT"],"accepts":["google.com$","lh3.googleusercontent.com$","twitter.com$","abs.twimg.com$","golang.org$","www5.javmost.com$","static.javhd.com$","avgle.com$","avgle.net$","www.pornhub.com$","a.realsrv.com$","chaturbate.com$","xapi.juicyads.com$","faws.xcity.jp$","i.ytimg.com$","encrypted-tbn0.gstatic.com$","www.imglnke.com$","cdn.qooqlevideo.com$","id.rlcdn.com$","googleads.g.doubleclick.net$","img9.doubanio.com$","feedly.com$","desktop.telegram.org$","static.reuters.com$","news.ycombinator.com$","connect.facebook.net$","dt.adsafeprotected.com$","static.reutersmedia.net$","hw-cdn2.trafficjunky.net$","di.phncdn.com$","www.vfthr.com$","s.amazon-adsystem.com$","t.co$","www.theguardian.com$","confiant-integrations.global.ssl.fastly.net$","imgur.com$","docs.rsshub.app$","external-preview.redd.it$","www.reddit.com$","www.redditstatic.com$","styles.redditmedia.com$","cdn.rawgit.com$","blog.ipfs.io$","en.wikipedia.org$","login.wikimedia.org$","www.youtube.com$","r3---sn-un57en7s.googlevideo.com$","yt3.ggpht.com$","blogspot.com$","www.blogger.com$","www.blogblog.com$","bcp.crwdcntrl.net$","s3t3d2y7.ackcdn.net$","spl.zeotap.com$","pics.dmm.co.jp$","adxadserv.com$","maps.googleapis.com$","prod-fastly-us-east-1.video.pscp.tv$","p4-ac7k666k5mxjy-r2vukgzcrraigxob-275394-i1-v6exp3-ds.metric.ipv6test.com$","p4-ac7k666k5mxjy-r2vukgzcrraigxob-275394-i2-v6exp3-ds.metric.ipv6test.net$","search.xiepp.com$","loadm.exelator.com$","interstitial-07.com$","www.facebook.com$","t.dtscout.com$","xfreehdvideos.com$","bebreloomr.com$","2g1radlamdy3.l4.adsco.re$","dt-secure.videohub.tv$","syndication.exosrv.com$","ml314.com$","global.ib-ibi.com$","cdn-images-1.medium.com$","cdn.substack.com$","cdn.streamroot.io$","pushance.com$","444131a.com$","iqiyi.irs01.com$","omgubuntu.disqus.com$","secure.gravatar.com$","rtb0.doubleverify.com$","www.google.com.tw$","analytics.tiktok.com$","external-content.duckduckgo.com$","github.com$","cafemedia-d.openx.net$","pandg.tapad.com$","192.168.1.100$","www.v2ex.com$","updates.tdesktop.com$","telegram.me$","t.me$","cdn3.dd109.com:65$","apt-mirror.github.io$","cdn-images.mailchimp.com$","api.amplitude.com$","registry.aliyuncs.com$","weibo.com$","shandianzy-com.xktapi.com:5656$","static.trafficmoose.com$","bordeaux.futurecdn.net$","rp.liadm.com$","www.javbus.com$","sdc.cmbchina.com$","bam.nr-data.net$","lit.dev$","developer.chrome.com$","az416426.vo.msecnd.net$","www.youtube-nocookie.com$","www.commonjs.org$","media.theporndude.com$","tn.voyeurhit.com$","www.fembed.com$","jable.tv$","cdn.o333o.com$","app.link$"],"denys":[],"server":"SOCKS5 127.0.0.1:10086"}],"version":3}
  `
  const rawConfig: RawConfig = JSON.parse(raw)
  const config = new Config(rawConfig, (_:RawConfig):Promise<void> => Promise.resolve())
  console.log(config.createGeneartor().compile())
}

function testSwitchyd () {
  const raw = `
  {"servers":[{"listen":["net::ERR_CONNECTION_RESET","net::ERR_CONNECTION_TIMED_OUT","net::ERR_SSL_PROTOCOL_ERROR","net::ERR_TIMED_OUT"],"accepts":["google.com$","lh3.googleusercontent.com$","twitter.com$","abs.twimg.com$","golang.org$","www5.javmost.com$","static.javhd.com$","avgle.com$","avgle.net$","www.pornhub.com$","a.realsrv.com$","chaturbate.com$","xapi.juicyads.com$","faws.xcity.jp$","i.ytimg.com$","encrypted-tbn0.gstatic.com$","www.imglnke.com$","cdn.qooqlevideo.com$","id.rlcdn.com$","googleads.g.doubleclick.net$","img9.doubanio.com$","feedly.com$","desktop.telegram.org$","static.reuters.com$","news.ycombinator.com$","connect.facebook.net$","dt.adsafeprotected.com$","static.reutersmedia.net$","hw-cdn2.trafficjunky.net$","di.phncdn.com$","www.vfthr.com$","s.amazon-adsystem.com$","t.co$","www.theguardian.com$","confiant-integrations.global.ssl.fastly.net$","imgur.com$","docs.rsshub.app$","external-preview.redd.it$","www.reddit.com$","www.redditstatic.com$","styles.redditmedia.com$","cdn.rawgit.com$","blog.ipfs.io$","en.wikipedia.org$","login.wikimedia.org$","www.youtube.com$","r3---sn-un57en7s.googlevideo.com$","yt3.ggpht.com$","blogspot.com$","www.blogger.com$","www.blogblog.com$","bcp.crwdcntrl.net$","s3t3d2y7.ackcdn.net$","spl.zeotap.com$","pics.dmm.co.jp$","adxadserv.com$","maps.googleapis.com$","prod-fastly-us-east-1.video.pscp.tv$","p4-ac7k666k5mxjy-r2vukgzcrraigxob-275394-i1-v6exp3-ds.metric.ipv6test.com$","p4-ac7k666k5mxjy-r2vukgzcrraigxob-275394-i2-v6exp3-ds.metric.ipv6test.net$","search.xiepp.com$","loadm.exelator.com$","interstitial-07.com$","www.facebook.com$","t.dtscout.com$","xfreehdvideos.com$","bebreloomr.com$","2g1radlamdy3.l4.adsco.re$","dt-secure.videohub.tv$","syndication.exosrv.com$","ml314.com$","global.ib-ibi.com$","cdn-images-1.medium.com$","cdn.substack.com$","cdn.streamroot.io$","pushance.com$","444131a.com$","iqiyi.irs01.com$","omgubuntu.disqus.com$","secure.gravatar.com$","rtb0.doubleverify.com$","www.google.com.tw$","analytics.tiktok.com$","external-content.duckduckgo.com$","github.com$","cafemedia-d.openx.net$","pandg.tapad.com$","192.168.1.100$","www.v2ex.com$","updates.tdesktop.com$","telegram.me$","t.me$","cdn3.dd109.com:65$","apt-mirror.github.io$","cdn-images.mailchimp.com$","api.amplitude.com$","registry.aliyuncs.com$","weibo.com$","shandianzy-com.xktapi.com:5656$","static.trafficmoose.com$","bordeaux.futurecdn.net$","rp.liadm.com$","www.javbus.com$","sdc.cmbchina.com$","bam.nr-data.net$","lit.dev$","developer.chrome.com$","az416426.vo.msecnd.net$","www.youtube-nocookie.com$","www.commonjs.org$","media.theporndude.com$","tn.voyeurhit.com$","www.fembed.com$","jable.tv$","cdn.o333o.com$","app.link$"],"denys":[],"server":"SOCKS5 127.0.0.1:10086"}],"version":3}
  `

  let singleValue: RawConfig = JSON.parse(raw)

  const engine = new Switchyd(
    {
      onErrorOccurred: {
        addListener: (callback, filter, extra):void => {
          const details = {
            error: 'net::ERR_CONNECTION_RESET',
            url: 'https://123.145.45.35:80'
          }
          callback(details)
        }
      }
    },
    {
      settings: {
        set: (details):Promise<void> => {
          return new Promise<void>((resolve) => {
            // console.log(`apply setting:${details}`)
            resolve()
          })
        }
      }
    },
    {
      set: (config:RawConfig):Promise<void> => {
        singleValue = config
        return Promise.resolve()
      },
      get: ():Promise<RawConfig> => {
        return Promise.resolve(singleValue)
      }
    }
  )

  engine.plug()
}

// testAddURL()
// testPac()
// testConfig()
testSwitchyd()
