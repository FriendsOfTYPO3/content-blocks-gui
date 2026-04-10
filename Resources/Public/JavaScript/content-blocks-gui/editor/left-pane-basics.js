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
import{LitElement as m,css as g,html as r}from"lit";import{property as p,state as b,customElement as u}from"lit/decorators.js";import"@typo3/backend/element/icon-element.js";var c=function(d,t,a,e){var s=arguments.length,i=s<3?t:e===null?e=Object.getOwnPropertyDescriptor(t,a):e,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(d,t,a,e);else for(var l=d.length-1;l>=0;l--)(n=d[l])&&(i=(s<3?n(i):s>3?n(t,a,i):n(t,a))||i);return s>3&&i&&Object.defineProperty(t,a,i),i};let o=class extends m{constructor(){super(...arguments),this.availableBasics=[],this.selectedBasics=[],this.draggedIndex=null}static{this.styles=g``}render(){const t=this.selectedBasics.map(e=>this.availableBasics.find(s=>s.identifier===e)).filter(e=>e!==void 0),a=this.availableBasics.filter(e=>!this.selectedBasics.includes(e.identifier));return r`
      <style>
        .basics-section {
          margin-bottom: 1.5rem;
        }

        .basics-section-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--typo3-text-color-base);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .basics-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .basic-item {
          display: flex;
          align-items: center;
          padding: 0.5rem 0.75rem;
          margin-bottom: 0.25rem;
          background: var(--typo3-surface-container-low);
          border: 1px solid var(--typo3-component-border-color);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .basic-item:hover {
          background: var(--typo3-component-hover-bg);
          border-color: var(--typo3-component-hover-border-color);
        }

        .basic-item.draggable {
          cursor: move;
        }

        .basic-item.dragging {
          opacity: 0.5;
        }

        .basic-item.drag-over {
          border-top: 2px solid var(--typo3-surface-primary);
        }

        .basic-item-add {
          margin-left: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: var(--typo3-surface-success);
          color: var(--typo3-surface-success-text);
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          transition: background 0.2s ease;
        }

        .basic-item-add:hover {
          background: var(--typo3-surface-success);
          filter: brightness(0.9);
        }

        .basic-item-drag-handle {
          margin-right: 0.75rem;
          color: var(--typo3-text-color-variant);
          cursor: move;
        }

        .basic-item-content {
          flex: 1;
        }

        .basic-item-identifier {
          font-weight: 500;
          color: var(--typo3-text-color-base);
        }

        .basic-item-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          margin-left: 0.5rem;
          font-size: 0.75rem;
          color: var(--typo3-surface-secondary-text);
          background: var(--typo3-surface-secondary);
          border-radius: 10px;
        }

        .basic-item-remove {
          margin-left: 0.5rem;
          padding: 0.25rem 0.5rem;
          background: var(--typo3-surface-danger);
          color: var(--typo3-surface-danger-text);
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 0.75rem;
        }

        .basic-item-remove:hover {
          background: var(--typo3-surface-danger);
          filter: brightness(0.9);
        }

        .empty-state {
          padding: 1rem;
          text-align: center;
          color: var(--typo3-text-color-variant);
          font-size: 0.875rem;
          background: var(--typo3-surface-container-low);
          border: 1px dashed var(--typo3-component-border-color);
          border-radius: 4px;
        }
      </style>

      <div class="basics-section">
        <h3 class="basics-section-title">Selected Basics (drag to reorder)</h3>
        ${t.length>0?r`
          <ul class="basics-list">
            ${t.map((e,s)=>r`
              <li
                class="basic-item draggable ${this.draggedIndex===s?"dragging":""}"
                draggable="true"
                @dragstart="${()=>this.handleDragStart(s)}"
                @dragend="${()=>this.handleDragEnd()}"
                @dragover="${i=>this.handleDragOver(i)}"
                @drop="${i=>this.handleDrop(i,s)}"
              >
                <span class="basic-item-drag-handle">
                  <typo3-backend-icon identifier="actions-move-move" size="small"></typo3-backend-icon>
                </span>
                <div class="basic-item-content">
                  <span class="basic-item-identifier">${e.identifier}</span>
                  <span class="basic-item-badge">${e.fieldCount} field${e.fieldCount!==1?"s":""}</span>
                </div>
                <button
                  class="basic-item-remove"
                  @click="${()=>this.handleRemove(e.identifier)}"
                  title="Remove ${e.identifier}"
                >
                  Remove
                </button>
              </li>
            `)}
          </ul>
        `:r`
          <div class="empty-state">
            No basics selected. Select from available basics below.
          </div>
        `}
      </div>

      <div class="basics-section">
        <h3 class="basics-section-title">Available Basics</h3>
        ${a.length>0?r`
          <ul class="basics-list">
            ${a.map(e=>r`
              <li class="basic-item">
                <div class="basic-item-content">
                  <span class="basic-item-identifier">${e.identifier}</span>
                  <span class="basic-item-badge">${e.fieldCount} field${e.fieldCount!==1?"s":""}</span>
                </div>
                <button
                  class="basic-item-add"
                  @click="${()=>this.handleAdd(e.identifier)}"
                  title="Add ${e.identifier}"
                >
                  <typo3-backend-icon identifier="actions-add" size="small"></typo3-backend-icon>
                  Add
                </button>
              </li>
            `)}
          </ul>
        `:r`
          <div class="empty-state">
            All available basics are selected.
          </div>
        `}
      </div>
    `}createRenderRoot(){return this}handleAdd(t){const a=[...this.selectedBasics,t];this.dispatchBasicsChanged(a)}handleRemove(t){const a=this.selectedBasics.filter(e=>e!==t);this.dispatchBasicsChanged(a)}handleDragStart(t){this.draggedIndex=t}handleDragEnd(){this.draggedIndex=null}handleDragOver(t){t.preventDefault(),t.dataTransfer.dropEffect="move"}handleDrop(t,a){if(t.preventDefault(),this.draggedIndex===null||this.draggedIndex===a)return;const e=[...this.selectedBasics],[s]=e.splice(this.draggedIndex,1);e.splice(a,0,s),this.dispatchBasicsChanged(e),this.draggedIndex=null}dispatchBasicsChanged(t){this.dispatchEvent(new CustomEvent("basics-changed",{detail:{basics:t},bubbles:!0,composed:!0}))}};c([p({type:Array})],o.prototype,"availableBasics",void 0),c([p({type:Array})],o.prototype,"selectedBasics",void 0),c([b()],o.prototype,"draggedIndex",void 0),o=c([u("editor-left-pane-basics")],o);export{o as EditorLeftPaneBasics};
