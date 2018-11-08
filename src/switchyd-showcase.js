import {LitElement, html} from '@polymer/lit-element';
import { repeat } from 'lit-html/directives/repeat.js';

import '@polymer/paper-styles/paper-styles.js';

import './switchyd-card.js';

class SwitchydShowcaseElement extends LitElement {
    
    static get properties() {
        return {
            _servers : {
            }
        }
    }

    constructor() {
        super();
        this._servers = [];

        this.addEventListener('show-update',(event)=>{
            this._servers = event.detail.servers; 
            this.requestUpdate('_servers');
        });
    }

    render() {
        return html`
            <custom-style>
                <style>
                    .container {
                        width: 80%;
                        margin: auto;
                    }

                    switchyd-card {
                        margin-bottom : 2%;
                        display:block ;
                    }
                </style>
            </custom-style>

            <div class='container'>
                ${repeat(
                    this._servers,
                    (server,index) => html`
                        <switchyd-card
                            .server=${server}
                            @request-sync=${(event)=>{
                                this.dispatchEvent(new CustomEvent(
                                    'update-server',
                                    {
                                        detail : {
                                            server : server,
                                        }
                                    }
                                ))
                            }}

                            @remove-server=${(event)=>{
                                this._servers.splice(index,1);
                                this.requestUpdate('_servers').then(()=>{
                                    this.dispatchEvent(new CustomEvent(
                                        event.type,
                                        {
                                            detail : {
                                                ...event.detail,
                                            },
                                        }
                                    ));
                                });
                            }}

                            @rename-server=${(event)=>{
                                this.dispatchEvent(new CustomEvent(
                                    event.type,
                                    {
                                        detail : {
                                            ...event.detail,    
                                        }
                                    }
                                ))
                            }}
                       >
                        </switchyd-card>
                    `
                )}                
            </div>
        `;
    }
}

customElements.define('switchyd-showcase',SwitchydShowcaseElement);



