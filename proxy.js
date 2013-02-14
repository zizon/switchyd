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
    "isFromProxy":function(details){
        if( details.ip == "127.0.0.1" ){
            return true;
        }else{
            return false;
        }
    }
}

var engine = {
    "gen":function(rank_host){
        // build lookup
        var lookup = {};
        for(var key in rank_host){
            if( rank_host[key] <= 0 ){
                delete rank_host[key];
                continue;
            }
            
            key.split(".").reduce(function( previous, current, index, array ){
                        return current in previous ? previous[current] : previous[current] = {};
                },
                lookup
            );
        }
        
        //gen template
        var template = function(url,host){
            var need_proxy = host.split(".").reduce(function( previous, current, index, array){
                    // skip not match
                    if( ! previous["match"] ){
                        return previous;
                    }
                    
                    var context = previous["context"];
                    
                    // update context
                    if( current in context ){
                        previous["context"] = context[current];
                    }else{
                        previous["match"] = false;
                    }
                    
                    return previous;
                },
                {
                    "context":lookup,
                    "match":true
                }
            );
            
            alert(need_proxy);
            
            return need_proxy["match"] ? 
                "SOCKS5 127.0.0.1:10086;DIRECT;" 
                : "DIRECT ;";
        }
        
        return "var lookup = " + JSON.stringify(lookup) + ";\n"
            +   "var FindProxyForURL = " + template.toString(); 
    }
}

var hints ={
    "marks":{
    },
    
    "unmark":function(host){
        if( host in this.marks ){
            switch(this.marks[host]){
                case 5:
                case 4:
                case 3:
                case 2:
                    this.marks[host]--;
                    break;
                case 1:
                    delete this.marks[host];
                    this.codegen();
                    break;
            }
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
                        "data":engine.gen(this.marks)
                    }
                }
            },
            function(){
                console.log("setting apply");
            }
        );
    },
    
    "mark":function(host){
            if( host in this.marks ){
                switch(this.marks[host]){
                    case 1:
                    case 2:
                    case 3:
                    case 4:
                        this.marks[host]++;
                    case 5:
                        break;
                    default:
                        delete this.marks[host];
                        this.codegen();
                        break;
                }
            }else{
                this.marks[host] = 2;
                this.codegen();
            }
    }
}

function extractHost(url){
    var start = url.indexOf("://") + 3;
    return url.substr(start,url.indexOf("/",start) - start);
}

function handInRequest(){
    chrome.webRequest.onErrorOccurred.addListener(
        function(details){
            console.error(details);
            
            // inspect potential reset request
            switch(details.error){
                default:
                    return;
                case "net::ERR_CONNECTION_RESET":
                case "net::ERR_CONNECTION_ABORTED":
                    break;
            }
            
            // mark it to direct proxy code gen
            hints.mark(extractHost(details.url));
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
            
            // if not from proxy,unmark it as need,
            // so it could have a chance to eliminate from
            // proxy code gen which is false positive.
            if( !config.isFromProxy(details) ){
                hints.unmark(extractHost(details.url));
            }
        },
        {
            "urls":["<all_urls>"]
        },
        []
    );
}

function handIn(){
    handInRequest();
}

chrome.runtime.onInstalled.addListener(function(details){
    console.log("install..");
    switch(details.reason){
        case "install":
        case "update":
        case "chrome_update":
            console.log(details.reason);
    }
    
   handIn();
});

chrome.runtime.onStartup.addListener(function(){
    console.log("starup");
    handIn();
});




 