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
import '@friendsoftypo3/content-blocks-gui/editor/draggable-field-type.js';
import type { FieldTypeSetting } from '@friendsoftypo3/content-blocks-gui/interface/definitions';

/**
 * Module: @typo3/module/web/ContentBlocksGui
 *
 * @example
 * <editor-left-pane-components></editor-left-pane-components>
 */
@customElement('editor-left-pane-components')
export class EditorLeftPaneComponents extends LitElement {
  static override styles = css``;

  @property()
  fieldTypes?: Array<FieldTypeSetting> = [
    { icon: 'form-textarea', type: 'Textarea', properties : [ { name: 'test', dataType: 'text' } ] },
    { icon: 'actions-refresh', type: 'Collection', properties : [ { name: 'test', dataType: 'text' } ] },
    { icon: 'form-checkbox', type: 'Checkbox', properties : [ { name: 'test', dataType: 'text' } ] },
  ];

  protected override render(): TemplateResult {
    return html`
      <ul class="list-unstyled row">
        ${this.fieldTypes.map( (item) => html`
              <li class="col-12 col-xl-6 col-xxl-4 mb-3">
                <draggable-field-type .fieldTypeSetting="${item}"></draggable-field-type>
              </li>` )}
      </ul>
    `;
  }

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    // @todo Switch to Shadow DOM once Bootstrap CSS style can be applied correctly
    // const renderRoot = this.attachShadow({mode: 'open'});
    return this;
  }
}
