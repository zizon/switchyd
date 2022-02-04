/* eslint-disable no-unused-vars */
// switchd cores
import { resolveStorage } from './core/chrome.js'
import { Storage, SwitchydWorker } from './core/switchyd.js'
import { RawConfig } from './core/config.js'

// lit
import { LitElement, css, html, TemplateResult } from 'lit'
import { customElement, state } from 'lit/decorators.js'
import { Task } from '@lit-labs/task'
import { repeat } from 'lit/directives/repeat.js'
import { when } from 'lit/directives/when.js'

// styles
import '@spectrum-web-components/theme/theme-light.js'
import '@spectrum-web-components/theme/scale-medium.js'
import '@spectrum-web-components/theme/sp-theme.js'

// side bar
import '@spectrum-web-components/split-view/sp-split-view.js'
import '@spectrum-web-components/sidenav/sp-sidenav.js'
import '@spectrum-web-components/sidenav/sp-sidenav-heading.js'
import '@spectrum-web-components/sidenav/sp-sidenav-item.js'
import '@spectrum-web-components/tabs/sp-tabs.js'
import '@spectrum-web-components/tabs/sp-tab.js'
import '@spectrum-web-components/tabs/sp-tab-panel.js'
import '@spectrum-web-components/textfield/sp-textfield.js'
import '@spectrum-web-components/button/sp-button.js'
import { Textfield } from '@spectrum-web-components/textfield'

// icons
import '@spectrum-web-components/icons-workflow/icons/sp-icon-actions.js'
import '@spectrum-web-components/icons-workflow/icons/sp-icon-add.js'
import '@spectrum-web-components/icons-workflow/icons/sp-icon-remove.js'
import '@spectrum-web-components/icons-workflow/icons/sp-icon-arrow-up.js'

enum ListType {
  Proxy = 'Proxy',
  Bypass = 'Bypass',
  Activate = 'Activate On'
}

declare const chrome: {
  webRequest:any
  proxy:any
}

@customElement('switchyd-setting')
export class SwitchydSetting extends LitElement {
  static styles = css`
    :host {
      .text {
        widht: 100%;
        text-align: center;
      }
    }

    .fill {
      height: 100vh;
    }

    .span {
      width: 100%;
    }

    .tab-spacing {
      min-width: 33%;
      text-align: center;
    }

    .list-item {
      text-align: center;
      margin-top: 1%;
    }

    sp-button {
      vertical-align: middle;
    }

    .icons {
      display: flex;
      justify-content: space-evenly;
    }
  `;

  dirty:number = 0

  @state()
  selected:number = 0

  config:Storage = resolveStorage()

  loadConfig = new Task(
    this,
    ([_]):Promise<RawConfig> => {
      return resolveStorage().get()
    },
    () => []
  );

