/*
Copyright (c) <2013>, <Zizon Qiu zzdtsv@gmail.com>
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
1. Redistributions of source code must retain the above copyright
notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright
notice, this list of conditions and the following disclaimer in the
documentation and/or other materials provided with the distribution.
3. All advertising materials mentioning features or use of this software
must display the following acknowledgement:
This product includes software developed by the <organization>.
4. Neither the name of the <organization> nor the
names of its contributors may be used to endorse or promote products
derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY <COPYRIGHT HOLDER> ''AS IS'' AND ANY
EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/
"use strict";

var switchyd = {
    config:{
        servers:[
            {
                type:"SOCKS5",
                ip:"127.0.0.1",
                port:10086
            }
        ],
        
        tracers:{
            proxy:{},
            do_not_track:{}
        },
        
        rules:{
            "net::ERR_CONNECTION_RESET":0,
            "net::ERR_CONNECTION_TIMED_OUT":0,
            "net::ERR_SSL_PROTOCOL_ERROR":0,
            "net::ERR_TIMED_OUT":0
        }
    },
    
    sync:{
        load:function(){
            console.log("load config");
            var config = localStorage.getItem("switchyd.config");
            if( config ){
                var loaded = JSON.parse(config);
                // patch needed
                if( !("rules" in loaded) ){
                    loaded.rules = switchyd.config.rules;
                }
                switchyd.config = loaded;
            }            
        },            

        save:function(){
            console.log("save config");
            for(var tracer in switchyd.config.tracers){
                switchyd.async.merge(
                    switchyd.build(tracer),
                    switchyd.config.tracers[tracer]
                );
            }

            localStorage.setItem("switchyd.config",JSON.stringify(switchyd.config));    
        }
    },
    
    tracer:(function(){
        var tracking = {};
        return function(name){
            if( name in tracking ){
                return tracking[name];
            }
            
            // not present yet,create one
            return tracking[name] = {
                urls:{},
                
                track:function(url){
                    url in this.urls ? 0 : this.urls[url]=0;
                    return this;
                },
                
                reset:function(){
                    this.urls = {};
                    return this;
                }
            };
        };
    })(),
    
    compile:function(tracer){
        var compiled = {};
        
        var transform = function(final,part){
            return part in final ? final[part] : final[part] = {};
        };
        
        // loop each node
        for(var url in tracer.urls){
            url.split(".").reduceRight(transform,compiled);
        }
        
        return compiled;
    },
    
    optimize:(function(){
        var no_children = function(node){
            for(var child in node){
                if( child !== "*" ){
                    return false;
                }
            }
            
            return true;
        };
        
        return function(compiled,depth){
            // ensure default value
            depth = typeof depth == "undefined" ? 1 : depth;
            
            // leaf
            if( no_children(compiled) ){
                return compiled;
            }
            
            var mergable = true;
            var number_of_children = 0;

            // none leaf
            for(var part in compiled){
                number_of_children++;
                // recrusive optimize
                compiled[part] = this.optimize(compiled[part],depth+1);
                mergable = mergable && no_children(compiled[part]);
            }
            
            // see if mergable
            if( "*" in compiled ||( mergable && number_of_children > 1 && depth > 2 )){
                for(var child in compiled){
                    delete compiled[child];
                }
                
                // add fuzzy mark
                compiled["*"]={};
            }
            
            return compiled;
        };
    })(),
    
    build:function(){
        for( var tracer in this.config.tracers ){
            var target = this.compile(this.tracer(tracer));
            this.tracer(tracer).reset();
            this.async.merge(target,this.config.tracers[tracer]);
            this.optimize(this.config.tracers[tracer]);
        }
        
        // trim do_not_track from proxy
        this.config.tracers.proxy = this.optimize(
            this.compile(
                this.expand(this.config.tracers.proxy).filter(function(url){
                        return !switchyd.match(switchyd.config.tracers.do_not_track,url);
                    }).reduce(function(tracer,url){
                        return tracer.track(url);
                    },this.tracer("filter").reset())
            )
        );
    },
    
    expand:(function(){
        var _expand = function(source){
            var result = [];
            for(var key in source){
                var child = _expand(source[key]);
                if( child.length === 0){
                    result.push([key]);
                    continue;
                }
                
                child.forEach(function(item){
                    result.push([].concat(key,item));
                });
            }
            
            return result;
        }
        
        return function(source){
            return _expand(source).map(function(item){
                item.reverse();
                return item.join(".");
            });
        };
    })(),

    match:function(compiled,url){
        return url.split(".").reduceRight(function(context,part){
            return context ? 
                    context === true ?
                        true : part in context ?
                            context[part] : "*" in context ?
                                true : false 
                    : false;
        },compiled) !== false;
    },
    
    async:{
        merge:function(from,to){
            for( var key in from ){
                this.merge(from[key],key in to ? to[key] : to[key]={});
            }
        },
         
        enqueue:function(){
            // dequeue
            this.dequeue();
        },

        dequeue:function(){
            switchyd.build();
            switchyd.link();
            switchyd.sync.save();
        }
    },
    
    link:function(){
        var shuffle = function(arrays){
            switch(arrays.length){
                case 0:case 1:
                    return [arrays];
                case 2:
                    return [
                        [arrays[0],arrays[1]],
                        [arrays[1],arrays[0]]
                    ];
            }
            
            return shuffle(arrays.slice(1)).reduce(function(shuffled,candidate,index,paritial){
                for( var i=0; i<candidate.length; i++ ){
                    shuffled.push([].concat(candidate.slice(0,i),arrays[0],candidate.slice(i)));
                }
                shuffled.push([].concat(candidate,arrays[0]));
                return shuffled;
            },[]);
        };
        var proxy = this.config.tracers.proxy;
        
        // make server load balance
        var load_balance = shuffle(this.config.servers).map(function(servers){
            return [].concat(servers.map(function(server){
               return [server.type," " , server.ip,":",server.port].join(""); 
            }),"DIRECT").join(";");
        });
        
        var match = this.match;
        var template = function(_,host){
            if( match(proxy,host) ){
                return load_balance[Date.now()%load_balance.length];
            }
            
            return "DIRECT;";
        };
        
        var script ="var load_balance = " + JSON.stringify(load_balance) + ";\n"
                    + "var proxy = " + JSON.stringify(proxy) + ";\n"
                    + "var match = " + match.toString() + ";\n"
                    + "var FindProxyForURL = " + template.toString() + ";";
        chrome.proxy.settings.set(
            {
                "value":{
                    "mode":"pac_script",
                    "pacScript":{
                        "mandatory":true,
                        "data":script
                    }
                }
            },

            function(){
                console.log("setting apply,sciprt:\n"+script);
            }
        );
        
        return script;
    },
    
    plug:function(){
        this.sync.load();

        chrome.proxy.onProxyError.addListener(function(details){
            console.error("proxy error:" + details);
        });
        
        // network diagnose
        chrome.webRequest.onErrorOccurred.addListener(function(details){
            console.error(details);
            
            // inspect potential reset request
            if( details.error in switchyd.config.rules ){
                // track hits
                ++switchyd.config.rules[details.error];
                
                var start = details.url.indexOf("://") + 3;
                var url = details.url.substr(start,details.url.indexOf("/",start) - start);
                
                // only trigger when it was not track yet.
                if( switchyd.match(switchyd.config.tracers.do_not_track,url) 
                    || switchyd.match(switchyd.config.tracers.proxy,url) ){
                    return;
                }

                switchyd.tracer("proxy").track(url);
                switchyd.async.enqueue();
            }
        },{
            "urls":[
                "http://*/*",
                "https://*/*"
            ]
        });
        
        this.async.enqueue();
    }
};

switchyd.plug();

