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
 * <content-block-editor-allowed-custom-properties></content-block-editor-allowed-custom-properties>
 */
@customElement('content-block-editor-allowed-custom-properties')
export class ContentBlockEditorAllowedCustomProperties extends LitElement {

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
  isAllowedCustomPropertiesEnabled = false;

  protected override render(): TemplateResult {
    this.updateAllowedCustomPropertiesEnabledState();
    const currentValue = (this.values.allowedCustomProperties as { itemProcFunc: string; enabled?: boolean }) || { itemProcFunc: '' };
    
    return html`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleAllowedCustomPropertiesEnabledChange}" 
              type="checkbox" 
              id="allowedCustomProperties_enabled" 
              ?checked="${live(this.isAllowedCustomPropertiesEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="allowedCustomProperties_enabled">
              Allowed Custom Properties (itemsProcFunc)
            </label>
          </div>
        </div>
        ${this.isAllowedCustomPropertiesEnabled ? html`
          <div class="component-body">
            <div class="form-group mb-3">
              <label class="form-label" for="itemProcFunc">Items Proc Function</label>
              <input @blur="${this.handleItemProcFuncChange}" 
                type="text" 
                id="itemProcFunc"
                .value="${live(currentValue.itemProcFunc || '')}" 
                class="form-control"
                placeholder="e.g., EXT:my_ext/Classes/ItemsProcFunc.php:MyClass-&gt;getItems" />
              <div class="form-text">
                Specify the itemsProcFunc for dynamic item generation.
              </div>
            </div>
          </div>
        ` : ''}
      </div>`;
  }

  protected updateAllowedCustomPropertiesEnabledState(): void {
    const allowedCustomProperties = this.values.allowedCustomProperties as { itemProcFunc?: string; enabled?: boolean };
    this.isAllowedCustomPropertiesEnabled = !!(allowedCustomProperties?.enabled || allowedCustomProperties?.itemProcFunc);
  }

  protected handleAllowedCustomPropertiesEnabledChange(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    
    this.isAllowedCustomPropertiesEnabled = target.checked;
    
    if (target.checked) {
      // Initialize with empty itemProcFunc
      this.values.allowedCustomProperties = { itemProcFunc: '', enabled: true };
    } else {
      // Clear the object
      this.values.allowedCustomProperties = { itemProcFunc: '', enabled: false };
    }
    
    this.dispatchUpdateEvent();
  }

  protected handleItemProcFuncChange(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    
    if (!this.values.allowedCustomProperties) {
      this.values.allowedCustomProperties = { itemProcFunc: '', enabled: true };
    }
    
    const currentProperties = this.values.allowedCustomProperties as { itemProcFunc: string; enabled?: boolean };
    currentProperties.itemProcFunc = target.value;
    
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
