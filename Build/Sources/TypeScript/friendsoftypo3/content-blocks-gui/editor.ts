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
import { customElement, property, state } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import '@friendsoftypo3/content-blocks-gui/editor/left-pane.js';
import '@friendsoftypo3/content-blocks-gui/editor/middle-pane.js';
import '@friendsoftypo3/content-blocks-gui/editor/right-pane.js';
import MultiStepWizard from '@typo3/backend/multi-step-wizard.js';
import Severity from '@typo3/backend/severity.js';
import AjaxRequest from '@typo3/core/ajax/ajax-request.js';
import Modal from '@typo3/backend/modal.js';
import { SeverityEnum } from '@typo3/backend/enum/severity.js';
import type {
  FieldTypeSetting,
  ContentBlockDefinition,
  ContentBlockField,
  DropField,
  GroupDefinition,
  ExtensionDefinition,
  FieldMetadata,
  ValidationResult,
  BasicMetadata
} from '@friendsoftypo3/content-blocks-gui/interface/definitions';

/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <content-block-editor></content-block-editor>
 */
@customElement('content-block-editor')
export class ContentBlockEditor extends LitElement {

  @property()
  name?: string;
  @property()
  mode?: string;
  @property()
  contenttype?: string;
  @property()
  data?: string;
  @property()
  extensions?: string;
  @property()
  groups?: string;
  @property()
  fieldconfig?: string;
  @property()
  fieldmetadata?: string;

  @property()
  fieldSettingsValues: ContentBlockField = {
    'identifier': '',
    'label': '',
    'type': '',
  };
  @property()
  rightPaneActiveSchema: FieldTypeSetting;
  @property()
  rightPaneActivePosition: number;
  @property()
  rightPaneActiveLevel: number;
  @property({ type: Array })
  rightPaneActiveParentPath: number[] = [];

  @property()
  dragActive?: boolean = false;
  @property()
  cbDefinition: ContentBlockDefinition;

  @state()
  availableBasics: Array<BasicMetadata> = [];

  init = false;
  fieldTypeList: Array<FieldTypeSetting>;
  groupList: Array<GroupDefinition>;
  extensionList: Array<ExtensionDefinition>;
  fieldMetadata: FieldMetadata;

  protected override render(): TemplateResult {
    this.initData();
    if (this.mode === 'copy') {
      this._initMultiStepWizard();
    }
    return html`
        <div class="row">
          <div class="col-4">
            <content-block-editor-left-pane
              .contentBlockYaml="${this.cbDefinition.yaml}"
              .groups="${this.groupList}"
              .extensions="${this.extensionList}"
              .fieldTypes="${this.fieldTypeList}"
              .hostExtension="${this.cbDefinition.hostExtension}"
              .mode="${this.mode}"
              .contenttype="${this.contenttype}"
              .availableBasics="${this.availableBasics}"
              @dragStart="${this.handleDragStart}"
              @dragEnd="${this.handleDragEnd}"
              @basics-changed="${this.handleBasicsChanged}"
              @settings-changed="${this.handleSettingsChanged}"
            >
            </content-block-editor-left-pane>
          </div>
          <div class="col-4">
            <content-block-editor-middle-pane
              .fieldList="${this.cbDefinition.yaml.fields}"
              .fieldTypes="${this.fieldTypeList}"
              .dragActive="${this.dragActive}"
              .activeFieldPosition="${this.rightPaneActivePosition}"
              .activeFieldLevel="${this.rightPaneActiveLevel}"
              .activeFieldParentPath="${this.rightPaneActiveParentPath}"
              @fieldTypeDropped="${this.fieldTypeDroppedListener}"
              @activateSettings="${this.activateFieldSettings}"
              @removeFieldType="${this.removeFieldTypeEventListener}"
            >
            </content-block-editor-middle-pane>
          </div>
          <div class="col-4 properties-pane p-4">
            <content-block-editor-right-pane
              .schema="${this.rightPaneActiveSchema}"
              .values="${this.fieldSettingsValues}"
              .position="${this.rightPaneActivePosition}"
              .level="${this.rightPaneActiveLevel}"
              .parentPath="${this.rightPaneActiveParentPath}"
              .fieldTypeList="${this.fieldTypeList}"
              .fieldMetadata="${this.fieldMetadata}"
              .availableBasics="${this.availableBasics}"
              .contenttype="${this.contenttype}"
              @updateCbFieldData="${this.updateFieldDataEventListener}"
            >
            </content-block-editor-right-pane>
          </div>
        </div>
      `;
  }

