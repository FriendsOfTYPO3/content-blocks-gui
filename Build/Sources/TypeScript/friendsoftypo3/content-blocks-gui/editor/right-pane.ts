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
import { live } from 'lit/directives/live.js';
// import '@typo3/backend/element/info-box.js';
import type { FieldTypeSetting, FieldTypeProperty, FieldTypeItems } from '@friendsoftypo3/content-blocks-gui/interface/field-type-setting';
import type { BasicMetadata, ValidationResult } from '@friendsoftypo3/content-blocks-gui/interface/definitions';
import '@friendsoftypo3/content-blocks-gui/editor/right-pane-components/value-picker.js';
import '@friendsoftypo3/content-blocks-gui/editor/right-pane-components/range-selector.js';
import '@friendsoftypo3/content-blocks-gui/editor/right-pane-components/slider-selector.js';
import '@friendsoftypo3/content-blocks-gui/editor/right-pane-components/allowed-types.js';
import '@friendsoftypo3/content-blocks-gui/editor/right-pane-components/allowed-custom-properties.js';
import '@friendsoftypo3/content-blocks-gui/editor/right-pane-components/items.js';

/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <content-block-editor-right-pane></content-block-editor-right-pane>
 */
@customElement('content-block-editor-right-pane')
export class ContentBlockEditorRightPane extends LitElement {

  @property()
  values: Record<string, unknown>;

  @property()
  schema?: FieldTypeSetting;

  @property({ type: Number })
  position?: number;

  @property({ type: Number })
  level?: number;

  @property()
  parent?: number;

  @property()
  fieldTypeList?: Array<FieldTypeSetting>;

  @property()
  fieldMetadata?: any;

  @property()
  availableBasics?: Array<BasicMetadata>;

  @property()
  contenttype?: string;


  protected override render(): TemplateResult {
    if (this.schema) {
      return html `
        <div class="content-block-field-configuration">
          <div class="field-properties">
            ${this.schema.properties.map( (item) => html` ${this.renderFormFieldset(item)}` )}
          </div>
        </div>
      `;
    }
    return html `
      <div class="no-selection-state">
        <div class="alert alert-info">
          <strong>No field selected</strong><br>
          Please select a field to configure its properties.
        </div>
      </div>`;
  }

  protected renderFormFieldset(fieldTypeProperty: FieldTypeProperty): TemplateResult {
    const fieldLabel = this.formatFieldLabel(fieldTypeProperty.name);
    const showValidationBadge = ['identifier', 'type', 'useExistingField'].includes(fieldTypeProperty.name);
    // Show base fields helper for content elements, page types, and basics — not for record types
    const showBaseFieldsHelper = fieldTypeProperty.name === 'identifier'
      && this.level === 0
      && this.fieldMetadata
      && this.contenttype !== 'record-type';

    return html `
      <div class="form-section mb-2">
        <div class="form-section-content">
          ${fieldTypeProperty.dataType === 'boolean' ? html`
            <div class="form-check">
              ${this.renderFormField(fieldTypeProperty)}
              <label for="${fieldTypeProperty.name}" class="form-check-label">${fieldLabel}</label>
            </div>
          ` : html`
            <label for="${fieldTypeProperty.name}" class="form-label">${fieldLabel}</label>
            ${this.renderFormField(fieldTypeProperty)}
          `}
          ${showValidationBadge ? this.renderValidationBadge() : ''}
          ${showBaseFieldsHelper ? this.renderBaseFieldsHelper() : ''}
        </div>
      </div>`;
  }

