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
import{LitElement as h,html as p}from"lit";import{property as o,customElement as m}from"lit/decorators.js";import{live as u}from"lit/directives/live.js";var n=function(d,e,i,t){var a=arguments.length,s=a<3?e:t===null?t=Object.getOwnPropertyDescriptor(e,i):t,l;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")s=Reflect.decorate(d,e,i,t);else for(var c=d.length-1;c>=0;c--)(l=d[c])&&(s=(a<3?l(s):a>3?l(e,i,s):l(e,i))||s);return a>3&&s&&Object.defineProperty(e,i,s),s};let r=class extends h{constructor(){super(...arguments),this.parentPath=[],this.isValuePickerEnabled=!1}render(){this.updateValuePickerEnabledState();const e=this.values[this.fieldTypeProperty.name]||{items:[]};return p`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleValuePickerEnabledChange}" 
              type="checkbox" 
              id="valuePicker_enabled" 
              ?checked="${u(this.isValuePickerEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="valuePicker_enabled">
              Value Picker
            </label>
          </div>
        </div>
        ${this.isValuePickerEnabled?p`
          <div class="component-body">
            <div class="form-group">
              <label class="form-label">Items</label>
              <div class="items-list">
                ${(e.items||[]).map((i,t)=>p`
                  <div class="item-row">
                    <div class="row g-2 align-items-center">
                      <div class="col">
                        <input 
                          @blur="${this.updateValuePickerItem}" 
                          type="text" 
                          placeholder="Label" 
                          .value="${u(i[0]||"")}" 
                          class="form-control form-control-sm" 
                          data-field="${this.fieldTypeProperty.name}" 
                          data-index="${t}" 
                          data-part="label" />
                      </div>
                      <div class="col">
                        <input 
                          @blur="${this.updateValuePickerItem}" 
                          type="text" 
                          placeholder="Value" 
                          .value="${u(i[1]||"")}" 
                          class="form-control form-control-sm" 
                          data-field="${this.fieldTypeProperty.name}" 
                          data-index="${t}" 
                          data-part="value" />
                      </div>
                      <div class="col-auto">
                        <button 
                          @click="${this.removeValuePickerItem}" 
                          class="btn btn-outline-danger btn-sm" 
                          title="Remove item"
                          data-field="${this.fieldTypeProperty.name}" 
                          data-index="${t}">
                          <typo3-backend-icon identifier="actions-delete" size="small"></typo3-backend-icon>
                        </button>
                      </div>
                    </div>
                  </div>
                `)}
                <div class="add-item-row">
                  <button 
                    @click="${this.addValuePickerItem}" 
                    class="btn btn-outline-secondary btn-sm" 
                    data-field="${this.fieldTypeProperty.name}">
                    <typo3-backend-icon identifier="actions-add" size="small"></typo3-backend-icon>
                    Add Item
                  </button>
                </div>
              </div>
            </div>
          </div>
        `:""}
      </div>
    `}updateValuePickerItem(e){const i=e.target,t=this.fieldTypeProperty.name,a=parseInt(i.dataset.index,10),s=i.dataset.part;this.values[t]||(this.values[t]={items:[],enabled:!0});const l=this.values[t];l.items||(l.items=[]),l.items[a]||(l.items[a]=["",""]),l.items[a][s==="label"?0:1]=i.value,this.values[t]=l,this.dispatchUpdateEvent()}addValuePickerItem(e){e.preventDefault();const i=this.fieldTypeProperty.name;this.values[i]||(this.values[i]={items:[],enabled:!0});const t=this.values[i];t.items||(t.items=[]),t.items.push(["",""]),this.values[i]=t,this.requestUpdate(),this.dispatchUpdateEvent()}removeValuePickerItem(e){e.preventDefault();const i=e.target,t=this.fieldTypeProperty.name,a=parseInt(i.dataset.index,10),s=this.values[t];if(!s||!s.items)return;const l=s;l.items.splice(a,1),this.values[t]=l,this.requestUpdate(),this.dispatchUpdateEvent()}updateValuePickerEnabledState(){const e=this.values[this.fieldTypeProperty.name];e&&Object.prototype.hasOwnProperty.call(e,"enabled")?this.isValuePickerEnabled=!!e.enabled:e?.items&&Array.isArray(e.items)&&e.items.length>0?this.isValuePickerEnabled=!0:this.isValuePickerEnabled=!1}handleValuePickerEnabledChange(e){e.preventDefault();const i=e.target,t=this.fieldTypeProperty.name;this.values[t]||(this.values[t]={items:[]}),this.isValuePickerEnabled=i.checked;const a=this.values[t];a.enabled=i.checked,i.checked&&(a.items||(a.items=[])),this.dispatchUpdateEvent()}dispatchUpdateEvent(){this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parentPath:this.parentPath,values:this.values}}))}createRenderRoot(){return this}};n([o()],r.prototype,"fieldTypeProperty",void 0),n([o()],r.prototype,"values",void 0),n([o()],r.prototype,"position",void 0),n([o()],r.prototype,"level",void 0),n([o({type:Array})],r.prototype,"parentPath",void 0),n([o()],r.prototype,"isValuePickerEnabled",void 0),r=n([m("content-block-editor-value-picker")],r);export{r as ContentBlockEditorValuePicker};
