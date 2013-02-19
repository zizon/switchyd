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
        
		var matchFuzzy = hints.match;
		
        //gen template
        var template = function(url,host){
            if( host in marks ){
                return servers;
            }
			
			return matchFuzzy(host,lookup,false)["fuzzy"] ? servers : "DIRECT;";
        }
        
        return "var lookup = " + JSON.stringify(lookup) + ";\n"
            +   "var marks = " + JSON.stringify(marks) + ";\n"
            +   "var servers = '" + servers + "'\n"
			+	"var matchFuzzy = " + matchFuzzy.toString() + "\n"
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
	  
	"match":function(host,lookup,create_when_miss){
		return host.split(".").reduceRight(function( previous, current, index, array ){
				// if already meet a fuzzy,ignore
				if( previous["fuzzy"] || previous["giveup"] ){
					return previous;
				}
					
				var lookup = previous["lookup"];
					
				// see if current context has fuzzy
				if( "*" in lookup || current == "*" ){
					// mark it
					previous["fuzzy"] = true;
					
					// save match context
					previous["context"].push("*");
					return previous;
				}
					
				if( current in lookup ){
					// match , deep down
					previous["lookup"] = lookup[current];
					previous["context"].push(current);
					return previous;
				}
				
				// not match,
				if( create_when_miss ){
					previous["lookup"] = lookup[current] = {};
					previous["context"].push(current);
					return previous;
				}else{
					previous["giveup"] = true;
					return previous;
				}
			},
			{
				"lookup":lookup,
				"fuzzy":false,
				"giveup":false,
				"context":[]
			}
		);
	},
	
    "compact":function(){
        // easy job
        if( "*" in this.marks ){
            this.marks = {"*":2};
            return true;
        }
        
        var sum = function( counter, lookup ){
            var leaf = true;
            for( var key in lookup ){
                leaf = false;
                counter += sum(0,lookup[key]);
            }
            return counter;
        }
        
		// lookup table
        var lookup = this.genLookup();
        var gen = false;
        for( var key in this.marks ){
            var match = this.match(key,lookup,false);
            
            // match a fuzzy
            if( match["fuzzy"] ){
                if( key.indexOf("*") == -1 ){
                    // not a fuzzy key.
                    // sum child,and delete
                    this.marks[match["context"].reverse().join(".")] += this.marks[key];
                    delete this.marks[key];
                }

                continue;
            }
 
            // not match any fuzzy,try optimize
            var parent = key.split(".");
            parent.reverse();
            parent.pop();
            
            var tail = parent.reduce(function( previous, current, index, array ){
                    return previous[current];
                },
                lookup
            );
            
            var mergable = true;
            var counter = 0;
            var children = [];
            for( var child in tail ){
                // case:all children have no sub domain
                var fuzzy = false;
                for( var grandchild in tail[child] ){
                    if( grandchild != "*" ){
                        mergable = false;
                        break;
                    }else{
                        fuzzy = true;
                    }
                }
                
                if( mergable ){
                    // child is empty or with a fuzzy
                    // update counter
                    var child_key;
                    if( fuzzy ){
                        parent.push(child);
                        parent.push("*");
                        child_key = parent.reverse().join(".");
                        parent.reverse();
                        parent.pop();
                        parent.pop();
                    }else{
                        parent.push(child);
                        child_key = parent.reverse().join(".");
                        parent.reverse();
                        parent.pop();
                    }
                        
                    children.push(child_key);
                    counter += this.marks[child_key];
                    continue;
                }
                
                break;
            }
            
            if( mergable ){
                // do not merge short domains
                if( parent.length >= 2 ){
                    for( var child in children ){
                        delete this.marks[child];
                    }
                    
                    parent.push("*");
                    this.marks[parent.reverse().join(".")] = counter;
                    gen = true;
                }
            }
        }
        
        return gen;
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
        chrome.proxy.settings.set(
            {
                "value":{
                    "mode":"pac_script",
                    "pacScript":{
                        "mandatory":true,
                        "data":engine.gen(hints)
                    }
                }
            },
            
            function(){
                console.log("setting apply");
            }
        );
    },
    
    "asyncCodegen":function(){
        chrome.alarms.get("codegen",function(alarm){
            if( alarm == undefined ){
                console.log("async codgen")
                chrome.alarms.create(
                    "codegen",
                    {
                        "when":Date.now()+500
                    }
                );
            }
        });
    },
    
    "markFail":function(host){
            // if host is in proxy.
			// update marks
            if( host in this.marks ){
                if( --this.marks[host] <= 0 ){
					// proxy fail much,remove from proxy
                    delete this.marks[host];
                    this.asyncCodegen();
                }
            }else{
				// not in proxy yet,add it
                this.marks[host] = 2;
                this.asyncCodegen();
            }
    }
}

function syncFromCloud(){
    console.log("sync from cloud");
    chrome.storage.sync.get(null,function(items){
        var marks = hints.marks;
        for(var key in items){
            marks[key] = items[key];
        }
        
        if( hints.compact() ){
            hints.asyncCodegen();
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
    
    chrome.proxy.onProxyError.addListener(function(details){
        console.error("proxy error:" + details);
    });
    
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
					hints.markFail(extractHost(details.url));
                    break;
            }
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
			case "codegen":
                hints.codegen();
                break;
            case "sync-to-cloud":
                chrome.storage.sync.clear(function(){
                    chrome.storage.sync.set(hints["marks"],function(){
                        console.log("sync to cloud");
                    });
                });
                break
            case "sweep-hints-marks":
				// compact first,make it shorter
				if( hints.compact() ){
                    hints.asyncCodegen();
                }
				
				// loop hints.complete list,
				// update counter in marks.
				var lookup = hints.genLookup();
				for( var key in hints.complete ){
                    if( key in hints.marks ){
                        hints.marks[key] += hints.complete[key];
                        continue;
                    }
					
                    var match = hints.match(key,lookup,false);
					if( match["fuzzy"] ){
						hints.marks[match["context"].reverse().join(".")] += hints.complete[key];
					}
				}
				
				// clear
				hints.complete = {};
				
				console.log("sync-local-cache");
				localStorage.setItem("hints.marks",JSON.stringify(hints.marks));
                break;
        }
    });
}

function handIn(){
    syncFromCloud();
    resoreHints();
    handInRequest();
    schedule();
}

(function(){
	handIn();
})();