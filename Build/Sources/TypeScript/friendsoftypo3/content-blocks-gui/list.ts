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
import { customElement, state } from 'lit/decorators.js';
import AjaxRequest from '@typo3/core/ajax/ajax-request.js';
import Modal from '@typo3/backend/modal.js';
import { lll } from '@typo3/core/lit-helper.js';
import { SeverityEnum } from '@typo3/backend/enum/severity.js';
import '@typo3/backend/element/icon-element.js';
import './upload.js';

interface ContentBlockItem {
  name: string;
  label: string;
  extension: string;
  usages?: number;
  icon?: string;
  editUrl?: string;
  deleteUrl?: string;
  duplicateUrl?: string;
  contentType?: string;
  tableName?: string;
  typeField?: string | null;
  typeName?: string | null;
}

interface ListResponse {
  type: string;
  items: ContentBlockItem[];
  counts: Record<string, number>;
  total: number;
}

type SortField = 'name' | 'label' | 'extension';
type SortDirection = 'asc' | 'desc';

/**
 * Content Block List Component
 *
 * @example
 * <content-block-list></content-block-list>
 */
@customElement('content-block-list')
export class ContentBlockList extends LitElement {
  @state()
  activeTab: string = 'content-element';

  @state()
  searchTerm: string = '';

  @state()
  items: ContentBlockItem[] = [];

  @state()
  counts: Record<string, number> = {};

  @state()
  isLoading: boolean = false;

  @state()
  sortField: SortField = 'name';

  @state()
  sortDirection: SortDirection = 'asc';

  @state()
  availableExtensions: any[] = [];

  @state()
  selectionMode: boolean = false;

  @state()
  selectedBlocks: Set<string> = new Set();

  private debounceTimeout: number | null = null;

  override connectedCallback() {
    super.connectedCallback();

    // Load available extensions from data attribute
    const extensionsData = this.getAttribute('data-available-extensions');
    if (extensionsData) {
      try {
        this.availableExtensions = JSON.parse(extensionsData);
      } catch (e) {
        console.error('Failed to parse available extensions:', e);
        this.availableExtensions = [];
      }
    }

    // Listen for upload button clicks from button bar
    document.addEventListener('click', this.handleUploadButtonClick);

    // Load initial state from URL
    this.loadStateFromUrl();
    // Load initial data
    this.loadContentBlocks(this.activeTab);
  }

