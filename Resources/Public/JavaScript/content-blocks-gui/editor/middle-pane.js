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
import { customElement, property } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import '@typo3/backend/element/icon-element.js';
import '@friendsoftypo3/content-blocks-gui/editor/dropzone-field.js';
/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <content-block-editor-middle-pane></content-block-editor-middle-pane>
 */
let ContentBlockEditorMiddlePane = class ContentBlockEditorMiddlePane extends LitElement {
    render() {
        return html `
      <style>
        .content-block-field-builder {
          min-height: 400px;
          background: var(--typo3-surface-container-low);
          border-radius: 4px;
          padding: 1rem;
          margin-top: 17px;
        }

        .field-builder-container {
          position: relative;
        }

        .initial-dropzone {
          margin-bottom: 0.5rem;
        }

        .fields-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .field-item {
          background: transparent;
        }

        .collection-container {
          display: flex;
          flex-direction: column;
        }

        .collection-field {
          border-left: 2px solid var(--typo3-surface-primary);
          border-radius: 5px;
          background: var(--typo3-surface-bright);
          margin-bottom: 0.5rem;
        }

        .collection-header {
          background: var(--typo3-surface-container-low);
          border-bottom: 1px solid var(--typo3-component-border-color);
          border-radius: 4px 4px 0 0;
        }

        .collection-body {
          padding: 0.5rem;
        }

        .collection-fields {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .field-item.collection-type {
          background: transparent;
        }

        .collection-field-item {
          background: transparent;
        }

        .collection-field-item .collection-field {
          border-left: 2px solid var(--typo3-surface-success);
          margin-left: 0.5rem;
        }

        .palette-field {
          border-left: 2px solid var(--typo3-surface-warning);
          border-radius: 5px;
          background: var(--typo3-surface-bright);
          margin-bottom: 0.5rem;
        }

        .collection-field-item .palette-field {
          border-left: 2px solid var(--typo3-surface-warning);
          margin-left: 0.5rem;
        }

        .field-component {
          position: relative;
        }

        .field-with-dropzone .field-wrapper {
          position: relative;
        }

        .field-with-dropzone .dropzone-wrapper {
          margin-top: 0.5rem;
        }

        .empty-state {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          text-align: center;
        }

        .empty-state-content {
          color: var(--typo3-text-color-variant);
        }

        .empty-state-content h4 {
          margin: 1rem 0 0.5rem 0;
          font-size: 1.1rem;
          font-weight: 500;
        }

        .empty-state-content p {
          margin: 0;
          font-size: 0.875rem;
        }


        .standard-field {
          position: relative;
        }

        [data-level="1"] {
          margin-left: 0.5rem;
        }

        [data-level="2"] {
          margin-left: 1rem;
        }

        [data-level="3"] {
          margin-left: 1.5rem;
        }

        .field-active .draggable-field-type {
          border-color: var(--typo3-component-focus-border-color) !important;
          background-color: var(--typo3-component-focus-bg) !important;
        }

        .field-active .draggable-field-type:hover {
          background-color: var(--typo3-component-hover-bg) !important;
        }
      </style>
      <div class="content-block-field-builder">
        <div class="field-builder-container">
          <div class="initial-dropzone">
            <dropzone-field position="0" level="0"></dropzone-field>
          </div>
          <div class="fields-list">
            ${this.fieldList?.map((item, index) => {
            const isActive = this.isFieldActive(index + 1, 0, null);
            return html `
                <div class=${classMap({ 'field-item': true, 'collection-type': item.type === 'Collection' || item.type === 'Palette', 'field-active': isActive })} data-field-index="${index}">
                  ${this.renderFieldArea(item, index + 1, 0, null)}
                </div>
              `;
        })}
          </div>
          ${this.fieldList?.length === 0 ? html `
            <div class="empty-state">
              <div class="empty-state-content">
                <typo3-backend-icon identifier="content-elements-container" size="large"></typo3-backend-icon>
                <h4>No fields added yet</h4>
                <p>Drag field types from the left panel to start building your content block.</p>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    }
    isFieldActive(position, level, parent) {
        return (this.activeFieldPosition === position - 1 &&
            this.activeFieldLevel === level &&
            this.activeFieldParent === parent);
    }
    renderFieldArea(cbField, position, level, parent) {
        const fieldType = this.fieldTypes?.filter((fieldType) => fieldType.type === cbField.type)[0];
        if (cbField.type === 'Collection' || cbField.type === 'Palette') {
            const containerClass = cbField.type === 'Palette' ? 'palette-field' : 'collection-field';
            return html `
        <div class="collection-container" data-level="${level}">
          <div class="${containerClass}">
            <div class="collection-header">
              ${this.renderDraggableFieldType(fieldType, cbField, position, level, parent, true, false)}
            </div>
            <div class="collection-body">
              <div class="collection-fields">
                <div class="collection-initial-dropzone">
                  ${this.renderDraggableFieldType(fieldType, cbField, 0, level + 1, cbField, false, true)}
                </div>
                ${cbField.fields?.map((field, index) => {
                const isActive = this.isFieldActive(index + 1, level + 1, cbField);
                return html `
                    <div class=${classMap({ 'collection-field-item': true, 'field-active': isActive })} data-field-index="${index}">
                      <div class=${classMap({ 'field-item': true, 'collection-type': field.type === 'Collection' || field.type === 'Palette' })} data-field-index="${index}">
                        ${this.renderFieldArea(field, index + 1, level + 1, cbField)}
                      </div>
                    </div>
                  `;
            })}
              </div>
            </div>
          </div>
          <div class="collection-footer">
            ${this.renderDraggableFieldType(fieldType, cbField, position, level, cbField, false, true)}
          </div>
        </div>
      `;
        }
        else {
            return html `
        <div class="standard-field" data-level="${level}">
          ${this.renderDraggableFieldType(fieldType, cbField, position, level, parent)}
        </div>
      `;
        }
    }
    renderDraggableFieldType(fieldType, fieldTypeInfo, position, level, parent, renderLabel = true, renderDropZone = true) {
        if (renderLabel && !renderDropZone) {
            return html `
        <div class="field-component field-only">
          <draggable-field-type
            .fieldTypeSetting="${fieldType}"
            .fieldTypeInfo="${fieldTypeInfo}"
            .position="${position}"
            .level="${level}"
            .parent="${parent}"
            showDeleteButton="true"
          ></draggable-field-type>
        </div>
      `;
        }
        if (!renderLabel && renderDropZone) {
            return html `
        <div class="field-component dropzone-only">
          <dropzone-field .position="${position}" .level="${level}" .parent="${parent}"></dropzone-field>
        </div>
      `;
        }
        return html `
      <div class="field-component field-with-dropzone">
        <div class="field-wrapper">
          <draggable-field-type
            .fieldTypeSetting="${fieldType}"
            .fieldTypeInfo="${fieldTypeInfo}"
            .position="${position}"
            .level="${level}"
            .parent="${parent}"
            showDeleteButton="true"
          ></draggable-field-type>
        </div>
        <div class="dropzone-wrapper">
          <dropzone-field .position="${position}" .level="${level}" .parent="${parent}"></dropzone-field>
        </div>
      </div>
    `;
    }
    createRenderRoot() {
        // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
        // const renderRoot = this.attachShadow({mode: 'open'});
        return this;
    }
};
__decorate([
    property()
], ContentBlockEditorMiddlePane.prototype, "fieldList", void 0);
__decorate([
    property()
], ContentBlockEditorMiddlePane.prototype, "fieldTypes", void 0);
__decorate([
    property()
], ContentBlockEditorMiddlePane.prototype, "dragActive", void 0);
__decorate([
    property()
], ContentBlockEditorMiddlePane.prototype, "position", void 0);
__decorate([
    property()
], ContentBlockEditorMiddlePane.prototype, "level", void 0);
__decorate([
    property()
], ContentBlockEditorMiddlePane.prototype, "parent", void 0);
__decorate([
    property()
], ContentBlockEditorMiddlePane.prototype, "activeFieldPosition", void 0);
__decorate([
    property()
], ContentBlockEditorMiddlePane.prototype, "activeFieldLevel", void 0);
__decorate([
    property()
], ContentBlockEditorMiddlePane.prototype, "activeFieldParent", void 0);
ContentBlockEditorMiddlePane = __decorate([
    customElement('content-block-editor-middle-pane')
], ContentBlockEditorMiddlePane);
export { ContentBlockEditorMiddlePane };
