switchyd
----
Chrome plugins that monitor browser traffic and auto proxy certain  sites for specific reason.

Install
----
[Google Chrome Web Store](http://goo.gl/Dw6qb)

What it does & How it works
----
Chrome provide an api that can inspect why some request fails.
What this does is detect certain failures and try to fix it automaticly, by adding sites to proxy list.

currently,failures like:
- net::ERR_CONNECTION_RESET  
- net::ERR_CONNECTION_TIMED_OUT  
- net::ERR_TIMED_OUT
- net::ERR_SSL_PROTOCOL_ERROR  

will be regonized fixable.

Permissions
----
the extension require permissions of:

- webRequest
- proxy  
- all_urls

webRequest and all_urls are required for extension to inspect all traffics.  
proxy ,of course, allows the extension to access chrome the proxy functionality. 

License
----
MIT license.  
