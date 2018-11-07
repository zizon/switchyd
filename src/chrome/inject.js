import { Injector } from './switchyd-server.js';

const SwitchydInjector = new Injector();
SwitchydInjector.inject();

if( window.SwitchydInjector === undefined ){
    window.SwitchydInjector = SwitchydInjector;
}
