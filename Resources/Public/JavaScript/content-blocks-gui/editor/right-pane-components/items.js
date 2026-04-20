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
import{LitElement as p,html as h}from"lit";import{property as o,customElement as u}from"lit/decorators.js";import{live as r}from"lit/directives/live.js";var d=function(c,e,t,a){var s=arguments.length,i=s<3?e:a===null?a=Object.getOwnPropertyDescriptor(e,t):a,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(c,e,t,a);else for(var m=c.length-1;m>=0;m--)(l=c[m])&&(i=(s<3?l(i):s>3?l(e,t,i):l(e,t))||i);return s>3&&i&&Object.defineProperty(e,t,i),i};let n=class extends p{constructor(){super(...arguments),this.parentPath=[],this.isItemsEnabled=!1}render(){this.normalizeItems(),this.updateItemsEnabledState();const t=(this.values.items||{}).items||[];return h`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleItemsEnabledChange}" 
              type="checkbox" 
              id="items_enabled" 
              ?checked="${r(this.isItemsEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="items_enabled">
              Items Configuration
            </label>
          </div>
        </div>
        ${this.isItemsEnabled?h`
          <div class="component-body">
            <div class="form-group mb-3">
              <div class="items-list">
                ${t.map((a,s)=>h`
                  <div class="item-row border rounded p-3 mb-2 position-relative">
                    <div class="row g-2">
                      <div class="col-md-5">
                        <label class="form-label">Label</label>
                        <input @blur="${this.handleItemValueChange}" 
                          type="text" 
                          data-index="${s}"
                          data-field="label"
                          .value="${r(a.label||"")}" 
                          class="form-control form-control-sm"
                          placeholder="Display label" />
                      </div>
                      <div class="col-md-5">
                        <label class="form-label">Value</label>
                        <input @blur="${this.handleItemValueChange}" 
                          type="text" 
                          data-index="${s}"
                          data-field="value"
                          .value="${r(a.value||"")}" 
                          class="form-control form-control-sm"
                          placeholder="Stored value" />
                      </div>
                      <div class="col-md-2 d-flex align-items-center justify-content-center" style="padding-top: 2rem;">
                        <button @click="${this.handleRemoveItem}" 
                          type="button" 
                          data-index="${s}"
                          class="btn btn-sm btn-outline-danger"
                          title="Remove item">
                          <typo3-backend-icon identifier="actions-delete" size="small"></typo3-backend-icon>
                        </button>
                      </div>
                    </div>
                    <div class="row g-2 mt-1">
                      <div class="col-md-5">
                        <label class="form-label">Checked Label</label>
                        <input @blur="${this.handleItemValueChange}" 
                          type="text" 
                          data-index="${s}"
                          data-field="labelChecked"
                          .value="${r(a.labelChecked||"")}" 
                          class="form-control form-control-sm"
                          placeholder="When checked" />
                      </div>
                      <div class="col-md-5">
                        <label class="form-label">Unchecked Label</label>
                        <input @blur="${this.handleItemValueChange}" 
                          type="text" 
                          data-index="${s}"
                          data-field="labelUnchecked"
                          .value="${r(a.labelUnchecked||"")}" 
                          class="form-control form-control-sm"
                          placeholder="When unchecked" />
                      </div>
                    </div>
                    <div class="row g-2 mt-2">
                      <div class="col-12">
                        <div class="form-check">
                          <input @change="${this.handleItemBooleanChange}" 
                            type="checkbox" 
                            data-index="${s}"
                            data-field="invertStateDisplay"
                            ?checked="${r(a.invertStateDisplay||!1)}" 
                            class="form-check-input"
                            id="invertStateDisplay_${s}" />
                          <label class="form-check-label" for="invertStateDisplay_${s}">
                            Invert State Display
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                `)}
              </div>
              <button @click="${this.handleAddItem}" 
                type="button" 
                class="btn btn-sm btn-outline-primary">
                <typo3-backend-icon identifier="actions-add" size="small"></typo3-backend-icon>
                Add Item
              </button>
            </div>
          </div>
        `:""}
      </div>`}normalizeItems(){Array.isArray(this.values.items)&&(this.values.items={enabled:!0,items:this.values.items})}updateItemsEnabledState(){const e=this.values.items;e&&Object.prototype.hasOwnProperty.call(e,"enabled")?this.isItemsEnabled=!!e.enabled:e?.items&&e.items.length>0?this.isItemsEnabled=!0:this.isItemsEnabled=!1}handleItemsEnabledChange(e){e.preventDefault();const t=e.target;this.values.items||(this.values.items={}),this.isItemsEnabled=t.checked;const a=this.values.items;a.enabled=t.checked,t.checked?a.items||(a.items=[{label:"",value:""}]):a.items=[],this.dispatchUpdateEvent()}handleItemValueChange(e){e.preventDefault();const t=e.target,a=parseInt(t.dataset.index,10),s=t.dataset.field;this.values.items||(this.values.items={items:[],enabled:!0});const i=this.values.items;(!i.items||!Array.isArray(i.items))&&(i.items=[]);const l=i.items;l[a]&&(l[a][s]=t.value),this.dispatchUpdateEvent()}handleItemBooleanChange(e){e.preventDefault();const t=e.target,a=parseInt(t.dataset.index,10),s=t.dataset.field;this.values.items||(this.values.items={items:[],enabled:!0});const i=this.values.items;(!i.items||!Array.isArray(i.items))&&(i.items=[]);const l=i.items;l[a]&&(l[a][s]=t.checked),this.dispatchUpdateEvent()}handleAddItem(e){e.preventDefault(),this.values.items||(this.values.items={items:[],enabled:!0});const t=this.values.items;(!t.items||!Array.isArray(t.items))&&(t.items=[]),t.items.push({label:"",value:""}),this.requestUpdate(),this.dispatchUpdateEvent()}handleRemoveItem(e){e.preventDefault();const t=e.target,a=parseInt(t.dataset.index,10),s=this.values.items;!s||!s.items||!Array.isArray(s.items)||(s.items.splice(a,1),s.items.length===0&&(this.isItemsEnabled=!1,s.enabled=!1),this.requestUpdate(),this.dispatchUpdateEvent())}dispatchUpdateEvent(){this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parentPath:this.parentPath,values:this.values}}))}createRenderRoot(){return this}};d([o()],n.prototype,"fieldTypeProperty",void 0),d([o()],n.prototype,"values",void 0),d([o()],n.prototype,"position",void 0),d([o()],n.prototype,"level",void 0),d([o({type:Array})],n.prototype,"parentPath",void 0),d([o()],n.prototype,"isItemsEnabled",void 0),n=d([u("content-block-editor-items")],n);export{n as ContentBlockEditorItems};
