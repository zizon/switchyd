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
            
            var scope = injector.get("$rootScope").$new(true);
            scope.activate = function(index){
                scope.navis.forEach(function(navi,i){
                    navi.active = i == index ? true: false;
                });
                
                scope.$emit("active-changed");
            };
            scope.navis =["servers","proxy-list","white-list"].map(function(name){
                return {
                    name:name,
                    active:false,
                    loaded:false
                }
            });
            
            scope.$on("active-changed",function(event){
                scope.navis.forEach(function(navi){
                     if(!navi.loaded){
                        var scope = navi.scope = injector.get("$rootScope").$new(true);
                        scope.switchyd = switchyd;
                        scope.active = navi.active;
                        scope.append = function(item){
                            if( "$$hashKey" in item){
                                item = angular.copy(item);
                                delete item["$$hashKey"];
                            }
                            scope.switchyd.config.servers.push(item);
                        };
                        
                        navi.loaded = true;
                        injector.get("$compile")(document.querySelector("#"+navi.name))(scope);
                    }
                    
                     navi.scope.active = navi.active;
                });
            });
            
            scope.navis[0].active = true;
            scope.$emit("active-changed");
            
            ["#navigation"].reduce(function(compile,node){
                compile(document.querySelector(node))(scope);
                return compile;
            },injector.get("$compile"));
            
            scope.$apply();
        });
    });
})();
