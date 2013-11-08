'use strict';
(function(){
    var script = document.createElement("script");
    script.async = 'async';
    script.src = "angular.js";
    script.type = "text/javascript";
    document.querySelector("script").insertBefore(script);
    
    script.addEventListener("load",function(event){
        chrome.runtime.getBackgroundPage(function(app){
            var switchyd = app.switchyd;
            var injector = angular.injector(['ng']);
            injector.get("$animate").enabled(true);
            var scope = injector.get("$rootScope").$new(true);
            scope.activate = function(index){
                scope.navis.forEach(function(navi,i){
                    navi.active = i == index ? true: false;
                });
                
                scope.$emit("active-changed");
            };
            scope.navis =["servers","proxy-list","white-list","rules"].map(function(name){
                return {
                    name:name,
                    active:false,
                    loaded:false,
                    sync:angular.noop
                }
            });
            
            scope.$on("active-changed",function(event){
                scope.navis.forEach(function(navi){
                    if(!navi.loaded){
                        var scope = navi.scope = injector.get("$rootScope").$new(true);
                        scope.switchyd = switchyd;
                        scope.active = navi.active;
                        scope.insert = function(item,index,array){
                            if( !angular.isString(item) && "$$hashKey" in item ){
                                item = angular.copy(item);
                                delete item["$$hashKey"];
                            }
                            
                            array.splice(index+1,0,item);
                        };
                        
                        scope.shadow = function(name,value){
                            scope[name+"-shadow"] = value;
                            scope[name] = angular.copy(value);
                        };
                        
                        scope.change = function(name,value,index){
                            if(angular.isArray(scope[name+"-shadow"])){
                                scope[name+"-shadow"][index] = value;
                            }else{
                                scope[name+"-shadow"] = value;
                            }
                        };
                        
                        scope.get_shadow = function(name){
                            return scope[name+"-shadow"];
                        };
                        
                        switch(navi.name){
                            case "servers":
                            case "rules":
                                scope.build = function(){
                                    var result = [];
                                    for(var key in scope.switchyd.config.rules){
                                        result.push({
                                            name:key,
                                            count:scope.switchyd.config.rules[key]
                                        });
                                    }
                                    
                                    if(result.length < 1){
                                        result.push({name:"NONE",count:0});
                                    }
                                    return result;
                                };
                                
                                scope.shadow("rules",scope.build());
                                scope.add_rules = function(index,value){
                                    scope.insert(value,index,scope.rules);
                                    scope.insert(value,index,scope.get_shadow("rules"));
                                };
                                
                                scope.remove_rules = function(index){
                                    scope.rules.splice(index,1);
                                    scope.get_shadow("rules").splice(index,1);
                                    if(scope.rules.length < 1){
                                        scope.rules.push({name:"NONE",count:0});
                                        scope.get_shadow("rules").push({name:"NONE",count:0});
                                    }
                                }
                                
                                scope.$watch("active",function(){
                                    scope.shadow("rules",scope.get_shadow("rules"));
                                });
                                
                                navi.sync = function(){
                                    scope.switchyd.config.rules = {};
                                    scope.get_shadow("rules").forEach(function(rule){
                                        if(rule.name != "NONE"){
                                            scope.switchyd.config.rules[rule.name]=rule.count;
                                        }
                                    });
                                };
                                break;
                            case "proxy-list":
                                scope.tracer = "proxy";
                            case "white-list":
                                if(!("tracer" in scope)){
                                    scope.tracer = "do_not_track";
                                }
                                
                                var adjust_urls = function(urls){
                                    if(urls.length === 0){
                                        urls.push("NONE");
                                    }else if(urls.length > 1){
                                        urls = urls.filter(function(url){return url != "NONE"});
                                    }
                                    
                                    return urls;
                                }
                                
                                scope.config_tracer = adjust_urls(scope.switchyd.config.tracers[scope.tracer]);
                                
                                navi.sync = function(){        
                                    var switchyd = scope.switchyd;                                
                                    var tracer = switchyd.tracer(scope.tracer);
                                    scope.get_shadow("urls").filter(function(url){
                                        return url != 'NONE';
                                    }).forEach(function(url){
                                        return tracer.track(url);
                                    });
                                    
                                    scope.config_tracer = scope.switchyd.config.tracers[scope.tracer] = adjust_urls(switchyd.optimize(switchyd.compile(tracer)));
                                };
                                
                                scope.shadow("urls",adjust_urls(switchyd.expand(scope.config_tracer)));
                                scope.$watch("config_tracer",function(){
                                    scope.shadow("urls",adjust_urls(switchyd.expand(scope.config_tracer)));
                                });
                                
                                scope.editing = function(index,url){
                                    scope.get_shadow("urls")[index] = url;
                                };
                                
                                scope.insertURL = function(index){
                                    scope.urls.splice(index+1,0,"new-url-" + Date.now());
                                    scope.urls = adjust_urls(scope.urls);
                                    scope.shadow("urls",scope.urls);
                                };
                                
                                scope.removeURL = function(index){
                                    scope.urls.splice(index,1)
                                    scope.urls = adjust_urls(scope.urls);
                                    scope.shadow("urls",scope.urls);
                                };
                                
                                scope.$watch("active",function(){
                                    scope.shadow("urls",scope.get_shadow("urls"));
                                });

                                break; 
                        }
                                    
                        navi.loaded = true;
                        injector.get("$compile")(document.querySelector("#"+navi.name))(scope);
                        scope.$apply();
                    }
                    
                     navi.scope.active = navi.active;
                });
            });
            
            scope.navis[0].active = true;
            scope.sync = function(){
                scope.navis.forEach(function(navi){
                    navi.sync();
                });
                
                switchyd.async.enqueue();
                scope.message = "sync...";
                injector.get("$timeout")(function(){
                    scope.message = '';
                },2000);
            };
            
            scope.$emit("active-changed");
            
            injector.get("$compile")(document.querySelector("#navigation"))(scope);
            scope.$apply();
        });
    });
})();
