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
import{LitElement as h,html as u}from"lit";import{property as i,customElement as g}from"lit/decorators.js";import{live as c}from"lit/directives/live.js";var r=function(o,e,t,n){var s=arguments.length,l=s<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,t):n,d;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")l=Reflect.decorate(o,e,t,n);else for(var p=o.length-1;p>=0;p--)(d=o[p])&&(l=(s<3?d(l):s>3?d(e,t,l):d(e,t))||l);return s>3&&l&&Object.defineProperty(e,t,l),l};let a=class extends h{constructor(){super(...arguments),this.isRangeEnabled=!1}render(){return this.updateRangeEnabledState(),u`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleRangeEnabledChange}" 
              type="checkbox" 
              id="range_enabled" 
              ?checked="${c(this.isRangeEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="range_enabled">
              Range Configuration
            </label>
          </div>
        </div>
        ${this.isRangeEnabled?u`
          <div class="component-body">
            <div class="row g-3">
              <div class="col-6">
                <label for="range_lower" class="form-label">Lower</label>
                <input @blur="${this.handleRangeInputChange}" 
                  type="number" 
                  id="range_lower" 
                  .value="${c(this.values.range?.lower||0)}"
                  class="form-control" />
              </div>
              <div class="col-6">
                <label for="range_upper" class="form-label">Upper</label>
                <input @blur="${this.handleRangeInputChange}" 
                  type="number" 
                  id="range_upper" 
                  .value="${c(this.values.range?.upper||100)}"
                  class="form-control" />
              </div>
            </div>
          </div>
        `:""}
      </div>`}updateRangeEnabledState(){const e=this.values.range;e&&Object.prototype.hasOwnProperty.call(e,"enabled")?this.isRangeEnabled=!!e.enabled:e&&(e.lower!==void 0||e.upper!==void 0)?this.isRangeEnabled=!0:this.isRangeEnabled=!1}handleRangeEnabledChange(e){e.preventDefault();const t=e.target;this.values.range||(this.values.range={}),this.isRangeEnabled=t.checked;const n=this.values.range;n.enabled=t.checked,t.checked&&(n.lower===void 0&&(n.lower=0),n.upper===void 0&&(n.upper=100)),this.dispatchUpdateEvent()}handleRangeInputChange(e){e.preventDefault();const t=e.target;this.values.range||(this.values.range={});const n=this.values.range;t.id==="range_lower"?n.lower=parseInt(t.value,10):t.id==="range_upper"&&(n.upper=parseInt(t.value,10)),this.dispatchUpdateEvent()}dispatchUpdateEvent(){this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parent:this.parent,values:this.values}}))}createRenderRoot(){return this}};r([i()],a.prototype,"fieldTypeProperty",void 0),r([i()],a.prototype,"values",void 0),r([i()],a.prototype,"position",void 0),r([i()],a.prototype,"level",void 0),r([i()],a.prototype,"parent",void 0),r([i()],a.prototype,"isRangeEnabled",void 0),a=r([g("content-block-editor-range-selector")],a);export{a as ContentBlockEditorRangeSelector};
