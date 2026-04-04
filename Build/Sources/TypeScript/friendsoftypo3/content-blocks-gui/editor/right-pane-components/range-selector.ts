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

interface RangeConfig {
  enabled?: boolean;
  lower?: number;
  upper?: number;
}

/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <content-block-editor-range-selector></content-block-editor-range-selector>
 */
@customElement('content-block-editor-range-selector')
export class ContentBlockEditorRangeSelector extends LitElement {

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
  isRangeEnabled = false;

  protected override render(): TemplateResult {
    this.updateRangeEnabledState();
    return html`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleRangeEnabledChange}" 
              type="checkbox" 
              id="range_enabled" 
              ?checked="${live(this.isRangeEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="range_enabled">
              Range Configuration
            </label>
          </div>
        </div>
        ${this.isRangeEnabled ? html`
          <div class="component-body">
            <div class="row g-3">
              <div class="col-6">
                <label for="range_lower" class="form-label">Lower</label>
                <input @blur="${this.handleRangeInputChange}" 
                  type="number" 
                  id="range_lower" 
                  .value="${live((this.values.range as RangeConfig)?.lower || 0)}"
                  class="form-control" />
              </div>
              <div class="col-6">
                <label for="range_upper" class="form-label">Upper</label>
                <input @blur="${this.handleRangeInputChange}" 
                  type="number" 
                  id="range_upper" 
                  .value="${live((this.values.range as RangeConfig)?.upper || 100)}"
                  class="form-control" />
              </div>
            </div>
          </div>
        ` : ''}
      </div>`;
  }

  protected updateRangeEnabledState(): void {
    const range = this.values.range as RangeConfig | undefined;

    if (range && Object.prototype.hasOwnProperty.call(range, 'enabled')) {
      // If enabled property is explicitly set, use that value
      this.isRangeEnabled = !!range.enabled;
    } else if (range && (range.lower !== undefined || range.upper !== undefined)) {
      // If no enabled property but has range values, consider it enabled on initial render
      this.isRangeEnabled = true;
    } else {
      // Default to disabled if no range or no values
      this.isRangeEnabled = false;
    }
  }

  protected handleRangeEnabledChange(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    
    if (!this.values.range) {
      this.values.range = {};
    }
    
    this.isRangeEnabled = target.checked;
    const range = this.values.range as RangeConfig;
    range.enabled = target.checked;

    if (target.checked) {
      if (range.lower === undefined) {
        range.lower = 0;
      }
      if (range.upper === undefined) {
        range.upper = 100;
      }
    }
    
    this.dispatchUpdateEvent();
  }

  protected handleRangeInputChange(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    
    if (!this.values.range) {
      this.values.range = {};
    }
    
    const range = this.values.range as RangeConfig;
    if (target.id === 'range_lower') {
      range.lower = parseInt(target.value, 10);
    } else if (target.id === 'range_upper') {
      range.upper = parseInt(target.value, 10);
    }
    
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
