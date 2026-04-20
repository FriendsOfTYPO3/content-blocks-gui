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
import{LitElement as m,html as p}from"lit";import{property as i,customElement as h}from"lit/decorators.js";import{live as u}from"lit/directives/live.js";var s=function(a,e,t,l){var n=arguments.length,r=n<3?e:l===null?l=Object.getOwnPropertyDescriptor(e,t):l,c;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(a,e,t,l);else for(var d=a.length-1;d>=0;d--)(c=a[d])&&(r=(n<3?c(r):n>3?c(e,t,r):c(e,t))||r);return n>3&&r&&Object.defineProperty(e,t,r),r};let o=class extends m{constructor(){super(...arguments),this.parentPath=[],this.isAllowedCustomPropertiesEnabled=!1}render(){this.updateAllowedCustomPropertiesEnabledState();const e=this.values.allowedCustomProperties||{itemProcFunc:""};return p`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleAllowedCustomPropertiesEnabledChange}" 
              type="checkbox" 
              id="allowedCustomProperties_enabled" 
              ?checked="${u(this.isAllowedCustomPropertiesEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="allowedCustomProperties_enabled">
              Allowed Custom Properties (itemsProcFunc)
            </label>
          </div>
        </div>
        ${this.isAllowedCustomPropertiesEnabled?p`
          <div class="component-body">
            <div class="form-group mb-3">
              <label class="form-label" for="itemProcFunc">Items Proc Function</label>
              <input @blur="${this.handleItemProcFuncChange}" 
                type="text" 
                id="itemProcFunc"
                .value="${u(e.itemProcFunc||"")}" 
                class="form-control"
                placeholder="e.g., EXT:my_ext/Classes/ItemsProcFunc.php:MyClass-&gt;getItems" />
              <div class="form-text">
                Specify the itemsProcFunc for dynamic item generation.
              </div>
            </div>
          </div>
        `:""}
      </div>`}updateAllowedCustomPropertiesEnabledState(){const e=this.values.allowedCustomProperties;this.isAllowedCustomPropertiesEnabled=!!(e?.enabled||e?.itemProcFunc)}handleAllowedCustomPropertiesEnabledChange(e){e.preventDefault();const t=e.target;this.isAllowedCustomPropertiesEnabled=t.checked,t.checked?this.values.allowedCustomProperties={itemProcFunc:"",enabled:!0}:this.values.allowedCustomProperties={itemProcFunc:"",enabled:!1},this.dispatchUpdateEvent()}handleItemProcFuncChange(e){e.preventDefault();const t=e.target;this.values.allowedCustomProperties||(this.values.allowedCustomProperties={itemProcFunc:"",enabled:!0});const l=this.values.allowedCustomProperties;l.itemProcFunc=t.value,this.dispatchUpdateEvent()}dispatchUpdateEvent(){this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parentPath:this.parentPath,values:this.values}}))}createRenderRoot(){return this}};s([i()],o.prototype,"fieldTypeProperty",void 0),s([i()],o.prototype,"values",void 0),s([i()],o.prototype,"position",void 0),s([i()],o.prototype,"level",void 0),s([i({type:Array})],o.prototype,"parentPath",void 0),s([i()],o.prototype,"isAllowedCustomPropertiesEnabled",void 0),o=s([h("content-block-editor-allowed-custom-properties")],o);export{o as ContentBlockEditorAllowedCustomProperties};
