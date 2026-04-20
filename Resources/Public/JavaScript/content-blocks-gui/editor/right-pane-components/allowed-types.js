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
import{LitElement as u,html as c}from"lit";import{property as d,customElement as v}from"lit/decorators.js";import{live as h}from"lit/directives/live.js";var o=function(n,e,l,a){var s=arguments.length,t=s<3?e:a===null?a=Object.getOwnPropertyDescriptor(e,l):a,p;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")t=Reflect.decorate(n,e,l,a);else for(var r=n.length-1;r>=0;r--)(p=n[r])&&(t=(s<3?p(t):s>3?p(e,l,t):p(e,l))||t);return s>3&&t&&Object.defineProperty(e,l,t),t};let i=class extends u{constructor(){super(...arguments),this.parentPath=[],this.isAllowedTypesEnabled=!1,this.availableLinkTypes=[{value:"page",label:"Page"},{value:"url",label:"URL"},{value:"file",label:"File"},{value:"folder",label:"Folder"},{value:"email",label:"Email"},{value:"telephone",label:"Telephone"},{value:"record",label:"Record"}]}render(){this.updateAllowedTypesEnabledState();const e=this.values.allowedTypes||[];return c`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleAllowedTypesEnabledChange}" 
              type="checkbox" 
              id="allowedTypes_enabled" 
              ?checked="${h(this.isAllowedTypesEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="allowedTypes_enabled">
              Link Type Restrictions
            </label>
          </div>
        </div>
        ${this.isAllowedTypesEnabled?c`
          <div class="component-body">
            <div class="form-group">
              <label class="form-label">Allowed Link Types</label>
              <div class="link-types-grid">
                ${this.availableLinkTypes.map(l=>c`
                  <div class="form-check">
                    <input @change="${this.handleLinkTypeChange}" 
                      type="checkbox" 
                      id="linktype_${l.value}" 
                      data-value="${l.value}"
                      ?checked="${h(e.includes(l.value))}" 
                      class="form-check-input" />
                    <label class="form-check-label" for="linktype_${l.value}">
                      ${l.label}
                    </label>
                  </div>
                `)}
              </div>
            </div>
          </div>
        `:""}
      </div>`}updateAllowedTypesEnabledState(){const e=this.values.allowedTypes;this.isAllowedTypesEnabled=e&&Array.isArray(e)&&e.length>0&&!e.includes("*")}handleAllowedTypesEnabledChange(e){e.preventDefault();const l=e.target;this.isAllowedTypesEnabled=l.checked,l.checked?this.values.allowedTypes=[...this.availableLinkTypes.map(a=>a.value)]:this.values.allowedTypes=["*"],this.dispatchUpdateEvent()}handleLinkTypeChange(e){e.preventDefault();const l=e.target,a=l.dataset.value;(!this.values.allowedTypes||!Array.isArray(this.values.allowedTypes))&&(this.values.allowedTypes=[]);const s=this.values.allowedTypes;if(l.checked)s.includes(a)||s.push(a);else{const t=s.indexOf(a);t>-1&&s.splice(t,1)}s.length===0&&(this.values.allowedTypes=["*"],this.isAllowedTypesEnabled=!1),this.requestUpdate(),this.dispatchUpdateEvent()}dispatchUpdateEvent(){this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parentPath:this.parentPath,values:this.values}}))}createRenderRoot(){return this}};o([d()],i.prototype,"fieldTypeProperty",void 0),o([d()],i.prototype,"values",void 0),o([d()],i.prototype,"position",void 0),o([d()],i.prototype,"level",void 0),o([d({type:Array})],i.prototype,"parentPath",void 0),o([d()],i.prototype,"isAllowedTypesEnabled",void 0),i=o([v("content-block-editor-allowed-types")],i);export{i as ContentBlockEditorAllowedTypes};
