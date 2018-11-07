import {LitElement, html} from '@polymer/lit-element';
import { when } from 'lit-html/directives/when.js';

import '@polymer/paper-styles/paper-styles.js';

import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/iron-icons/iron-icons';

import { Persistor,SwitchydServer } from './chrome/switchyd-server.js';

class SwitchydOmniboxElement extends LitElement {
    
    static get properties() {
        return {
            _mode : {
            }
        }
    }

    constructor() {
        super();
        this._mode = 'search';
    }
    
    _onTyped(event) {
        const target = event.target;
        const value = target.value.toLowerCase();
        
        const hit = new Persistor().unpersist()
            .filter((server)=>{
                return server.server() &&  server.server().toLowerCase().indexOf(value) != -1;
            });

        if(hit.length === 0) {
            this._mode = 'extra';
            return;
        }else {
            this._mode = 'search';
            this.dispatchEvent(new CustomEvent(
                'search-match-change',
                {
                    detail: {
                        hit : hit,
                    }
                }
            ));
            return;
        }
    }

    _onNewServer(event) {
        const value = this.shadowRoot.querySelector('#query').value; 
        this.dispatchEvent(new CustomEvent(
            'add-new-server',
            {
                detail : {
                    server : new SwitchydServer().bind(value),
                }
            }
        ));
    }

    render() {
        return html`
            <custom-style>
                <style>
                    .container {
                        width: 80%;
                        margin: auto;

                        display: flex;
                        align-items:flex-end;
                    }

                    paper-icon-button {
                        color : var(--google-blue-500);
                    }

                    paper-input {
                        width : 100%;
                        text-align: center;
                    }
                </style>
            </custom-style>

            <div class='container'>
                <paper-input
                    id='query'
                    mini
                    noLabelFloat
                    placeholder='type to crate or search server like "SOCKS5 127.0.0.1:10086"'
                    @change=${this._onTyped}
                >
                </paper-input>
                ${when(
                    this._mode === 'extra',
                    () => html`
                        <paper-icon-button
                            icon='add'
                            @tap=${this._onNewServer}
                        >
                        </paper-icon-button>
                    `,
                    () => html``
                )}
            </div>
        `;
    }
}

customElements.define('switchyd-omnibox',SwitchydOmniboxElement);



