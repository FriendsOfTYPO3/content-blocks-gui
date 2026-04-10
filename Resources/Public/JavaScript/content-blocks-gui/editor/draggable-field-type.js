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
import{LitElement as f,css as h,html as c}from"lit";import{property as r,customElement as y}from"lit/decorators.js";import"@typo3/backend/element/icon-element.js";var s=function(l,e,t,n){var p=arguments.length,o=p<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,t):n,d;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")o=Reflect.decorate(l,e,t,n);else for(var a=l.length-1;a>=0;a--)(d=l[a])&&(o=(p<3?d(o):p>3?d(e,t,o):d(e,t))||o);return p>3&&o&&Object.defineProperty(e,t,o),o};let i=class extends f{constructor(){super(...arguments),this.identifierIndex=0,this.position=0,this.level=0,this.parent=null,this.showDeleteButton=!1}static{this.styles=h`  `}render(){if(this.fieldTypeSetting){let e=this.fieldTypeSetting.type+"_"+this.identifierIndex,t=this.fieldTypeSetting.type;return this.fieldTypeInfo&&(e=this.fieldTypeInfo.identifier,t=e+" ("+t+")"),c`
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
          ${this.showDeleteButton?c`<div class="delete-icon-wrap ms-auto" @click="${()=>{this.removeFieldType()}}">
            <typo3-backend-icon identifier="actions-delete" size="small"></typo3-backend-icon>
          </div>`:""}
        </div>
      `}else return c`<p>No FieldTypeSetting</p>`}handleDragStart(e,t,n){const p={type:t,identifier:n};e.dataTransfer?.setData("text/plain",JSON.stringify(p)),this.dispatchEvent(new CustomEvent("dragStart",{bubbles:!0,composed:!0}))}handleDragEnd(){this.dispatchEvent(new CustomEvent("dragEnd",{bubbles:!0,composed:!0}))}activateSettings(e){this.fieldTypeInfo&&this.dispatchEvent(new CustomEvent("activateSettings",{detail:{identifier:e,position:this.position-1,level:this.level,parent:this.parent},bubbles:!0,composed:!0}))}removeFieldType(){this.dispatchEvent(new CustomEvent("removeFieldType",{detail:{position:this.position-1,level:this.level,parent:this.parent},bubbles:!0,composed:!0}))}createRenderRoot(){return this}};s([r()],i.prototype,"fieldTypeSetting",void 0),s([r()],i.prototype,"fieldTypeInfo",void 0),s([r({type:Number})],i.prototype,"identifierIndex",void 0),s([r({type:Number})],i.prototype,"position",void 0),s([r({type:Number})],i.prototype,"level",void 0),s([r()],i.prototype,"parent",void 0),s([r()],i.prototype,"showDeleteButton",void 0),i=s([y("draggable-field-type")],i);export{i as DraggableFieldType};
