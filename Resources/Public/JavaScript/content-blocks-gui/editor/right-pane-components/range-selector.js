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
import{LitElement as u,html as h}from"lit";import{property as i,customElement as g}from"lit/decorators.js";import{live as c}from"lit/directives/live.js";var r=function(o,e,t,a){var s=arguments.length,l=s<3?e:a===null?a=Object.getOwnPropertyDescriptor(e,t):a,p;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")l=Reflect.decorate(o,e,t,a);else for(var d=o.length-1;d>=0;d--)(p=o[d])&&(l=(s<3?p(l):s>3?p(e,t,l):p(e,t))||l);return s>3&&l&&Object.defineProperty(e,t,l),l};let n=class extends u{constructor(){super(...arguments),this.parentPath=[],this.isRangeEnabled=!1}render(){return this.updateRangeEnabledState(),h`
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
        ${this.isRangeEnabled?h`
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
      </div>`}updateRangeEnabledState(){const e=this.values.range;e&&Object.prototype.hasOwnProperty.call(e,"enabled")?this.isRangeEnabled=!!e.enabled:e&&(e.lower!==void 0||e.upper!==void 0)?this.isRangeEnabled=!0:this.isRangeEnabled=!1}handleRangeEnabledChange(e){e.preventDefault();const t=e.target;this.values.range||(this.values.range={}),this.isRangeEnabled=t.checked;const a=this.values.range;a.enabled=t.checked,t.checked&&(a.lower===void 0&&(a.lower=0),a.upper===void 0&&(a.upper=100)),this.dispatchUpdateEvent()}handleRangeInputChange(e){e.preventDefault();const t=e.target;this.values.range||(this.values.range={});const a=this.values.range;t.id==="range_lower"?a.lower=parseInt(t.value,10):t.id==="range_upper"&&(a.upper=parseInt(t.value,10)),this.dispatchUpdateEvent()}dispatchUpdateEvent(){this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parentPath:this.parentPath,values:this.values}}))}createRenderRoot(){return this}};r([i()],n.prototype,"fieldTypeProperty",void 0),r([i()],n.prototype,"values",void 0),r([i()],n.prototype,"position",void 0),r([i()],n.prototype,"level",void 0),r([i({type:Array})],n.prototype,"parentPath",void 0),r([i()],n.prototype,"isRangeEnabled",void 0),n=r([g("content-block-editor-range-selector")],n);export{n as ContentBlockEditorRangeSelector};