  override disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener('click', this.handleUploadButtonClick);
  }

  protected override createRenderRoot(): HTMLElement | ShadowRoot {
    // Don't use Shadow DOM to allow Bootstrap CSS styling
    return this;
  }

  protected override render(): TemplateResult {
    return html`
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
              ${this.searchTerm.length > 0 && this.searchTerm.length < 3 ? html`
                <small class="form-text text-muted">Enter at least 3 characters to search</small>
              ` : ''}
            </div>
          </div>
        </div>

        <!-- Tabs -->
        <ul class="nav nav-tabs mb-3" role="tablist">
          ${this.renderTab('content-element', 'Content Elements')}
          ${this.renderTab('page-type', 'Page Types')}
          ${this.renderTab('record-type', 'Record Types')}
          ${this.renderTab('basic', 'Basics')}
        </ul>

        <!-- Loading State -->
        ${this.isLoading ? html`
          <div class="alert alert-info">
            <typo3-backend-icon identifier="spinner-circle" size="small"></typo3-backend-icon>
            Loading...
          </div>
        ` : ''}

        <!-- Content -->
        ${!this.isLoading ? this.renderContent() : ''}
      </div>
    `;
  }

  protected renderTab(type: string, label: string): TemplateResult {
    const count = this.counts[type] || 0;
    const isActive = this.activeTab === type;

    return html`
      <li class="nav-item" role="presentation">
        <button
          class="nav-link ${isActive ? 'active' : ''}"
          @click="${() => this.switchTab(type)}"
          role="tab"
          aria-selected="${isActive}">
          ${label}
          <span class="badge bg-primary ms-2" style="color: white;">${count}</span>
        </button>
      </li>
    `;
  }

  protected renderToolbar(): TemplateResult {
    return html`
      <div class="btn-toolbar mb-3" role="toolbar">
        <button
          class="btn ${this.selectionMode ? 'btn-warning' : 'btn-default'}"
          @click="${this.toggleSelectionMode}"
          title="${this.selectionMode ? 'Cancel Selection' : 'Select Multiple for Download'}">
          <typo3-backend-icon identifier="${this.selectionMode ? 'actions-close' : 'actions-check-square'}" size="small"></typo3-backend-icon>
          ${this.selectionMode ? 'Cancel Selection' : 'Select Multiple'}
        </button>

        ${this.selectionMode ? html`
          <button
            class="btn btn-primary ms-2"
            @click="${this.handleMultiDownload}"
            ?disabled="${this.selectedBlocks.size === 0}"
            title="Download ${this.selectedBlocks.size} selected block(s)">
            <typo3-backend-icon identifier="actions-download" size="small"></typo3-backend-icon>
            Download Selected (${this.selectedBlocks.size})
          </button>
        ` : ''}
      </div>
    `;
  }

  protected renderContent(): TemplateResult {
    const filteredItems = this.getFilteredAndSortedItems();

    if (filteredItems.length === 0) {
      return this.renderEmptyState();
    }

    return html`
      ${this.renderToolbar()}
      <div class="list-table-container">
        <div class="table-fit">
          <table class="table table-striped table-hover">
            <thead>
              <tr>
                ${this.selectionMode ? html`<th style="width: 40px;"><input type="checkbox" disabled /></th>` : ''}
                <th></th>
                <th class="sortable" @click="${() => this.handleSort('name')}" style="cursor: pointer;">
                  Content Block name
                  ${this.sortField === 'name' ? html`
                    <span class="text-primary">${this.sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                  ` : ''}
                </th>
                <th class="sortable" @click="${() => this.handleSort('label')}" style="cursor: pointer;">
                  Label
                  ${this.sortField === 'label' ? html`
                    <span class="text-primary">${this.sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                  ` : ''}
                </th>
                <th class="sortable" @click="${() => this.handleSort('extension')}" style="cursor: pointer;">
                  Extension
                  ${this.sortField === 'extension' ? html`
                    <span class="text-primary">${this.sortDirection === 'asc' ? ' ▲' : ' ▼'}</span>
                  ` : ''}
                </th>
                ${this.activeTab !== 'basic' ? html`<th>References</th>` : ''}
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${filteredItems.map(item => this.renderRow(item))}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  protected getTypeName(): string {
    const typeNames: Record<string, string> = {
      'content-element': 'Content Element',
      'page-type': 'Page Type',
      'record-type': 'Record Type',
      'basic': 'Basic'
    };
    return typeNames[this.activeTab] || 'Content Block';
  }

  protected renderRow(item: ContentBlockItem): TemplateResult {
    const typeName = this.getTypeName();
    const key = `${this.activeTab}:${item.name}`;
    const isSelected = this.selectedBlocks.has(key);

    return html`
      <tr>
        ${this.selectionMode ? html`
          <td class="col-checkbox">
            <input
              type="checkbox"
              ?checked="${isSelected}"
              @change="${() => this.toggleBlockSelection(item.name, this.activeTab)}"
            />
          </td>
        ` : ''}
        <td class="col-icon">
          ${item.icon ? html`
            <typo3-backend-icon identifier="${item.icon}" size="small"></typo3-backend-icon>
          ` : html`
            <typo3-backend-icon identifier="content-extension" size="small"></typo3-backend-icon>
          `}
        </td>
        <td class="col">
          ${item.editUrl ? html`
            <a href="${item.editUrl}" title="Edit ${typeName}: ${item.name}">${item.name}</a>
          ` : item.name}
        </td>
        <td class="col">
          ${item.editUrl ? html`
            <a href="${item.editUrl}" title="Edit ${typeName}: ${item.name}">${item.label}</a>
          ` : item.label}
        </td>
        <td><code>${item.extension}</code></td>
        ${this.activeTab !== 'basic' ? html`
          <td>
            <span class="badge badge-default">
              ${item.usages || 0} References
            </span>
          </td>
        ` : ''}
        <td class="col-control">
          <div class="btn-group" role="group">
            ${item.editUrl ? html`
              <a class="btn btn-default" href="${item.editUrl}" title="Edit this ${typeName}">
                <typo3-backend-icon identifier="actions-open"></typo3-backend-icon>
              </a>
            ` : ''}
            ${item.duplicateUrl ? html`
              <button class="btn btn-default"
                      title="Duplicate this ${typeName}"
                      @click="${() => this.handleDuplicate(item)}">
                <typo3-backend-icon identifier="actions-duplicate"></typo3-backend-icon>
              </button>
            ` : ''}
            <button class="btn btn-default"
                    title="Download this ${typeName}"
                    @click="${() => this.handleDownload(item.name)}">
              <typo3-backend-icon identifier="actions-download"></typo3-backend-icon>
            </button>
            ${item.deleteUrl ? html`
              <button class="btn btn-default"
                      title="Delete this ${typeName}"
                      @click="${() => this.handleDelete(item.deleteUrl)}">
                <typo3-backend-icon identifier="actions-delete"></typo3-backend-icon>
              </button>
            ` : ''}
          </div>
        </td>
      </tr>
    `;
  }

  protected renderEmptyState(): TemplateResult {
    if (this.searchTerm.length > 0) {
      return html`
        <div class="alert alert-warning">
          No results found for "${this.searchTerm}"
        </div>
      `;
    }

    return html`
      <div class="alert alert-info">
        No content blocks available
      </div>
    `;
  }

  protected getFilteredAndSortedItems(): ContentBlockItem[] {
    let filtered = this.items;

    // Apply search filter (min 3 characters)
    if (this.searchTerm.length >= 3) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchLower) ||
        item.label.toLowerCase().includes(searchLower) ||
        item.extension.toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aValue = a[this.sortField] || '';
      const bValue = b[this.sortField] || '';
      const comparison = aValue.localeCompare(bValue);
      return this.sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }

  protected async switchTab(type: string): Promise<void> {
    if (type === this.activeTab) {
      return;
    }

    this.activeTab = type;
    this.updateUrl();
    await this.loadContentBlocks(type);
  }

  protected async loadContentBlocks(type: string): Promise<void> {
    this.isLoading = true;

    try {
      const ajaxUrl = TYPO3.settings.ajaxUrls.content_blocks_gui_list_by_type;
      const response = await new AjaxRequest(ajaxUrl)
        .withQueryArguments({ type })
        .get();

      const data = await response.resolve() as ListResponse;
      this.items = data.items;
      this.counts = data.counts;
    } catch (error) {
      console.error('Failed to load content blocks:', error);
      this.items = [];
    } finally {
      this.isLoading = false;
    }
  }

  protected handleSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm = input.value;

    // Debounce the filtering
    if (this.debounceTimeout !== null) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = window.setTimeout(() => {
      this.updateUrl();
      this.requestUpdate();
    }, 300);
  }

  protected handleSort(field: SortField): void {
    if (this.sortField === field) {
      // Toggle direction if same field
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      // New field, default to ascending
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    this.updateUrl();
    this.requestUpdate();
  }

  protected updateUrl(): void {
    const params = new URLSearchParams();
    params.set('type', this.activeTab);

    if (this.searchTerm.length >= 3) {
      params.set('search', this.searchTerm);
    }

    if (this.sortField !== 'name' || this.sortDirection !== 'asc') {
      params.set('sort', `${this.sortField}:${this.sortDirection}`);
    }

    const url = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState({}, '', url);
  }

  protected loadStateFromUrl(): void {
    const params = new URLSearchParams(window.location.search);

    const type = params.get('type');
    if (type) {
      this.activeTab = type;
    }

    const search = params.get('search');
    if (search) {
      this.searchTerm = search;
    }

    const sort = params.get('sort');
    if (sort) {
      const [field, direction] = sort.split(':');
      this.sortField = field as SortField;
      this.sortDirection = (direction as SortDirection) || 'asc';
    }
  }

  protected handleDownload(name: string): void {
    // Determine which endpoint and payload to use based on type
    const isBasic = this.activeTab === 'basic';
    const ajaxUrl = isBasic
      ? TYPO3.settings.ajaxUrls.content_blocks_gui_download_basic
      : TYPO3.settings.ajaxUrls.content_blocks_gui_download_cb;
    const payload = isBasic
      ? { identifier: name }
      : { name: name };

    new AjaxRequest(ajaxUrl)
      .post(payload, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/zip'
        }
      })
      .then(async (response) => {
        const responseData = response.raw();
        const blob = await responseData.blob();
        const contentDisposition = responseData.headers.get('content-disposition');
        let filename = name + '.zip';
        if (contentDisposition) {
          const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
          if (filenameMatch && filenameMatch.length > 1) {
            filename = filenameMatch[1];
          }
        }

        filename = filename.replace(/"+$/, '');

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);

        document.body.appendChild(link);
        link.click();
      })
      .catch((error) => {
        console.error(error);
      });
  }

  protected handleDelete(url: string): void {
    const modal = Modal.confirm(
      lll('make.remove.confirm.title'),
      lll('make.remove.confirm.message'),
      SeverityEnum.warning, [
        {
          text: lll('make.remove.button.close'),
          active: true,
          btnClass: 'btn-default',
          name: 'cancel',
        },
        {
          text: lll('make.remove.button.ok'),
          btnClass: 'btn-warning remove-button',
          name: 'delete',
        },
      ]
    );

    modal.addEventListener('button.clicked', (e: Event): void => {
      const target = e.target as HTMLButtonElement;
      if (target.getAttribute('name') === 'delete') {
        // Append current tab to URL for redirect back
        const urlWithTab = new URL(url, window.location.origin);
        urlWithTab.searchParams.set('returnTab', this.activeTab);
        window.location.href = urlWithTab.toString();
      }
      modal.hideModal();
    });
  }

  protected handleDuplicate(item: ContentBlockItem): void {
    // Check if this is a Basic (handled differently)
    if (this.activeTab === 'basic') {
      this.handleDuplicateBasic(item);
      return;
    }

    // Parse source name to extract vendor and name
    const nameParts = item.name.split('/');
    const sourceVendor = nameParts[0] || '';
    const sourceBlockName = nameParts[1] || '';

    // Check if this is a multi-type RecordType
    const isMultiTypeRecordType = item.contentType === 'RECORD_TYPE' && item.typeField;

    // Generate extension options
    let extensionOptions = '';
    this.availableExtensions.forEach((ext: any) => {
      const selected = ext.extension === item.extension ? 'selected' : '';
      extensionOptions += `<option value="${ext.extension}" ${selected}>${ext.package} (${ext.extension})</option>`;
    });

    // Create content as a DOM element
    const content = document.createElement('div');

    let strategySection = '';
    if (isMultiTypeRecordType) {
      strategySection = `
        <div class="alert alert-info mb-3">
          <strong>RecordType Duplication</strong><br>
          This is a multi-type RecordType sharing table <code>${item.tableName}</code>.<br>
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
      `;
    }

    content.innerHTML = `
      <form id="duplicate-content-block-form">
        ${strategySection}
        <div class="form-group mb-3">
          <label for="duplicate-extension" class="form-label">Extension</label>
          <select class="form-control form-select" id="duplicate-extension" name="extension" required>
            ${extensionOptions}
          </select>
          <div class="form-text">The extension where the duplicated content block will be stored</div>
        </div>
        <div class="form-group mb-3">
          <label for="duplicate-vendor" class="form-label">Vendor Name</label>
          <input type="text" class="form-control" id="duplicate-vendor" name="vendor" value="${sourceVendor}" required pattern="[a-z0-9\\-]+">
          <div class="form-text">Lowercase letters, numbers, and hyphens only</div>
        </div>
        <div class="form-group mb-3">
          <label for="duplicate-name" class="form-label">Content Block Name</label>
          <input type="text" class="form-control" id="duplicate-name" name="name" value="${sourceBlockName}-copy" required pattern="[a-z0-9\\-]+">
          <div class="form-text">Lowercase letters, numbers, and hyphens only</div>
          <div id="duplicate-name-error" class="text-danger d-none">The new name must be different from the original</div>
        </div>
      </form>
    `;

    const modal = Modal.advanced({
      title: 'Duplicate Content Block',
      content: content,
      severity: SeverityEnum.info,
      size: Modal.sizes.medium,
      buttons: [
        {
          text: 'Cancel',
          active: true,
          btnClass: 'btn-default',
          name: 'cancel',
          trigger: () => {
            modal.hideModal();
          }
        },
        {
          text: 'Duplicate',
          btnClass: 'btn-primary',
          name: 'duplicate',
          trigger: () => {
            if (this.validateAndSubmitDuplicate(item, sourceVendor, sourceBlockName, modal)) {
              modal.hideModal();
            }
          }
        }
      ]
    });

    // If multi-type RecordType, set up strategy change handlers
    if (isMultiTypeRecordType) {
      const sharedTableRadio = modal.querySelector('#strategy-shared-table') as HTMLInputElement;
      const newTableRadio = modal.querySelector('#strategy-new-table') as HTMLInputElement;
      const strategyContainer = modal.querySelector('#strategy-fields-container') as HTMLElement;

      const updateStrategyFields = () => {
        const strategy = sharedTableRadio?.checked ? 'shared-table' : 'new-table';
        const vendorValue = (modal.querySelector('#duplicate-vendor') as HTMLInputElement)?.value || sourceVendor;
        const nameValue = (modal.querySelector('#duplicate-name') as HTMLInputElement)?.value || sourceBlockName;
        const suggestedIdentifier = `${vendorValue}_${nameValue}`.toLowerCase().replace(/[/-]/g, '_');

        if (strategy === 'shared-table') {
          strategyContainer.innerHTML = `
            <div class="form-group mb-3">
              <label for="custom-type-name" class="form-label">Type Name</label>
              <input type="text" class="form-control" id="custom-type-name" name="typeName" value="${suggestedIdentifier}" required pattern="[a-zA-Z0-9_]+">
              <div class="form-text">Unique identifier for this type in the shared table</div>
              <div id="type-name-validation" class="mt-2"></div>
            </div>
          `;
        } else {
          strategyContainer.innerHTML = `
            <div class="form-group mb-3">
              <label for="custom-table-name" class="form-label">Table Name</label>
              <input type="text" class="form-control" id="custom-table-name" name="tableName" value="tx_${suggestedIdentifier}" required pattern="[a-zA-Z][a-zA-Z0-9_]*">
              <div class="form-text">Database table name (should start with tx_)</div>
              <div id="table-name-validation" class="mt-2"></div>
            </div>
          `;
        }

        // Set up real-time validation
        this.setupRecordTypeValidation(item, modal);
      };

      sharedTableRadio?.addEventListener('change', updateStrategyFields);
      newTableRadio?.addEventListener('change', updateStrategyFields);

      // Initial setup
      updateStrategyFields();
    }
  }

  protected setupRecordTypeValidation(item: ContentBlockItem, modal: any): void {
    const sharedTableRadio = modal.querySelector('#strategy-shared-table') as HTMLInputElement;

    let validationTimer: number;
    const validationDelay = 500; // ms

    const performValidation = async () => {
      const typeNameInput = modal.querySelector('#custom-type-name') as HTMLInputElement;
      const tableNameInput = modal.querySelector('#custom-table-name') as HTMLInputElement;
      const typeNameValidationDiv = modal.querySelector('#type-name-validation') as HTMLElement;
      const tableNameValidationDiv = modal.querySelector('#table-name-validation') as HTMLElement;

      const currentStrategy = sharedTableRadio?.checked ? 'shared-table' : 'new-table';
      const validationValue = currentStrategy === 'shared-table' ? typeNameInput?.value : tableNameInput?.value;
      const validationDiv = currentStrategy === 'shared-table' ? typeNameValidationDiv : tableNameValidationDiv;
      const inputElement = currentStrategy === 'shared-table' ? typeNameInput : tableNameInput;

      if (!validationValue || !validationDiv || !inputElement) {
        return;
      }

      // Show loading state
      validationDiv.innerHTML = '<small class="text-muted">Validating...</small>';

      try {
        const url = new URL(
          (window as any).TYPO3.settings.ajaxUrls.content_blocks_gui_validate_record_duplication,
          window.location.origin
        );
        url.searchParams.append('sourceName', item.name);
        url.searchParams.append('duplicationStrategy', currentStrategy);

        if (currentStrategy === 'shared-table') {
          url.searchParams.append('typeName', validationValue);
        } else {
          url.searchParams.append('tableName', validationValue);
        }

        const request = new AjaxRequest(url.toString());
        const response = await request.get();
        const result = await response.resolve();

        if (result.valid) {
          validationDiv.innerHTML = '<small class="text-success">✓ Valid</small>';
          inputElement.classList.remove('is-invalid');
          inputElement.classList.add('is-valid');
        } else {
          const errorMessages = result.errors.join('<br>');
          validationDiv.innerHTML = `<small class="text-danger">${errorMessages}</small>`;
          inputElement.classList.remove('is-valid');
          inputElement.classList.add('is-invalid');
        }
      } catch (error) {
        console.error('[ContentBlockList] Validation error:', error);
        validationDiv.innerHTML = '<small class="text-danger">Validation failed</small>';
      }
    };

    // Set up debounced validation on input
    const typeNameInput = modal.querySelector('#custom-type-name') as HTMLInputElement;
    const tableNameInput = modal.querySelector('#custom-table-name') as HTMLInputElement;

    const debouncedValidation = () => {
      clearTimeout(validationTimer);
      validationTimer = window.setTimeout(performValidation, validationDelay);
    };

    typeNameInput?.addEventListener('input', debouncedValidation);
    tableNameInput?.addEventListener('input', debouncedValidation);

    // Perform initial validation
    performValidation();
  }

  protected handleDuplicateBasic(item: ContentBlockItem): void {
    // Generate extension options
    let extensionOptions = '';
    this.availableExtensions.forEach((ext: any) => {
      const selected = ext.extension === item.extension ? 'selected' : '';
      extensionOptions += `<option value="${ext.extension}" ${selected}>${ext.package} (${ext.extension})</option>`;
    });

    // Create content as a DOM element
    const content = document.createElement('div');
    content.innerHTML = `
      <form id="duplicate-basic-form">
        <div class="alert alert-info mb-3">
          <strong>Basic Duplication</strong><br>
          Duplicating Basic: <code>${item.name}</code>
        </div>
        <div class="form-group mb-3">
          <label for="duplicate-extension" class="form-label">Extension</label>
          <select class="form-control form-select" id="duplicate-extension" name="extension" required>
            ${extensionOptions}
          </select>
          <div class="form-text">The extension where the duplicated basic will be stored</div>
        </div>
        <div class="form-group mb-3">
          <label for="duplicate-identifier" class="form-label">Basic Identifier</label>
          <input type="text" class="form-control" id="duplicate-identifier" name="identifier" value="${item.name}-copy" required pattern="[a-z0-9\\-\\/]+">
          <div class="form-text">Format: vendor/name (e.g., basic-99/basic-99-copy)</div>
          <div id="duplicate-identifier-error" class="text-danger d-none">The new identifier must be different from the original</div>
        </div>
      </form>
    `;

    const modal = Modal.advanced({
      title: 'Duplicate Basic',
      content: content,
      severity: SeverityEnum.info,
      size: Modal.sizes.medium,
      buttons: [
        {
          text: 'Cancel',
          active: true,
          btnClass: 'btn-default',
          name: 'cancel',
          trigger: () => {
            modal.hideModal();
          }
        },
        {
          text: 'Duplicate',
          btnClass: 'btn-primary',
          name: 'duplicate',
          trigger: () => {
            if (this.validateAndSubmitDuplicateBasic(item.name, item.duplicateUrl, modal)) {
              modal.hideModal();
            }
          }
        }
      ]
    });
  }

  protected validateAndSubmitDuplicateBasic(sourceIdentifier: string, duplicateUrl: string, modal: any): boolean {
    // Search within the modal element
    const form = modal.querySelector('#duplicate-basic-form') as HTMLFormElement;
    if (!form) {
      return false;
    }

    const extension = modal.querySelector('#duplicate-extension') as HTMLSelectElement;
    const identifier = modal.querySelector('#duplicate-identifier') as HTMLInputElement;
    const errorDiv = modal.querySelector('#duplicate-identifier-error') as HTMLElement;

    const extensionValue = extension?.value;
    const identifierValue = identifier?.value;

    if (!extensionValue || !identifierValue) {
      console.error('[ContentBlockList] Missing form values');
      return false;
    }

    // Validate pattern
    const pattern = /^[a-z0-9/-]+$/;
    if (!pattern.test(identifierValue)) {
      console.error('[ContentBlockList] Invalid pattern');
      if (!form.checkValidity()) {
        form.reportValidity();
      }
      return false;
    }

    // Check if the new identifier is the same as the old identifier
    if (identifierValue === sourceIdentifier) {
      // Show error message
      if (errorDiv) {
        errorDiv.classList.remove('d-none');
      }
      if (identifier) {
        identifier.classList.add('is-invalid');
        identifier.focus();
      }
      return false;
    }

    // Hide error message if it was shown
    if (errorDiv) {
      errorDiv.classList.add('d-none');
    }
    if (identifier) {
      identifier.classList.remove('is-invalid');
    }

    // Build URL with query parameters
    const url = new URL(duplicateUrl, window.location.origin);
    url.searchParams.append('targetExtension', extensionValue);
    url.searchParams.append('targetIdentifier', identifierValue);
    url.searchParams.append('returnTab', this.activeTab);

    // Navigate to the backend route (PHP will handle redirect)
    window.location.href = url.toString();

    return true;
  }

  protected validateAndSubmitDuplicate(item: ContentBlockItem, sourceVendor: string, sourceBlockName: string, modal: any): boolean {
    // Search within the modal element
    const form = modal.querySelector('#duplicate-content-block-form') as HTMLFormElement;
    if (!form) {
      return false;
    }

    const extension = modal.querySelector('#duplicate-extension') as HTMLSelectElement;
    const vendor = modal.querySelector('#duplicate-vendor') as HTMLInputElement;
    const name = modal.querySelector('#duplicate-name') as HTMLInputElement;
    const errorDiv = modal.querySelector('#duplicate-name-error') as HTMLElement;
    const nameInput = modal.querySelector('#duplicate-name') as HTMLInputElement;

    const extensionValue = extension?.value;
    const vendorValue = vendor?.value;
    const nameValue = name?.value;

    if (!extensionValue || !vendorValue || !nameValue) {
      console.error('[ContentBlockList] Missing form values');
      return false;
    }

    // Validate pattern
    const pattern = /^[a-z0-9-]+$/;
    if (!pattern.test(vendorValue) || !pattern.test(nameValue)) {
      console.error('[ContentBlockList] Invalid pattern');
      if (!form.checkValidity()) {
        form.reportValidity();
      }
      return false;
    }

    // Check if the new name is the same as the old name
    if (vendorValue === sourceVendor && nameValue === sourceBlockName) {
      // Show error message
      if (errorDiv) {
        errorDiv.classList.remove('d-none');
      }
      if (nameInput) {
        nameInput.classList.add('is-invalid');
        nameInput.focus();
      }
      return false;
    }

    // Hide error message if it was shown
    if (errorDiv) {
      errorDiv.classList.add('d-none');
    }
    if (nameInput) {
      nameInput.classList.remove('is-invalid');
    }

    // Build URL with query parameters
    const url = new URL(item.duplicateUrl, window.location.origin);
    url.searchParams.append('targetExtension', extensionValue);
    url.searchParams.append('targetVendor', vendorValue);
    url.searchParams.append('targetName', nameValue);

    // Add RecordType strategy parameters if applicable
    const isMultiTypeRecordType = item.contentType === 'RECORD_TYPE' && item.typeField;
    if (isMultiTypeRecordType) {
      const sharedTableRadio = modal.querySelector('#strategy-shared-table') as HTMLInputElement;
      const strategy = sharedTableRadio?.checked ? 'shared-table' : 'new-table';

      url.searchParams.append('duplicationStrategy', strategy);

      if (strategy === 'shared-table') {
        const typeNameInput = modal.querySelector('#custom-type-name') as HTMLInputElement;
        if (typeNameInput?.value) {
          url.searchParams.append('customTypeName', typeNameInput.value);
        }
      } else {
        const tableNameInput = modal.querySelector('#custom-table-name') as HTMLInputElement;
        if (tableNameInput?.value) {
          url.searchParams.append('customTableName', tableNameInput.value);
        }
      }
    }

    // Append current tab for redirect back
    url.searchParams.append('returnTab', this.activeTab);

    // Navigate to the backend route (PHP will handle redirect)
    window.location.href = url.toString();

    return true;
  }

  /**
   * Toggle selection mode on/off
   */
  protected toggleSelectionMode(): void {
    this.selectionMode = !this.selectionMode;
    if (!this.selectionMode) {
      this.selectedBlocks.clear();
    }
  }

  /**
   * Toggle selection of a single block
   */
  protected toggleBlockSelection(identifier: string, type: string): void {
    const key = `${type}:${identifier}`;
    if (this.selectedBlocks.has(key)) {
      this.selectedBlocks.delete(key);
    } else {
      this.selectedBlocks.add(key);
    }
    this.requestUpdate();
  }

  /**
   * Handle multi-select download
   */
  protected async handleMultiDownload(): Promise<void> {
    if (this.selectedBlocks.size === 0) {
      Modal.confirm(
        'No Selection',
        'Please select at least one content block or basic.',
        SeverityEnum.warning,
        [
          {
            text: 'OK',
            active: true,
            btnClass: 'btn-default',
            trigger: (): void => {
              Modal.dismiss();
            }
          }
        ]
      );
      return;
    }

    // Convert selected blocks to array
    const selected = Array.from(this.selectedBlocks).map(key => {
      const [type, identifier] = key.split(':', 2);
      return { type, identifier };
    });

    try {
      // Call AJAX endpoint
      const response = await new AjaxRequest(TYPO3.settings.ajaxUrls.content_blocks_gui_multi_download)
        .post({ blocks: selected });

      // Get the response as blob for file download
      const blob = await response.raw().blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      // Extract filename from Content-Disposition header or use default
      const disposition = response.raw().headers.get('Content-Disposition');
      let filename = `${selected.length}-blocks_${Date.now()}.zip`;
      if (disposition) {
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      // Exit selection mode after successful download
      this.toggleSelectionMode();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Modal.confirm(
        'Download Failed',
        `Error downloading content blocks: ${errorMessage}`,
        SeverityEnum.error,
        [
          {
            text: 'OK',
            active: true,
            btnClass: 'btn-default',
            trigger: (): void => {
              Modal.dismiss();
            }
          }
        ]
      );
    }
  }

  /**
   * Open upload modal
   */
  protected openUploadModal(): void {
    // Create container with upload component
    const content = document.createElement('div');
    const uploadComponent = document.createElement('content-block-upload') as any;

    content.appendChild(uploadComponent);

    // Pass available extensions after component is connected
    setTimeout(() => {
      uploadComponent.availableExtensions = this.availableExtensions;
    }, 0);

    const modal = Modal.advanced({
      title: 'Upload Content Block(s)',
      content: content,
      size: Modal.sizes.large,
      buttons: []
    });

    // Listen for close event from upload component
    uploadComponent.addEventListener('close', () => {
      modal.hideModal();
    });
  }

  private readonly handleUploadButtonClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement;
    if (target.closest('[data-action="upload-content-blocks"]')) {
      event.preventDefault();
      this.openUploadModal();
    }
  };
}
