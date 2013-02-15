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

var config = {
    "servers":"SOCKS5 127.0.0.1:10086;"
}

var engine = {
    "gen":function(hints){
        // build lookup
        var lookup = hints.genLookup();
		var marks = hints.marks;
        
        var servers = config["servers"] + ";DIRECT;";
        
        //gen template
        var template = function(url,host){
            if( host in marks ){
                return servers;
            }
            
            var need_proxy = host.split(".").reduceRight(function( previous, current, index, array){
					// if already meet a fuzzy,ignore
					if( previous["fuzzy"] || previous["giveup"] ){
						return previous;
					}
					
					var context = previous["lookup"];
					
					// see if current context has fuzzy
					if( "*" in context ){
						// mark it
						previous["fuzzy"] = true;
						return previous;
					}
					
					if( current in context ){
						// match , deep down
						previous["lookup"] = context[current];
						return previous;
					}else{
						// no match,indicates:
						// 1. not in host list
						// 2. not necessary in lookup table
						previous["giveup"] = true;
						return previous;
					}
                },
                {
                    "lookup":lookup,
                    "fuzzy":false,
					"giveup":false
                }
            );
            
            return need_proxy["fuzzy"] ? servers : "DIRECT;";
        }
        
        return "var lookup = " + JSON.stringify(lookup) + ";\n"
            +   "var marks = " + JSON.stringify(marks) + ";\n"
            +   "var servers = '" + servers + "'\n"
            +   "var FindProxyForURL = " + template.toString(); 
    }
}

var hints ={
    "marks":{},
	
	"complete":{},
	
	"genLookup":function(){
		var lookup = {};
		var marks = this.marks;
        for(var key in marks){
            if( marks[key] <= 0 ){
                delete marks[key];
                continue;
            }
            
            key.split(".").reduceRight(function( previous, current, index, array ){
                        return current in previous ? previous[current] : previous[current] = {};
                },
                lookup
            );
        }
		
		return lookup;
	},
	
    "compact":function(){
        // easy job
        if( "*" in this.marks ){
            this.marks = {"*":2};
            return;
        }
        
		// lookup table
        var lookup = {};

		// eliminate
		var this_hints = this;
		var eliminate = function( context, current_lookup ){
			for( var key in current_lookup ){
				// ignore fuzzy itself
				if( key == "*" ){
					continue;
				}
				
				// sweep children
				context.push(key);
				eliminate(context,current_lookup[key]);
				delete this_hints.marks[context.reverse().join(".")];
				context.reverse();
				context.pop();
			}
		}
		
        for( var key in this.marks ){
            if( this.marks[key] <= 0 ){
                delete this.marks[key];
                continue;
            }
            
            // no fuzzy match,easy job
            if( key.indexOf("*") == -1 ){
                if( key.split(".").reduceRight(function( previous, current, index, array ){
								// give up
                                if( previous["giveup"] ){
                                    return previous;
                                }
                                
								// if fuzzy,give up
                                var lookup = previous["lookup"];
                                if( "*" in lookup ){
                                        previous["giveup"] = true;
                                        return previous;
                                }
                                
								// not in lookup,create one
                                if( !(current in lookup) ){
                                    lookup[current] = {}
                                }
                                
								// update lookup
                                previous["lookup"] = lookup[current];
                                return previous;
                        },
                        {
                            "lookup":lookup,
                            "giveup":false
                        }
                    )["giveup"] 
                ){
                    // give up means there already be a fuzzy match,
					// so ,this ruled.
                    delete this.marks[key];
                }
                
				// done lookup build for this key in situation:
				// 1. either bulid into lookup without bother of fuzzy match.
				// 2. or ignore by an existing fuzzy match.
                continue;
            }
            
            // 1.find the right most fuzzy.
			// and keep context
            var context = key.split(".").reduceRight(function( previous, current, index, array ){
                    if( previous["fuzzy"] ){
						// already meet fuzzy.
						// do nothing,and continue next
                        return previous;
                    }else if( current == "*" ){
						// meet a fuzzy
						// update flag
                        previous["fuzzy"] = true;
                        return previous;
                    }else{
						// normal case,build context
                        previous["context"].push(current);
                        
						// update lookup
                        var lookup = previous["lookup"];
						
						// not in lookup yet,make one
                        if( !(current in lookup) ){
                            lookup[current] = {}
                        }
						
						// update
                        previous["lookup"] = lookup[current];
                        return previous;
                    }
                },
                {
                    "fuzzy":false,
                    "context":[],
                    "lookup":lookup
                }
            );
            
            // 2.clean old if needed
			var stack = context["context"];
			var current = context["lookup"];
            for( var key in current ){
				// optimize case,ignore fuzzy
                if( key != "*" ){
                    stack.push(key);
                    eliminate(stack,current[key]);
                    stack.pop();
                }
            }
            
            // 3. add fuzzy back
            stack.push("*")
            this.marks[stack.reverse().join(".")] = 2;
            
            // 4. update lookup
            current["*"] = {};
        }
    },
    
    "markOK":function(host){
        if( host in this.complete ){
            if( this.complete[host] < Number.MAX_VALUE ){
                this.complete[host]++;
            }
        }else{
			this.complete[host] = 1;
		}
    },
    
    "codegen":function(){
        chrome.proxy.settings.clear({});

        chrome.proxy.onProxyError.addListener(function(details){
            console.error("proxy error:" + details);
        });

        chrome.proxy.settings.set(
            {
                "value":{
                    "mode":"pac_script",
                    "pacScript":{
                        "mandatory":true,
                        "data":engine.gen(this)
                    }
                }
            },
            function(){
                console.log("setting apply");
            }
        );
    },
    
    "markFail":function(host){
            // if host not mark yet,mark it and gen proxy
            // or that host already in proxy mode.
            // decrease counter untile zero so it may recover from an
            // init & clean state.(it may not require a proxy any more)
            if( host in this.marks ){
                if( --this.marks[host] <= 0 ){
                    delete this.marks[host];
                    this.codegen();
                }
            }else{
                this.marks[host] = 2;
                this.codegen();
            }
    }
}

