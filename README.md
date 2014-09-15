switchyd
----
Chrome plugin that mainly focus on aotomatic proxing [GFWed](http://en.wikipedia.org/wiki/GFW) sites.

Install
----
[Google Chrome Web Store](http://goo.gl/Dw6qb)

What it does & How it works
----
detect failed site request and add it to generated pac scripts.
in most of the case,you need just refresh the page a seconrd time to meet the normal view.

failure include:
- net::ERR_CONNECTION_RESET  
- net::ERR_CONNECTION_ABORTED  
- net::ERR_SSL_PROTOCOL_ERROR  

Permissions
----
the extension require permissions of:

- webRequest
- proxy  
- http://*/*
- https://*/*

webRequest and http/https are required for extension to inspect both http and https request.  
proxy ,of course, allows the extension to access chrome the proxy functionality. 

Internal API
----
- switchyd.sync()
  - switchyd.sync.load()
    - loads the config
  - sswichyd.sync.save()
    - save the config

- switchyd.tracer(name)
  - interesting url tracer,curring active names are:
    - proxy
      - tracking urls that needs to go through proxy
    - do_not_track
      - urls that never send through proxy

- switchyd.compile(tracer)
  - compile the given tracer into a tier like tree. with url compoment reversed. for example,www.google.com will be reverse to com.google.www and the split by ., each part of splited unit will be key in each tree level:
```javascript
{
  'com':{
      'google':{
        'www':{}
      }
  }
}
```

- switchyd.optimize(compiled)
  - merge sub domains in compiled tree,eliminate and improve hit ratio.(for domains like lh4.googlecontent.com will be 'expand' to *.googlecontent.com if another ANY.googlecontent.com is presented)

- switchyd.build()
  - compile and optimize proxy and do_not_track

- switchyd.link()
  - generate and activate PAC script accroding to current config(proxy/do_not_track tracers that previous compiled and/o optimized)

License
----
BSD 4-clause license.  
