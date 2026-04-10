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

import { html, LitElement, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import '@friendsoftypo3/content-blocks-gui/editor/left-pane-content-block-settings.js';
import '@friendsoftypo3/content-blocks-gui/editor/left-pane-components.js';
import '@friendsoftypo3/content-blocks-gui/editor/left-pane-basics.js';
import type { ExtensionDefinition, GroupDefinition, ContentBlocksYaml, FieldTypeSetting, BasicMetadata } from '@friendsoftypo3/content-blocks-gui/interface/definitions';

/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <content-block-editor-left-pain></content-block-editor-left-pain>
 */
@customElement('content-block-editor-left-pane')
export class ContentBlockEditorLeftPane extends LitElement {

  @property()
  activeTab: string = 'settings';
  @property()
  groups: Array<GroupDefinition>;
  @property()
  extensions: Array<ExtensionDefinition>;
  @property()
  contentBlockYaml: ContentBlocksYaml;
  @property()
  fieldTypes: Array<FieldTypeSetting>;
  @property()
  hostExtension: string;
  @property()
  mode?: string;
  @property()
  contenttype?: string;
  @property()
  availableBasics: Array<BasicMetadata> = [];

  protected override render(): TemplateResult {
    // For Basic mode, hide the Basics tab (Basics can't have root-level basics)
    const isBasicMode = this.contenttype === 'basic';

    const isShowSettings = this.activeTab === 'settings';
    const isShowComponents = this.activeTab === 'components';
    const isShowBasics = this.activeTab === 'basics';

    return html`
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
               @click="${() => {this.setActiveTab('settings');}}"
               title=""
               aria-selected="${isShowSettings ? 'true' : 'false'}"
               class="${isShowSettings ? 'active' : nothing}"
            >
              Settings
            </a>
          </li>
          <li role="presentation" class="t3js-tabmenu-item ">
            <a
              href="#"
              @click="${() => {this.setActiveTab('components');}}"
              title=""
              aria-selected="${isShowComponents ? 'true' : 'false'}"
              class="${isShowComponents ? 'active' : nothing}"
            >
              Components
            </a>
          </li>
          ${isBasicMode ? nothing : html`
            <li role="presentation" class="t3js-tabmenu-item ">
              <a href="#"
                 @click="${() => {this.setActiveTab('basics');}}"
                 title=""
                 aria-selected="${isShowBasics ? 'true' : 'false'}"
                 class="${isShowBasics ? 'active' : nothing}"
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
    `;
  }

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
    // const renderRoot = this.attachShadow({mode: 'open'});
    return this;
  }

  protected renderTab(): TemplateResult {
    switch (this.activeTab) {
      case 'settings':
        return html`<editor-left-pane-content-block-settings .contentBlockYaml="${this.contentBlockYaml}" .groups="${this.groups}" .extensions="${this.extensions}" .hostExtension="${this.hostExtension}" .mode="${this.mode}" .contenttype="${this.contenttype}" @settings-changed="${this.handleSettingsChanged}"></editor-left-pane-content-block-settings>`;
      case 'components':
        return html`<editor-left-pane-components .fieldTypes="${this.fieldTypes}"></editor-left-pane-components>`;
      case 'basics':
        return html`<editor-left-pane-basics .availableBasics="${this.availableBasics}" .selectedBasics="${this.contentBlockYaml.basics || []}"></editor-left-pane-basics>`;
      default:
        return html`Unknown tab: ${this.activeTab}`;
    }
  }

  private handleSettingsChanged(event: CustomEvent): void {
    // Forward the event to the parent editor component
    this.dispatchEvent(new CustomEvent('settings-changed', {
      detail: event.detail,
      bubbles: true,
      composed: true
    }));
  }

  private setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

}
