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
import{LitElement as E,html as l}from"lit";import{live as U}from"lit/directives/live.js";import{state as k,customElement as M}from"lit/decorators.js";import L from"@typo3/core/ajax/ajax-request.js";import b from"@typo3/backend/modal.js";import{lll as C}from"@typo3/core/lit-helper.js";import{SeverityEnum as x}from"@typo3/backend/enum/severity.js";import"@typo3/backend/element/icon-element.js";import"@friendsoftypo3/content-blocks-gui/upload.js";var f=function(S,e,t,a){var s=arguments.length,i=s<3?e:a===null?a=Object.getOwnPropertyDescriptor(e,t):a,n;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")i=Reflect.decorate(S,e,t,a);else for(var r=S.length-1;r>=0;r--)(n=S[r])&&(i=(s<3?n(i):s>3?n(e,t,i):n(e,t))||i);return s>3&&i&&Object.defineProperty(e,t,i),i};let m=class extends E{constructor(){super(...arguments),this.activeTab="content-element",this.searchTerm="",this.items=[],this.counts={},this.isLoading=!1,this.sortField="name",this.sortDirection="asc",this.availableExtensions=[],this.selectionMode=!1,this.selectedBlocks=new Set,this.debounceTimeout=null,this.handleUploadButtonClick=e=>{e.target.closest('[data-action="upload-content-blocks"]')&&(e.preventDefault(),this.openUploadModal())}}connectedCallback(){super.connectedCallback();const e=this.getAttribute("data-available-extensions");if(e)try{this.availableExtensions=JSON.parse(e)}catch(t){console.error("Failed to parse available extensions:",t),this.availableExtensions=[]}document.addEventListener("click",this.handleUploadButtonClick),this.loadStateFromUrl(),this.loadContentBlocks(this.activeTab)}disconnectedCallback(){super.disconnectedCallback(),document.removeEventListener("click",this.handleUploadButtonClick)}createRenderRoot(){return this}render(){return l`
      <div class="content-block-list-view">
        <!-- Search Bar -->
        <div class="row mb-3">
          <div class="col-md-6">
            <div class="form-group">
              <input
                type="search"
                class="form-control"
                placeholder="Search content blocks (min. 3 characters)..."
                .value="${this.searchTerm}"
                @input="${this.handleSearchInput}"
              />
              ${this.searchTerm.length>0&&this.searchTerm.length<3?l`
                <small class="form-text text-muted">Enter at least 3 characters to search</small>
              `:""}
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <ul class="nav nav-tabs mb-3" role="tablist">
          ${this.renderTab("content-element","Content Elements")}
          ${this.renderTab("page-type","Page Types")}
          ${this.renderTab("record-type","Record Types")}
          ${this.renderTab("basic","Basics")}
        </ul>

        <!-- Loading State -->
        ${this.isLoading?l`
          <div class="alert alert-info">
            <typo3-backend-icon identifier="spinner-circle" size="small"></typo3-backend-icon>
            Loading...
          </div>
        `:""}

        <!-- Content -->
        ${this.isLoading?"":this.renderContent()}
      </div>
    `}renderTab(e,t){const a=this.counts[e]||0,s=this.activeTab===e;return l`
      <li class="nav-item" role="presentation">
        <button
          class="nav-link ${s?"active":""}"
          @click="${()=>this.switchTab(e)}"
          role="tab"
          aria-selected="${s}">
          ${t}
          <span class="badge bg-primary ms-2" style="color: white;">${a}</span>
        </button>
      </li>
    `}renderToolbar(){return l`
      <div class="btn-toolbar mb-3" role="toolbar">
        <button
          class="btn ${this.selectionMode?"btn-warning":"btn-default"}"
          @click="${this.toggleSelectionMode}"
          title="${this.selectionMode?"Cancel Selection":"Select Multiple for Download"}">
          <typo3-backend-icon identifier="${this.selectionMode?"actions-close":"actions-check-square"}" size="small"></typo3-backend-icon>
          ${this.selectionMode?"Cancel Selection":"Select Multiple"}
        </button>

        ${this.selectionMode?l`
          <button
            class="btn btn-primary ms-2"
            @click="${this.handleMultiDownload}"
            ?disabled="${this.selectedBlocks.size===0}"
            title="Download ${this.selectedBlocks.size} selected block(s)">
            <typo3-backend-icon identifier="actions-download" size="small"></typo3-backend-icon>
            Download Selected (${this.selectedBlocks.size})
          </button>
        `:""}
      </div>
    `}renderContent(){const e=this.getFilteredAndSortedItems();return e.length===0?this.renderEmptyState():l`
      ${this.renderToolbar()}
      <div class="list-table-container">
        <div class="table-fit">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                ${this.selectionMode?l`<th style="width: 40px;"><input type="checkbox" @change="${this.toggleAllSelection}" .checked="${this.areAllVisibleSelected()}" .indeterminate="${this.areSomeVisibleSelected()&&!this.areAllVisibleSelected()}" /></th>`:""}
                <th></th>
                <th class="sortable" @click="${()=>this.handleSort("name")}" style="cursor: pointer;">
                  Content Block name
                  ${this.sortField==="name"?l`
                    <span class="text-primary">${this.sortDirection==="asc"?" \u25B2":" \u25BC"}</span>
                  `:""}
                </th>
                <th class="sortable" @click="${()=>this.handleSort("label")}" style="cursor: pointer;">
                  Label
                  ${this.sortField==="label"?l`
                    <span class="text-primary">${this.sortDirection==="asc"?" \u25B2":" \u25BC"}</span>
                  `:""}
                </th>
                <th class="sortable" @click="${()=>this.handleSort("extension")}" style="cursor: pointer;">
                  Extension
                  ${this.sortField==="extension"?l`
                    <span class="text-primary">${this.sortDirection==="asc"?" \u25B2":" \u25BC"}</span>
                  `:""}
                </th>
                ${this.activeTab!=="basic"?l`<th>References</th>`:""}
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${e.map(t=>this.renderRow(t))}
            </tbody>
          </table>
        </div>
      </div>
    `}getTypeName(){return{"content-element":"Content Element","page-type":"Page Type","record-type":"Record Type",basic:"Basic"}[this.activeTab]||"Content Block"}renderRow(e){const t=this.getTypeName(),a=`${this.activeTab}:${e.name}`,s=this.selectedBlocks.has(a);return l`
      <tr>
        ${this.selectionMode?l`
          <td class="col-checkbox">
            <input
              type="checkbox"
              .checked="${U(s)}"
              @change="${()=>this.toggleBlockSelection(e.name,this.activeTab)}"
            />
          </td>
        `:""}
        <td class="col-icon">
          ${e.icon?l`
            <typo3-backend-icon identifier="${e.icon}" size="small"></typo3-backend-icon>
          `:l`
            <typo3-backend-icon identifier="content-extension" size="small"></typo3-backend-icon>
          `}
        </td>
        <td class="col">
          ${e.editUrl?l`
            <a href="${e.editUrl}" title="Edit ${t}: ${e.name}">${e.name}</a>
          `:e.name}
        </td>
        <td class="col">
          ${e.editUrl?l`
            <a href="${e.editUrl}" title="Edit ${t}: ${e.name}">${e.label}</a>
          `:e.label}
        </td>
        <td><code>${e.extension}</code></td>
        ${this.activeTab!=="basic"?l`
          <td>
            <span class="badge badge-default">
              ${e.usages||0} References
            </span>
          </td>
        `:""}
        <td class="col-control">
          <div class="btn-group" role="group">
            ${e.editUrl?l`
              <a class="btn btn-default" href="${e.editUrl}" title="Edit this ${t}">
                <typo3-backend-icon identifier="actions-open"></typo3-backend-icon>
              </a>
            `:""}
            ${e.duplicateUrl?l`
              <button class="btn btn-default"
                      title="Duplicate this ${t}"
                      @click="${()=>this.handleDuplicate(e)}">
                <typo3-backend-icon identifier="actions-duplicate"></typo3-backend-icon>
              </button>
            `:""}
            <button class="btn btn-default"
                    title="Download this ${t}"
                    @click="${()=>this.handleDownload(e.name)}">
              <typo3-backend-icon identifier="actions-download"></typo3-backend-icon>
            </button>
            ${e.deleteUrl?l`
              <button class="btn btn-default"
                      title="Delete this ${t}"
                      @click="${()=>this.handleDelete(e.deleteUrl)}">
                <typo3-backend-icon identifier="actions-delete"></typo3-backend-icon>
              </button>
            `:""}
          </div>
        </td>
      </tr>
    `}renderEmptyState(){return this.searchTerm.length>0?l`
        <div class="alert alert-warning">
          No results found for "${this.searchTerm}"
        </div>
      `:l`
      <div class="alert alert-info">
        No content blocks available
      </div>
    `}getFilteredAndSortedItems(){let e=this.items;if(this.searchTerm.length>=3){const t=this.searchTerm.toLowerCase();e=e.filter(a=>a.name.toLowerCase().includes(t)||a.label.toLowerCase().includes(t)||a.extension.toLowerCase().includes(t))}return e.sort((t,a)=>{const s=t[this.sortField]||"",i=a[this.sortField]||"",n=s.localeCompare(i);return this.sortDirection==="asc"?n:-n}),e}async switchTab(e){e!==this.activeTab&&(this.activeTab=e,this.updateUrl(),await this.loadContentBlocks(e))}async loadContentBlocks(e){this.isLoading=!0;try{const t=TYPO3.settings.ajaxUrls.content_blocks_gui_list_by_type,s=await(await new L(t).withQueryArguments({type:e}).get()).resolve();this.items=s.items,this.counts=s.counts}catch(t){console.error("Failed to load content blocks:",t),this.items=[]}finally{this.isLoading=!1}}handleSearchInput(e){const t=e.target;this.searchTerm=t.value,this.debounceTimeout!==null&&clearTimeout(this.debounceTimeout),this.debounceTimeout=window.setTimeout(()=>{this.updateUrl(),this.requestUpdate()},300)}handleSort(e){this.sortField===e?this.sortDirection=this.sortDirection==="asc"?"desc":"asc":(this.sortField=e,this.sortDirection="asc"),this.updateUrl(),this.requestUpdate()}updateUrl(){const e=new URLSearchParams;e.set("type",this.activeTab),this.searchTerm.length>=3&&e.set("search",this.searchTerm),(this.sortField!=="name"||this.sortDirection!=="asc")&&e.set("sort",`${this.sortField}:${this.sortDirection}`);const t=`${window.location.pathname}?${e.toString()}`;window.history.pushState({},"",t)}loadStateFromUrl(){const e=new URLSearchParams(window.location.search),t=e.get("type");t&&(this.activeTab=t);const a=e.get("search");a&&(this.searchTerm=a);const s=e.get("sort");if(s){const[i,n]=s.split(":");this.sortField=i,this.sortDirection=n||"asc"}}handleDownload(e){const t=this.activeTab==="basic",a=t?TYPO3.settings.ajaxUrls.content_blocks_gui_download_basic:TYPO3.settings.ajaxUrls.content_blocks_gui_download_cb,s=t?{identifier:e}:{name:e};new L(a).post(s,{headers:{"Content-Type":"application/json",Accept:"application/zip"}}).then(async i=>{const n=i.raw(),r=await n.blob(),u=n.headers.get("content-disposition");let o=e+".zip";if(u){const h=u.match(/filename="?([^"]+)"?/);h&&h.length>1&&(o=h[1])}o=o.replace(/"+$/,"");const c=window.URL.createObjectURL(r),d=document.createElement("a");d.href=c,d.setAttribute("download",o),document.body.appendChild(d),d.click()}).catch(i=>{console.error(i)})}handleDelete(e){const t=b.confirm(C("make.remove.confirm.title"),C("make.remove.confirm.message"),x.warning,[{text:C("make.remove.button.close"),active:!0,btnClass:"btn-default",name:"cancel"},{text:C("make.remove.button.ok"),btnClass:"btn-warning remove-button",name:"delete"}]);t.addEventListener("button.clicked",a=>{if(a.target.getAttribute("name")==="delete"){const i=new URL(e,window.location.origin);i.searchParams.set("returnTab",this.activeTab),window.location.href=i.toString()}t.hideModal()})}handleDuplicate(e){if(this.activeTab==="basic"){this.handleDuplicateBasic(e);return}const t=e.name.split("/"),a=t[0]||"",s=t[1]||"",i=e.contentType==="RECORD_TYPE"&&e.typeField;let n="";this.availableExtensions.forEach(c=>{const d=c.extension===e.extension?"selected":"";n+=`<option value="${c.extension}" ${d}>${c.package} (${c.extension})</option>`});const r=document.createElement("div");let u="";i&&(u=`
        <div class="alert alert-info mb-3">
          <strong>RecordType Duplication</strong><br>
          This is a multi-type RecordType sharing table <code>${e.tableName}</code>.<br>
          Choose how to duplicate it:
        </div>
        <div class="form-group mb-3">
          <label class="form-label">Duplication Strategy</label>
          <div class="form-check">
            <input class="form-check-input" type="radio" name="duplicationStrategy" id="strategy-shared-table" value="shared-table" checked>
            <label class="form-check-label" for="strategy-shared-table">
              <strong>Add as new type to shared table</strong><br>
              <small class="text-muted">Keeps the same table and typeField, creates a new typeName</small>
            </label>
          </div>
          <div class="form-check mt-2">
            <input class="form-check-input" type="radio" name="duplicationStrategy" id="strategy-new-table" value="new-table">
            <label class="form-check-label" for="strategy-new-table">
              <strong>Create independent RecordType with new table</strong><br>
              <small class="text-muted">Creates a new database table, removes typeField/typeName</small>
            </label>
          </div>
        </div>
        <div id="strategy-fields-container"></div>
      `),r.innerHTML=`
      <form id="duplicate-content-block-form">
        ${u}
        <div class="form-group mb-3">
          <label for="duplicate-extension" class="form-label">Extension</label>
          <select class="form-control form-select" id="duplicate-extension" name="extension" required>
            ${n}
          </select>
          <div class="form-text">The extension where the duplicated content block will be stored</div>
        </div>
        <div class="form-group mb-3">
          <label for="duplicate-vendor" class="form-label">Vendor Name</label>
          <input type="text" class="form-control" id="duplicate-vendor" name="vendor" value="${a}" required pattern="[a-z0-9\\-]+">
          <div class="form-text">Lowercase letters, numbers, and hyphens only</div>
        </div>
        <div class="form-group mb-3">
          <label for="duplicate-name" class="form-label">Content Block Name</label>
          <input type="text" class="form-control" id="duplicate-name" name="name" value="${s}-copy" required pattern="[a-z0-9\\-]+">
          <div class="form-text">Lowercase letters, numbers, and hyphens only</div>
          <div id="duplicate-name-error" class="text-danger d-none">The new name must be different from the original</div>
        </div>
      </form>
    `;const o=b.advanced({title:"Duplicate Content Block",content:r,severity:x.info,size:b.sizes.medium,buttons:[{text:"Cancel",active:!0,btnClass:"btn-default",name:"cancel",trigger:()=>{o.hideModal()}},{text:"Duplicate",btnClass:"btn-primary",name:"duplicate",trigger:()=>{this.validateAndSubmitDuplicate(e,a,s,o)&&o.hideModal()}}]});if(i){const c=o.querySelector("#strategy-shared-table"),d=o.querySelector("#strategy-new-table"),h=o.querySelector("#strategy-fields-container"),v=()=>{const y=c?.checked?"shared-table":"new-table",p=o.querySelector("#duplicate-vendor")?.value||a,$=o.querySelector("#duplicate-name")?.value||s,w=`${p}_${$}`.toLowerCase().replace(/[/-]/g,"_");y==="shared-table"?h.innerHTML=`
            <div class="form-group mb-3">
              <label for="custom-type-name" class="form-label">Type Name</label>
              <input type="text" class="form-control" id="custom-type-name" name="typeName" value="${w}" required pattern="[a-zA-Z0-9_]+">
              <div class="form-text">Unique identifier for this type in the shared table</div>
              <div id="type-name-validation" class="mt-2"></div>
            </div>
          `:h.innerHTML=`
            <div class="form-group mb-3">
              <label for="custom-table-name" class="form-label">Table Name</label>
              <input type="text" class="form-control" id="custom-table-name" name="tableName" value="tx_${w}" required pattern="[a-zA-Z][a-zA-Z0-9_]*">
              <div class="form-text">Database table name (should start with tx_)</div>
              <div id="table-name-validation" class="mt-2"></div>
            </div>
          `,this.setupRecordTypeValidation(e,o)};c?.addEventListener("change",v),d?.addEventListener("change",v),v()}}setupRecordTypeValidation(e,t){const a=t.querySelector("#strategy-shared-table");let s;const i=500,n=async()=>{const c=t.querySelector("#custom-type-name"),d=t.querySelector("#custom-table-name"),h=t.querySelector("#type-name-validation"),v=t.querySelector("#table-name-validation"),y=a?.checked?"shared-table":"new-table",p=y==="shared-table"?c?.value:d?.value,$=y==="shared-table"?h:v,w=y==="shared-table"?c:d;if(!(!p||!$||!w)){$.innerHTML='<small class="text-muted">Validating...</small>';try{const g=new URL(window.TYPO3.settings.ajaxUrls.content_blocks_gui_validate_record_duplication,window.location.origin);g.searchParams.append("sourceName",e.name),g.searchParams.append("duplicationStrategy",y),y==="shared-table"?g.searchParams.append("typeName",p):g.searchParams.append("tableName",p);const D=await(await new L(g.toString()).get()).resolve();if(D.valid)$.innerHTML='<small class="text-success">\u2713 Valid</small>',w.classList.remove("is-invalid"),w.classList.add("is-valid");else{const B=D.errors.join("<br>");$.innerHTML=`<small class="text-danger">${B}</small>`,w.classList.remove("is-valid"),w.classList.add("is-invalid")}}catch(g){console.error("[ContentBlockList] Validation error:",g),$.innerHTML='<small class="text-danger">Validation failed</small>'}}},r=t.querySelector("#custom-type-name"),u=t.querySelector("#custom-table-name"),o=()=>{clearTimeout(s),s=window.setTimeout(n,i)};r?.addEventListener("input",o),u?.addEventListener("input",o),n()}handleDuplicateBasic(e){let t="";this.availableExtensions.forEach(i=>{const n=i.extension===e.extension?"selected":"";t+=`<option value="${i.extension}" ${n}>${i.package} (${i.extension})</option>`});const a=document.createElement("div");a.innerHTML=`
      <form id="duplicate-basic-form">
        <div class="alert alert-info mb-3">
          <strong>Basic Duplication</strong><br>
          Duplicating Basic: <code>${e.name}</code>
        </div>
        <div class="form-group mb-3">
          <label for="duplicate-extension" class="form-label">Extension</label>
          <select class="form-control form-select" id="duplicate-extension" name="extension" required>
            ${t}
          </select>
          <div class="form-text">The extension where the duplicated basic will be stored</div>
        </div>
        <div class="form-group mb-3">
          <label for="duplicate-identifier" class="form-label">Basic Identifier</label>
          <input type="text" class="form-control" id="duplicate-identifier" name="identifier" value="${e.name}-copy" required pattern="[a-z0-9\\-\\/]+">
          <div class="form-text">Format: vendor/name (e.g., basic-99/basic-99-copy)</div>
          <div id="duplicate-identifier-error" class="text-danger d-none">The new identifier must be different from the original</div>
        </div>
      </form>
    `;const s=b.advanced({title:"Duplicate Basic",content:a,severity:x.info,size:b.sizes.medium,buttons:[{text:"Cancel",active:!0,btnClass:"btn-default",name:"cancel",trigger:()=>{s.hideModal()}},{text:"Duplicate",btnClass:"btn-primary",name:"duplicate",trigger:()=>{this.validateAndSubmitDuplicateBasic(e.name,e.duplicateUrl,s)&&s.hideModal()}}]})}validateAndSubmitDuplicateBasic(e,t,a){const s=a.querySelector("#duplicate-basic-form");if(!s)return!1;const i=a.querySelector("#duplicate-extension"),n=a.querySelector("#duplicate-identifier"),r=a.querySelector("#duplicate-identifier-error"),u=i?.value,o=n?.value;if(!u||!o)return console.error("[ContentBlockList] Missing form values"),!1;if(!/^[a-z0-9/-]+$/.test(o))return console.error("[ContentBlockList] Invalid pattern"),s.checkValidity()||s.reportValidity(),!1;if(o===e)return r&&r.classList.remove("d-none"),n&&(n.classList.add("is-invalid"),n.focus()),!1;r&&r.classList.add("d-none"),n&&n.classList.remove("is-invalid");const d=new URL(t,window.location.origin);return d.searchParams.append("targetExtension",u),d.searchParams.append("targetIdentifier",o),d.searchParams.append("returnTab",this.activeTab),window.location.href=d.toString(),!0}validateAndSubmitDuplicate(e,t,a,s){const i=s.querySelector("#duplicate-content-block-form");if(!i)return!1;const n=s.querySelector("#duplicate-extension"),r=s.querySelector("#duplicate-vendor"),u=s.querySelector("#duplicate-name"),o=s.querySelector("#duplicate-name-error"),c=s.querySelector("#duplicate-name"),d=n?.value,h=r?.value,v=u?.value;if(!d||!h||!v)return console.error("[ContentBlockList] Missing form values"),!1;const y=/^[a-z0-9-]+$/;if(!y.test(h)||!y.test(v))return console.error("[ContentBlockList] Invalid pattern"),i.checkValidity()||i.reportValidity(),!1;if(h===t&&v===a)return o&&o.classList.remove("d-none"),c&&(c.classList.add("is-invalid"),c.focus()),!1;o&&o.classList.add("d-none"),c&&c.classList.remove("is-invalid");const p=new URL(e.duplicateUrl,window.location.origin);if(p.searchParams.append("targetExtension",d),p.searchParams.append("targetVendor",h),p.searchParams.append("targetName",v),e.contentType==="RECORD_TYPE"&&e.typeField){const g=s.querySelector("#strategy-shared-table")?.checked?"shared-table":"new-table";if(p.searchParams.append("duplicationStrategy",g),g==="shared-table"){const T=s.querySelector("#custom-type-name");T?.value&&p.searchParams.append("customTypeName",T.value)}else{const T=s.querySelector("#custom-table-name");T?.value&&p.searchParams.append("customTableName",T.value)}}return p.searchParams.append("returnTab",this.activeTab),window.location.href=p.toString(),!0}toggleSelectionMode(){this.selectionMode=!this.selectionMode,this.selectionMode||this.selectedBlocks.clear()}toggleBlockSelection(e,t){const a=`${t}:${e}`;this.selectedBlocks.has(a)?this.selectedBlocks.delete(a):this.selectedBlocks.add(a),this.requestUpdate()}toggleAllSelection(){const e=this.getFilteredAndSortedItems().map(t=>`${this.activeTab}:${t.name}`);this.areAllVisibleSelected()?e.forEach(t=>this.selectedBlocks.delete(t)):e.forEach(t=>this.selectedBlocks.add(t)),this.requestUpdate()}areAllVisibleSelected(){const e=this.getFilteredAndSortedItems();return e.length===0?!1:e.every(t=>this.selectedBlocks.has(`${this.activeTab}:${t.name}`))}areSomeVisibleSelected(){return this.getFilteredAndSortedItems().some(e=>this.selectedBlocks.has(`${this.activeTab}:${e.name}`))}async handleMultiDownload(){if(this.selectedBlocks.size===0){b.confirm("No Selection","Please select at least one content block or basic.",x.warning,[{text:"OK",active:!0,btnClass:"btn-default",trigger:()=>{b.dismiss()}}]);return}const e=Array.from(this.selectedBlocks).map(t=>{const[a,s]=t.split(":",2);return{type:a,identifier:s}});try{const t=await new L(TYPO3.settings.ajaxUrls.content_blocks_gui_multi_download).post({blocks:e}),a=await t.raw().blob(),s=window.URL.createObjectURL(a),i=document.createElement("a");i.href=s;const n=t.raw().headers.get("Content-Disposition");let r=`${e.length}-blocks_${Date.now()}.zip`;if(n){const u=n.match(/filename="?([^"]+)"?/);u&&(r=u[1])}i.download=r,document.body.appendChild(i),i.click(),document.body.removeChild(i),window.URL.revokeObjectURL(s),this.toggleSelectionMode()}catch(t){const a=t instanceof Error?t.message:"Unknown error";b.confirm("Download Failed",`Error downloading content blocks: ${a}`,x.error,[{text:"OK",active:!0,btnClass:"btn-default",trigger:()=>{b.dismiss()}}])}}openUploadModal(){const e=document.createElement("div"),t=document.createElement("content-block-upload");e.appendChild(t),setTimeout(()=>{t.availableExtensions=this.availableExtensions},0);const a=b.advanced({title:"Upload Content Block(s)",content:e,size:b.sizes.large,buttons:[]});t.addEventListener("close",()=>{a.hideModal()})}};f([k()],m.prototype,"activeTab",void 0),f([k()],m.prototype,"searchTerm",void 0),f([k()],m.prototype,"items",void 0),f([k()],m.prototype,"counts",void 0),f([k()],m.prototype,"isLoading",void 0),f([k()],m.prototype,"sortField",void 0),f([k()],m.prototype,"sortDirection",void 0),f([k()],m.prototype,"availableExtensions",void 0),f([k()],m.prototype,"selectionMode",void 0),f([k()],m.prototype,"selectedBlocks",void 0),m=f([M("content-block-list")],m);export{m as ContentBlockList};
