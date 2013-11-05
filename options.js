'use strict';
(function(){
    var script = document.createElement("script");
    script.async = 'async';
    script.src = "angular.js";
    script.type = "text/javascript";
    document.querySelector("script").insertBefore(script);
    
    script.addEventListener("load",function(event){
        var injector = angular.injector(['ng']);
        window.injector = injector;
        
        var scope = injector.get("$rootScope").$new(true);
        var navis = scope.navis =[
            {
                name:"servers"
            },
            {
                name:"proxy-list"
            },
            {
                name:"white-list"
            }
        ];
        
        injector.get("$compile")(document.querySelector("#navigation"))(scope);
        scope.$apply();
        
        chrome.runtime.getBackgroundPage(function(app){
            var switchyd = app.switchyd;
            var scope = injector.get("$rootScope").$new(true);
            scope.servers = switchyd.config.servers;
            scope.append = function(item){
                if( "$$hashKey" in item){
                    item = angular.copy(item);
                    delete item["$$hashKey"];
                }
                
                scope.servers.push(item);
            };
            
            injector.get("$compile")(document.querySelector("#servers-stage"))(scope);
            scope.$apply();
        });
    });
})();
