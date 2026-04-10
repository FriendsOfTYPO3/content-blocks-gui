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

import { html, LitElement, css } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import type { FieldTypeSetting, ContentBlockField } from '@friendsoftypo3/content-blocks-gui/interface/definitions';


/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <draggable-field-type></draggable-field-type>
 */


@customElement('draggable-field-type')
export class DraggableFieldType extends LitElement {

  static override styles = css`  `;

  @property()
  fieldTypeSetting?: FieldTypeSetting;

  @property()
  fieldTypeInfo?: ContentBlockField;

  @property({ type: Number })
  identifierIndex?: number = 0;

  @property({ type: Number })
  position?: number = 0;

  @property({ type: Number })
  level?: number = 0;

  @property()
  parent?: ContentBlockField = null;

  @property()
  showDeleteButton?: boolean = false;

  protected override render(): TemplateResult {
    if (this.fieldTypeSetting) {
      let identifier: string = this.fieldTypeSetting.type + '_' + this.identifierIndex;
      let renderLabel: string = this.fieldTypeSetting.type;
      if (this.fieldTypeInfo) {
        identifier = this.fieldTypeInfo.identifier;
        renderLabel = identifier + ' (' + renderLabel + ')';
      }

      return html`
        <div class="draggable-field-type d-flex gap-2 text-start btn btn-default d-block justify-content-start"
             draggable="true"
             @dragstart="${(event: DragEvent) => { this.handleDragStart(event, this.fieldTypeSetting.type, identifier); }}"
             data-identifier="${identifier}"
             @click="${() => { this.activateSettings(identifier); }}" @dragend="${ () => {this.handleDragEnd();} }"
        >
          <span class="icon-wrap">
            <typo3-backend-icon identifier="${this.fieldTypeSetting.icon}" size="small"></typo3-backend-icon>
          </span>
          <span>${renderLabel}</span>
          ${this.showDeleteButton ? html`<div class="delete-icon-wrap ms-auto" @click="${() => { this.removeFieldType(); }}">
            <typo3-backend-icon identifier="actions-delete" size="small"></typo3-backend-icon>
          </div>` : ''}
        </div>
      `;
    } else {
      return html `<p>No FieldTypeSetting</p>`;
    }
  }

  protected handleDragStart(event: DragEvent, type: string, identifier: string): void {
    const data = {
      type: type,
      identifier: identifier,
    };
    event.dataTransfer?.setData('text/plain', JSON.stringify(data));
    this.dispatchEvent(new CustomEvent('dragStart', {
      bubbles: true,
      composed: true,
    }));
  }

  protected handleDragEnd(): void {
    this.dispatchEvent(new CustomEvent('dragEnd', {
      bubbles: true,
      composed: true,
    }));
  }

  protected activateSettings(identifier: string): void {
    if (this.fieldTypeInfo) {
      this.dispatchEvent(new CustomEvent('activateSettings', {
        detail: {
          identifier: identifier,
          position: this.position - 1,
          level: this.level,
          parent: this.parent,
        },
        bubbles: true,
        composed: true,
      }));
    }
  }
  protected removeFieldType(): void {
    this.dispatchEvent(new CustomEvent('removeFieldType', {
      detail: {
        position: this.position - 1,
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
