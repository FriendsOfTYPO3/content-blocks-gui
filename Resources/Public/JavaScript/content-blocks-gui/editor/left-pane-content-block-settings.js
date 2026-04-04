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
import{LitElement as y,css as b,html as p}from"lit";import{property as c,customElement as x}from"lit/decorators.js";import"@typo3/backend/element/icon-element.js";var s=function(d,o,e,t){var i=arguments.length,n=i<3?o:t===null?t=Object.getOwnPropertyDescriptor(o,e):t,r;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(d,o,e,t);else for(var a=d.length-1;a>=0;a--)(r=d[a])&&(n=(i<3?r(n):i>3?r(o,e,n):r(o,e))||n);return i>3&&n&&Object.defineProperty(o,e,n),n};let l=class extends y{static{this.styles=b``}render(){const o=this.contenttype==="basic",e=this.mode==="edit";return p`
      <div class="form-group">
        <label for="extension" class="form-label">Extension</label>
        <select class="form-control" id="extension" ?disabled="${e}" @change="${this.handleInputChange}">
          <option value="0">Choose...</option>
          ${this.extensions.map(t=>p`
            <option value="${t.package}" ?selected="${t.package===this.hostExtension}">${t.extension}</option>
          `)}
        </select>
        ${e?p`
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
      ${o?"":p`
        <div class="form-group">
          <label for="title" class="form-label">Title</label>
          <input type="text" id="title" class="form-control" value="${this.contentBlockYaml.title||""}" @input="${this.handleInputChange}" />
        </div>
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
            ${this.groups.map(t=>p`
              <option value="${t.key}" ?selected="${this.getGroupSelectionState(t.key)}">${t.label}</option>
            `)}
          </select>
        </div>
        <div class="form-group">
          <label for="typeName" class="form-label">typeName</label>
          <input type="text" id="typeName" class="form-control" value="${this.contentBlockYaml.typeName||""}" @input="${this.handleInputChange}" />
        </div>
      `}
    `}getGroupSelectionState(o){return this.contentBlockYaml.group&&this.contentBlockYaml.group===o?!0:!this.contentBlockYaml.group||!this.groups.some(e=>e.key===this.contentBlockYaml.group)?o==="default":!1}createRenderRoot(){return this}handleInputChange(){const o=this.contenttype==="basic",e={},t=this.renderRoot.querySelector("#extension");t&&(e.hostExtension=t.value);const i=this.renderRoot.querySelector("#vendor"),n=this.renderRoot.querySelector("#name");if(i&&(e.vendor=i.value),n&&(e.name=n.value),!o){const r=this.renderRoot.querySelector("#title"),a=this.renderRoot.querySelector("#prefix"),f=this.renderRoot.querySelector("#prefix-type"),h=this.renderRoot.querySelector("#vendor-prefix"),u=this.renderRoot.querySelector("#priority"),m=this.renderRoot.querySelector("#group"),v=this.renderRoot.querySelector("#typeName");r&&(e.title=r.value),a&&(e.prefixFields=a.checked),f&&(e.prefixType=f.value),h&&(e.vendorPrefix=h.value),u&&(e.priority=u.value?parseInt(u.value,10):void 0),m&&(e.group=m.value),v&&(e.typeName=v.value)}this.dispatchEvent(new CustomEvent("settings-changed",{detail:{settings:e},bubbles:!0,composed:!0}))}};s([c()],l.prototype,"groups",void 0),s([c()],l.prototype,"extensions",void 0),s([c()],l.prototype,"contentBlockYaml",void 0),s([c()],l.prototype,"hostExtension",void 0),s([c()],l.prototype,"mode",void 0),s([c()],l.prototype,"contenttype",void 0),l=s([x("editor-left-pane-content-block-settings")],l);export{l as EditorLeftPaneContentBlockSettings};
