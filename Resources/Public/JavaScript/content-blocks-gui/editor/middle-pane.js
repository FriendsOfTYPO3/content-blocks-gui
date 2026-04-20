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
import{LitElement as g,html as n}from"lit";import{property as p,customElement as u}from"lit/decorators.js";import{classMap as m}from"lit/directives/class-map.js";import"@typo3/backend/element/icon-element.js";import"@friendsoftypo3/content-blocks-gui/editor/dropzone-field.js";var a=function(s,e,i,t){var r=arguments.length,o=r<3?e:t===null?t=Object.getOwnPropertyDescriptor(e,i):t,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(s,e,i,t);else for(var c=s.length-1;c>=0;c--)(l=s[c])&&(o=(r<3?l(o):r>3?l(e,i,o):l(e,i))||o);return r>3&&o&&Object.defineProperty(e,i,o),o};let d=class extends g{render(){return n`
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
            <dropzone-field .position="${0}" .level="${0}" .parentPath="${[]}"></dropzone-field>
          </div>
          <div class="fields-list">
            ${this.fieldList?.map((e,i)=>{const t=this.isFieldActive(i+1,0,[]);return n`
                <div class=${m({"field-item":!0,"collection-type":e.type==="Collection"||e.type==="Palette","field-active":t})} data-field-index="${i}">
                  ${this.renderFieldArea(e,i+1,0,[])}
                </div>
              `})}
          </div>
          ${this.fieldList?.length===0?n`
            <div class="empty-state">
              <div class="empty-state-content">
                <typo3-backend-icon identifier="content-elements-container" size="large"></typo3-backend-icon>
                <h4>No fields added yet</h4>
                <p>Drag field types from the left panel to start building your content block.</p>
              </div>
            </div>
          `:""}
        </div>
      </div>
    `}isFieldActive(e,i,t){return this.activeFieldPosition===e-1&&this.activeFieldLevel===i&&this.pathsEqual(this.activeFieldParentPath,t)}pathsEqual(e,i){if(!e||!i)return(!e||e.length===0)&&(!i||i.length===0);if(e.length!==i.length)return!1;for(let t=0;t<e.length;t++)if(e[t]!==i[t])return!1;return!0}renderFieldArea(e,i,t,r){const o=this.fieldTypes?.filter(l=>l.type===e.type)[0];if(e.type==="Collection"||e.type==="Palette"){const l=[...r,i-1],c=e.type==="Palette"?"palette-field":"collection-field";return n`
        <div class="collection-container" data-level="${t}">
          <div class="${c}">
            <div class="collection-header">
              ${this.renderDraggableFieldType(o,e,i,t,r,!0,!1)}
            </div>
            <div class="collection-body">
              <div class="collection-fields">
                <div class="collection-initial-dropzone">
                  ${this.renderDraggableFieldType(o,e,0,t+1,l,!1,!0)}
                </div>
                ${e.fields?.map((v,f)=>{const y=this.isFieldActive(f+1,t+1,l);return n`
                    <div class=${m({"collection-field-item":!0,"field-active":y})} data-field-index="${f}">
                      <div class=${m({"field-item":!0,"collection-type":v.type==="Collection"||v.type==="Palette"})} data-field-index="${f}">
                        ${this.renderFieldArea(v,f+1,t+1,l)}
                      </div>
                    </div>
                  `})}
              </div>
            </div>
          </div>
          <div class="collection-footer">
            ${this.renderDraggableFieldType(o,e,i,t,r,!1,!0)}
          </div>
        </div>
      `}else return n`
        <div class="standard-field" data-level="${t}">
          ${this.renderDraggableFieldType(o,e,i,t,r)}
        </div>
      `}renderDraggableFieldType(e,i,t,r,o,l=!0,c=!0){return l&&!c?n`
        <div class="field-component field-only">
          <draggable-field-type
            .fieldTypeSetting="${e}"
            .fieldTypeInfo="${i}"
            .position="${t}"
            .level="${r}"
            .parentPath="${o}"
            showDeleteButton="true"
          ></draggable-field-type>
        </div>
      `:!l&&c?n`
        <div class="field-component dropzone-only">
          <dropzone-field .position="${t}" .level="${r}" .parentPath="${o}"></dropzone-field>
        </div>
      `:n`
      <div class="field-component field-with-dropzone">
        <div class="field-wrapper">
          <draggable-field-type
            .fieldTypeSetting="${e}"
            .fieldTypeInfo="${i}"
            .position="${t}"
            .level="${r}"
            .parentPath="${o}"
            showDeleteButton="true"
          ></draggable-field-type>
        </div>
        <div class="dropzone-wrapper">
          <dropzone-field .position="${t}" .level="${r}" .parentPath="${o}"></dropzone-field>
        </div>
      </div>
    `}createRenderRoot(){return this}};a([p()],d.prototype,"fieldList",void 0),a([p()],d.prototype,"fieldTypes",void 0),a([p()],d.prototype,"dragActive",void 0),a([p()],d.prototype,"position",void 0),a([p()],d.prototype,"level",void 0),a([p()],d.prototype,"activeFieldPosition",void 0),a([p()],d.prototype,"activeFieldLevel",void 0),a([p({type:Array})],d.prototype,"activeFieldParentPath",void 0),d=a([u("content-block-editor-middle-pane")],d);export{d as ContentBlockEditorMiddlePane};
