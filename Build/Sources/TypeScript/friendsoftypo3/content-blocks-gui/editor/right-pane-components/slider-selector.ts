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

interface SliderConfig {
  enabled?: boolean;
  step?: number;
  width?: number;
}

/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <content-block-editor-slider-selector></content-block-editor-slider-selector>
 */
@customElement('content-block-editor-slider-selector')
export class ContentBlockEditorSliderSelector extends LitElement {

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
  isSliderEnabled = false;

  protected override render(): TemplateResult {
    this.updateSliderEnabledState();
    return html`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleSliderEnabledChange}" 
              type="checkbox" 
              id="slider_enabled" 
              ?checked="${live(this.isSliderEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="slider_enabled">
              Slider Configuration
            </label>
          </div>
        </div>
        ${this.isSliderEnabled ? html`
          <div class="component-body">
            <div class="row g-3">
              <div class="col-6">
                <label for="slider_step" class="form-label">Step</label>
                <input @blur="${this.handleSliderInputChange}" 
                  type="number" 
                  id="slider_step" 
                  step="0.1"
                  .value="${live((this.values.slider as SliderConfig)?.step || 1)}"
                  class="form-control" />
              </div>
              <div class="col-6">
                <label for="slider_width" class="form-label">Width (px)</label>
                <input @blur="${this.handleSliderInputChange}" 
                  type="number" 
                  id="slider_width" 
                  .value="${live((this.values.slider as SliderConfig)?.width || 100)}"
                  class="form-control" />
              </div>
            </div>
          </div>
        ` : ''}
      </div>`;
  }

  protected updateSliderEnabledState(): void {
    const slider = this.values.slider as SliderConfig | undefined;

    if (slider && Object.prototype.hasOwnProperty.call(slider, 'enabled')) {
      // If enabled property is explicitly set, use that value
      this.isSliderEnabled = !!slider.enabled;
    } else if (slider && (slider.step !== undefined || slider.width !== undefined)) {
      // If no enabled property but has slider values, consider it enabled on initial render
      this.isSliderEnabled = true;
    } else {
      // Default to disabled if no slider or no values
      this.isSliderEnabled = false;
    }
  }

  protected handleSliderEnabledChange(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    
    if (!this.values.slider) {
      this.values.slider = {};
    }
    
    this.isSliderEnabled = target.checked;
    const slider = this.values.slider as SliderConfig;
    slider.enabled = target.checked;

    if (target.checked) {
      if (slider.step === undefined) {
        slider.step = 1;
      }
      if (slider.width === undefined) {
        slider.width = 100;
      }
    }
    
    this.dispatchUpdateEvent();
  }

  protected handleSliderInputChange(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    
    if (!this.values.slider) {
      this.values.slider = {};
    }
    
    const slider = this.values.slider as SliderConfig;
    if (target.id === 'slider_step') {
      slider.step = parseFloat(target.value);
    } else if (target.id === 'slider_width') {
      slider.width = parseInt(target.value, 10);
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
