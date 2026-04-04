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

import { html, LitElement, css } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import type { ExtensionDefinition, GroupDefinition, ContentBlocksYaml } from '@friendsoftypo3/content-blocks-gui/interface/definitions';


/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <editor-left-pane-content-block-settings></editor-left-pane-content-block-settings>
 */
@customElement('editor-left-pane-content-block-settings')
export class EditorLeftPaneContentBlockSettings extends LitElement {
  static override styles = css``;

  @property()
  groups: Array<GroupDefinition>;
  @property()
  extensions: Array<ExtensionDefinition>;
  @property()
  contentBlockYaml: ContentBlocksYaml;
  @property()
  hostExtension: string;
  @property()
  mode?: string;
  @property()
  contenttype?: string;

  protected override render(): TemplateResult {
    const isBasicMode = this.contenttype === 'basic';
    const isEditMode = this.mode === 'edit';

    return html`
      <div class="form-group">
        <label for="extension" class="form-label">Extension</label>
        <select class="form-control" id="extension" ?disabled="${isEditMode}" @change="${this.handleInputChange}">
          <option value="0">Choose...</option>
          ${this.extensions.map((extension: ExtensionDefinition) => html`
            <option value="${extension.package}" ?selected="${extension.package === this.hostExtension}">${extension.extension}</option>
          `)}
        </select>
        ${isEditMode ? html`
          <div class="form-text text-muted mt-1">
            <typo3-backend-icon identifier="actions-document-info" size="small"></typo3-backend-icon>
            Extension cannot be changed in edit mode. Use "Duplicate" to copy to another extension.
          </div>
        ` : ''}
      </div>
      <div class="form-group">
        <label for="vendor" class="form-label">Vendor</label>
        <input type="text" id="vendor" class="form-control" value=${(this.contentBlockYaml.vendor || '')} @input="${this.handleInputChange}" />
      </div>
      <div class="form-group">
        <label for="name" class="form-label">Name</label>
        <input type="text" id="name" class="form-control" value=${(this.contentBlockYaml.name || '')} @input="${this.handleInputChange}" />
      </div>
      ${!isBasicMode ? html`
        <div class="form-group">
          <label for="title" class="form-label">Title</label>
          <input type="text" id="title" class="form-control" value="${this.contentBlockYaml.title || ''}" @input="${this.handleInputChange}" />
        </div>
        <div class="form-group">
          <div class="form-check">
            <input type="checkbox" id="prefix" class="form-check-input" ?checked=${this.contentBlockYaml.prefixFields} @change="${this.handleInputChange}" />
            <label for="prefix" class="form-check-label">Prefix fields</label>
          </div>
        </div>
        <div class="form-group">
          <label for="prefix-type" class="form-label">Prefix type</label>
          <select class="form-control" id="prefix-type" @change="${this.handleInputChange}">
            <option value="">Choose...</option>
            <option value="full" ?selected="${this.contentBlockYaml.prefixType === 'full' || !this.contentBlockYaml.prefixType}" >Full</option>
            <option value="vendor" ?selected="${this.contentBlockYaml.prefixType === 'vendor'}" >Vendor</option>
          </select>
        </div>
        <div class="form-group">
          <label for="vendor-prefix" class="form-label">Vendor prefix</label>
          <input type="text" id="vendor-prefix" class="form-control" value="${this.contentBlockYaml.vendorPrefix || ''}" @input="${this.handleInputChange}" />
        </div>
        <div class="form-group">
          <label for="priority" class="form-label">Priority</label>
          <input type="number" id="priority" class="form-control" value="${this.contentBlockYaml.priority || ''}" @input="${this.handleInputChange}" />
        </div>
        <div class="form-group">
          <label for="group" class="form-label">Group</label>
          <select class="form-control" id="group" @change="${this.handleInputChange}">
            <option value="">Choose...</option>
            ${this.groups.map((group: GroupDefinition) => html`
              <option value="${group.key}" ?selected="${this.getGroupSelectionState(group.key)}">${group.label}</option>
            `)}
          </select>
        </div>
        <div class="form-group">
          <label for="typeName" class="form-label">typeName</label>
          <input type="text" id="typeName" class="form-control" value="${this.contentBlockYaml.typeName || ''}" @input="${this.handleInputChange}" />
        </div>
      ` : ''}
    `;
  }

  protected getGroupSelectionState(groupKey: string): boolean {
    if (this.contentBlockYaml.group && this.contentBlockYaml.group === groupKey) {
      return true;
    }
    if (!this.contentBlockYaml.group || !this.groups.some(group => group.key === this.contentBlockYaml.group)) {
      return groupKey === 'default';
    }
    return false;
  }

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
    // const renderRoot = this.attachShadow({mode: 'open'});
    return this;
  }

  private handleInputChange(): void {
    const isBasicMode = this.contenttype === 'basic';

    // Read all current form values
    const settings: any = {};

    // Extension (for parent component, not part of YAML)
    const extensionSelect = this.renderRoot.querySelector('#extension') as HTMLSelectElement;
    if (extensionSelect) {
      settings.hostExtension = extensionSelect.value;
    }

    // Vendor and Name
    const vendorInput = this.renderRoot.querySelector('#vendor') as HTMLInputElement;
    const nameInput = this.renderRoot.querySelector('#name') as HTMLInputElement;

    if (vendorInput) {settings.vendor = vendorInput.value;}
    if (nameInput) {settings.name = nameInput.value;}

    // Content Block specific fields
    if (!isBasicMode) {
      const titleInput = this.renderRoot.querySelector('#title') as HTMLInputElement;
      const prefixCheckbox = this.renderRoot.querySelector('#prefix') as HTMLInputElement;
      const prefixTypeSelect = this.renderRoot.querySelector('#prefix-type') as HTMLSelectElement;
      const vendorPrefixInput = this.renderRoot.querySelector('#vendor-prefix') as HTMLInputElement;
      const priorityInput = this.renderRoot.querySelector('#priority') as HTMLInputElement;
      const groupSelect = this.renderRoot.querySelector('#group') as HTMLSelectElement;
      const typeName = this.renderRoot.querySelector('#typeName') as HTMLSelectElement;

      if (titleInput) {settings.title = titleInput.value;}
      if (prefixCheckbox) {settings.prefixFields = prefixCheckbox.checked;}
      if (prefixTypeSelect) {settings.prefixType = prefixTypeSelect.value;}
      if (vendorPrefixInput) {settings.vendorPrefix = vendorPrefixInput.value;}
      if (priorityInput) {settings.priority = priorityInput.value ? parseInt(priorityInput.value, 10) : undefined;}
      if (groupSelect) {settings.group = groupSelect.value;}
      if (typeName) {settings.typeName = typeName.value;}
    }

    // Dispatch custom event to parent
    this.dispatchEvent(new CustomEvent('settings-changed', {
      detail: { settings },
      bubbles: true,
      composed: true
    }));
  }
}
