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
import{LitElement as x,css as g,html as a}from"lit";import{property as p,customElement as $}from"lit/decorators.js";import"@typo3/backend/element/icon-element.js";var c=function(d,l,e,n){var i=arguments.length,t=i<3?l:n===null?n=Object.getOwnPropertyDescriptor(l,e):n,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")t=Reflect.decorate(d,l,e,n);else for(var o=d.length-1;o>=0;o--)(r=d[o])&&(t=(i<3?r(t):i>3?r(l,e,t):r(l,e))||t);return i>3&&t&&Object.defineProperty(l,e,t),t};let s=class extends x{static{this.styles=g``}render(){const l=this.contenttype==="basic",e=this.contenttype==="record-type",n=this.mode==="edit",i=(this.contentBlockYaml.vendor||"").replace(/-/g,""),t=(this.contentBlockYaml.name||"").replace(/-/g,""),r=i&&t?`tx_${i}_${t}`:"";return a`
      <div class="form-group">
        <label for="extension" class="form-label">Extension</label>
        <select class="form-control" id="extension" ?disabled="${n}" @change="${this.handleInputChange}">
          <option value="0">Choose...</option>
          ${this.extensions.map(o=>a`
            <option value="${o.extension}" ?selected="${o.extension===this.hostExtension}">${o.extension}</option>
          `)}
        </select>
        ${n?a`
          <div class="form-text text-muted mt-1">
            <typo3-backend-icon identifier="actions-document-info" size="small"></typo3-backend-icon>
            Extension cannot be changed in edit mode. Use "Duplicate" to copy to another extension.
          </div>
        `:""}
      </div>
      <div class="form-group">
        <label for="vendor" class="form-label">Vendor</label>
        <input type="text" id="vendor" class="form-control" value=${this.contentBlockYaml.vendor||""} @input="${this.handleInputChange}" />
      </div>
      <div class="form-group">
        <label for="name" class="form-label">Name</label>
        <input type="text" id="name" class="form-control" value=${this.contentBlockYaml.name||""} @input="${this.handleInputChange}" />
      </div>
      ${l?"":a`
        <div class="form-group">
          <label for="title" class="form-label">Title</label>
          <input type="text" id="title" class="form-control" value="${this.contentBlockYaml.title||""}" @input="${this.handleInputChange}" />
        </div>
        ${e?a`
          <div class="form-group">
            <label for="table" class="form-label">Table name <span class="text-danger">*</span></label>
            <input type="text" id="table" class="form-control" required
              value="${this.contentBlockYaml.table||r}"
              placeholder="${r||"tx_vendor_name"}"
              ?disabled="${n}"
              @input="${this.handleInputChange}" />
            <div class="form-text text-muted mt-1">
              Database table for this Record Type. Auto-suggested from vendor/name.
            </div>
            ${n?a`
              <div class="form-text text-muted mt-1">
                <typo3-backend-icon identifier="actions-document-info" size="small"></typo3-backend-icon>
                Table name cannot be changed in edit mode.
              </div>
            `:""}
          </div>
          <div class="form-group">
            <label for="labelField" class="form-label">Label field <span class="text-danger">*</span></label>
            <input type="text" id="labelField" class="form-control" required
              value="${this.contentBlockYaml.labelField||"title"}"
              placeholder="title"
              @input="${this.handleInputChange}" />
            <div class="form-text text-muted mt-1">
              Field identifier used as record label in the backend.
            </div>
          </div>
        `:""}
        <div class="form-group">
          <div class="form-check">
            <input type="checkbox" id="prefix" class="form-check-input" ?checked=${this.contentBlockYaml.prefixFields} @change="${this.handleInputChange}" />
            <label for="prefix" class="form-check-label">Prefix fields</label>
          </div>
        </div>
        <div class="form-group">
          <label for="prefix-type" class="form-label">Prefix type</label>
          <select class="form-control" id="prefix-type" @change="${this.handleInputChange}">
            <option value="">Choose...</option>
            <option value="full" ?selected="${this.contentBlockYaml.prefixType==="full"||!this.contentBlockYaml.prefixType}" >Full</option>
            <option value="vendor" ?selected="${this.contentBlockYaml.prefixType==="vendor"}" >Vendor</option>
          </select>
        </div>
        <div class="form-group">
          <label for="vendor-prefix" class="form-label">Vendor prefix</label>
          <input type="text" id="vendor-prefix" class="form-control" value="${this.contentBlockYaml.vendorPrefix||""}" @input="${this.handleInputChange}" />
        </div>
        <div class="form-group">
          <label for="priority" class="form-label">Priority</label>
          <input type="number" id="priority" class="form-control" value="${this.contentBlockYaml.priority||""}" @input="${this.handleInputChange}" />
        </div>
        <div class="form-group">
          <label for="group" class="form-label">Group</label>
          <select class="form-control" id="group" @change="${this.handleInputChange}">
            <option value="">Choose...</option>
            ${this.groups.map(o=>a`
              <option value="${o.key}" ?selected="${this.getGroupSelectionState(o.key)}">${o.label}</option>
            `)}
          </select>
        </div>
        <div class="form-group">
          <label for="typeName" class="form-label">typeName</label>
          <input type="text" id="typeName" class="form-control" value="${this.contentBlockYaml.typeName||""}" @input="${this.handleInputChange}" />
        </div>
      `}
    `}getGroupSelectionState(l){return this.contentBlockYaml.group&&this.contentBlockYaml.group===l?!0:!this.contentBlockYaml.group||!this.groups.some(e=>e.key===this.contentBlockYaml.group)?l==="default":!1}createRenderRoot(){return this}handleInputChange(){const l=this.contenttype==="basic",e={},n=this.renderRoot.querySelector("#extension");n&&(e.hostExtension=n.value);const i=this.renderRoot.querySelector("#vendor"),t=this.renderRoot.querySelector("#name");if(i&&(e.vendor=i.value),t&&(e.name=t.value),!l){const r=this.renderRoot.querySelector("#title"),o=this.renderRoot.querySelector("#prefix"),f=this.renderRoot.querySelector("#prefix-type"),m=this.renderRoot.querySelector("#vendor-prefix"),u=this.renderRoot.querySelector("#priority"),h=this.renderRoot.querySelector("#group"),v=this.renderRoot.querySelector("#typeName"),b=this.renderRoot.querySelector("#table"),y=this.renderRoot.querySelector("#labelField");r&&(e.title=r.value),o&&(e.prefixFields=o.checked),f&&(e.prefixType=f.value),m&&(e.vendorPrefix=m.value),u&&(e.priority=u.value?parseInt(u.value,10):void 0),h&&(e.group=h.value),v&&(e.typeName=v.value),b&&(e.table=b.value),y&&(e.labelField=y.value)}this.dispatchEvent(new CustomEvent("settings-changed",{detail:{settings:e},bubbles:!0,composed:!0}))}};c([p()],s.prototype,"groups",void 0),c([p()],s.prototype,"extensions",void 0),c([p()],s.prototype,"contentBlockYaml",void 0),c([p()],s.prototype,"hostExtension",void 0),c([p()],s.prototype,"mode",void 0),c([p()],s.prototype,"contenttype",void 0),s=c([$("editor-left-pane-content-block-settings")],s);export{s as EditorLeftPaneContentBlockSettings};
