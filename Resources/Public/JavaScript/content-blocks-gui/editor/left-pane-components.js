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
import{LitElement as f,css as m,html as c}from"lit";import{property as d,customElement as y}from"lit/decorators.js";import"@typo3/backend/element/icon-element.js";import"@friendsoftypo3/content-blocks-gui/editor/draggable-field-type.js";var a=function(r,e,o,n){var l=arguments.length,t=l<3?e:n===null?n=Object.getOwnPropertyDescriptor(e,o):n,p;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")t=Reflect.decorate(r,e,o,n);else for(var s=r.length-1;s>=0;s--)(p=r[s])&&(t=(l<3?p(t):l>3?p(e,o,t):p(e,o))||t);return l>3&&t&&Object.defineProperty(e,o,t),t};let i=class extends f{constructor(){super(...arguments),this.fieldTypes=[{icon:"form-textarea",type:"Textarea",properties:[{name:"test",dataType:"text"}]},{icon:"actions-refresh",type:"Collection",properties:[{name:"test",dataType:"text"}]},{icon:"form-checkbox",type:"Checkbox",properties:[{name:"test",dataType:"text"}]}]}static{this.styles=m``}render(){return c`
      <ul class="list-unstyled row">
        ${this.fieldTypes.map(e=>c`
              <li class="col-12 col-xl-6 col-xxl-4 mb-3">
                <draggable-field-type .fieldTypeSetting="${e}"></draggable-field-type>
              </li>`)}
      </ul>
    `}createRenderRoot(){return this}};a([d()],i.prototype,"fieldTypes",void 0),i=a([y("editor-left-pane-components")],i);export{i as EditorLeftPaneComponents};
