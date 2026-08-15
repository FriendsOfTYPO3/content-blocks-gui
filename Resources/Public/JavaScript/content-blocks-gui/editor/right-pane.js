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
import{LitElement as m,html as s,nothing as v}from"lit";import{property as r,customElement as $}from"lit/decorators.js";import"@typo3/backend/element/icon-element.js";import{live as d}from"lit/directives/live.js";import"@friendsoftypo3/content-blocks-gui/editor/right-pane-components/value-picker.js";import"@friendsoftypo3/content-blocks-gui/editor/right-pane-components/range-selector.js";import"@friendsoftypo3/content-blocks-gui/editor/right-pane-components/slider-selector.js";import"@friendsoftypo3/content-blocks-gui/editor/right-pane-components/allowed-types.js";import"@friendsoftypo3/content-blocks-gui/editor/right-pane-components/allowed-custom-properties.js";import"@friendsoftypo3/content-blocks-gui/editor/right-pane-components/items.js";var o=function(h,e,t,l){var i=arguments.length,a=i<3?e:l===null?l=Object.getOwnPropertyDescriptor(e,t):l,c;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")a=Reflect.decorate(h,e,t,l);else for(var u=h.length-1;u>=0;u--)(c=h[u])&&(a=(i<3?c(a):i>3?c(e,t,a):c(e,t))||a);return i>3&&a&&Object.defineProperty(e,t,a),a},p;let n=p=class extends m{constructor(){super(...arguments),this.parentPath=[]}static normalizeIdentifier(e){return e.trim().toLowerCase().replace(/[\s/-]+/g,"_")}render(){return this.schema?s`
        <div class="content-block-field-configuration">
          <div class="field-properties">
            ${this.schema.properties.map(e=>s` ${this.renderFormFieldset(e)}`)}
          </div>
        </div>
      `:s`
      <div class="no-selection-state">
        <div class="alert alert-info">
          <strong>No field selected</strong><br>
          Please select a field to configure its properties.
        </div>
      </div>`}renderFormFieldset(e){const t=this.formatFieldLabel(e.name),l=["identifier","type","useExistingField"].includes(e.name),i=e.name==="identifier"&&this.level===0&&this.fieldMetadata&&this.contenttype!=="record-type";return s`
      <div class="form-section mb-2">
        <div class="form-section-content">
          ${e.dataType==="boolean"?s`
            <div class="form-check">
              ${this.renderFormField(e)}
              <label for="${e.name}" class="form-check-label">${t}</label>
            </div>
          `:s`
            <label for="${e.name}" class="form-label">${t}</label>
            ${this.renderFormField(e)}
          `}
          ${l?this.renderValidationBadge():""}
          ${i?this.renderBaseFieldsHelper():""}
        </div>
      </div>`}renderFormField(e){if(e.name==="type"&&this.fieldTypeList)return this.renderTypeDropdown(e);if(e.name==="identifier"&&this.values.type==="Basic"&&this.availableBasics)return this.renderBasicIdentifierDropdown(e);switch(e.dataType){case"text":return s`<input @blur="${this.dispatchBlurEvent}" type="text" id="${e.name}" .value="${d(this.values[e.name]||e.default||"")}" class="form-control" />`;case"number":return s`<input @blur="${this.dispatchBlurEvent}" type="number" id="${e.name}" .value="${d(this.values[e.name]||e.default)}" class="form-control" />`;case"select":const t=e.name==="prefixType"&&this.values.prefixFields===!1;return s`<select @change="${this.dispatchBlurEvent}" class="form-select" id="${e.name}" ?disabled="${t}">
          <option value="">Choose...</option>
          ${e.items.map(a=>s`
            <option .value="${d(a.value)}" ?selected="${d(this.values[e.name]===a.value)}">${a.label}</option>`)}
        </select>`;case"boolean":const l=e.name==="prefixFields"&&this.values._isBaseField,i=l?!1:this.values[e.name]||e.default;return s`<input @change="${this.dispatchBlurEvent}" type="checkbox" id="${e.name}" ?checked=${d(i)} ?disabled="${l}" class="form-check-input" />`;case"textarea":return s`<textarea @blur="${this.dispatchBlurEvent}" id="${e.name}" class="form-control">${d(e.default)}</textarea>`;case"array":switch(e.name){case"valuePicker":return s`<content-block-editor-value-picker
                  .fieldTypeProperty="${e}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parentPath="${this.parentPath}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-value-picker>`;case"range":return s`<content-block-editor-range-selector
                  .fieldTypeProperty="${e}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parentPath="${this.parentPath}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-range-selector>`;case"slider":return s`<content-block-editor-slider-selector
                  .fieldTypeProperty="${e}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parentPath="${this.parentPath}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-slider-selector>`;case"allowedTypes":return s`<content-block-editor-allowed-types
                  .fieldTypeProperty="${e}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parentPath="${this.parentPath}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-allowed-types>`;case"allowedCustomProperties":return s`<content-block-editor-allowed-custom-properties
                  .fieldTypeProperty="${e}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parentPath="${this.parentPath}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-allowed-custom-properties>`;case"items":return s`<content-block-editor-items
                  .fieldTypeProperty="${e}"
                  .values="${this.values}"
                  .position="${this.position}"
                  .level="${this.level}"
                  .parentPath="${this.parentPath}"
                  @updateCbFieldData="${this.dispatchUpdateEvent}">
                </content-block-editor-items>`;default:return s`Array field type for property ${e.name} is not yet implemented.`}default:return s`Unknown field type property ${e.name}.`}}dispatchUpdateEvent(){this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parentPath:this.parentPath,values:this.values}}))}formatFieldLabel(e){return e.replace(/([A-Z])/g," $1").replace(/^./,t=>t.toUpperCase()).trim()}dispatchBlurEvent(e){e.preventDefault();const t=e.target;if(t.id==="identifier"&&t.type==="text"){const l=p.normalizeIdentifier(t.value);t.value=l}this.values[t.id]=t.type==="checkbox"?t.checked:t.value,this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parentPath:this.parentPath,values:this.values}}))}renderTypeDropdown(e){const t=[...this.fieldTypeList].sort((a,c)=>a.type.localeCompare(c.type)),l=this.values[e.name]||"",i=this.values._isBaseField||!1;return s`
      <select
        @change="${this.handleTypeChange}"
        class="form-select"
        id="${e.name}"
        ?disabled="${i}"
      >
        <option value="">Choose...</option>
        ${t.map(a=>s`
          <option
            value="${a.type}"
            ?selected="${l===a.type}"
          >
            ${a.type}
          </option>
        `)}
      </select>
    `}handleTypeChange(e){e.preventDefault();const l=e.target.value;this.values.type=l,this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parentPath:this.parentPath,values:this.values,typeChanged:!0,newType:l}}))}renderValidationBadge(){const e=this.values._validation;if(!e||!e.message)return v;const t={success:"alert-success",warning:"alert-warning",error:"alert-danger",info:"alert-info"},l={success:"actions-check",warning:"actions-exclamation",error:"actions-close",info:"actions-info"},i=t[e.severity]||"alert-info",a=l[e.severity]||"actions-info";return s`
      <div class="alert ${i} mt-2 mb-0 py-1 px-2 d-flex align-items-center" role="alert">
        <typo3-backend-icon identifier="${a}" size="small" class="me-1"></typo3-backend-icon>
        <small>${e.message}</small>
      </div>
    `}renderBaseFieldsHelper(){if(!this.fieldMetadata||!this.fieldMetadata.baseFields)return v;const e=this.fieldMetadata.systemReservedFields||[],t=Array.isArray(e)?e:Object.values(e),l=Object.entries(this.fieldMetadata.baseFields).filter(([i])=>!t.includes(i)).sort(([i],[a])=>i.localeCompare(a));return s`
      <div class="mt-2">
        <label class="form-label text-muted small">Or choose from existing base fields:</label>
        <select
          class="form-select form-select-sm"
          @change="${this.handleBaseFieldSelection}"
          .value="${""}">
          <option value="">Select a base field...</option>
          ${l.map(([i,a])=>s`
            <option value="${i}">
              ${i} (${a.type})
            </option>
          `)}
        </select>
        <small class="form-text text-muted">
          Base fields are reusable TCA columns like header, bodytext, etc.
        </small>
      </div>
    `}handleBaseFieldSelection(e){const t=e.target,l=t.value;l&&(this.values.identifier=l,this.values.useExistingField=!0,t.value="",this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parentPath:this.parentPath,values:this.values}})))}renderBasicIdentifierDropdown(e){const t=this.values[e.name]||"",l=[...this.availableBasics||[]].sort((i,a)=>i.identifier.localeCompare(a.identifier));return s`
      <select
        @change="${this.dispatchBlurEvent}"
        class="form-select"
        id="${e.name}"
      >
        <option value="">Choose a Basic...</option>
        ${l.map(i=>s`
          <option
            value="${i.identifier}"
            ?selected="${t===i.identifier}"
          >
            ${i.identifier} (${i.fieldCount} fields)
          </option>
        `)}
      </select>
      <small class="form-text text-muted mt-1">
        Select a pre-defined Basic (field mixin) to include in this Content Block.
      </small>
    `}createRenderRoot(){return this}};o([r()],n.prototype,"values",void 0),o([r()],n.prototype,"schema",void 0),o([r({type:Number})],n.prototype,"position",void 0),o([r({type:Number})],n.prototype,"level",void 0),o([r({type:Array})],n.prototype,"parentPath",void 0),o([r()],n.prototype,"fieldTypeList",void 0),o([r()],n.prototype,"fieldMetadata",void 0),o([r()],n.prototype,"availableBasics",void 0),o([r()],n.prototype,"contenttype",void 0),n=p=o([$("content-block-editor-right-pane")],n);export{n as ContentBlockEditorRightPane};
