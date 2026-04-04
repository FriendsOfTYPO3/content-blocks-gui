import { LitElement, html, nothing } from 'lit';
import type { TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import AjaxRequest from '@typo3/core/ajax/ajax-request.js';

interface ContentBlockInfo {
  type: string;
  name: string;
  vendor: string;
  table: string;
  directoryName: string;
  fileName: string;
  files: string[];
  conflict: string; // Empty string for no conflict, 'DIRECTORY_EXISTS' or 'BASIC_FILE_EXISTS' for conflicts
}

interface ImportAnalysis {
  blocks: ContentBlockInfo[];
  valid: boolean;
  errors: string[];
  tempDir: string;
}

interface ImportResult {
  imported: ContentBlockInfo[];
  skipped: ContentBlockInfo[];
  errors: Array<{block: string; error: string}>;
}

/**
 * Upload component for importing content blocks from ZIP files
 */
@customElement('content-block-upload')
export class ContentBlockUpload extends LitElement {
  @state()
  public availableExtensions: any[] = [];

  @state()
  private uploadedFile: File | null = null;

  @state()
  private analysis: ImportAnalysis | null = null;

  @state()
  private targetExtension: string = 'samples';

  @state()
  private readonly conflicts: Map<string, string> = new Map();

  @state()
  private step: 'upload' | 'analysis' | 'import' | 'result' = 'upload';

  @state()
  private isUploading: boolean = false;

  @state()
  private result: ImportResult | null = null;

  @state()
  private error: string | null = null;

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    return this;
  }

  protected override firstUpdated(): void {
    // Set default target extension if available
    if (this.availableExtensions.length > 0 && !this.targetExtension) {
      this.targetExtension = this.availableExtensions[0].extension;
    }
  }

  protected override render(): TemplateResult {
    return html`
      <div class="content-block-upload">
        ${this.renderStepContent()}
      </div>
    `;
  }

  protected renderStepContent(): TemplateResult | typeof nothing {
    switch (this.step) {
      case 'upload':
        return this.renderUploadStep();
      case 'analysis':
        return this.renderAnalysisStep();
      case 'import':
        return this.renderImportStep();
      case 'result':
        return this.renderResultStep();
      default:
        return nothing;
    }
  }

  /**
   * Step 1: File selection and upload
   */
  protected renderUploadStep(): TemplateResult {
    return html`
      <div class="card">
        <div class="card-header">
          <h3>Upload Content Block(s)</h3>
        </div>
        <div class="card-body">
          ${this.error ? html`
            <div class="alert alert-danger" role="alert">
              <strong>Error:</strong> ${this.error}
            </div>
          ` : ''}

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
            ${this.uploadedFile ? html`
              <small class="form-text text-muted">
                Selected: ${this.uploadedFile.name} (${this.formatFileSize(this.uploadedFile.size)})
              </small>
            ` : ''}
          </div>

          <div class="form-group mb-3">
            <label for="targetExtension" class="form-label">
              Target Extension *
            </label>
            <select
              id="targetExtension"
              class="form-select"
              .value="${this.targetExtension}"
              @change="${(e: Event) => this.targetExtension = (e.target as HTMLSelectElement).value}"
              ?disabled="${this.isUploading}"
            >
              ${this.availableExtensions.map(ext => html`
                <option value="${ext.extension}">${ext.package} (${ext.extension})</option>
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
            @click="${() => this.dispatchEvent(new CustomEvent('close'))}"
            ?disabled="${this.isUploading}"
          >
            Cancel
          </button>
          <button
            class="btn btn-primary ms-2"
            @click="${this.handleAnalyze}"
            ?disabled="${!this.uploadedFile || this.isUploading}"
          >
            ${this.isUploading ? html`
              <span class="spinner-border spinner-border-sm me-1"></span>
              Analyzing...
            ` : 'Analyze & Continue'}
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Step 2: Display analysis results with conflict resolution
   */
  protected renderAnalysisStep(): TemplateResult | typeof nothing {
    if (!this.analysis) {return nothing;}

    const blocksWithConflicts = this.analysis.blocks.filter(b => b.conflict !== '');
    const blocksWithoutConflicts = this.analysis.blocks.filter(b => b.conflict === '');

    return html`
      <div class="card">
        <div class="card-header">
          <h3>Import to Extension: "${this.targetExtension}"</h3>
        </div>
        <div class="card-body" style="max-height: 60vh; overflow-y: auto;">
          <p class="lead">Found ${this.analysis.blocks.length} item(s):</p>

          ${this.renderBlocksByType(blocksWithoutConflicts, 'Ready to Import', false)}
          ${this.renderBlocksByType(blocksWithConflicts, 'Conflicts Detected', true)}
        </div>
        <div class="card-footer">
          <button
            class="btn btn-default"
            @click="${() => this.resetToUpload()}"
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
    `;
  }

  /**
   * Step 3: Import progress
   */
  protected renderImportStep(): TemplateResult {
    return html`
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
    `;
  }

  /**
   * Step 4: Import results
   */
  protected renderResultStep(): TemplateResult | typeof nothing {
    if (!this.result) {return nothing;}

    const hasErrors = this.result.errors.length > 0;
    const hasImported = this.result.imported.length > 0;
    const hasSkipped = this.result.skipped.length > 0;

    return html`
      <div class="card">
        <div class="card-header">
          <h3>
            ${hasErrors ? 'Import Completed with Errors' : 'Import Complete'}
          </h3>
        </div>
        <div class="card-body">
          ${hasImported ? html`
            <div class="alert alert-success">
              <h4>Successfully Imported (${this.result.imported.length}):</h4>
              ${this.renderResultBlocksByType(this.result.imported)}
            </div>
          ` : ''}

          ${hasSkipped ? html`
            <div class="alert alert-info">
              <h4>Skipped (${this.result.skipped.length}):</h4>
              ${this.renderResultBlocksByType(this.result.skipped, true)}
            </div>
          ` : ''}

          ${hasErrors ? html`
            <div class="alert alert-danger">
              <h4>Errors (${this.result.errors.length}):</h4>
              <ul class="mb-0">
                ${this.result.errors.map(err => html`
                  <li><strong>${err.block}:</strong> ${err.error}</li>
                `)}
              </ul>
            </div>
          ` : ''}

          ${hasImported ? html`
            <p class="mt-3">
              <strong>Success:</strong> Cache cleared and content blocks registered.
            </p>
          ` : ''}
        </div>
        <div class="card-footer">
          <button
            class="btn btn-default"
            @click="${() => this.resetToUpload()}"
          >
            Import Another
          </button>
          <button
            class="btn btn-primary ms-2"
            @click="${() => this.closeAndReload()}"
          >
            Close
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render block info without conflict
   */
  protected renderBlockInfo(block: ContentBlockInfo): TemplateResult {
    return html`
      <div class="card mb-2 border-success">
        <div class="card-body">
          <h5 class="card-title">
            ${block.name}
          </h5>
          <p class="card-text mb-1">
            <strong>Type:</strong> ${this.getTypeLabel(block.type)}
            ${block.table !== '' ? html`<span class="text-muted">(${block.table})</span>` : ''}
          </p>
          <p class="card-text mb-1">
            <strong>Files:</strong> ${block.files.length} file(s)
          </p>
          <p class="card-text mb-0 text-muted">
            <small>→ ContentBlocks/${this.getTypeDirectory(block.type)}/${block.directoryName !== '' ? block.directoryName : block.fileName}</small>
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Render block info with conflict resolution
   */
  protected renderBlockInfoWithConflict(block: ContentBlockInfo): TemplateResult {
    const conflictResolution = this.conflicts.get(block.name) || 'skip';

    return html`
      <div class="card mb-2 border-warning">
        <div class="card-body">
          <h5 class="card-title">
            ${block.name}
          </h5>
          <p class="card-text mb-1">
            <strong>Type:</strong> ${this.getTypeLabel(block.type)}
            ${block.table !== '' ? html`<span class="text-muted">(${block.table})</span>` : ''}
          </p>
          <p class="card-text mb-2">
            <strong>Files:</strong> ${block.files.length} file(s)
          </p>

          <div class="alert alert-warning mb-2">
            <strong>Warning:</strong> Already exists! Choose action:
          </div>

          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="conflict_${block.name}"
              id="skip_${block.name}"
              value="skip"
              ?checked="${conflictResolution === 'skip'}"
              @change="${() => this.setConflictResolution(block.name, 'skip')}"
            />
            <label class="form-check-label" for="skip_${block.name}">
              Skip this content block (keep existing)
            </label>
          </div>
          <div class="form-check">
            <input
              class="form-check-input"
              type="radio"
              name="conflict_${block.name}"
              id="overwrite_${block.name}"
              value="overwrite"
              ?checked="${conflictResolution === 'overwrite'}"
              @change="${() => this.setConflictResolution(block.name, 'overwrite')}"
            />
            <label class="form-check-label" for="overwrite_${block.name}">
              Overwrite existing content block
            </label>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Handle file selection
   */
  protected handleFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.uploadedFile = input.files?.[0] || null;
    this.error = null;
  }

  /**
   * Handle analyze button click
   */
  protected async handleAnalyze(): Promise<void> {
    if (!this.uploadedFile) {
      return;
    }

    this.isUploading = true;
    this.error = null;

    try {
      const formData = new FormData();
      formData.append('file', this.uploadedFile);
      formData.append('targetExtension', this.targetExtension);

      const response = await new AjaxRequest(TYPO3.settings.ajaxUrls.content_blocks_gui_upload)
        .post(formData);

      const data = await response.resolve();

      if (data.success) {
        this.analysis = data.analysis;
        this.step = 'analysis';

        // Initialize conflict resolutions to 'skip' by default
        this.conflicts.clear();
        data.analysis.blocks.forEach((block: ContentBlockInfo) => {
          if (block.conflict !== '') {
            this.conflicts.set(block.name, 'skip');
          }
        });
        this.requestUpdate();
      } else {
        this.error = data.error || 'Failed to analyze ZIP file';
      }
    } catch (error: any) {
      // Extract detailed error message from AJAX response
      let errorMessage = 'Unknown error';

      if (error?.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch {
          errorMessage = error.response.statusText || errorMessage;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      this.error = errorMessage;
    } finally {
      this.isUploading = false;
    }
  }

  /**
   * Handle import button click
   */
  protected async handleImport(): Promise<void> {
    if (!this.analysis) {
      return;
    }

    this.step = 'import';

    try {
      const conflictsObj: Record<string, string> = {};
      this.conflicts.forEach((value, key) => {
        conflictsObj[key] = value;
      });

      const response = await new AjaxRequest(TYPO3.settings.ajaxUrls.content_blocks_gui_import)
        .post({
          analysis: this.analysis,
          targetExtension: this.targetExtension,
          conflicts: conflictsObj
        });

      const data = await response.resolve();

      if (data.success) {
        this.result = data.result;
        this.step = 'result';
      } else {
        this.error = data.error || 'Failed to import content blocks';
        this.step = 'upload';
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.error = `Failed to import: ${errorMessage}`;
      this.step = 'upload';
    }
  }

  /**
   * Set conflict resolution for a block
   */
  protected setConflictResolution(blockName: string, resolution: string): void {
    this.conflicts.set(blockName, resolution);
    this.requestUpdate();
  }

  /**
   * Calculate how many blocks will be imported
   */
  protected getImportCount(): number {
    if (!this.analysis) {return 0;}

    let count = 0;
    this.analysis.blocks.forEach(block => {
      if (block.conflict === '' || this.conflicts.get(block.name) === 'overwrite') {
        count++;
      }
    });
    return count;
  }

  /**
   * Close modal and reload page to show updated content blocks
   */
  protected closeAndReload(): void {
    // Dispatch close event to close the modal
    this.dispatchEvent(new CustomEvent('close'));

    // Reload page after a short delay to ensure modal closes first
    setTimeout(() => {
      window.location.reload();
    }, 100);
  }

  /**
   * Reset to upload step
   */
  protected resetToUpload(): void {
    this.step = 'upload';
    this.uploadedFile = null;
    this.analysis = null;
    this.result = null;
    this.error = null;
    this.conflicts.clear();

    // Reset file input
    const fileInput = this.querySelector('#zipFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  /**
   * Group blocks by type and render with section headers
   */
  protected renderBlocksByType(blocks: ContentBlockInfo[], title: string, withConflict: boolean): TemplateResult | typeof nothing {
    if (blocks.length === 0) {return nothing;}

    const grouped = this.groupByType(blocks);
    return html`
      <h4 class="mt-3">${title} (${blocks.length})</h4>
      ${grouped.map(([type, typeBlocks]) => html`
        <h5 class="mt-2 text-muted">${this.getTypeLabel(type)}s (${typeBlocks.length})</h5>
        ${typeBlocks.map(block => withConflict ? this.renderBlockInfoWithConflict(block) : this.renderBlockInfo(block))}
      `)}
    `;
  }

  /**
   * Group blocks by type and render as lists in result step
   */
  protected renderResultBlocksByType(blocks: ContentBlockInfo[], showAlreadyExists: boolean = false): TemplateResult {
    const grouped = this.groupByType(blocks);
    return html`
      ${grouped.map(([type, typeBlocks]) => html`
        <h5 class="mb-1 mt-2">${this.getTypeLabel(type)}s (${typeBlocks.length}):</h5>
        <ul class="mb-0">
          ${typeBlocks.map(block => html`
            <li>${block.name}${showAlreadyExists ? ' (already exists)' : ''}</li>
          `)}
        </ul>
      `)}
    `;
  }

  /**
   * Group blocks by their type
   */
  protected groupByType(blocks: ContentBlockInfo[]): Array<[string, ContentBlockInfo[]]> {
    const map = new Map<string, ContentBlockInfo[]>();
    for (const block of blocks) {
      const list = map.get(block.type) || [];
      list.push(block);
      map.set(block.type, list);
    }
    return [...map.entries()];
  }

  /**
   * Get human-readable type label
   */
  protected getTypeLabel(type: string): string {
    return {
      'CONTENT_ELEMENT': 'Content Element',
      'PAGE_TYPE': 'Page Type',
      'RECORD_TYPE': 'Record Type',
      'FILE_TYPE': 'File Type',
      'BASIC': 'Basic'
    }[type] || type;
  }

  /**
   * Get type directory name
   */
  protected getTypeDirectory(type: string): string {
    return {
      'CONTENT_ELEMENT': 'ContentElements',
      'PAGE_TYPE': 'PageTypes',
      'RECORD_TYPE': 'RecordTypes',
      'FILE_TYPE': 'FileTypes',
      'BASIC': 'Basics'
    }[type] || type;
  }

  /**
   * Format file size in human-readable format
   */
  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) {return bytes + ' B';}
    if (bytes < 1024 * 1024) {return (bytes / 1024).toFixed(1) + ' KB';}
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}
