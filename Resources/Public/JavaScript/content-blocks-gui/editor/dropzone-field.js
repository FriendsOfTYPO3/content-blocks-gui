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
import{LitElement as c,html as u}from"lit";import{property as l,customElement as v}from"lit/decorators.js";import"@typo3/backend/element/icon-element.js";var s=function(n,e,r,o){var p=arguments.length,t=p<3?e:o===null?o=Object.getOwnPropertyDescriptor(e,r):o,i;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")t=Reflect.decorate(n,e,r,o);else for(var d=n.length-1;d>=0;d--)(i=n[d])&&(t=(p<3?i(t):p>3?i(e,r,t):i(e,r))||t);return p>3&&t&&Object.defineProperty(e,r,t),t};let a=class extends c{constructor(){super(...arguments),this.position=0,this.level=0,this.parent=null}render(){return u`
        <style>
            .cb-drop-zone {
                border: 1px dashed var(--typo3-component-border-color);
                height: 20px;
                margin: 10px;
                background-color: var(--typo3-surface-container-lowest);
                transition: all 0.2s ease;

                &:focus {
                    background-color: var(--typo3-surface-container-success);
                }

                &.drag-over {
                    background-color: var(--typo3-surface-container-primary);
                    border-color: var(--typo3-surface-primary);
                    border-width: 2px;
                }
            }
        </style>
        <div id="cb-drop-zone-${this.position}"
             class="cb-drop-zone"
             @dragover="${this.handleDragOver}"
             @dragleave="${this.handleDragLeave}"
             @drop="${this.handleDrop}"
        >
        </div>
    `}handleDragOver(e){e.preventDefault(),e.currentTarget.classList.add("drag-over")}handleDragLeave(e){e.currentTarget.classList.remove("drag-over")}handleDrop(e){e.preventDefault(),e.currentTarget.classList.remove("drag-over"),this._dispatchFieldTypeDroppedEvent(e.dataTransfer?.getData("text/plain"))}_dispatchFieldTypeDroppedEvent(e){let r;try{r=JSON.parse(e)}catch(o){console.error("Failed to parse dropped field data",o);return}this.dispatchEvent(new CustomEvent("fieldTypeDropped",{detail:{data:r,position:this.position,level:this.level,parent:this.parent},bubbles:!0,composed:!0}))}createRenderRoot(){return this}};s([l({type:Number})],a.prototype,"position",void 0),s([l({type:Number})],a.prototype,"level",void 0),s([l()],a.prototype,"parent",void 0),a=s([v("dropzone-field")],a);export{a as DropzoneField};
