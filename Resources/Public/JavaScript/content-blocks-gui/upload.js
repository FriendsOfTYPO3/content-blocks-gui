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
import{LitElement as m,html as i,nothing as h}from"lit";import{state as c,customElement as f}from"lit/decorators.js";import u from"@typo3/core/ajax/ajax-request.js";var a=function(p,e,t,s){var r=arguments.length,n=r<3?e:s===null?s=Object.getOwnPropertyDescriptor(e,t):s,o;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")n=Reflect.decorate(p,e,t,s);else for(var d=p.length-1;d>=0;d--)(o=p[d])&&(n=(r<3?o(n):r>3?o(e,t,n):o(e,t))||n);return r>3&&n&&Object.defineProperty(e,t,n),n};let l=class extends m{constructor(){super(...arguments),this.availableExtensions=[],this.uploadedFile=null,this.analysis=null,this.targetExtension="samples",this.conflicts=new Map,this.step="upload",this.isUploading=!1,this.result=null,this.error=null}createRenderRoot(){return this}firstUpdated(){this.availableExtensions.length>0&&!this.targetExtension&&(this.targetExtension=this.availableExtensions[0].extension)}render(){return i`
      <div class="content-block-upload">
        ${this.renderStepContent()}
      </div>
    `}renderStepContent(){switch(this.step){case"upload":return this.renderUploadStep();case"analysis":return this.renderAnalysisStep();case"import":return this.renderImportStep();case"result":return this.renderResultStep();default:return h}}renderUploadStep(){return i`
      <div class="card">
        <div class="card-header">
          <h3>Upload Content Block(s)</h3>
        </div>
        <div class="card-body">
          ${this.error?i`
            <div class="alert alert-danger" role="alert">
              <strong>Error:</strong> ${this.error}
            </div>
          `:""}

          <div class="form-group mb-3">
            <label for="zipFile" class="form-label">
              Select ZIP File
            </label>
            <input
              type="file"
              id="zipFile"
              class="form-control"
              accept=".zip"
              @change="${this.handleFileSelect}"
              ?disabled="${this.isUploading}"
            />
            ${this.uploadedFile?i`
              <small class="form-text text-muted">
                Selected: ${this.uploadedFile.name} (${this.formatFileSize(this.uploadedFile.size)})
              </small>
            `:""}
          </div>

          <div class="form-group mb-3">
            <label for="targetExtension" class="form-label">
              Target Extension *
            </label>
            <select
              id="targetExtension"
              class="form-select"
              .value="${this.targetExtension}"
              @change="${e=>this.targetExtension=e.target.value}"
              ?disabled="${this.isUploading}"
            >
              ${this.availableExtensions.map(e=>i`
                <option value="${e.extension}">${e.package} (${e.extension})</option>
              `)}
            </select>
          </div>

          <div class="alert alert-info">
            <strong>Info:</strong> ZIP files must contain type directories (ContentElements/, PageTypes/, RecordTypes/, or Basics/).
            All downloads from this GUI already have the correct structure.
          </div>
        </div>
        <div class="card-footer">
          <button
            class="btn btn-default"
            @click="${()=>this.dispatchEvent(new CustomEvent("close"))}"
            ?disabled="${this.isUploading}"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary ms-2"
            @click="${this.handleAnalyze}"
            ?disabled="${!this.uploadedFile||this.isUploading}"
          >
            ${this.isUploading?i`
              <span class="spinner-border spinner-border-sm me-1"></span>
              Analyzing...
            `:"Analyze & Continue"}
          </button>
        </div>
      </div>
    `}renderAnalysisStep(){if(!this.analysis)return h;const e=this.analysis.blocks.filter(s=>s.conflict!==""),t=this.analysis.blocks.filter(s=>s.conflict==="");return i`
      <div class="card">
        <div class="card-header">
          <h3>Import to Extension: "${this.targetExtension}"</h3>
        </div>
        <div class="card-body" style="max-height: 60vh; overflow-y: auto;">
          <p class="lead">Found ${this.analysis.blocks.length} item(s):</p>

          ${this.renderBlocksByType(t,"Ready to Import",!1)}
          ${this.renderBlocksByType(e,"Conflicts Detected",!0)}
        </div>
        <div class="card-footer">
          <button
            class="btn btn-default"
            @click="${()=>this.resetToUpload()}"
          >
            Back
          </button>
          <button
            class="btn btn-primary ms-2"
            @click="${this.handleImport}"
          >
            Import ${this.getImportCount()} Block(s)
          </button>
        </div>
      </div>
    `}renderImportStep(){return i`
      <div class="card">
        <div class="card-header">
          <h3>Importing Content Blocks...</h3>
        </div>
        <div class="card-body text-center py-5">
          <div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <p class="mt-3">Please wait while content blocks are being imported...</p>
        </div>
      </div>
    `}renderResultStep(){if(!this.result)return h;const e=this.result.errors.length>0,t=this.result.imported.length>0,s=this.result.skipped.length>0;return i`
      <div class="card">
        <div class="card-header">
          <h3>
            ${e?"Import Completed with Errors":"Import Complete"}
          </h3>
        </div>
        <div class="card-body">
          ${t?i`
            <div class="alert alert-success">
              <h4>Successfully Imported (${this.result.imported.length}):</h4>
              ${this.renderResultBlocksByType(this.result.imported)}
            </div>
          `:""}

          ${s?i`
            <div class="alert alert-info">
              <h4>Skipped (${this.result.skipped.length}):</h4>
              ${this.renderResultBlocksByType(this.result.skipped,!0)}
            </div>
          `:""}

          ${e?i`
            <div class="alert alert-danger">
              <h4>Errors (${this.result.errors.length}):</h4>
              <ul class="mb-0">
                ${this.result.errors.map(r=>i`
                  <li><strong>${r.block}:</strong> ${r.error}</li>
                `)}
              </ul>
            </div>
          `:""}

          ${t?i`
            <p class="mt-3">
              <strong>Success:</strong> Cache cleared and content blocks registered.
            </p>
          `:""}
        </div>
        <div class="card-footer">
          <button
            class="btn btn-default"
            @click="${()=>this.resetToUpload()}"
          >
            Import Another
          </button>
          <button
            class="btn btn-primary ms-2"
            @click="${()=>this.dispatchEvent(new CustomEvent("close"))}"
          >
            Close
          </button>
        </div>
      </div>
    `}renderBlockInfo(e){return i`
      <div class="card mb-2 border-success">
        <div class="card-body">
          <h5 class="card-title">
            ${e.name}
          </h5>
          <p class="card-text mb-1">
            <strong>Type:</strong> ${this.getTypeLabel(e.type)}
            ${e.table!==""?i`<span class="text-muted">(${e.table})</span>`:""}
          </p>
          <p class="card-text mb-1">
            <strong>Files:</strong> ${e.files.length} file(s)
          </p>
          <p class="card-text mb-0 text-muted">
            <small>→ ContentBlocks/${this.getTypeDirectory(e.type)}/${e.directoryName!==""?e.directoryName:e.fileName}</small>
          </p>
        </div>
      </div>
    `}renderBlockInfoWithConflict(e){const t=this.conflicts.get(e.name)||"skip";return i`
      <div class="card mb-2 border-warning">
        <div class="card-body">
          <h5 class="card-title">
            ${e.name}
          </h5>
          <p class="card-text mb-1">
            <strong>Type:</strong> ${this.getTypeLabel(e.type)}
            ${e.table!==""?i`<span class="text-muted">(${e.table})</span>`:""}
          </p>
          <p class="card-text mb-2">
            <strong>Files:</strong> ${e.files.length} file(s)
          </p>

          <div class="alert alert-warning mb-2">
            <strong>Warning:</strong> Already exists! Choose action:
          </div>

          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="conflict_${e.name}"
              id="skip_${e.name}"
              value="skip"
              ?checked="${t==="skip"}"
              @change="${()=>this.setConflictResolution(e.name,"skip")}"
            />
            <label class="form-check-label" for="skip_${e.name}">
              Skip this content block (keep existing)
            </label>
          </div>
          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="conflict_${e.name}"
              id="overwrite_${e.name}"
              value="overwrite"
              ?checked="${t==="overwrite"}"
              @change="${()=>this.setConflictResolution(e.name,"overwrite")}"
            />
            <label class="form-check-label" for="overwrite_${e.name}">
              Overwrite existing content block
            </label>
          </div>
        </div>
      </div>
    `}handleFileSelect(e){const t=e.target;this.uploadedFile=t.files?.[0]||null,this.error=null}async handleAnalyze(){if(this.uploadedFile){this.isUploading=!0,this.error=null;try{const e=new FormData;e.append("file",this.uploadedFile),e.append("targetExtension",this.targetExtension);const s=await(await new u(TYPO3.settings.ajaxUrls.content_blocks_gui_upload).post(e)).resolve();s.success?(this.analysis=s.analysis,this.step="analysis",this.conflicts.clear(),s.analysis.blocks.forEach(r=>{r.conflict!==""&&this.conflicts.set(r.name,"skip")}),this.requestUpdate()):this.error=s.error||"Failed to analyze ZIP file"}catch(e){let t="Unknown error";if(e?.response)try{const s=await e.response.json();t=s.error||s.message||t}catch{t=e.response.statusText||t}else e instanceof Error?t=e.message:typeof e=="string"&&(t=e);this.error=t}finally{this.isUploading=!1}}}async handleImport(){if(this.analysis){this.step="import";try{const e={};this.conflicts.forEach((r,n)=>{e[n]=r});const s=await(await new u(TYPO3.settings.ajaxUrls.content_blocks_gui_import).post({analysis:this.analysis,targetExtension:this.targetExtension,conflicts:e})).resolve();s.success?(this.result=s.result,this.step="result"):(this.error=s.error||"Failed to import content blocks",this.step="upload")}catch(e){const t=e instanceof Error?e.message:"Unknown error";this.error=`Failed to import: ${t}`,this.step="upload"}}}setConflictResolution(e,t){this.conflicts.set(e,t),this.requestUpdate()}getImportCount(){if(!this.analysis)return 0;let e=0;return this.analysis.blocks.forEach(t=>{(t.conflict===""||this.conflicts.get(t.name)==="overwrite")&&e++}),e}resetToUpload(){this.step="upload",this.uploadedFile=null,this.analysis=null,this.result=null,this.error=null,this.conflicts.clear();const e=this.querySelector("#zipFile");e&&(e.value="")}renderBlocksByType(e,t,s){if(e.length===0)return h;const r=this.groupByType(e);return i`
      <h4 class="mt-3">${t} (${e.length})</h4>
      ${r.map(([n,o])=>i`
        <h5 class="mt-2 text-muted">${this.getTypeLabel(n)}s (${o.length})</h5>
        ${o.map(d=>s?this.renderBlockInfoWithConflict(d):this.renderBlockInfo(d))}
      `)}
    `}renderResultBlocksByType(e,t=!1){const s=this.groupByType(e);return i`
      ${s.map(([r,n])=>i`
        <h5 class="mb-1 mt-2">${this.getTypeLabel(r)}s (${n.length}):</h5>
        <ul class="mb-0">
          ${n.map(o=>i`
            <li>${o.name}${t?" (already exists)":""}</li>
          `)}
        </ul>
      `)}
    `}groupByType(e){const t=new Map;for(const s of e){const r=t.get(s.type)||[];r.push(s),t.set(s.type,r)}return[...t.entries()]}getTypeLabel(e){return{CONTENT_ELEMENT:"Content Element",PAGE_TYPE:"Page Type",RECORD_TYPE:"Record Type",FILE_TYPE:"File Type",BASIC:"Basic"}[e]||e}getTypeDirectory(e){return{CONTENT_ELEMENT:"ContentElements",PAGE_TYPE:"PageTypes",RECORD_TYPE:"RecordTypes",FILE_TYPE:"FileTypes",BASIC:"Basics"}[e]||e}formatFileSize(e){return e<1024?e+" B":e<1024*1024?(e/1024).toFixed(1)+" KB":(e/(1024*1024)).toFixed(1)+" MB"}};a([c()],l.prototype,"availableExtensions",void 0),a([c()],l.prototype,"uploadedFile",void 0),a([c()],l.prototype,"analysis",void 0),a([c()],l.prototype,"targetExtension",void 0),a([c()],l.prototype,"conflicts",void 0),a([c()],l.prototype,"step",void 0),a([c()],l.prototype,"isUploading",void 0),a([c()],l.prototype,"result",void 0),a([c()],l.prototype,"error",void 0),l=a([f("content-block-upload")],l);export{l as ContentBlockUpload};
