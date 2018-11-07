"use strict";

// forward decleartion
export const switchyd = {};

// track things
switchyd.tracer = (function(){
    var tracers = {};
    
    return function(name){
        var candidate = undefined;
        if( name in tracers ){
            candidate = tracers[name];
        }else{
            // not found
            candidate = {
                container : {},

                track : function(thing){
                    if( thing in this.container ){
                        this.container[thing]++;
                    }else{
                        this.container[thing] = 1;
                    }

                    return;
                },

                untrack : function(thing){
                    delete this.container[thing];
                },

                clear : function(){
                    this.container = {};
                },
            };

            // set it
            tracers[name] = candidate;
        }

        return candidate;
    };
})();

// inspecting errors
switchyd.inspector = (function(){
        return {
            _inspect_key : 'inspect-error',
            
            _trace_key : 'all-inspect-error',

            inspect : function(error){
                // do tracing
                switchyd.tracer(this._trace_key).track(error);
                
                var tracking = switchyd.tracer(this._inspect_key);
                if( error in tracking.container ){
                    tracking.track(error);
                    return true;
                }

                return false;
            },
            
            register : function(rule){
                switchyd.tracer(this._inspect_key).track(rule); 
            },
            
            unregisger : function(rule){
                switchyd.tracer(this._inspect_key).untrack(rule);
            },
        };
})();

// inject switchyd
switchyd.inject = function(){
        // reload
        switchyd.config.reload();
        
        // apply pac
        switchyd.pac.gen();
        
        // hook
        chrome.proxy.onProxyError.addListener(function(details){
            console.error("proxy error:" + details.details);
        });
        
        // network diagnose
        chrome.webRequest.onErrorOccurred.addListener(function(details){
                if( details.error == 'net::ERR_NETWORK_CHANGED' ){
                    console.log('network changed,regen PAC script');
                    switchyd.pac.gen();
                    return;
                }

                if( switchyd.inspector.inspect(details.error) ){
                    var start = details.url.indexOf("://") + 3;
                    var url = details.url.substr(start,details.url.indexOf("/",start) - start);
                    
                    // do proxy
                    switchyd.proxy.forward(url);
                    return;
                };

                console.warn(details);
            },
            {
                "urls":[
                    "http://*/*",
                    "https://*/*"
                ]
            }
        );
};

// forward proxy works
switchyd.proxy = (function(){
    return {
        forward : function( url ){
            // swichyd.group
            if( switchyd.group('whitelist').match(url) ){
                // url in white list,stop proxying
                return;
            }
            
            if( switchyd.group('proxy').match(url) ){
                // already in proxy list,do nothing
                return;
            }

            // not yet proxy, make it
            // switchyd.pac
            switchyd.pac.add(url);
        },
    };
})();

// url matcher groups
switchyd.group = (function(){
    var groups = {};
    return function(group_name){
        var tracer = switchyd.tracer(group_name);
        
        var group = groups[group_name];
        if( !group ){
            group = groups[group_name] = {
                
                container : {},
                
                match : function(url){
                    var compoments = url.split('.');
                    var container = this.container;
                    for( var i=compoments.length-1; i>=0 ; i-- ){
                        // fast path
                        if( '*' in container ){
                            // fuzzy match
                            return true;
                        }
                        
                        var compoment = compoments[i];
                        // normal case
                        if( compoment in container ){
                            container = container[compoment];
                            continue;
                        }
                        
                        // not match
                        return false;
                    }

                    return true;
                }
            };
        }
        
        if( Object.keys(tracer.container).length > 0 ){
            // somthing new,compile it
            // switchyd.compiler
            switchyd.compiler.compile( group,tracer.container);
            
            // clear tracer
            tracer.clear();
        }
        
        return group;
    };
})();

// matcher compiler
switchyd.compiler = (function(){
    var reap = function(map_style){
        var container = [];
        for(var key in map_style){
            container.push(map_style[key]);
        }

        return container;
    };

    return {
        compile : function(group,list_style){
            var map_style = (group && group.container) || {}; 
            var candidates = Object.keys(list_style);
            
            // do real compile only when needed
            if( candidates.length > 0 ){
                // transfer from list to map
                candidates.forEach(function(url){
                    var compoments = url.split('.');
                    var container = map_style;
                    for( var i=compoments.length - 1; i >=0 ; i-- ){
                        var key = compoments[i];
                        // fast path
                        if( '*' in container ){
                            // a fuzzy token found.
                            return;
                        }

                        // normal case
                        if( key in container ){
                            // this part registered
                            container = container[key];
                        }else{
                            // not yet register
                            container = container[key] = {};
                        }
                    }
                });

                // rape level 1 and level 2
                var pending = [];
                reap(map_style).forEach(function(candidate){
                    Array.prototype.push.apply(pending,reap(candidate));
                });
                
                // do merge
                for(;;){
                    if( pending.length <= 0 ){
                        // nothing to do,quit
                        break;
                    }
                    
                    var new_pending = [];
                    pending.forEach(function(candidate){
                        if( '*' in candidate ){
                            // a previous merged container,remove others
                            for(var key in candidate){
                                if(key != '*'){
                                    delete candidate[key];
                                }

                                return;
                            }
                        }                    
                        
                        // if at least 2 children
                        if( Object.keys(candidate).length >=2 ){
                            for(var key in candidate){
                                delete candidate[key];
                            }

                            // add fuzzy back
                            candidate['*'] = {};
                            return;
                        }

                        // drill down
                        Array.prototype.push.apply(new_pending,reap(candidate));
                    });

                    // replace pending
                    pending = new_pending;
                }
            }
        },
    };
})();

