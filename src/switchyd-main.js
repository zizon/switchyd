import {LitElement, html} from '@polymer/lit-element';

import '@polymer/paper-material/paper-material.js';
import '@polymer/paper-styles/paper-styles.js';

import './switchyd-omnibox.js';
import './switchyd-showcase.js';

import { Persistor,SwitchydServer,Injector } from './chrome/switchyd-server.js';

class SwitchyMainElement extends LitElement {
   
    constructor() {
        super();
        
        this._whenReady('#showcase').then((element)=>{
            element.dispatchEvent(new CustomEvent(
                'show-update',
                {
                    detail : {
                        servers : new Persistor().unpersist(), 
                    }
                }
            ));
        });
    }

    _whenReady(selector) {
        return new Promise((resolve)=>{
            this.updateComplete.then(()=>{
                const element = this.shadowRoot.querySelector(selector);
                if( element != null ){
                    resolve(element); 
                    return;
                }
                
                this._whenReady(selector).then((element)=>resolve(element));
                return;
            });
        });
    }

    _onSearchMatchChange(event) {
        this.shadowRoot.querySelector('#showcase')
            .dispatchEvent(new CustomEvent(
                'show-update',
                {
                    detail : {
                        servers : event.detail.hit, 
                    }
                }
            ));
    }

    _onAddNewServer(event) {
        this.shadowRoot.querySelector('#showcase')
            .dispatchEvent(new CustomEvent(
                'show-update',
                {
                    detail : {
                        servers : [event.detail.server],
                    }
                }
            ));
    }
    
    _persist(servers) {
        new Persistor().persist(servers);
        if( chrome && chrome.runtime && chrome.runtime.getBackgroundPage ){
             chrome.runtime.getBackgroundPage((page)=>{
                page.SwitchydInjector.apply();
             })
        }
    }

    render() {
        return html`
            <custom-style>
                <style>
                    paper-material {
                        width : 80%;
                        margin: auto;
                        padding-bottom : 2%;
                    }
                </style>
            </custom-style>

            <div>
                <paper-material
                    animated
                    elevation=5
                >
                    <div> 
                        <switchyd-omnibox
                            @search-match-change=${this._onSearchMatchChange}
                            @add-new-server=${this._onAddNewServer}
                        >
                        </switcyd-omnibox>
                    </div>

                    <div>
                        <switchyd-showcase
                            id='showcase'
                            @update-server=${(event)=>{
                                const server = event.detail.server;
                                const servers = new Persistor().unpersist();
                                
                                const found =servers.findIndex((value)=>value.server() === server.server());
                                if(found >= 0){
                                    servers.splice(found,1);
                                }
                                
                                servers.push(server);
                                this._persist(servers); 
                            }}

                            @remove-server=${(event)=>{
                                const server = event.detail.server;
                                const servers = new Persistor().unpersist();
                                const found =servers.findIndex((value)=>value.server() === server.server());
                                if(found >= 0){
                                    servers.splice(found,1);
                                }
                                
                                this._persist(servers); 
                            }}

                            @rename-server=${(event)=>{
                                const server = event.detail.value;
                                const old = event.detail.old;
                                const servers = new Persistor().unpersist();
                                
                                const found =servers.findIndex((value)=>value.server() === old);
                                if(found >= 0){
                                    servers.splice(found,1);
                                }
                                
                                servers.push(server);
                                this._persist(servers); 
                            }}
                        >
                        </switchyd-showcase>
                    </div>
                </paper-material>
            </div>
        `;
    }
}

customElements.define('switchyd-main', SwitchyMainElement);




