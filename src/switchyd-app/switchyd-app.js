import {html, PolymerElement} from '@polymer/polymer/polymer-element.js';


/**
 * @customElement
 * @polymer
 */
class SwitchydApp extends PolymerElement {
  static get template() {
    return html`
      <style>
        :host {
          display: block;
        }
      </style>
      <h2>Hello [[prop1]]!</h2>
    `;
  }
  static get properties() {
    return {
      prop1: {
        type: String,
        value: 'switchyd-app'
      }
    };
  }
}

window.customElements.define('switchyd-app', SwitchydApp);
