/* eslint-disable no-unused-vars */
// switchd cores
import { ChromeStorage } from '../../core/chrome.js'
import { Storage } from '../../core/switchyd.js'

// lit
import { LitElement, css, html } from 'lit'
import { customElement, property, state } from 'lit/decorators.js'
import { Task } from '@lit-labs/task'
import { repeat } from 'lit/directives/repeat.js'

// styles
import '@spectrum-web-components/theme/theme-light.js'
import '@spectrum-web-components/theme/scale-medium.js'
import '@spectrum-web-components/theme/sp-theme.js'

// side bar
import '@spectrum-web-components/split-view/sp-split-view.js'
import '@spectrum-web-components/sidenav/sp-sidenav.js'
import '@spectrum-web-components/sidenav/sp-sidenav-heading.js'
import '@spectrum-web-components/sidenav/sp-sidenav-item.js'
import { RawConfig } from '../../core/config.js'

@customElement('switchyd-setting')
export class SwitchydSetting extends LitElement {
  static styles = css`
    :host {
    }

    .fill {
      height: 100vh;
    }
  `;

  @property()
  mock: boolean = true

  @state({
    hasChanged: (value:boolean, old:boolean):boolean => value !== old && value
  })
  dirty:boolean = true

  config:Storage = this.createConfigStorage()

  loadConfig = new Task(
    this,
    ([_]):Promise<RawConfig> => {
      return this.config.get()
    },
    () => [this.dirty]
  );

  render () {
    return html`
    <sp-theme color='light' scale='medium'>
      <sp-split-view resizable collapsible primary-size="10%" class="fill">
          <div class='nav'>
            <sp-sidenav >
              <sp-sidenav-heading label="Servers">
                ${this.loadConfig.render({
                  complete: (config) => html`
                    ${repeat(
                      config.servers,
                       (server) => server.server,
                        (server, index) => html`
                        <sp-sidenav-item>
                          ${server.server}
                        </sp-sidenav-item>
                        `
                    )}
                  `
                })}
              </sp-sidenav-heading>
            </sp-sidenav>
          </div>

          <div class='content'>
            Right panel
          </div>
      </sp-split-view>
    </sp-theme>
    `
  }

  protected createConfigStorage ():Storage {
    if (!this.mock) {
      return ChromeStorage
    }

    let mockConfig:RawConfig = {
      version: 3,
      servers: [
        {
          accepts: ['www.google.com', 'www.facebook.com'],
          denys: ['www.weibo.com', 'www.baidu.com'],
          listen: [
            'net::ERR_CONNECTION_RESET',
            'net::ERR_CONNECTION_TIMED_OUT',
            'net::ERR_SSL_PROTOCOL_ERROR',
            'net::ERR_TIMED_OUT'
          ],
          server: 'SOCKS5:127.0.0.1:10086'
        },
        {
          accepts: ['twitter.com', 'github.com'],
          denys: ['www.douban.com'],
          listen: [
            'net::ERR_CONNECTION_RESET',
            'net::ERR_CONNECTION_TIMED_OUT',
            'net::ERR_SSL_PROTOCOL_ERROR',
            'net::ERR_TIMED_OUT'
          ],
          server: 'SOCKS5:127.0.0.2:10086'
        }
      ]
    }
    return {
      get: ():Promise<RawConfig> => {
        return Promise.resolve(mockConfig)
      },
      set: (config:RawConfig):Promise<void> => {
        mockConfig = config
        return Promise.resolve()
      }
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'switchyd-setting': SwitchydSetting,
  }
}