switchyd.pac = (function(){
    return {
        add : function(url){
            // track it
            var tracer = switchyd.tracer('proxy');
            tracer.track(url);

            // compile proxy group
            switchyd.compiler.compile(
                switchyd.group('proxy'),
                tracer.container
            );
            
            this.gen();
        },

        gen : function(){
            // proxy group
            var proxy_group = switchyd.group('proxy');
            
            // whitelist group
            var whitelist_group = switchyd.group('whitelist');
            
            // servers
            var servers = switchyd.config.servers().map(function(server){
                return server;
            })[0];

            // function tempalte
            var FindProxyForURL = function(_,host){
                if( proxy_group.match(host) 
                    && !whitelist_group.match(host)){
                    return servers;
                }
                return 'DIRECT;';
            };
            
            // scripts
            var script = 'var proxy_group = ' + JSON.stringify(proxy_group) + ';\n'
                    + 'proxy_group.match = ' + proxy_group.match.toString() + ';\n'
                    + 'var whitelist_group = ' + JSON.stringify(whitelist_group) + ';\n'
                    + 'whitelist_group.match = ' + whitelist_group.match.toString() + ';\n'
                    + 'var servers = ' + JSON.stringify(servers) + ';\n'
                    + "var FindProxyForURL = " + FindProxyForURL.toString() + ";";
        
            // apply proxy
            chrome.proxy.settings.set(
                {
                    "value":{
                        "mode":"pac_script",
                        "pacScript":{
                            "mandatory":false,
                            "data":script
                        }
                    }
                },

                function(){
                    console.log("setting apply,script:\n"+script);
                }
            );

            // save config
            switchyd.config.save();
        },
    }
})();

// config provider
switchyd.config = (function(){
    return {
        reload : function(){
            var raw = localStorage.getItem('switchyd.config');
            if( raw ){
                var config = undefined;
                try{
                    config = JSON.parse(raw);
                }catch(e){
                    console.error('fail to parse stored config:'+raw);
                }

                if( config && (typeof config === 'object') ){
                    config = this.migrate(config);

                    // setup groups
                    switchyd.group('proxy').container = config['group-proxy'] || {};
                    switchyd.group('whitelist').container = config['group-whitelist'] || {};
                    
                    // tracer
                    switchyd.tracer('inspect-error').container = config['tracer-inspect-error'];
                    switchyd.tracer('servers').container = config['tracer-servers'];
                    return ;
                }
            }
            
            // default config
            switchyd.tracer('inspect-error').container = {
                "net::ERR_CONNECTION_RESET":0,
                "net::ERR_CONNECTION_TIMED_OUT":0,
                "net::ERR_SSL_PROTOCOL_ERROR":0,
                "net::ERR_TIMED_OUT":0
            };
            
            switchyd.tracer('servers').container = {
                'SOCKS5 127.0.0.1:10086' : 0,
            };
            
            // save
            this.save();
        },

        servers : function(){
            return Object.keys(switchyd.tracer('servers').container);
        },

        save : function(){
            var config = {};
            
            // group
            config['group-proxy'] = switchyd.group('proxy').container;
            config['group-whitelist'] = switchyd.group('whitelist').container;
                
            // tracer
            config['tracer-inspect-error'] = switchyd.tracer('inspect-error').container;
            config['tracer-servers'] = switchyd.tracer('servers').container;
            
            // version
            config['version'] = 2;

            localStorage.setItem('switchyd.config',JSON.stringify(config));
        },

        migrate : function(config){
            if( 'version' in config ){
                console.log('config version:'+config['version']);
                return config;
            }
        
            // pre versioning config
            var new_config = {};
            new_config['group-proxy'] = config.tracers['proxy'];
            new_config['group-whitelist'] = config.tracers['do_not_track'];
            new_config['tracer-inspect-error'] = config.rules;
            new_config['tracer-servers'] = config['servers'].map(function(server){
                return server['type'] + ' ' + server['ip'] + ':' + server['port'];
            });
            
            // replace
            config = new_config;
            return config; 
        },

    }
})();


