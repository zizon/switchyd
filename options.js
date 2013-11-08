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
                            
                            array.splice(index,array[index],item);
                        };
                        
                        switch(navi.name){
                            case "servers":
                            case "rules":
                                scope.remove = function(name){
                                    delete scope.switchyd.config.rules[name];
                                }
                                break;
                            case "proxy-list":
                                scope.tracer = "proxy";
                            case "white-list":
                                if(!("tracer" in scope)){
                                    scope.tracer = "do_not_track";
                                }
                                
                                scope.config_tracer = scope.switchyd.config.tracers[scope.tracer];
                                
                                var adjust_urls = function(urls){
                                    if(urls.length === 0){
                                        urls.push("NONE");
                                    }else if(urls.length > 1){
                                        urls = urls.filter(function(url){return url != "NONE"});
                                    }
                                    
                                    return urls;
                                }
                                                               
                                var scope_shader = function(name,value){
                                    scope[name+"-shader"] = value;
                                    scope[name] = angular.copy(value);
                                };
                                
                                var get_shader = function(name){
                                    return scope[name+"-shader"]
                                };
                                
                                var sync_shader = function(name){
                                    scope[name] = angular.copy(scope[name+"-shader"]);
                                };
            
                                navi.sync = function(){        
                                    var switchyd = scope.switchyd;                                
                                    var tracer = switchyd.tracer(scope.tracer);
                                    get_shader("urls").filter(function(url){
                                        return url != 'NONE';
                                    }).forEach(function(url){
                                        return tracer.track(url);
                                    });
                                    
                                    scope.config_tracer = scope.switchyd.config.tracers[scope.tracer] = switchyd.optimize(switchyd.compile(tracer));
                                };
                                
                                scope_shader("urls",switchyd.expand(scope.config_tracer));
 
                                scope.editing = function(index,url){
                                    get_shader("urls")[index] = url;
                                };
                                
                                scope.insertURL = function(index){
                                    scope.urls.splice(index+1,0,"new-url-" + Date.now());
                                    scope.urls = adjust_urls(scope.urls);
                                    scope_shader("urls",scope.urls);
                                };
                                
                                scope.removeURL = function(index){
                                    scope.urls.splice(index,1)
                                    scope.urls = adjust_urls(scope.urls);
                                    scope_shader("urls",scope.urls);
                                };
                                
                                scope.$watch("active",function(){
                                    sync_shader("urls");
                                    console.log(scope.config_tracer);
                                });
                                
                                scope.$watch("config_tracer",function(){
                                    console.log("change");
                                    scope_shader("urls",switchyd.expand(scope.config_tracer));
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
