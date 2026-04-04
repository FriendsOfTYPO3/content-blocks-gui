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

import { html, LitElement } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import type { ContentBlockField } from '@friendsoftypo3/content-blocks-gui/interface/definitions';

/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <dropzone-field></dropzone>
 */
@customElement('dropzone-field')
export class DropzoneField extends LitElement {

  @property({ type: Number })
  position: number = 0;
  @property({ type: Number })
  level: number = 0;
  @property()
  parent?: ContentBlockField = null;

  protected override render(): TemplateResult {
    return html`
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
    `;
  }

  protected handleDragOver(event: DragEvent): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  protected handleDragLeave(event: DragEvent): void {
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  protected handleDrop(event: DragEvent): void {
    event.preventDefault();
    const target = event.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    this._dispatchFieldTypeDroppedEvent(event.dataTransfer?.getData('text/plain'));
  }
  protected _dispatchFieldTypeDroppedEvent(data: string): void {
    let dataObject;
    try {
      dataObject = JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse dropped field data', e);
      return;
    }
    this.dispatchEvent(new CustomEvent('fieldTypeDropped', {
      detail: {
        data: dataObject,
        position: this.position,
        level: this.level,
        parent: this.parent,
      },
      bubbles: true,
      composed: true,
    }));
  }

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
    // const renderRoot = this.attachShadow({mode: 'open'});
    return this;
  }
}