  render () {
    return html`
    <sp-theme color='light' scale='medium'>
      <sp-split-view resizable collapsible primary-size='auto' class="fill">
        <div>
          <sp-sidenav @change='${this.selectServer}'>
            <sp-sidenav-heading label="Servers">
              ${this.loadConfig.render({
                complete: (config) => html`
                  ${repeat(
                    config.servers,
                    (server) => server.server,
                      (server, index) => html`
              
                        <sp-sidenav-item value='${index}'>
                          <div>
                            <div class='icons'>
                              
                              ${when(
                                index !== 0,
                                () => html`
                                  <div  @click='${(_:Event):void => {
                                    [config.servers[index], config.servers[index - 1]] = [config.servers[index - 1], config.servers[index]]
                                    this.syncConfig(config)
                                  }}'>
                                    <sp-icon-arrow-up></sp-icon-arrow-up>
                                  </div>
                                `
                              )}

                              <div @click='${(_:Event):void => {
                                  const input = this.renderRoot.querySelector('#nav-' + index) as Textfield
                                  input.disabled = false
                              }}'>
                                <sp-icon-actions></sp-icon-actions>
                              </div>

                              <div @click='${(_:Event):void => {
                                  config.servers.splice(index, 0, {
                                    accepts: [],
                                    denys: [],
                                    listen: [],
                                    server: config.servers[index].server
                                  })
                                  this.syncConfig(config)
                              }}'>
                                <sp-icon-add></sp-icon-add>
                              </div>

                              ${when(
                                config.servers.length > 1,
                                () => html`
                                  <div @click='${(_:Event):void => {
                                    config.servers.splice(index, 1)
                                    if (index > 0 && this.selected >= index) {
                                      this.selected--
                                    }

                                    this.syncConfig(config)
                                  }}'>
                                    <sp-icon-remove></sp-icon-remove>
                                  </div>
                                `
                              )}
                      
                            </div>

                            <sp-textfield id='nav-${index}' value='${server.server}' disabled
                              @change='${(_:Event):void => {
                                const input = this.renderRoot.querySelector('#nav-' + index) as Textfield
                                config.servers[index].server = input.value
                                this.syncConfig(config)
                              }}' 
                              @focusout='${(_:Event):void => {
                                const input = this.renderRoot.querySelector('#nav-' + index) as Textfield
                                input.disabled = true
                              }}'
                            >
                            </sp-textfield>                     
                          </div>
                        </sp-sidenav-item>
                      `
                  )}
                `
              })}
            </sp-sidenav-heading>
          </sp-sidenav>
        </div>

        <div>
          <sp-tabs selected='${ListType.Proxy}'>
            <sp-tab value='${ListType.Proxy}' label='${ListType.Proxy}' class='tab-spacing'></sp-tab>
            <sp-tab value='${ListType.Bypass}' label='${ListType.Bypass}' class='tab-spacing'></sp-tab>
            <sp-tab value='${ListType.Activate}' label='${ListType.Activate}' class='tab-spacing'></sp-tab>
  
            ${this.loadConfig.render({
              complete: (config) => html`
              <sp-tab-panel value='${ListType.Proxy}'>
                ${this.rednerList(config, ListType.Proxy, this.selected)}
              </sp-tab-panel>
              <sp-tab-panel value='${ListType.Bypass}'>
                ${this.rednerList(config, ListType.Bypass, this.selected)}
              </sp-tab-panel>
              <sp-tab-panel value='${ListType.Activate}'>
                ${this.rednerList(config, ListType.Activate, this.selected)}
              </sp-tab-panel>
              `
            })}
            
          </sp-tabs>
        </div>
      </sp-split-view>
    </sp-theme>
    `
  }

  protected rednerList (config:RawConfig, type:ListType, selected:number):TemplateResult {
    const list = (():string[] => {
      switch (type) {
        case ListType.Proxy:
          return config.servers[selected].accepts
        case ListType.Bypass:
          return config.servers[selected].denys
        case ListType.Activate:
          return config.servers[selected].listen
      }
    })()

    return html`
    <div class='span'>
      ${when(
        list.length > 0,
        // not empty
        () => html`${repeat(list, (s, index) => html`
          <div class='list-item'>
            <sp-textfield id='list-${selected}-${type}-${index}' type='url' value='${s}' 
                @input='${(_:Event):void => {
                  const changed = this.renderRoot.querySelector('#list-' + selected + '-' + type + '-' + index) as Textfield
                  this.typeToList(config, type, selected)[index] = changed.value

                  this.syncConfig(config)
                }}'>
            </sp-textfield>

            <sp-button size='s' class='remove-button' variant='negative'
              @click='${(_:Event):void => {
                this.typeToList(config, type, selected).splice(index, 1)
                this.syncConfig(config)
              }}'>Remove</sp-button>
            <sp-button size='s' class='add-button' variant='cta'
              @click=${(_:Event):void => {
                this.typeToList(config, type, selected).splice(index, 0, 'example.com')
                this.syncConfig(config)
              }}
              >Add</sp-button>
          </div>
        `)}`,

        // empty
        () => html`
        <div class='list-item'>
          <sp-textfield type='url' id='list-${selected}-${type}'>
          </sp-textfield>
          <sp-button size='s' class='add-button' variant='cta'
              @click=${(_:Event):void => {
                const changed = this.renderRoot.querySelector('#list-' + selected + '-' + type) as Textfield
                if (changed.value.length > 0) {
                  this.typeToList(config, type, selected).push(changed.value)
                  this.syncConfig(config)
                }
              }}
          >Add</sp-button>
        </div>
        `
      )}
    </div>
    `
  }

  protected typeToList (config:RawConfig, type:ListType, selected:number):string[] {
    switch (type) {
      case ListType.Proxy:
        return config.servers[selected].accepts
      case ListType.Bypass:
        return config.servers[selected].denys
      case ListType.Activate:
        return config.servers[selected].listen
    }
  }

  protected selectServer (event:Event):void {
    const selectedValue = this.renderRoot.querySelector('sp-sidenav')?.value
    if (selectedValue) {
      this.selected = Number.parseInt(selectedValue)
    }
  }

  protected syncConfig (config:RawConfig):void {
    this.config.set(config)
    this.requestUpdate()

    if (chrome.proxy) {
      new SwitchydWorker(chrome.proxy, this.config).applyPAC()
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'switchyd-setting': SwitchydSetting,
  }
}
