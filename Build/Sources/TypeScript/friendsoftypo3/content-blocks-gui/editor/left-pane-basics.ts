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
import { customElement, property, state } from 'lit/decorators.js';
import '@typo3/backend/element/icon-element.js';
import type { BasicMetadata } from '@friendsoftypo3/content-blocks-gui/interface/definitions';

/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <editor-left-pane-basics></editor-left-pane-basics>
 */
@customElement('editor-left-pane-basics')
export class EditorLeftPaneBasics extends LitElement {
  static override styles = css``;

  @property({ type: Array })
  availableBasics: Array<BasicMetadata> = [];

  @property({ type: Array })
  selectedBasics: Array<string> = [];

  @state()
  private draggedIndex: number | null = null;

  protected override render(): TemplateResult {
    const selected = this.selectedBasics.map(identifier => {
      return this.availableBasics.find(b => b.identifier === identifier);
    }).filter(b => b !== undefined) as BasicMetadata[];

    const unselected = this.availableBasics.filter(
      b => !this.selectedBasics.includes(b.identifier)
    );

    return html`
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
        ${selected.length > 0 ? html`
          <ul class="basics-list">
            ${selected.map((basic, index) => html`
              <li
                class="basic-item draggable ${this.draggedIndex === index ? 'dragging' : ''}"
                draggable="true"
                @dragstart="${() => this.handleDragStart(index)}"
                @dragend="${() => this.handleDragEnd()}"
                @dragover="${(e: DragEvent) => this.handleDragOver(e)}"
                @drop="${(e: DragEvent) => this.handleDrop(e, index)}"
              >
                <span class="basic-item-drag-handle">
                  <typo3-backend-icon identifier="actions-move-move" size="small"></typo3-backend-icon>
                </span>
                <div class="basic-item-content">
                  <span class="basic-item-identifier">${basic.identifier}</span>
                  <span class="basic-item-badge">${basic.fieldCount} field${basic.fieldCount !== 1 ? 's' : ''}</span>
                </div>
                <button
                  class="basic-item-remove"
                  @click="${() => this.handleRemove(basic.identifier)}"
                  title="Remove ${basic.identifier}"
                >
                  Remove
                </button>
              </li>
            `)}
          </ul>
        ` : html`
          <div class="empty-state">
            No basics selected. Select from available basics below.
          </div>
        `}
      </div>

      <div class="basics-section">
        <h3 class="basics-section-title">Available Basics</h3>
        ${unselected.length > 0 ? html`
          <ul class="basics-list">
            ${unselected.map(basic => html`
              <li class="basic-item">
                <div class="basic-item-content">
                  <span class="basic-item-identifier">${basic.identifier}</span>
                  <span class="basic-item-badge">${basic.fieldCount} field${basic.fieldCount !== 1 ? 's' : ''}</span>
                </div>
                <button
                  class="basic-item-add"
                  @click="${() => this.handleAdd(basic.identifier)}"
                  title="Add ${basic.identifier}"
                >
                  <typo3-backend-icon identifier="actions-add" size="small"></typo3-backend-icon>
                  Add
                </button>
              </li>
            `)}
          </ul>
        ` : html`
          <div class="empty-state">
            All available basics are selected.
          </div>
        `}
      </div>
    `;
  }

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
    // const renderRoot = this.attachShadow({mode: 'open'});
    return this;
  }

  private handleAdd(identifier: string): void {
    const updated = [...this.selectedBasics, identifier];
    this.dispatchBasicsChanged(updated);
  }

  private handleRemove(identifier: string): void {
    const updated = this.selectedBasics.filter(id => id !== identifier);
    this.dispatchBasicsChanged(updated);
  }

  private handleDragStart(index: number): void {
    this.draggedIndex = index;
  }

  private handleDragEnd(): void {
    this.draggedIndex = null;
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  }

  private handleDrop(e: DragEvent, dropIndex: number): void {
    e.preventDefault();

    if (this.draggedIndex === null || this.draggedIndex === dropIndex) {
      return;
    }

    const updated = [...this.selectedBasics];
    const [draggedItem] = updated.splice(this.draggedIndex, 1);
    updated.splice(dropIndex, 0, draggedItem);

    this.dispatchBasicsChanged(updated);
    this.draggedIndex = null;
  }

  private dispatchBasicsChanged(basics: string[]): void {
    this.dispatchEvent(new CustomEvent('basics-changed', {
      detail: { basics },
      bubbles: true,
      composed: true
    }));
  }
}