  protected initData(): void {
    if (this.init) {
      return;
    }
    try {
      this.cbDefinition = JSON.parse(this.data);
      this.fieldTypeList = JSON.parse(this.fieldconfig);
      this.groupList = JSON.parse(this.groups);
      this.extensionList = JSON.parse(this.extensions);
    } catch (e) {
      console.error('Failed to parse editor configuration data', e);
      return;
    }

    // For Content Blocks: Split name into vendor and name if it contains a slash
    if (this.contenttype !== 'basic' && this.cbDefinition.yaml.name && this.cbDefinition.yaml.name.includes('/')) {
      const nameParts = this.cbDefinition.yaml.name.split('/');
      if (nameParts.length >= 2 && nameParts[0] && nameParts[1]) {
        this.cbDefinition.yaml.vendor = nameParts[0];
        this.cbDefinition.yaml.name = nameParts[1];
      }
    }
    this.fieldMetadata = JSON.parse(this.fieldmetadata || '{"baseFields":{},"systemReservedFields":[],"currentTable":"tt_content"}');

    // Load available Basics
    this.loadAvailableBasics();

    // Process fields to inject types for base fields
    this.processFieldsForTypeInjection(this.cbDefinition.yaml.fields, 0);

    this.init = true;

    // Save button (AJAX - stays in editor)
    document.querySelectorAll('[data-action="save-content-block"]').forEach((saveButton) => {
      saveButton.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.saveContentBlock();
      });
    });

    // Save & Close button (Form POST - redirects to list)
    document.querySelectorAll('[data-action="save-and-close-content-block"]').forEach((saveAndCloseButton) => {
      saveAndCloseButton.addEventListener('click', async (event) => {
        event.preventDefault();
        await this.saveContentBlockAndClose();
      });
    });
  }

  /**
   * Load available Basics from the API
   */
  protected async loadAvailableBasics(): Promise<void> {
    try {
      const response = await new AjaxRequest(TYPO3.settings.ajaxUrls.content_blocks_gui_list_basics).get();
      const data = await response.resolve();

      if (data.body && data.body.basicList) {
        // Convert object to array and transform to BasicMetadata format
        this.availableBasics = Object.values(data.body.basicList).map((basic: any) => ({
          identifier: basic.identifier,
          vendor: basic.identifier.split('/')[0] || '',
          name: basic.identifier.split('/')[1] || '',
          fieldCount: basic.fields?.length || 0,
          path: '',
          extension: basic.hostExtension || ''
        }));
      }
    } catch (error) {
      console.error('Failed to load available Basics:', error);
      this.availableBasics = [];
    }
  }

  /**
   * Process fields recursively to inject types for base fields
   * This handles YAML that doesn't have 'type' property for base fields
   */
  protected processFieldsForTypeInjection(fields: ContentBlockField[], level: number): void {
    if (!fields || !Array.isArray(fields)) {
      return;
    }

    fields.forEach((field) => {
      // Check if this is a useExistingField at level 0
      if (field.useExistingField && level === 0 && field.identifier) {
        const baseField = this.fieldMetadata.baseFields[field.identifier];

        if (baseField) {
          // Base field detected
          field._isBaseField = true;

          // FORCE prefixFields to false - you can't prefix existing base fields
          field.prefixFields = false;
          // Reset prefixType since prefixing is disabled
          field.prefixType = '';

          // Inject type only if missing
          if (!field.type) {
            field.type = baseField.type;
            field._typeInjected = true;
          }
        }
      }

      // Recursively process nested fields (e.g., Collection fields)
      if (field.fields && Array.isArray(field.fields)) {
        this.processFieldsForTypeInjection(field.fields, level + 1);
      }
    });
  }

  /**
   * Check if a field identifier is system reserved
   */
  protected isSystemReservedField(identifier: string): boolean {
    const reserved = this.fieldMetadata.systemReservedFields || [];
    const reservedArray: string[] = Array.isArray(reserved) ? reserved : Object.values(reserved);
    return reservedArray.includes(identifier);
  }

  /**
   * Validate a field based on useExistingField rules and context
   */
  protected validateField(field: ContentBlockField, level: number): ValidationResult {
    // Check 1: Collections (level > 0) always need type
    if (level > 0 && !field.type) {
      return {
        valid: false,
        severity: 'error',
        message: 'Type required in collections'
      };
    }

    // Check 2: useExistingField logic (only applies at level 0)
    // This check must come BEFORE system reserved field check, because base fields
    // like 'header' are reusable and should show SUCCESS, not ERROR
    if (level === 0 && field.useExistingField && !field.prefixFields) {
      const baseField = this.fieldMetadata.baseFields[field.identifier];

      if (baseField) {
        // Base field detected - type is optional, this is the recommended approach!
        return {
          valid: true,
          severity: 'success',
          message: `Base field - type auto-detected: ${baseField.type}`,
          detectedType: baseField.type
        };
      }

      // Not a base field - check if it's a system reserved field
      if (this.isSystemReservedField(field.identifier)) {
        return {
          valid: false,
          severity: 'error',
          message: 'System reserved field - enable prefixing or choose different identifier'
        };
      }

      // Custom field (from TCA/Overrides) - type is required
      if (!field.type) {
        return {
          valid: false,
          severity: 'error',
          message: 'Custom field requires type'
        };
      }
      return {
        valid: true,
        severity: 'warning',
        message: 'Custom field - type required'
      };
    }

    // Check 3: System reserved fields without prefixing (for new fields)
    if (!field.prefixFields && this.isSystemReservedField(field.identifier)) {
      return {
        valid: false,
        severity: 'error',
        message: 'System reserved field - enable prefixing or choose different identifier'
      };
    }

    // Check 4: Normal field needs type
    if (!field.type) {
      return {
        valid: false,
        severity: 'error',
        message: 'Type is required'
      };
    }

    return { valid: true, severity: 'info', message: '' };
  }

  /**
   * Prepare fields for save by removing internal properties and injected types
   * Base fields should not have 'type' in YAML
   */
  protected prepareFieldsForSave(fields: ContentBlockField[], level: number): ContentBlockField[] {
    if (!fields || !Array.isArray(fields)) {
      return fields;
    }

    return fields.map((field) => {
      const cleanField = { ...field };

      // Remove internal tracking properties
      delete cleanField._typeInjected;
      delete cleanField._isBaseField;
      delete cleanField._validation;

      // Remove type for base fields at level 0
      if (level === 0 && field._isBaseField && field.useExistingField) {
        delete cleanField.type;
      }

      // Recursively process nested fields
      if (cleanField.fields && Array.isArray(cleanField.fields)) {
        cleanField.fields = this.prepareFieldsForSave(cleanField.fields, level + 1);
      }

      return cleanField;
    });
  }

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
    // const renderRoot = this.attachShadow({mode: 'open'});
    return this;
  }

  // Walks cbDefinition.yaml.fields using a path of indices and returns the
  // innermost `fields` array. Empty path means the root array.
  // Paths identify containers by position, so they survive structuredClone
  // (unlike raw object references which become orphans in the discarded tree).
  private resolveParentFields(path: number[]): ContentBlockField[] {
    if (!path || path.length === 0) {
      if (!this.cbDefinition.yaml.fields) {
        this.cbDefinition.yaml.fields = [];
      }
      return this.cbDefinition.yaml.fields;
    }
    let fields: ContentBlockField[] = this.cbDefinition.yaml.fields ?? [];
    for (const index of path) {
      const node = fields[index];
      if (!node) {return [];}
      if (!node.fields) {node.fields = [];}
      fields = node.fields;
    }
    return fields;
  }

  protected fieldTypeDroppedListener(event: CustomEvent) {
    this.rightPaneActiveSchema = this.fieldTypeList.filter((fieldType) => fieldType.type === event.detail.data.type)[0];
    const fields = this.resolveParentFields(event.detail.parentPath);
    const newIdentifier = event.detail.data.type + '_' + this.getNextFieldIndex(fields, event.detail.data.type);
    this.handleFieldAction(newIdentifier, event.detail);
  }

  protected handleFieldAction(newIdentifier: string, eventData: DropField) {
    const fields = this.resolveParentFields(eventData.parentPath);
    if (fields.filter((fieldType) => fieldType.identifier === eventData.data.identifier).length > 0) {
      this.updateContentBlockField(eventData.data.identifier, eventData.position, eventData.level, eventData.parentPath);
    } else {
      this.addNewContentBlockField(newIdentifier, eventData.data.type, eventData.position, eventData.level, eventData.parentPath);
    }
  }

  protected addNewContentBlockField(identifier: string, type: string, position: number, level: number, parentPath: number[]): void {
    const newField: ContentBlockField = {
      identifier: identifier,
      type: type,
      label: type + position,
    };
    if (type === 'Collection' || type === 'Palette') {
      newField.fields = [];
    }
    const fields = this.resolveParentFields(parentPath);
    fields.splice(position, 0, newField);

    // Validate the newly created field before deep-cloning
    const validation = this.validateField(newField, level);
    newField._validation = validation;

    this.cbDefinition = structuredClone(this.cbDefinition);

    const freshFields = this.resolveParentFields(parentPath);
    this.fieldSettingsValues = { ...freshFields[position] };
    this.rightPaneActivePosition = position;
    this.rightPaneActiveLevel = level;
    this.rightPaneActiveParentPath = parentPath;
  }

  protected updateContentBlockField(identifier: string, position: number, level: number, parentPath: number[]): void {
    const fields = this.resolveParentFields(parentPath);
    const existingFieldPosition = fields.findIndex((fieldType: ContentBlockField) => fieldType.identifier === identifier);
    const movedField = fields[existingFieldPosition];
    const reordered: ContentBlockField[] = [
      ...fields.slice(0, existingFieldPosition),
      ...fields.slice(existingFieldPosition + 1),
    ];
    reordered.splice(position, 0, movedField);
    // Mutate the array in place so the parent's .fields reference is preserved.
    fields.length = 0;
    fields.push(...reordered);

    this.cbDefinition = structuredClone(this.cbDefinition);

    const freshFields = this.resolveParentFields(parentPath);
    this.fieldSettingsValues = { ...freshFields[position] };
    this.rightPaneActivePosition = position;
    this.rightPaneActiveLevel = level;
    this.rightPaneActiveParentPath = parentPath;
  }

  protected updateFieldDataEventListener(event: CustomEvent) {
    const fields = this.resolveParentFields(event.detail.parentPath);
    const field = event.detail.values as ContentBlockField;
    fields[event.detail.position] = field;

    // Recalculate _isBaseField and type injection for root-level fields.
    if (event.detail.level === 0) {
      if (field.useExistingField && field.identifier) {
        const baseField = this.fieldMetadata.baseFields[field.identifier];
        if (baseField) {
          field.prefixFields = false;
          field.prefixType = '';
          field._isBaseField = true;
          if (!field.type || field._typeInjected) {
            field.type = baseField.type;
            field._typeInjected = true;
          }
        } else {
          field._isBaseField = false;
          if (field._typeInjected) {
            field._typeInjected = false;
          }
        }
      } else {
        field._isBaseField = false;
        if (field._typeInjected) {
          field._typeInjected = false;
        }
      }
    }

    field._validation = this.validateField(field, event.detail.level);

    this.cbDefinition = structuredClone(this.cbDefinition);

    const freshFields = this.resolveParentFields(event.detail.parentPath);
    this.fieldSettingsValues = { ...freshFields[event.detail.position] };

    if (event.detail.typeChanged && event.detail.newType) {
      const newSchema = this.fieldTypeList.find(
        (fieldType) => fieldType.type === event.detail.newType
      );
      if (newSchema) {
        this.rightPaneActiveSchema = newSchema;
      }
    } else if (this.fieldSettingsValues.type && !this.rightPaneActiveSchema) {
      const newSchema = this.fieldTypeList.find(
        (fieldType) => fieldType.type === this.fieldSettingsValues.type
      );
      if (newSchema) {
        this.rightPaneActiveSchema = newSchema;
      }
    }

    this.requestUpdate();
  }

  protected removeFieldTypeEventListener(event: CustomEvent) {
    const parentPath: number[] = event.detail.parentPath ?? [];
    const position: number = event.detail.position;
    const fields = this.resolveParentFields(parentPath);
    fields.splice(position, 1);

    this.cbDefinition = structuredClone(this.cbDefinition);

    // Selection maintenance: if the removed field was or is an ancestor of the
    // currently active field, clear selection; if a same-parent sibling above
    // the active field was removed, shift active position left.
    if (this.rightPaneActiveParentPath && this.pathsEqual(this.rightPaneActiveParentPath, parentPath)) {
      if (this.rightPaneActivePosition === position) {
        this.clearRightPaneSelection();
      } else if (this.rightPaneActivePosition > position) {
        this.rightPaneActivePosition -= 1;
      }
    } else if (this.isSubPath(parentPath, this.rightPaneActiveParentPath)
      && this.rightPaneActiveParentPath[parentPath.length] === position) {
      // The removed field IS an ancestor of the active one — drop selection.
      this.clearRightPaneSelection();
    }
  }

  protected activateFieldSettings(event: CustomEvent) {
    const parentPath: number[] = event.detail.parentPath ?? [];
    const position: number = event.detail.position;
    const fields = this.resolveParentFields(parentPath);
    const field = fields[position] as ContentBlockField;
    if (field === undefined) {
      this.clearRightPaneSelection();
      return;
    }

    if (event.detail.level === 0 && field.useExistingField && field.identifier) {
      const baseField = this.fieldMetadata.baseFields[field.identifier];
      if (baseField) {
        field.prefixFields = false;
        field.prefixType = '';
        field._isBaseField = true;
        if (!field.type || field._typeInjected) {
          field.type = baseField.type;
          field._typeInjected = true;
        }
      }
    }

    field._validation = this.validateField(field, event.detail.level);

    this.cbDefinition = structuredClone(this.cbDefinition);

    const freshFields = this.resolveParentFields(parentPath);
    this.fieldSettingsValues = { ...freshFields[position] };

    this.rightPaneActiveSchema = this.fieldTypeList.filter((fieldType) => fieldType.type === this.fieldSettingsValues.type)[0];
    this.rightPaneActivePosition = position;
    this.rightPaneActiveLevel = event.detail.level;
    this.rightPaneActiveParentPath = parentPath;

    this.requestUpdate();
  }

  private clearRightPaneSelection(): void {
    this.fieldSettingsValues = { identifier: '', label: '', type: '' };
    this.rightPaneActiveSchema = null;
    this.rightPaneActivePosition = 0;
    this.rightPaneActiveLevel = 0;
    this.rightPaneActiveParentPath = [];
  }

  private pathsEqual(a: number[] | undefined, b: number[] | undefined): boolean {
    if (!a || !b) {return (!a || a.length === 0) && (!b || b.length === 0);}
    if (a.length !== b.length) {return false;}
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) {return false;}
    }
    return true;
  }

  // True when `prefix` is a strict prefix of `path` (path descends from prefix).
  private isSubPath(prefix: number[], path: number[] | undefined): boolean {
    if (!path || path.length <= prefix.length) {return false;}
    for (let i = 0; i < prefix.length; i++) {
      if (prefix[i] !== path[i]) {return false;}
    }
    return true;
  }


  private handleDragEnd(): void {
    this.dragActive = false;
  }

  private handleDragStart(): void {
    this.dragActive = true;
  }

  private handleBasicsChanged(event: CustomEvent): void {
    const { basics } = event.detail;
    // Create new yaml object reference so LitElement detects the change
    this.cbDefinition = {
      ...this.cbDefinition,
      yaml: { ...this.cbDefinition.yaml, basics }
    };
  }

  private handleSettingsChanged(event: CustomEvent): void {
    const { settings } = event.detail;

    // Extract hostExtension separately as it's not part of yaml
    const { hostExtension, ...yamlSettings } = settings;

    // Create new object reference so LitElement detects the change
    this.cbDefinition = {
      ...this.cbDefinition,
      hostExtension: hostExtension || this.cbDefinition.hostExtension,
      yaml: { ...this.cbDefinition.yaml, ...yamlSettings }
    };
  }

  // TODO: add logic and templates to handle a duplicated content block
  private _initMultiStepWizard() {
    // const contentBlockData = this.data;
    MultiStepWizard.addSlide('step-1', 'Step 1', '', Severity.notice, 'Step 1', async function (slide) {
      MultiStepWizard.unlockNextStep();
      slide.html('<h2>Select vendor</h2><p><select><option value="1">Sample</option></select></p>');
    });
    MultiStepWizard.addSlide('step-2', 'Step 2', '', Severity.notice, 'Step 2', async function (slide) {
      slide.html('Test 2');
      MultiStepWizard.unlockPrevStep();
    });
    MultiStepWizard.show();
  }

  /**
   * Recursively remove "enabled" properties from fields structure
   */
  private removeEnabledProperties(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.removeEnabledProperties(item));
    } else if (obj && typeof obj === 'object') {
      const cleaned = { ...obj };
      delete cleaned.enabled;

      // Recursively clean nested objects
      for (const key in cleaned) {
        if (Object.prototype.hasOwnProperty.call(cleaned, key)) {
          const value = cleaned[key];
          // Unwrap UI wrapper: { enabled: bool, items: [...] } -> [...]
          // The items editor component wraps items in this format internally,
          // but Content Blocks expects a flat array. Only unwrap objects that
          // have 'items' + optionally 'enabled' and nothing else.
          if (value && typeof value === 'object' && !Array.isArray(value) && Array.isArray(value.items)) {
            const keys = Object.keys(value).filter(k => k !== 'enabled');
            if (keys.length === 1 && keys[0] === 'items') {
              cleaned[key] = this.removeEnabledProperties(value.items);
              continue;
            }
          }
          cleaned[key] = this.removeEnabledProperties(cleaned[key]);
        }
      }

      return cleaned;
    }

    return obj;
  }

  /**
   * Validate that all field identifiers are unique at the same level
   */
  private validateUniqueIdentifiers(fields: ContentBlockField[]): { isValid: boolean; duplicates: string[] } {
    const duplicates: string[] = [];

    const validateLevel = (fieldsAtLevel: ContentBlockField[]): void => {
      const identifierCounts = new Map<string, number>();

      for (const field of fieldsAtLevel) {
        if (field.identifier) {
          const count = identifierCounts.get(field.identifier) || 0;
          identifierCounts.set(field.identifier, count + 1);

          if (count === 1) {
            duplicates.push(field.identifier);
          }
        }

        if (field.fields && field.fields.length > 0) {
          validateLevel(field.fields);
        }
      }
    };

    validateLevel(fields);

    return {
      isValid: duplicates.length === 0,
      duplicates
    };
  }

  /**
   * Save content block or basic via AJAX
   */
  private showSavingOverlay(): void {
    this.removeSavingOverlay();
    const overlay = document.createElement('div');
    overlay.id = 'cb-saving-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;';
    overlay.innerHTML = `
      <div style="background:var(--typo3-surface-bright, #fff);color:var(--typo3-text-color-base, #000);border-radius:8px;padding:2rem 3rem;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,0.3);">
        <typo3-backend-icon identifier="spinner-circle" size="large"></typo3-backend-icon>
        <div style="margin-top:1rem;font-size:1.1rem;font-weight:500;">Saving, clearing caches and updating database...</div>
        <div style="margin-top:0.5rem;font-size:0.85rem;color:var(--typo3-text-color-variant, #666);">This may take a few seconds.</div>
      </div>`;
    document.body.appendChild(overlay);
  }

  private removeSavingOverlay(): void {
    document.getElementById('cb-saving-overlay')?.remove();
  }

  private async saveContentBlock(): Promise<void> {
    try {
      this.showSavingOverlay();

      // Check if we're saving a Basic or Content Block
      if (this.contenttype === 'basic') {
        await this.saveBasicAjax();
        return;
      }

      // Clean fields by removing "enabled" properties and injected types recursively
      let cleanedFields = this.removeEnabledProperties(this.cbDefinition.yaml.fields || []);
      cleanedFields = this.prepareFieldsForSave(cleanedFields, 0);

      // Validate unique identifiers before saving
      const validation = this.validateUniqueIdentifiers(cleanedFields);
      if (!validation.isValid) {
        this.isSaving = false;

        // Show error message with duplicate identifiers
        Modal.confirm(
          'Duplicate Field Identifiers',
          `The following field identifiers are used multiple times at the same level: ${validation.duplicates.join(', ')}. Please ensure all field identifiers are unique within their respective levels.`,
          SeverityEnum.error,
          [{
            text: 'OK',
            active: true,
            btnClass: 'btn-danger',
            name: 'ok',
            trigger: function() {
              Modal.dismiss();
            }
          }]
        );
        return;
      }

      const contentBlock: Record<string, any> = {
        fields: cleanedFields,
        basics: this.cbDefinition.yaml.basics || [],
      };

      // Only include optional fields when they have non-empty values.
      // Omitting them lets content-blocks core use its own defaults
      // (e.g. typeName is auto-generated from the block name).
      if (this.cbDefinition.yaml.group) {contentBlock.group = this.cbDefinition.yaml.group;}
      if (this.cbDefinition.yaml.prefixFields !== undefined) {contentBlock.prefixFields = this.cbDefinition.yaml.prefixFields !== false;}
      if (this.cbDefinition.yaml.prefixType) {contentBlock.prefixType = this.cbDefinition.yaml.prefixType;}
      if (this.cbDefinition.yaml.table) {contentBlock.table = this.cbDefinition.yaml.table;}
      if (this.cbDefinition.yaml.typeField) {contentBlock.typeField = this.cbDefinition.yaml.typeField;}
      if (this.cbDefinition.yaml.typeName) {contentBlock.typeName = this.cbDefinition.yaml.typeName;}
      if (this.cbDefinition.yaml.labelField) {contentBlock.labelField = this.cbDefinition.yaml.labelField;}
      if (this.cbDefinition.yaml.priority) {contentBlock.priority = this.cbDefinition.yaml.priority;}
      if (this.cbDefinition.yaml.title) {contentBlock.title = this.cbDefinition.yaml.title;}
      if (this.cbDefinition.yaml.vendorPrefix) {contentBlock.vendorPrefix = this.cbDefinition.yaml.vendorPrefix;}

      const saveData: Record<string, any> = {
        contentType: this.contenttype || 'content-element',
        extension: this.cbDefinition.hostExtension,
        mode: this.mode || 'edit',
        name: this.cbDefinition.yaml.name,
        vendor: this.cbDefinition.yaml.vendor,
        contentBlock: contentBlock,
      };

      if (this.mode === 'copy') {
        saveData.contentBlock.initialVendor = (this.cbDefinition.yaml as any).initialVendor || '';
        saveData.contentBlock.initialName = (this.cbDefinition.yaml as any).initialName || '';
      }

      const formData = new FormData();
      Object.keys(saveData).forEach(key => {
        if (typeof saveData[key] === 'object') {
          formData.append(key, JSON.stringify(saveData[key]));
        } else {
          formData.append(key, saveData[key]);
        }
      });

      const ajaxUrl = TYPO3.settings.ajaxUrls.content_blocks_gui_save_cb;
      const response = await new AjaxRequest(ajaxUrl)
        .post(formData);

      const result = await response.resolve();

      // Switch from 'new' to 'edit' mode after successful first save
      if (this.mode === 'new' && result.success !== false) {
        this.mode = 'edit';
      }

      // Show success message
      Modal.confirm(
        'Success',
        'Content block has been saved successfully.',
        SeverityEnum.info,
        [{
          text: 'OK',
          active: true,
          btnClass: 'btn-info',
          name: 'ok',
          trigger: function() {
            Modal.dismiss();
          }
        }]
      );

    } catch (error) {
      console.error('Failed to save content block:', error);

      // Show error message
      Modal.confirm(
        'Error',
        'Failed to save content block. Please try again.',
        SeverityEnum.error,
        [{
          text: 'OK',
          active: true,
          btnClass: 'btn-danger',
          name: 'ok',
          trigger: function() {
            Modal.dismiss();
          }
        }]
      );
    } finally {
      this.removeSavingOverlay();
    }
  }

  /**
   * Save Basic via AJAX (stays in editor)
   */
  private async saveBasicAjax(): Promise<void> {
    try {
      // Get vendor and name from component state
      const vendor = (this.cbDefinition.yaml as any).vendor?.trim() || '';
      const name = this.cbDefinition.yaml.name?.trim() || '';

      if (!vendor || !name) {
        Modal.confirm(
          'Validation Error',
          'Vendor and Name are required fields.',
          SeverityEnum.error,
          [{
            text: 'OK',
            active: true,
            btnClass: 'btn-default',
            trigger: function() {
              Modal.dismiss();
            }
          }]
        );
        return;
      }

      // Get extension from component state
      const extension = this.cbDefinition.hostExtension;
      if (!extension || extension === '0') {
        Modal.confirm(
          'Validation Error',
          'Please select an extension.',
          SeverityEnum.error,
          [{
            text: 'OK',
            active: true,
            btnClass: 'btn-default',
            trigger: function() {
              Modal.dismiss();
            }
          }]
        );
        return;
      }

      // Clean fields by removing "enabled" properties
      const cleanedFields = this.removeEnabledProperties(this.cbDefinition.yaml.fields || []);

      // Save via AJAX
      const saveData = {
        mode: this.mode || 'new',
        extension: extension,
        vendor: vendor,
        name: name,
        fields: cleanedFields,
        flushCache: true // Tell backend to flush cache
      };

      const ajaxUrl = TYPO3.settings.ajaxUrls.content_blocks_gui_save_basic_ajax;
      const response = await new AjaxRequest(ajaxUrl)
        .post(saveData);

      const result = await response.resolve();

      // Switch from 'new' to 'edit' mode after successful first save
      if (this.mode === 'new' && result.success) {
        this.mode = 'edit';
      }

      // Show success message
      Modal.confirm(
        'Success',
        result.message || 'Basic saved successfully.',
        SeverityEnum.info,
        [{
          text: 'OK',
          active: true,
          btnClass: 'btn-info',
          name: 'ok',
          trigger: function() {
            Modal.dismiss();
          }
        }]
      );

    } catch (error) {
      console.error('Failed to save basic:', error);

      let errorMessage = 'Failed to save Basic. Please try again.';

      // Try to extract error message from response
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as any).message;
      }

      // Show error message
      Modal.confirm(
        'Error',
        errorMessage,
        SeverityEnum.error,
        [{
          text: 'OK',
          active: true,
          btnClass: 'btn-default',
          trigger: function() {
            Modal.dismiss();
          }
        }]
      );
    } finally {
      this.removeSavingOverlay();
    }
  }

  /**
   * Save Basic via form POST (redirects to list with flash message)
   */
  private async saveBasicAndClose(): Promise<void> {
    try {
      // Get vendor and name from component state (not DOM, since form may not be rendered when on different tab)
      const vendor = (this.cbDefinition.yaml as any).vendor?.trim() || '';
      const name = this.cbDefinition.yaml.name?.trim() || '';

      if (!vendor || !name) {
        Modal.confirm(
          'Validation Error',
          'Vendor and Name are required fields.',
          SeverityEnum.error,
          [{
            text: 'OK',
            active: true,
            btnClass: 'btn-default',
            trigger: function() {
              Modal.dismiss();
            }
          }]
        );
        return;
      }

      // Get extension from component state
      const extension = this.cbDefinition.hostExtension;
      if (!extension || extension === '0') {
        Modal.confirm(
          'Validation Error',
          'Please select an extension.',
          SeverityEnum.error,
          [{
            text: 'OK',
            active: true,
            btnClass: 'btn-default',
            trigger: function() {
              Modal.dismiss();
            }
          }]
        );
        return;
      }

      // Clean fields by removing "enabled", "_validation", "_isBaseField" properties
      const cleanedFields = this.removeEnabledProperties(this.cbDefinition.yaml.fields || []);

      // Create a hidden form and submit it for proper server-side redirect
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = TYPO3.settings.ajaxUrls.content_block_gui_api_basics_save;

      // Add form fields
      const addHiddenInput = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };

      addHiddenInput('mode', this.mode || 'new');
      addHiddenInput('extension', extension);
      addHiddenInput('vendor', vendor);
      addHiddenInput('name', name);
      addHiddenInput('fields', JSON.stringify(cleanedFields));

      // Append form to body, submit, and remove
      document.body.appendChild(form);
      form.submit();
      // Note: form will be removed on page navigation

    } catch (error) {
      console.error('Failed to save basic:', error);

      let errorMessage = 'Failed to save Basic. Please try again.';

      // Try to extract error message from response
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null && 'message' in error) {
        errorMessage = (error as any).message;
      }

      // Show error message
      Modal.confirm(
        'Error',
        errorMessage,
        SeverityEnum.error,
        [{
          text: 'OK',
          active: true,
          btnClass: 'btn-default',
          trigger: function() {
            Modal.dismiss();
          }
        }]
      );
    } finally {
      this.removeSavingOverlay();
    }
  }

  /**
   * Save & Close dispatcher (checks content type and calls appropriate method)
   */
  private async saveContentBlockAndClose(): Promise<void> {
    this.showSavingOverlay();

    try {
      // Check if we're saving a Basic or Content Block
      if (this.contenttype === 'basic') {
        await this.saveBasicAndClose();
        return;
      }

      // Content Block save & close implementation
      // Clean fields by removing "enabled" properties and injected types recursively
      let cleanedFields = this.removeEnabledProperties(this.cbDefinition.yaml.fields || []);
      cleanedFields = this.prepareFieldsForSave(cleanedFields, 0);

      // Validate unique identifiers before saving
      const validation = this.validateUniqueIdentifiers(cleanedFields);
      if (!validation.isValid) {
        Modal.confirm(
          'Duplicate Field Identifiers',
          `The following field identifiers are used multiple times at the same level: ${validation.duplicates.join(', ')}. Please ensure all field identifiers are unique within their respective levels.`,
          SeverityEnum.error,
          [{
            text: 'OK',
            active: true,
            btnClass: 'btn-danger',
            name: 'ok',
            trigger: function() {
              Modal.dismiss();
            }
          }]
        );
        return;
      }

      // Prepare data for save
      const contentBlock: Record<string, any> = {
        fields: cleanedFields,
        basics: this.cbDefinition.yaml.basics || [],
      };

      // Only include optional fields when they have non-empty values.
      if (this.cbDefinition.yaml.group) {contentBlock.group = this.cbDefinition.yaml.group;}
      if (this.cbDefinition.yaml.prefixFields !== undefined) {contentBlock.prefixFields = this.cbDefinition.yaml.prefixFields !== false;}
      if (this.cbDefinition.yaml.prefixType) {contentBlock.prefixType = this.cbDefinition.yaml.prefixType;}
      if (this.cbDefinition.yaml.table) {contentBlock.table = this.cbDefinition.yaml.table;}
      if (this.cbDefinition.yaml.typeField) {contentBlock.typeField = this.cbDefinition.yaml.typeField;}
      if (this.cbDefinition.yaml.typeName) {contentBlock.typeName = this.cbDefinition.yaml.typeName;}
      if (this.cbDefinition.yaml.labelField) {contentBlock.labelField = this.cbDefinition.yaml.labelField;}
      if (this.cbDefinition.yaml.priority) {contentBlock.priority = this.cbDefinition.yaml.priority;}
      if (this.cbDefinition.yaml.title) {contentBlock.title = this.cbDefinition.yaml.title;}
      if (this.cbDefinition.yaml.vendorPrefix) {contentBlock.vendorPrefix = this.cbDefinition.yaml.vendorPrefix;}

      const saveData: Record<string, any> = {
        contentType: this.contenttype || 'content-element',
        extension: this.cbDefinition.hostExtension,
        mode: this.mode || 'edit',
        name: this.cbDefinition.yaml.name,
        vendor: this.cbDefinition.yaml.vendor,
        contentBlock: contentBlock,
      };

      if (this.mode === 'copy') {
        saveData.contentBlock.initialVendor = (this.cbDefinition.yaml as any).initialVendor || '';
        saveData.contentBlock.initialName = (this.cbDefinition.yaml as any).initialName || '';
      }

      // Create hidden form and submit for proper server-side redirect
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = TYPO3.settings.ajaxUrls.content_blocks_gui_save_cb_and_close;

      const addHiddenInput = (name: string, value: string) => {
        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = name;
        input.value = value;
        form.appendChild(input);
      };

      // Add all saveData as hidden inputs
      Object.keys(saveData).forEach(key => {
        if (typeof saveData[key] === 'object') {
          addHiddenInput(key, JSON.stringify(saveData[key]));
        } else {
          addHiddenInput(key, saveData[key]);
        }
      });

      // Append form to body and submit
      document.body.appendChild(form);
      form.submit();
      // Note: form will be removed on page navigation

    } finally {
      // Restore overlay (in case of error - if successful, page will redirect)
      this.isSaving = false;
    }
  }

  /**
   * Find the next available index for a field type to avoid identifier collisions after deletion
   */
  private getNextFieldIndex(fields: Array<ContentBlockField>, type: string): number {
    let maxIndex = -1;
    const prefix = type + '_';
    for (const field of fields) {
      if (field.identifier.startsWith(prefix)) {
        const num = parseInt(field.identifier.substring(prefix.length), 10);
        if (!isNaN(num) && num > maxIndex) {
          maxIndex = num;
        }
      }
    }
    return maxIndex + 1;
  }
}