  protected renderFormField(fieldTypeProperty: FieldTypeProperty): TemplateResult {
    // Special handling for "type" field - render as dropdown of available field types
    if (fieldTypeProperty.name === 'type' && this.fieldTypeList) {
      return this.renderTypeDropdown(fieldTypeProperty);
    }

    // Special handling for "identifier" field when type is "Basic" - render as dropdown of available Basics
    if (fieldTypeProperty.name === 'identifier' && this.values.type === 'Basic' && this.availableBasics) {
      return this.renderBasicIdentifierDropdown(fieldTypeProperty);
    }

    // https://lit.dev/docs/templates/directives/#live
    switch (fieldTypeProperty.dataType) {
      case 'text':
        return html `<input @blur="${this.dispatchBlurEvent}" type="text" id="${fieldTypeProperty.name}" .value="${live(this.values[fieldTypeProperty.name] || fieldTypeProperty.default || '')}" class="form-control" />`;
      case 'number':
        return html `<input @blur="${this.dispatchBlurEvent}" type="number" id="${fieldTypeProperty.name}" .value="${live(this.values[fieldTypeProperty.name] as number || fieldTypeProperty.default)}" class="form-control" />`;
      case 'select':
        // Disable prefixType only when prefixFields is explicitly false
        const isPrefixTypeDisabled = fieldTypeProperty.name === 'prefixType' && this.values.prefixFields === false;
        return html `<select @change="${this.dispatchBlurEvent}" class="form-select" id="${fieldTypeProperty.name}" ?disabled="${isPrefixTypeDisabled}">
          <option value="">Choose...</option>
          ${fieldTypeProperty.items.map( (option: FieldTypeItems) => html`
            <option .value="${live(option.value)}" ?selected="${live(this.values[fieldTypeProperty.name] === option.value)}">${option.label}</option>` )}
        </select>`;
      case 'boolean':
        // Disable prefixFields checkbox for base fields with useExistingField
        const isPrefixFieldsDisabled = fieldTypeProperty.name === 'prefixFields' && this.values._isBaseField;
        // Force prefixFields to false for base fields
        const checkboxValue = isPrefixFieldsDisabled ? false : (this.values[fieldTypeProperty.name] as boolean || fieldTypeProperty.default);
        return html `<input @change="${this.dispatchBlurEvent}" type="checkbox" id="${fieldTypeProperty.name}" ?checked=${live(checkboxValue)} ?disabled="${isPrefixFieldsDisabled}" class="form-check-input" />`;
      case 'textarea':
        return html `<textarea @blur="${this.dispatchBlurEvent}" id="${fieldTypeProperty.name}" class="form-control">${live(fieldTypeProperty.default)}</textarea>`;
      case 'array':
        switch (fieldTypeProperty.name) {
          case 'valuePicker':
            return html`<content-block-editor-value-picker
                  .fieldTypeProperty="${fieldTypeProperty}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parent="${this.parent}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-value-picker>`;
          case 'range':
            return html`<content-block-editor-range-selector
                  .fieldTypeProperty="${fieldTypeProperty}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parent="${this.parent}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-range-selector>`;
          case 'slider':
            return html`<content-block-editor-slider-selector
                  .fieldTypeProperty="${fieldTypeProperty}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parent="${this.parent}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-slider-selector>`;
          case 'allowedTypes':
            return html`<content-block-editor-allowed-types
                  .fieldTypeProperty="${fieldTypeProperty}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parent="${this.parent}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-allowed-types>`;
          case 'allowedCustomProperties':
            return html`<content-block-editor-allowed-custom-properties
                  .fieldTypeProperty="${fieldTypeProperty}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parent="${this.parent}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-allowed-custom-properties>`;
          case 'items':
            return html`<content-block-editor-items
                  .fieldTypeProperty="${fieldTypeProperty}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parent="${this.parent}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-items>`;
          default:
            return html `Array field type for property ${fieldTypeProperty.name} is not yet implemented.`;
        }
      default:
        return html `Unknown field type property ${fieldTypeProperty.name}.`;
    }
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

  protected formatFieldLabel(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  protected dispatchBlurEvent(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLInputElement;
    this.values[target.id] = target.type === 'checkbox' ? target.checked : target.value;
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

  /**
   * Render type field as dropdown populated from available field types
   */
  protected renderTypeDropdown(fieldTypeProperty: FieldTypeProperty): TemplateResult {
    // Sort field types alphabetically
    const sortedFieldTypes = [...this.fieldTypeList].sort((a, b) =>
      a.type.localeCompare(b.type)
    );

    const currentValue = this.values[fieldTypeProperty.name] as string || '';

    // Disable dropdown for base fields (type is auto-detected)
    const isBaseField = this.values._isBaseField || false;

    return html`
      <select
        @change="${this.handleTypeChange}"
        class="form-select"
        id="${fieldTypeProperty.name}"
        ?disabled="${isBaseField}"
      >
        <option value="">Choose...</option>
        ${sortedFieldTypes.map((fieldType) => html`
          <option
            value="${fieldType.type}"
            ?selected="${currentValue === fieldType.type}"
          >
            ${fieldType.type}
          </option>
        `)}
      </select>
    `;
  }

  /**
   * Handle type field change - update value and trigger schema change
   */
  protected handleTypeChange(event: Event): void {
    event.preventDefault();
    const target = event.target as HTMLSelectElement;
    const newType = target.value;

    // Update the value
    this.values.type = newType;

    // Dispatch event to update field data and trigger schema reload
    this.dispatchEvent(new CustomEvent('updateCbFieldData', {
      bubbles: true,
      composed: true,
      detail: {
        position: this.position,
        level: this.level,
        parent: this.parent,
        values: this.values,
        typeChanged: true, // Flag to indicate type changed
        newType: newType,
      },
    }));
  }

  /**
   * Render validation badge based on field validation state
   */
  protected renderValidationBadge(): TemplateResult | typeof nothing {
    const validation = this.values._validation as ValidationResult | undefined;

    if (!validation || !validation.message) {
      return nothing;
    }

    const severityClasses = {
      'success': 'alert-success',
      'warning': 'alert-warning',
      'error': 'alert-danger',
      'info': 'alert-info'
    };

    const severityIcons = {
      'success': 'actions-check',
      'warning': 'actions-exclamation',
      'error': 'actions-close',
      'info': 'actions-info'
    };

    const alertClass = severityClasses[validation.severity] || 'alert-info';
    const iconIdentifier = severityIcons[validation.severity] || 'actions-info';

    return html`
      <div class="alert ${alertClass} mt-2 mb-0 py-1 px-2 d-flex align-items-center" role="alert">
        <typo3-backend-icon identifier="${iconIdentifier}" size="small" class="me-1"></typo3-backend-icon>
        <small>${validation.message}</small>
      </div>
    `;
  }

  /**
   * Render base fields helper dropdown for identifier field
   */
  protected renderBaseFieldsHelper(): TemplateResult | typeof nothing {
    if (!this.fieldMetadata || !this.fieldMetadata.baseFields) {
      return nothing;
    }

    // Filter out system reserved fields and sort alphabetically
    const reserved = this.fieldMetadata.systemReservedFields || [];
    const reservedFields: string[] = Array.isArray(reserved) ? reserved : Object.values(reserved);
    const baseFieldEntries = Object.entries(this.fieldMetadata.baseFields)
      .filter(([fieldName]) => !reservedFields.includes(fieldName))
      .sort(([a], [b]) => a.localeCompare(b));

    return html`
      <div class="mt-2">
        <label class="form-label text-muted small">Or choose from existing base fields:</label>
        <select
          class="form-select form-select-sm"
          @change="${this.handleBaseFieldSelection}"
          .value="${''}">
          <option value="">Select a base field...</option>
          ${baseFieldEntries.map(([fieldName, fieldInfo]: [string, any]) => html`
            <option value="${fieldName}">
              ${fieldName} (${fieldInfo.type})
            </option>
          `)}
        </select>
        <small class="form-text text-muted">
          Base fields are reusable TCA columns like header, bodytext, etc.
        </small>
      </div>
    `;
  }

  /**
   * Handle base field selection from dropdown
   */
  protected handleBaseFieldSelection(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const selectedField = target.value;

    if (selectedField) {
      // Update the identifier field with the selected base field name
      this.values.identifier = selectedField;
      // Automatically enable useExistingField
      this.values.useExistingField = true;

      // Reset the dropdown
      target.value = '';

      // Dispatch update event
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
  }

  /**
   * Render identifier field for Basic type as dropdown of available Basics
   */
  protected renderBasicIdentifierDropdown(fieldTypeProperty: FieldTypeProperty): TemplateResult {
    const currentValue = this.values[fieldTypeProperty.name] as string || '';

    // Sort Basics by identifier
    const sortedBasics = [...(this.availableBasics || [])].sort((a, b) =>
      a.identifier.localeCompare(b.identifier)
    );

    return html`
      <select
        @change="${this.dispatchBlurEvent}"
        class="form-select"
        id="${fieldTypeProperty.name}"
      >
        <option value="">Choose a Basic...</option>
        ${sortedBasics.map((basic) => html`
          <option
            value="${basic.identifier}"
            ?selected="${currentValue === basic.identifier}"
          >
            ${basic.identifier} (${basic.fieldCount} fields)
          </option>
        `)}
      </select>
      <small class="form-text text-muted mt-1">
        Select a pre-defined Basic (field mixin) to include in this Content Block.
      </small>
    `;
  }

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
    // const renderRoot = this.attachShadow({mode: 'open'});
    return this;
  }
}
