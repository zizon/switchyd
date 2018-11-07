import {LitElement, html} from '@polymer/lit-element';
import { repeat } from 'lit-html/directives/repeat.js';
import { when } from 'lit-html/directives/when.js';

import '@polymer/paper-styles/paper-styles.js';
import '@polymer/paper-icon-button/paper-icon-button.js';
import '@polymer/iron-icons/iron-icons';
import '@polymer/paper-input/paper-input.js';

class SwitchydListElement extends LitElement {
    
    static get properties() {
        return {
            list : {
            }
        }
    }

    constructor() {
        super();
    }

    render() {
        return html`
            <custom-style>
                <style>
                    .container {
                        width: 100%;
                    }

                    .inputs {
                        display: flex;
                        align-items: flex-end;
                        justify-content : space-between;
                    }

                    paper-input {
                        flex-grow: 1;
                    }

                    paper-icon-button {
                        color : var(--google-blue-500);
                    }
                </style>
            </custom-style>

            <div class='container'>
                ${when(
                    this.list.length === 0,
                    () => html`
                        <div class='inputs'>
                            <paper-input
                                @change=${(event)=>{
                                    const value = event.target.value;
                                    this.list.push(value);
                                    event.target.value = '';
                                    this.requestUpdate('list').then(()=>{
                                        this.dispatchEvent(new CustomEvent(
                                            'add-item',
                                            {
                                                detail : {
                                                    value : value, 
                                                }
                                            }
                                        ));
                                    });
                                }}
                            >
                            </paper-input>
                        <div>
                    `,
                    () => html`
                        ${repeat(
                            this.list,
                            (item,index)=>html`
                                <div class='inputs'>
                                    <paper-input value=${item}
                                        @change=${(event)=>{
                                            const value = event.target.value;
                                            this.list.splice(index,1,value);
                                            this.requestUpdate('list').then(()=>{
                                                this.dispatchEvent(new CustomEvent(
                                                    'replace-item',
                                                    {
                                                        detail : {
                                                            old : item,
                                                            value : value,
                                                        }
                                                    }
                                                ));
                                            });
                                        }}
                                    >
                                    </paper-input>

                                    <div class='buttons'>
                                        <paper-icon-button
                                            icon='add'
                                            @tap=${(event)=>{
                                                this.list.splice(index,0,item);
                                                this.requestUpdate('list');
                                            }}
                                        >
                                        </paper-icon-button>

                                        <paper-icon-button
                                            icon='remove'
                                            @tap=${(event)=>{
                                                this.list.splice(index,1);
                                                this.requestUpdate('list').then(()=>{
                                                    this.dispatchEvent(new CustomEvent(
                                                        'remove-item',
                                                        {
                                                            detail : {
                                                                value : item,
                                                            }
                                                        }
                                                    ));
                                                });
                                            }}
                                        >
                                        </paper-icon-button>
                                    </div>
                                </div>
                            `
                        )}
                    `
                )}

            </div>
        `;
    }
}

customElements.define('switchyd-list',SwitchydListElement);


