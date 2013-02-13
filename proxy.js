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

function handInProxy(){
    // reset 
    //chrome.proxy.settings.clear({});
/*
    chrome.proxy.onProxyError.addListener(function(details){
        console.error("proxy error:" + details);
    });

    chrome.proxy.settings.set(
        {
            "value":{
                "mode":"pac_script",
                "pacScript":{
                    "mandatory":true,
                    "url":"proxy.pac"
                }
            }
        },
        function(){
            console.log("setting apply");
        }
    );*/
}

function handInRequest(){
    chrome.webRequest.onErrorOccurred.addListener(
        function(details){
            console.error(details);
            var url = details.url;
            
            if( url.length < 3 ){
                return;
            }
            
            var i=3;
            for( ;i<url.length; ){
                switch( url[i] ){
                    default:
                        i+=3;
                        continue;
                    case ':':
                        i+=2;
                        continue;
                    case '/':
                        if( url[i-1] == '/' && url[i-2] == ':'  ){
                            i++;
                            break;
                        }
                        i++;
                        continue;
                }
                break;
            }
            
            var start = i;
            var host = "";
            while(i<url.length){
                if( url[i++] == "/" ){
                    host = url.substr(start,i-start-1);
                    break;
                }
            }
            
            console.log(details.url + "---" +host);
        },
        {
            "urls":["<all_urls>"]
        }
    );
}

function handIn(){
    //handInStorage();
    handInRequest();
    //handInProxy();
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
    handIn();
});




 