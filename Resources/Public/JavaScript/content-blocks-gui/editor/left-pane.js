/*
 * This file is part of the TYPO3 CMS project.
 *
 * It is free software; you can redistribute it and/or modify it under
 * the terms of the GNU General Public License, either version 2
 * of the License, or any later version.
 *
 * For the full copyright and license information, please read the
 * LICENSE.txt file that was distributed with this source code.
 *
 * The TYPO3 project - inspiring people to share!
 */
import{LitElement as m,html as c,nothing as b}from"lit";import{property as n,customElement as v}from"lit/decorators.js";import"@typo3/backend/element/icon-element.js";import"@friendsoftypo3/content-blocks-gui/editor/left-pane-content-block-settings.js";import"@friendsoftypo3/content-blocks-gui/editor/left-pane-components.js";import"@friendsoftypo3/content-blocks-gui/editor/left-pane-basics.js";var o=function(l,t,s,i){var r=arguments.length,a=r<3?t:i===null?i=Object.getOwnPropertyDescriptor(t,s):i,p;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(l,t,s,i);else for(var d=l.length-1;d>=0;d--)(p=l[d])&&(a=(r<3?p(a):r>3?p(t,s,a):p(t,s))||a);return r>3&&a&&Object.defineProperty(t,s,a),a};let e=class extends m{constructor(){super(...arguments),this.activeTab="settings",this.availableBasics=[]}render(){const t=this.contenttype==="basic",s=this.activeTab==="settings",i=this.activeTab==="components",r=this.activeTab==="basics";return c`
      <style>
        #tabs-content-elements {
          border-bottom: 1px solid var(--typo3-component-border-color);
          margin-bottom: 1rem;
          padding: 0;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        #tabs-content-elements .t3js-tabmenu-item {
          margin-right: 2px;
          margin-bottom: -1px;
        }

        #tabs-content-elements .t3js-tabmenu-item a {
          display: block;
          padding: 0.75rem 1.25rem;
          color: var(--typo3-text-color-base);
          text-decoration: none;
          background: transparent;
          border: 1px solid transparent;
          border-radius: 4px 4px 0 0;
          font-weight: 500;
          transition: all 0.2s ease;
        }

        #tabs-content-elements .t3js-tabmenu-item a:hover {
          background: var(--typo3-surface-container-low);
          color: var(--typo3-text-color-primary);
          border-color: var(--typo3-component-border-color) var(--typo3-component-border-color) transparent;
        }

        #tabs-content-elements .t3js-tabmenu-item a.active {
          color: var(--typo3-text-color-primary);
          border-color: var(--typo3-component-border-color) var(--typo3-component-border-color) var(--typo3-surface-bright);
          position: relative;
        }

        #tabs-content-elements .t3js-tabmenu-item a.active::after {
          content: '';
          position: absolute;
          bottom: -1px;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--typo3-surface-primary);
        }

        .tab-content {
          border-radius: 0 0 4px 4px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .panel-tab {
          border: none;
          box-shadow: none;
        }

        .panel-body {
          padding: 1.25rem;
        }
      </style>
      <div role="tabpanel">
        <ul class="nav nav-tabs t3js-tabs" role="tablist" id="tabs-content-elements" data-store-last-tab="1">
          <li role="presentation" class="t3js-tabmenu-item">
            <a href="#"
               @click="${()=>{this.setActiveTab("settings")}}"
               title=""
               aria-selected="${s?"true":"false"}"
               class="${s?"active":b}"
            >
              Settings
            </a>
          </li>
          <li role="presentation" class="t3js-tabmenu-item ">
            <a
              href="#"
              @click="${()=>{this.setActiveTab("components")}}"
              title=""
              aria-selected="${i?"true":"false"}"
              class="${i?"active":b}"
            >
              Components
            </a>
          </li>
          ${t?b:c`
            <li role="presentation" class="t3js-tabmenu-item ">
              <a href="#"
                 @click="${()=>{this.setActiveTab("basics")}}"
                 title=""
                 aria-selected="${r?"true":"false"}"
                 class="${r?"active":b}"
              >
                Basics
              </a>
            </li>
          `}
        </ul>
        <div class="tab-content">
          <div role="tabpanel" class="tab-pane active" id="content-elements-1">
            <div class="panel panel-tab">
              <div class="panel-body">
                ${this.renderTab()}
              </div>
            </div>
          </div>
        </div>
      </div>
    `}createRenderRoot(){return this}renderTab(){switch(this.activeTab){case"settings":return c`<editor-left-pane-content-block-settings .contentBlockYaml="${this.contentBlockYaml}" .groups="${this.groups}" .extensions="${this.extensions}" .hostExtension="${this.hostExtension}" .mode="${this.mode}" .contenttype="${this.contenttype}" @settings-changed="${this.handleSettingsChanged}"></editor-left-pane-content-block-settings>`;case"components":return c`<editor-left-pane-components .fieldTypes="${this.fieldTypes}"></editor-left-pane-components>`;case"basics":return c`<editor-left-pane-basics .availableBasics="${this.availableBasics}" .selectedBasics="${this.contentBlockYaml.basics||[]}"></editor-left-pane-basics>`;default:return c`Unknown tab: ${this.activeTab}`}}handleSettingsChanged(t){this.dispatchEvent(new CustomEvent("settings-changed",{detail:t.detail,bubbles:!0,composed:!0}))}setActiveTab(t){this.activeTab=t}};o([n()],e.prototype,"activeTab",void 0),o([n()],e.prototype,"groups",void 0),o([n()],e.prototype,"extensions",void 0),o([n()],e.prototype,"contentBlockYaml",void 0),o([n()],e.prototype,"fieldTypes",void 0),o([n()],e.prototype,"hostExtension",void 0),o([n()],e.prototype,"mode",void 0),o([n()],e.prototype,"contenttype",void 0),o([n()],e.prototype,"availableBasics",void 0),e=o([v("content-block-editor-left-pane")],e);export{e as ContentBlockEditorLeftPane};