function syncFromCloud(){
    console.log("sync from cloud");
    chrome.storage.sync.get(null,function(items){
        console.log(items);
        var marks = hints.marks;
        for(var key in items){
            marks[key] = items[key];
        }
    });
}

function resoreHints(){
    console.log("restore hints");
    var cache = localStorage.getItem("hints.marks");
    if( cache == null ){
        return;
    }
    
    cache = JSON.parse(cache);
    for( key in cache ){
        hints.marks[key] = cache[key];
    }
    
	hints.compact();
    hints.codegen();
}

function extractHost(url){
    var start = url.indexOf("://") + 3;
    return url.substr(start,url.indexOf("/",start) - start);
}

function handInRequest(){
    console.log("handin request");
    chrome.webRequest.onErrorOccurred.addListener(
        function(details){
            console.error(details);
            
            // inspect potential reset request
            switch(details.error){
                default:
                    return;
                case "net::ERR_CONNECTION_RESET":
                case "net::ERR_CONNECTION_ABORTED":
                case "net::ERR_CONNECTION_TIMED_OUT":
                    break;
            }
            
            // mark it to direct proxy code gen
            hints.markFail(extractHost(details.url));
        },
        {
            "urls":["<all_urls>"]
        }
    );
    
    chrome.webRequest.onCompleted.addListener(
        function(details){
            // ignore cache
            if(details.fromCache){
                return;
            }
            
            // mark host ok
            hints.markOK(extractHost(details.url));
        },
        {
            "urls":["<all_urls>"]
        },
        []
    );
}

function schedule(){
    console.log("schedule");
    chrome.alarms.create(
        "sync-local-cache",
        {
            "periodInMinutes":10
        }
    );
    
    chrome.alarms.create(
        "sync-to-cloud",
        {
            "periodInMinutes":30
        }
    );
    
    chrome.alarms.create(
        "sweep-hints-marks",
        {
            "periodInMinutes":5
        }
    );
    
    chrome.alarms.onAlarm.addListener(function( alarm ){
        console.log("fire alarm:" + alarm.name);
        switch(alarm.name){
            case "sync-local-cache":
                localStorage.setItem("hints.marks",JSON.stringify(hints.marks));
                break;
            case "sync-to-cloud":
                chrome.storage.sync.set(hints["marks"],function(){
                    console.log("sync to cloud");
                });
                break
            case "sweep-hints-marks":
				hints.compact();
				var lookup = hints.genLookup();
				for( var key in hints.complete ){
					key.split(".").reduceRight(function( previous, current, index, array ){
							if( previous["done"] ){
								return previous;
							}
							
							var lookup = previous["lookup"];
							var context = previous["context"];
							if( "*" in lookup ){
								// meet a fuzzy,
								// update marks
								context.push("*");
								
								var new_key = context.reverse().join(".");
								// already in marks,update it
								if( new_key in hints.marks ){
									hints.marks[new_key] += hints.complete[key];
								}
								
								// reset context
								context.reverse();
								context.pop();
								
								// delete key
								delete hints.complete[key];
								
								previous["done"] = true;
							}
							
							// normal case,deep down if needed
							if( current in lookup ){
								context.push(current);
								previous["lookup"] = lookup[current];
							}else{
								// no record in marks
								previous["done"] = true;
								delete hints.complete[key];
							}
							
							return previous;
						},
						{
							"lookup":lookup,
							"context":[],
							"done":false
						}
					);
				}
        }
    });
}

function handIn(){
    syncFromCloud();
    resoreHints();
    handInRequest();
    schedule();
}

chrome.runtime.onInstalled.addListener(function(details){
    console.log("install..");
    switch(details.reason){
        case "install":
        case "update":
        case "chrome_update":
            console.log(details.reason);
            break;
    }
    
   handIn();
});

chrome.runtime.onStartup.addListener(function(){
    console.log("starup");
    handIn();
});