import { Optimizer,SwitchydServer,Persistor,Migrate,Injector } from './switchyd-server.js';

function test1() {
    const untired = new Optimizer().optimize([
        'www.google.com',
        'www.facebook.com',
        'toplevel.dot.google.com',
    ]);
} 

function test2() {
    const raw = ['www.google.com',
        'www.facebook.com',
        'toplevel.dot.google.com',
    ];
    const server = new SwitchydServer().bind('SOCKS5 127.0.0.1:10086');
    raw.forEach((x)=>{
        ['listen','accepts','denys'].forEach((name)=>{
            server._shorhand(name,x);
        });
    });
    const code = new Compiler().compile([server]);
    console.log(code);
}

function test3() {
     const raw = ['www.google.com',
        'www.facebook.com',
        'toplevel.dot.google.com',
    ];
    const server = new SwitchydServer().bind('SOCKS5 127.0.0.1:10086');
    raw.forEach((x)=>{
        ['listen','accepts','denys'].forEach((name)=>{
            server._shorhand(name,x);
        });
    });
    
    console.log(
        new Persistor()
            .persist([server])
            .unpersist()
    );
}

function test4() {
    new Migrate().migrate();
}

function test5() {
    new Injector().inject();
}

test5();


