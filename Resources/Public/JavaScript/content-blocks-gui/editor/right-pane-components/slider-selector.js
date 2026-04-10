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
import{LitElement as u,html as h}from"lit";import{property as r,customElement as v}from"lit/decorators.js";import{live as c}from"lit/directives/live.js";var d=function(a,e,t,i){var n=arguments.length,s=n<3?e:i===null?i=Object.getOwnPropertyDescriptor(e,t):i,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")s=Reflect.decorate(a,e,t,i);else for(var p=a.length-1;p>=0;p--)(o=a[p])&&(s=(n<3?o(s):n>3?o(e,t,s):o(e,t))||s);return n>3&&s&&Object.defineProperty(e,t,s),s};let l=class extends u{constructor(){super(...arguments),this.isSliderEnabled=!1}render(){return this.updateSliderEnabledState(),h`
      <div class="component-container">
        <div class="component-header">
          <div class="form-check">
            <input @change="${this.handleSliderEnabledChange}" 
              type="checkbox" 
              id="slider_enabled" 
              ?checked="${c(this.isSliderEnabled)}" 
              class="form-check-input" />
            <label class="form-check-label" for="slider_enabled">
              Slider Configuration
            </label>
          </div>
        </div>
        ${this.isSliderEnabled?h`
          <div class="component-body">
            <div class="row g-3">
              <div class="col-6">
                <label for="slider_step" class="form-label">Step</label>
                <input @blur="${this.handleSliderInputChange}" 
                  type="number" 
                  id="slider_step" 
                  step="0.1"
                  .value="${c(this.values.slider?.step||1)}"
                  class="form-control" />
              </div>
              <div class="col-6">
                <label for="slider_width" class="form-label">Width (px)</label>
                <input @blur="${this.handleSliderInputChange}" 
                  type="number" 
                  id="slider_width" 
                  .value="${c(this.values.slider?.width||100)}"
                  class="form-control" />
              </div>
            </div>
          </div>
        `:""}
      </div>`}updateSliderEnabledState(){const e=this.values.slider;e&&Object.prototype.hasOwnProperty.call(e,"enabled")?this.isSliderEnabled=!!e.enabled:e&&(e.step!==void 0||e.width!==void 0)?this.isSliderEnabled=!0:this.isSliderEnabled=!1}handleSliderEnabledChange(e){e.preventDefault();const t=e.target;this.values.slider||(this.values.slider={}),this.isSliderEnabled=t.checked;const i=this.values.slider;i.enabled=t.checked,t.checked&&(i.step===void 0&&(i.step=1),i.width===void 0&&(i.width=100)),this.dispatchUpdateEvent()}handleSliderInputChange(e){e.preventDefault();const t=e.target;this.values.slider||(this.values.slider={});const i=this.values.slider;t.id==="slider_step"?i.step=parseFloat(t.value):t.id==="slider_width"&&(i.width=parseInt(t.value,10)),this.dispatchUpdateEvent()}dispatchUpdateEvent(){this.dispatchEvent(new CustomEvent("updateCbFieldData",{bubbles:!0,composed:!0,detail:{position:this.position,level:this.level,parent:this.parent,values:this.values}}))}createRenderRoot(){return this}};d([r()],l.prototype,"fieldTypeProperty",void 0),d([r()],l.prototype,"values",void 0),d([r()],l.prototype,"position",void 0),d([r()],l.prototype,"level",void 0),d([r()],l.prototype,"parent",void 0),d([r()],l.prototype,"isSliderEnabled",void 0),l=d([v("content-block-editor-slider-selector")],l);export{l as ContentBlockEditorSliderSelector};
