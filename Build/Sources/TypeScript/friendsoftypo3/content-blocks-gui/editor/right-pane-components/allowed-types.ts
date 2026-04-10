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

import { html, LitElement } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { live } from 'lit/directives/live.js';
import type { FieldTypeProperty } from '@friendsoftypo3/content-blocks-gui/interface/field-type-setting';

/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <content-block-editor-allowed-types></content-block-editor-allowed-types>
 */
@customElement('content-block-editor-allowed-types')
export class ContentBlockEditorAllowedTypes extends LitElement {

  @property()
  fieldTypeProperty: FieldTypeProperty;

  @property()
  values: Record<string, unknown>;

  @property()
  position?: number;

  @property()
  level?: number;

  @property()
  parent?: number;

  @property()
  isAllowedTypesEnabled = false;

  protected availableLinkTypes = [
    { value: 'page', label: 'Page' },
    { value: 'url', label: 'URL' },
    { value: 'file', label: 'File' },
    { value: 'folder', label: 'Folder' },
    { value: 'email', label: 'Email' },
    { value: 'telephone', label: 'Telephone' },
    { value: 'record', label: 'Record' }
  ];

  protected override render(): TemplateResult {
    this.updateAllowedTypesEnabledState();
    const currentValue = this.values.allowedTypes as string[] || [];
    
    return html`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleAllowedTypesEnabledChange}" 
              type="checkbox" 
              id="allowedTypes_enabled" 
              ?checked="${live(this.isAllowedTypesEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="allowedTypes_enabled">
              Link Type Restrictions
            </label>
          </div>
        </div>
        ${this.isAllowedTypesEnabled ? html`
          <div class="component-body">
            <div class="form-group">
              <label class="form-label">Allowed Link Types</label>
              <div class="link-types-grid">
                ${this.availableLinkTypes.map(type => html`
                  <div class="form-check">
                    <input @change="${this.handleLinkTypeChange}" 
                      type="checkbox" 
                      id="linktype_${type.value}" 
                      data-value="${type.value}"
                      ?checked="${live(currentValue.includes(type.value))}" 
                      class="form-check-input" />
                    <label class="form-check-label" for="linktype_${type.value}">
                      ${type.label}
                    </label>
                  </div>
                `)}
              </div>
            </div>
          </div>
        ` : ''}
      </div>`;
  }

  protected updateAllowedTypesEnabledState(): void {
    const allowedTypes = this.values.allowedTypes;
    this.isAllowedTypesEnabled = allowedTypes && Array.isArray(allowedTypes) && allowedTypes.length > 0 && !allowedTypes.includes('*');
  }

  protected handleAllowedTypesEnabledChange(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    
    this.isAllowedTypesEnabled = target.checked;
    
    if (target.checked) {
      // Initialize with all types selected
      this.values.allowedTypes = [...this.availableLinkTypes.map(type => type.value)];
    } else {
      // Set to default (all types allowed)
      this.values.allowedTypes = ['*'];
    }
    
    this.dispatchUpdateEvent();
  }

  protected handleLinkTypeChange(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    const typeValue = target.dataset.value!;
    
    if (!this.values.allowedTypes || !Array.isArray(this.values.allowedTypes)) {
      this.values.allowedTypes = [];
    }
    
    const currentTypes = this.values.allowedTypes as string[];
    
    if (target.checked) {
      if (!currentTypes.includes(typeValue)) {
        currentTypes.push(typeValue);
      }
    } else {
      const index = currentTypes.indexOf(typeValue);
      if (index > -1) {
        currentTypes.splice(index, 1);
      }
    }
    
    // If no types selected, revert to default
    if (currentTypes.length === 0) {
      this.values.allowedTypes = ['*'];
      this.isAllowedTypesEnabled = false;
    }
    
    this.requestUpdate();
    this.dispatchUpdateEvent();
  }

  protected dispatchUpdateEvent(): void {
    this.dispatchEvent(new CustomEvent('updateCbFieldData', {
      bubbles: true,
      composed: true,
      detail: {
        position: this.position,
        level: this.level,
        parent: this.parent,
        values: this.values,
      },
    }));
  }

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
    // const renderRoot = this.attachShadow({mode: 'open'});
    return this;
  }
}
