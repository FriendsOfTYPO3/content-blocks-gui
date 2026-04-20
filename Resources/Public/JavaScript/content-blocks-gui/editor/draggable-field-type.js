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
import{LitElement as c,css as f,html as h}from"lit";import{property as s,customElement as y}from"lit/decorators.js";import"@typo3/backend/element/icon-element.js";var o=function(p,e,t,n){var a=arguments.length,r=a<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,t):n,d;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")r=Reflect.decorate(p,e,t,n);else for(var l=p.length-1;l>=0;l--)(d=p[l])&&(r=(a<3?d(r):a>3?d(e,t,r):d(e,t))||r);return a>3&&r&&Object.defineProperty(e,t,r),r};let i=class extends c{constructor(){super(...arguments),this.identifierIndex=0,this.position=0,this.level=0,this.parentPath=[],this.showDeleteButton=!1}static{this.styles=f`  `}render(){if(this.fieldTypeSetting){let e=this.fieldTypeSetting.type+"_"+this.identifierIndex,t=this.fieldTypeSetting.type;return this.fieldTypeInfo&&(e=this.fieldTypeInfo.identifier,t=e+" ("+t+")"),h`
        <div class="draggable-field-type d-flex gap-2 text-start btn btn-default d-block justify-content-start"
             draggable="true"
             @dragstart="${n=>{this.handleDragStart(n,this.fieldTypeSetting.type,e)}}"
             data-identifier="${e}"
             @click="${()=>{this.activateSettings(e)}}" @dragend="${()=>{this.handleDragEnd()}}"
        >
          <span class="icon-wrap">
            <typo3-backend-icon identifier="${this.fieldTypeSetting.icon}" size="small"></typo3-backend-icon>
          </span>
          <span>${t}</span>
          ${this.showDeleteButton?h`<div class="delete-icon-wrap ms-auto" @click="${()=>{this.removeFieldType()}}">
            <typo3-backend-icon identifier="actions-delete" size="small"></typo3-backend-icon>
          </div>`:""}
        </div>
      `}else return h`<p>No FieldTypeSetting</p>`}handleDragStart(e,t,n){const a={type:t,identifier:n};e.dataTransfer?.setData("text/plain",JSON.stringify(a)),this.dispatchEvent(new CustomEvent("dragStart",{bubbles:!0,composed:!0}))}handleDragEnd(){this.dispatchEvent(new CustomEvent("dragEnd",{bubbles:!0,composed:!0}))}activateSettings(e){this.fieldTypeInfo&&this.dispatchEvent(new CustomEvent("activateSettings",{detail:{identifier:e,position:this.position-1,level:this.level,parentPath:this.parentPath},bubbles:!0,composed:!0}))}removeFieldType(){this.dispatchEvent(new CustomEvent("removeFieldType",{detail:{position:this.position-1,level:this.level,parentPath:this.parentPath},bubbles:!0,composed:!0}))}createRenderRoot(){return this}};o([s()],i.prototype,"fieldTypeSetting",void 0),o([s()],i.prototype,"fieldTypeInfo",void 0),o([s({type:Number})],i.prototype,"identifierIndex",void 0),o([s({type:Number})],i.prototype,"position",void 0),o([s({type:Number})],i.prototype,"level",void 0),o([s({type:Array})],i.prototype,"parentPath",void 0),o([s()],i.prototype,"showDeleteButton",void 0),i=o([y("draggable-field-type")],i);export{i as DraggableFieldType};
