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
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, LitElement } from 'lit';
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
/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <content-block-editor></content-block-editor>
 */
let ContentBlockEditor = class ContentBlockEditor extends LitElement {
    constructor() {
        super(...arguments);
        this.fieldSettingsValues = {
            'identifier': '',
            'label': '',
            'type': '',
        };
        this.dragActive = false;
        this.availableBasics = [];
        this.init = false;
    }
    render() {
        this.initData();
        if (this.mode === 'copy') {
            this._initMultiStepWizard();
        }
        return html `
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
              .activeFieldParent="${this.rightPaneActiveParent}"
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
              .parent="${this.rightPaneActiveParent}"
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
    initData() {
        if (this.init) {
            return;
        }
        try {
            this.cbDefinition = JSON.parse(this.data);
            this.fieldTypeList = JSON.parse(this.fieldconfig);
            this.groupList = JSON.parse(this.groups);
            this.extensionList = JSON.parse(this.extensions);
        }
        catch (e) {
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
    async loadAvailableBasics() {
        try {
            const response = await new AjaxRequest(TYPO3.settings.ajaxUrls.content_blocks_gui_list_basics).get();
            const data = await response.resolve();
            if (data.body && data.body.basicList) {
                // Convert object to array and transform to BasicMetadata format
                this.availableBasics = Object.values(data.body.basicList).map((basic) => ({
                    identifier: basic.identifier,
                    vendor: basic.identifier.split('/')[0] || '',
                    name: basic.identifier.split('/')[1] || '',
                    fieldCount: basic.fields?.length || 0,
                    path: '',
                    extension: basic.hostExtension || ''
                }));
            }
        }
        catch (error) {
            console.error('Failed to load available Basics:', error);
            this.availableBasics = [];
        }
    }
    /**
     * Process fields recursively to inject types for base fields
     * This handles YAML that doesn't have 'type' property for base fields
     */
    processFieldsForTypeInjection(fields, level) {
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
    isSystemReservedField(identifier) {
        const reserved = this.fieldMetadata.systemReservedFields || [];
        const reservedArray = Array.isArray(reserved) ? reserved : Object.values(reserved);
        return reservedArray.includes(identifier);
    }
    /**
     * Validate a field based on useExistingField rules and context
     */
    validateField(field, level) {
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
    prepareFieldsForSave(fields, level) {
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
    createRenderRoot() {
        // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
        // const renderRoot = this.attachShadow({mode: 'open'});
        return this;
    }
    fieldTypeDroppedListener(event) {
        this.rightPaneActiveSchema = this.fieldTypeList.filter((fieldType) => fieldType.type === event.detail.data.type)[0];
        const fields = event.detail.level > 0 ? event.detail.parent.fields : this.cbDefinition.yaml.fields;
        const newIdentifier = event.detail.data.type + '_' + this.getNextFieldIndex(fields, event.detail.data.type);
        this.handleFieldAction(newIdentifier, event.detail);
    }
    handleFieldAction(newIdentifier, eventData) {
        let fields = this.cbDefinition.yaml.fields;
        if (eventData.parent !== null) {
            fields = eventData.parent.fields;
        }
        if (fields.filter((fieldType) => fieldType.identifier === eventData.data.identifier).length > 0) {
            this.updateContentBlockField(eventData.data.identifier, eventData.position, eventData.level, eventData.parent);
        }
        else {
            this.addNewContentBlockField(newIdentifier, eventData.data.type, eventData.position, eventData.level, eventData.parent);
        }
    }
    addNewContentBlockField(identifier, type, position, level, parent) {
        const newField = {
            identifier: identifier,
            type: type,
            label: type + position,
        };
        if (type === 'Collection' || type === 'Palette') {
            newField.fields = [];
        }
        if (level > 0) {
            parent.fields.splice(position, 0, newField);
        }
        else {
            this.cbDefinition.yaml.fields.splice(position, 0, newField);
        }
        this.fieldSettingsValues = newField;
        this.rightPaneActivePosition = position;
        this.rightPaneActiveLevel = level;
        this.rightPaneActiveParent = parent;
        // Validate the newly created field
        const validation = this.validateField(newField, level);
        newField._validation = validation;
        this.fieldSettingsValues._validation = validation;
    }
    updateContentBlockField(identifier, position, level, parent) {
        let fields = this.cbDefinition.yaml.fields;
        if (parent !== null) {
            fields = parent.fields;
        }
        const existingFieldPosition = fields.findIndex((fieldType) => fieldType.identifier === identifier);
        const movedField = fields[existingFieldPosition];
        const tempFields = [
            ...fields.slice(0, existingFieldPosition),
            ...fields.slice(existingFieldPosition + 1)
        ];
        fields = [
            ...tempFields.slice(0, position),
            movedField,
            ...tempFields.slice(position)
        ];
        if (parent !== null) {
            parent.fields = fields;
        }
        else {
            this.cbDefinition.yaml.fields = fields;
        }
        this.fieldSettingsValues = fields[position];
        this.rightPaneActivePosition = position;
        this.rightPaneActiveLevel = level;
        this.rightPaneActiveParent = parent;
        this.cbDefinition = structuredClone(this.cbDefinition);
    }
    updateFieldDataEventListener(event) {
        // Use parent context to get the correct field array
        let fields = this.cbDefinition.yaml.fields;
        if (event.detail.parent !== null) {
            fields = event.detail.parent.fields;
        }
        // Update field values
        fields[event.detail.position] = event.detail.values;
        this.fieldSettingsValues = event.detail.values;
        // Recalculate _isBaseField and type injection when relevant fields change
        // This ensures the type dropdown enables/disables correctly and validation updates
        const field = event.detail.values;
        if (event.detail.level === 0) {
            if (field.useExistingField && field.identifier) {
                // Check if this identifier is a base field
                const baseField = this.fieldMetadata.baseFields[field.identifier];
                if (baseField) {
                    // It's a base field - FORCE prefixField to false (can't prefix existing base fields)
                    field.prefixFields = false;
                    // Reset prefixType since prefixing is disabled
                    field.prefixType = '';
                    // Mark as base field and inject type if needed
                    field._isBaseField = true;
                    if (!field.type || field._typeInjected) {
                        field.type = baseField.type;
                        field._typeInjected = true;
                    }
                }
                else {
                    // Not a base field - clear base field marker but KEEP the type
                    field._isBaseField = false;
                    // Remove the _typeInjected flag but keep the type property itself
                    if (field._typeInjected) {
                        field._typeInjected = false;
                    }
                }
            }
            else {
                // useExistingField is false - clear base field marker but KEEP the type
                field._isBaseField = false;
                // Remove the _typeInjected flag but keep the type property itself
                if (field._typeInjected) {
                    field._typeInjected = false;
                }
            }
        }
        // Validate the field
        const validation = this.validateField(field, event.detail.level);
        field._validation = validation;
        // Clone the entire definition to trigger reactivity
        this.cbDefinition = structuredClone(this.cbDefinition);
        // After cloning, get fresh references to the updated field
        let clonedFields = this.cbDefinition.yaml.fields;
        if (event.detail.parent !== null) {
            clonedFields = event.detail.parent.fields;
        }
        // Create a shallow copy to ensure a new reference for reactivity
        this.fieldSettingsValues = { ...clonedFields[event.detail.position] };
        // Update the active schema only if type changed explicitly (via dropdown)
        // Don't change schema when we just removed an injected type
        if (event.detail.typeChanged && event.detail.newType) {
            const newSchema = this.fieldTypeList.find((fieldType) => fieldType.type === event.detail.newType);
            if (newSchema) {
                this.rightPaneActiveSchema = newSchema;
            }
        }
        else if (this.fieldSettingsValues.type && !this.rightPaneActiveSchema) {
            // Field has a type but no schema is set - find and set the schema
            const newSchema = this.fieldTypeList.find((fieldType) => fieldType.type === this.fieldSettingsValues.type);
            if (newSchema) {
                this.rightPaneActiveSchema = newSchema;
            }
        }
        // Keep existing schema if type was just removed - don't set to null
        // Force re-render to ensure UI updates
        this.requestUpdate();
    }
    removeFieldTypeEventListener(event) {
        let fields = this.cbDefinition.yaml.fields;
        // TODO: check why parent is set for Collection on level 0
        // if(event.detail.parent !== null) {
        if (event.detail.level > 0) {
            fields = event.detail.parent.fields;
        }
        fields.splice(event.detail.position, 1);
        if (event.detail.level > 0) {
            event.detail.parent.fields = fields;
        }
        else {
            this.cbDefinition.yaml.fields = fields;
        }
        this.cbDefinition = structuredClone(this.cbDefinition);
        this.fieldSettingsValues = { identifier: '', label: '', type: '' };
        this.rightPaneActiveSchema = null;
    }
    activateFieldSettings(event) {
        let fields = this.cbDefinition.yaml.fields;
        if (event.detail.parent !== null) {
            fields = event.detail.parent.fields;
        }
        const field = fields[event.detail.position];
        if (field !== undefined) {
            // Apply base field logic when activating a field
            if (event.detail.level === 0 && field.useExistingField && field.identifier) {
                const baseField = this.fieldMetadata.baseFields[field.identifier];
                if (baseField) {
                    // It's a base field - FORCE prefixFields to false
                    field.prefixFields = false;
                    // Reset prefixType since prefixing is disabled
                    field.prefixType = '';
                    field._isBaseField = true;
                    // Inject type if missing
                    if (!field.type || field._typeInjected) {
                        field.type = baseField.type;
                        field._typeInjected = true;
                    }
                }
            }
            // Validate the field when it's activated to show current validation state
            const validation = this.validateField(field, event.detail.level);
            field._validation = validation;
            // Trigger reactivity - clone FIRST
            this.cbDefinition = structuredClone(this.cbDefinition);
            // NOW get fresh references to the cloned objects
            let clonedFields = this.cbDefinition.yaml.fields;
            if (event.detail.parent !== null) {
                clonedFields = event.detail.parent.fields;
            }
            // Update fieldSettingsValues to point to the CLONED field
            this.fieldSettingsValues = { ...clonedFields[event.detail.position] };
            this.rightPaneActiveSchema = this.fieldTypeList.filter((fieldType) => fieldType.type === this.fieldSettingsValues.type)[0];
            this.rightPaneActivePosition = event.detail.position;
            this.rightPaneActiveLevel = event.detail.level;
            this.rightPaneActiveParent = event.detail.parent;
            this.requestUpdate();
        }
        else {
            this.fieldSettingsValues = { identifier: '', label: '', type: '' };
            this.rightPaneActiveSchema = null;
            this.rightPaneActivePosition = 0;
            this.rightPaneActiveLevel = 0;
            this.rightPaneActiveParent = null;
        }
    }
    handleDragEnd() {
        this.dragActive = false;
    }
    handleDragStart() {
        this.dragActive = true;
    }
    handleBasicsChanged(event) {
        const { basics } = event.detail;
        // Create new yaml object reference so LitElement detects the change
        this.cbDefinition = {
            ...this.cbDefinition,
            yaml: { ...this.cbDefinition.yaml, basics }
        };
    }
    handleSettingsChanged(event) {
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
    _initMultiStepWizard() {
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
    removeEnabledProperties(obj) {
        if (Array.isArray(obj)) {
            return obj.map(item => this.removeEnabledProperties(item));
        }
        else if (obj && typeof obj === 'object') {
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
    validateUniqueIdentifiers(fields) {
        const duplicates = [];
        const validateLevel = (fieldsAtLevel) => {
            const identifierCounts = new Map();
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
    async saveContentBlock() {
        try {
            const saveButtons = document.querySelectorAll('[data-action="save-content-block"]');
            saveButtons.forEach(button => {
                button.disabled = true;
                button.innerHTML = '<typo3-backend-icon identifier="spinner-circle" size="small"></typo3-backend-icon> Saving...';
            });
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
                // Re-enable save buttons
                saveButtons.forEach(button => {
                    button.disabled = false;
                    button.innerHTML = 'Save';
                });
                // Show error message with duplicate identifiers
                Modal.confirm('Duplicate Field Identifiers', `The following field identifiers are used multiple times at the same level: ${validation.duplicates.join(', ')}. Please ensure all field identifiers are unique within their respective levels.`, SeverityEnum.error, [{
                        text: 'OK',
                        active: true,
                        btnClass: 'btn-danger',
                        name: 'ok',
                        trigger: function () {
                            Modal.dismiss();
                        }
                    }]);
                return;
            }
            const saveData = {
                contentType: 'content-element', // TODO: make configurable to support other page-type and record-type
                extension: this.cbDefinition.hostExtension,
                mode: this.mode || 'edit', // Use edit mode by default
                name: this.cbDefinition.yaml.name,
                vendor: this.cbDefinition.yaml.vendor,
                contentBlock: {
                    fields: cleanedFields,
                    basics: this.cbDefinition.yaml.basics || [],
                    group: this.cbDefinition.yaml.group || 'default',
                    prefixFields: this.cbDefinition.yaml.prefixFields !== false,
                    prefixType: this.cbDefinition.yaml.prefixType || 'full',
                    table: this.cbDefinition.yaml.table || 'tt_content',
                    typeField: this.cbDefinition.yaml.typeField || 'CType',
                    typeName: this.cbDefinition.yaml.typeName || '',
                    priority: this.cbDefinition.yaml.priority || 0,
                    title: this.cbDefinition.yaml.title || '',
                    vendorPrefix: this.cbDefinition.yaml.vendorPrefix || ''
                }
            };
            if (this.mode === 'copy') {
                // These would need to be provided by the UI for copy operations
                saveData.contentBlock.initialVendor = this.cbDefinition.yaml.initialVendor || '';
                saveData.contentBlock.initialName = this.cbDefinition.yaml.initialName || '';
            }
            const formData = new FormData();
            Object.keys(saveData).forEach(key => {
                if (typeof saveData[key] === 'object') {
                    formData.append(key, JSON.stringify(saveData[key]));
                }
                else {
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
            Modal.confirm('Success', 'Content block has been saved successfully.', SeverityEnum.info, [{
                    text: 'OK',
                    active: true,
                    btnClass: 'btn-info',
                    name: 'ok',
                    trigger: function () {
                        Modal.dismiss();
                    }
                }]);
        }
        catch (error) {
            console.error('Failed to save content block:', error);
            // Show error message
            Modal.confirm('Error', 'Failed to save content block. Please try again.', SeverityEnum.error, [{
                    text: 'OK',
                    active: true,
                    btnClass: 'btn-danger',
                    name: 'ok',
                    trigger: function () {
                        Modal.dismiss();
                    }
                }]);
        }
        finally {
            // Restore save buttons
            const saveButtons = document.querySelectorAll('[data-action="save-content-block"]');
            saveButtons.forEach(button => {
                button.disabled = false;
                button.innerHTML = '<typo3-backend-icon identifier="actions-save"></typo3-backend-icon> Save';
            });
        }
    }
    /**
     * Save Basic via AJAX (stays in editor)
     */
    async saveBasicAjax() {
        try {
            // Get vendor and name from component state
            const vendor = this.cbDefinition.yaml.vendor?.trim() || '';
            const name = this.cbDefinition.yaml.name?.trim() || '';
            if (!vendor || !name) {
                Modal.confirm('Validation Error', 'Vendor and Name are required fields.', SeverityEnum.error, [{
                        text: 'OK',
                        active: true,
                        btnClass: 'btn-default',
                        trigger: function () {
                            Modal.dismiss();
                        }
                    }]);
                return;
            }
            // Get extension from component state
            const extension = this.cbDefinition.hostExtension;
            if (!extension || extension === '0') {
                Modal.confirm('Validation Error', 'Please select an extension.', SeverityEnum.error, [{
                        text: 'OK',
                        active: true,
                        btnClass: 'btn-default',
                        trigger: function () {
                            Modal.dismiss();
                        }
                    }]);
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
            Modal.confirm('Success', result.message || 'Basic saved successfully.', SeverityEnum.info, [{
                    text: 'OK',
                    active: true,
                    btnClass: 'btn-info',
                    name: 'ok',
                    trigger: function () {
                        Modal.dismiss();
                    }
                }]);
        }
        catch (error) {
            console.error('Failed to save basic:', error);
            let errorMessage = 'Failed to save Basic. Please try again.';
            // Try to extract error message from response
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (typeof error === 'object' && error !== null && 'message' in error) {
                errorMessage = error.message;
            }
            // Show error message
            Modal.confirm('Error', errorMessage, SeverityEnum.error, [{
                    text: 'OK',
                    active: true,
                    btnClass: 'btn-default',
                    trigger: function () {
                        Modal.dismiss();
                    }
                }]);
        }
        finally {
            // Restore save buttons
            const saveButtons = document.querySelectorAll('[data-action="save-content-block"]');
            saveButtons.forEach(button => {
                button.disabled = false;
                button.innerHTML = '<typo3-backend-icon identifier="actions-save"></typo3-backend-icon> Save';
            });
        }
    }
    /**
     * Save Basic via form POST (redirects to list with flash message)
     */
    async saveBasicAndClose() {
        try {
            // Get vendor and name from component state (not DOM, since form may not be rendered when on different tab)
            const vendor = this.cbDefinition.yaml.vendor?.trim() || '';
            const name = this.cbDefinition.yaml.name?.trim() || '';
            if (!vendor || !name) {
                Modal.confirm('Validation Error', 'Vendor and Name are required fields.', SeverityEnum.error, [{
                        text: 'OK',
                        active: true,
                        btnClass: 'btn-default',
                        trigger: function () {
                            Modal.dismiss();
                        }
                    }]);
                return;
            }
            // Get extension from component state
            const extension = this.cbDefinition.hostExtension;
            if (!extension || extension === '0') {
                Modal.confirm('Validation Error', 'Please select an extension.', SeverityEnum.error, [{
                        text: 'OK',
                        active: true,
                        btnClass: 'btn-default',
                        trigger: function () {
                            Modal.dismiss();
                        }
                    }]);
                return;
            }
            // Clean fields by removing "enabled", "_validation", "_isBaseField" properties
            const cleanedFields = this.removeEnabledProperties(this.cbDefinition.yaml.fields || []);
            // Create a hidden form and submit it for proper server-side redirect
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = TYPO3.settings.ajaxUrls.content_block_gui_api_basics_save;
            // Add form fields
            const addHiddenInput = (name, value) => {
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
        }
        catch (error) {
            console.error('Failed to save basic:', error);
            let errorMessage = 'Failed to save Basic. Please try again.';
            // Try to extract error message from response
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            else if (typeof error === 'object' && error !== null && 'message' in error) {
                errorMessage = error.message;
            }
            // Show error message
            Modal.confirm('Error', errorMessage, SeverityEnum.error, [{
                    text: 'OK',
                    active: true,
                    btnClass: 'btn-default',
                    trigger: function () {
                        Modal.dismiss();
                    }
                }]);
        }
        finally {
            // Restore save & close button (in case of client-side validation error)
            const saveAndCloseButtons = document.querySelectorAll('[data-action="save-and-close-content-block"]');
            saveAndCloseButtons.forEach(button => {
                button.disabled = false;
                button.innerHTML = '<typo3-backend-icon identifier="actions-save-close"></typo3-backend-icon> Save & Close';
            });
        }
    }
    /**
     * Save & Close dispatcher (checks content type and calls appropriate method)
     */
    async saveContentBlockAndClose() {
        // Disable both buttons during save
        const saveButtons = document.querySelectorAll('[data-action="save-content-block"]');
        const saveAndCloseButtons = document.querySelectorAll('[data-action="save-and-close-content-block"]');
        saveButtons.forEach(button => {
            button.disabled = true;
        });
        saveAndCloseButtons.forEach(button => {
            button.disabled = true;
            button.innerHTML = '<typo3-backend-icon identifier="spinner-circle" size="small"></typo3-backend-icon> Saving...';
        });
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
                Modal.confirm('Duplicate Field Identifiers', `The following field identifiers are used multiple times at the same level: ${validation.duplicates.join(', ')}. Please ensure all field identifiers are unique within their respective levels.`, SeverityEnum.error, [{
                        text: 'OK',
                        active: true,
                        btnClass: 'btn-danger',
                        name: 'ok',
                        trigger: function () {
                            Modal.dismiss();
                        }
                    }]);
                return;
            }
            // Prepare data for save
            const saveData = {
                contentType: 'content-element', // TODO: make configurable to support other page-type and record-type
                extension: this.cbDefinition.hostExtension,
                mode: this.mode || 'edit',
                name: this.cbDefinition.yaml.name,
                vendor: this.cbDefinition.yaml.vendor,
                contentBlock: {
                    fields: cleanedFields,
                    basics: this.cbDefinition.yaml.basics || [],
                    group: this.cbDefinition.yaml.group || 'default',
                    prefixFields: this.cbDefinition.yaml.prefixFields !== false,
                    prefixType: this.cbDefinition.yaml.prefixType || 'full',
                    table: this.cbDefinition.yaml.table || 'tt_content',
                    typeField: this.cbDefinition.yaml.typeField || 'CType',
                    typeName: this.cbDefinition.yaml.typeName || '',
                    priority: this.cbDefinition.yaml.priority || 0,
                    title: this.cbDefinition.yaml.title || '',
                    vendorPrefix: this.cbDefinition.yaml.vendorPrefix || ''
                }
            };
            if (this.mode === 'copy') {
                saveData.contentBlock.initialVendor = this.cbDefinition.yaml.initialVendor || '';
                saveData.contentBlock.initialName = this.cbDefinition.yaml.initialName || '';
            }
            // Create hidden form and submit for proper server-side redirect
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = TYPO3.settings.ajaxUrls.content_blocks_gui_save_cb_and_close;
            const addHiddenInput = (name, value) => {
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
                }
                else {
                    addHiddenInput(key, saveData[key]);
                }
            });
            // Append form to body and submit
            document.body.appendChild(form);
            form.submit();
            // Note: form will be removed on page navigation
        }
        finally {
            // Restore buttons (in case of error - if successful, page will redirect)
            saveButtons.forEach(button => {
                button.disabled = false;
            });
            saveAndCloseButtons.forEach(button => {
                button.disabled = false;
                button.innerHTML = '<typo3-backend-icon identifier="actions-save-close"></typo3-backend-icon> Save & Close';
            });
        }
    }
    /**
     * Find the next available index for a field type to avoid identifier collisions after deletion
     */
    getNextFieldIndex(fields, type) {
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
};
__decorate([
    property()
], ContentBlockEditor.prototype, "name", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "mode", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "contenttype", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "data", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "extensions", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "groups", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "fieldconfig", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "fieldmetadata", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "fieldSettingsValues", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "rightPaneActiveSchema", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "rightPaneActivePosition", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "rightPaneActiveLevel", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "rightPaneActiveParent", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "dragActive", void 0);
__decorate([
    property()
], ContentBlockEditor.prototype, "cbDefinition", void 0);
__decorate([
    state()
], ContentBlockEditor.prototype, "availableBasics", void 0);
ContentBlockEditor = __decorate([
    customElement('content-block-editor')
], ContentBlockEditor);
export { ContentBlockEditor };
