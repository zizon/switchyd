import {LitElement, html} from '@polymer/lit-element';
import { repeat } from 'lit-html/directives/repeat.js';
import { when } from 'lit-html/directives/when.js';

import '@polymer/paper-styles/paper-styles.js';
import '@polymer/paper-input/paper-input.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/iron-icons/iron-icons';

import './switchyd-list.js';

class SwitchydCardElement extends LitElement {
    
    static get properties() {
        return {
            server : {
            },

            _editable : {
            },
        }
    }

    constructor() {
        super();

        this._editable = false;
    }

    render() {
        return html`
            <custom-style>
                <style>
                    .container {
                        width: 100%;
                        padding: 2%;
                        @apply --shadow-elevation-16dp;
                    }

                    .fill {
                        width: 100%;
                    }

                    .title {
                        @apply --paper-font-body2;
                        color : var(--google-blue-500);
                        text-transform: uppercase;

                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                    }

                    #title:hover {
                        cursor: pointer;
                    }

                    .lists {
                        display:flex;
                    }

                    .list {
                        flex-grow:1;
                        margin-right: 1%;
                    }

                    .name {
                        text-align : center;
                        @apply --paper-font-body2;
                        color : var(--google-blue-700);
                        text-transform: capitalize;
                    }
                </style>
            </custom-style>
            
            <div class='container'>
                <div class='fill title'>
                    ${when(
                        this._editable,
                        () => html`
                            <paper-input value=${this.server.server()}
                                mini
                                noLabelFloat
                                @change=${(event)=>{
                                    this._editable = false;
                                    const old = this.server.server();
                                    this.server.bind(event.target.value);

                                    this.dispatchEvent(new CustomEvent(
                                        'rename-server',
                                        {
                                            detail : {
                                                old : old,
                                                value : this.server,
                                            }
                                        }
                                    ));
                                }}
                                @focused-changed=${(event)=>{
                                    this._editable = event.detail.value;
                                }}
                            ></paper-input>
                        `,
                        () => html`
                            <span id='title' 
                                @click=${(event)=>this._editable=true}
                            >
                                ${this.server.server()}
                            </span>

                            <paper-icon-button
                                icon='close'
                                @tap=${(event)=>{
                                    this.dispatchEvent(new CustomEvent(
                                        'remove-server',
                                        {
                                            detail : {
                                                server : this.server,
                                            },
                                        }
                                    ))
                                }}
                            >
                            </paper-icon-button>
                    `
                    )}
                </div>

                <div class='lists'>
                    ${repeat(
                        ['accepts','denys','listen'],
                        (name) => html`
                            <div class='list'>
                                <div class='name'>
                                    <span>${name}</span>
                                </div>

                                <switchyd-list
                                    .list=${Array.from(this.server._shorhand(name))}
                                    
                                    @remove-item=${(event)=>{
                                        const value = event.detail.value;
                                        this.server._shorhand(name).delete(value);
                                        this.dispatchEvent(new CustomEvent('request-sync'));
                                    }}
                                    
                                    @add-item=${(event)=>{
                                        const value = event.detail.value;
                                        this.server._shorhand(name).add(value);
                                        console.log(this.server._shorhand(name));
                                        this.dispatchEvent(new CustomEvent('request-sync'));
                                    }}

                                    @replace-item=${(event)=>{
                                        const set = this.server._shorhand(name);
                                        set.delete(event.detail.old);
                                        set.add(event.detail.value);
                                        this.dispatchEvent(new CustomEvent('request-sync'));
                                    }}
                                >
                                </switchyd-list>
                            </div>
                        `
                    )}
                </div>
            </div>
        `;
    }
}

customElements.define('switchyd-card',SwitchydCardElement);


