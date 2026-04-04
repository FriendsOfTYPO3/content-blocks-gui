export type { FieldTypeItems, FieldTypeProperty, FieldTypeSetting } from '@friendsoftypo3/content-blocks-gui/interface/field-type-setting';
import type { FieldTypeItems } from '@friendsoftypo3/content-blocks-gui/interface/field-type-setting';

export interface ExtensionDefinition {
  vendor: string;
  package: string;
  extension: string;
  icon: string;
}

export interface GroupDefinition {
  key: string;
  label: string
}

export interface ValuePicker {
  items: Array<[string, string]>;
  enabled?: boolean;
}

export interface Range {
  lower: number;
  upper: number;
  enabled?: boolean;
}

export interface Slider {
  step: number;
  width: number;
  enabled?: boolean;
}

export interface AllowedTypes {
  types: Array<'page' | 'url' | 'file' | 'folder' | 'email' | 'telephone' | 'record' | '*'>;
  enabled?: boolean;
}

export interface AllowedCustomProperties {
  itemProcFunc: string;
  enabled?: boolean;
}

export interface Items {
  items: Array<FieldTypeItems>;
  enabled?: boolean;
}

export interface ContentBlockField {
  identifier: string;
  type: string;
  label: string;
  description?: string;
  useExistingField?: boolean;
  prefixFields?: boolean;
  prefixType?: string;
  displayCond?: string;
  onChange?: string;
  default?: string;
  placeholder?: string;
  required?: boolean;
  enableRichtext?: boolean;
  richtextConfiguration?: string;
  rows?: number;
  relationship?: string;
  maxitems?: number;
  minitems?: number;
  items?: Items;
  renderType?: string;
  allowedCustomProperties?: AllowedCustomProperties;
  format?: string;
  range?: Range;
  slider?: Slider;
  size?: number;
  valuePicker?: ValuePicker;
  allowedTypes?: Array<string>;
  ignoreIfNotInPalette?: boolean;
  fields?: Array<ContentBlockField>;

  // Internal tracking properties (not saved to YAML)
  _typeInjected?: boolean; // Type was auto-detected and injected
  _isBaseField?: boolean; // Field is a base TCA field
  _validation?: ValidationResult; // Validation state
}

export interface FieldMetadata {
  baseFields: Record<string, BaseFieldInfo>;
  systemReservedFields: string[];
  currentTable: string;
}

export interface BaseFieldInfo {
  type: string;
  tcaType: string;
  label: string;
  description: string;
}

export interface ValidationResult {
  valid: boolean;
  severity?: 'success' | 'warning' | 'error' | 'info';
  message?: string;
  detectedType?: string;
}

export interface BasicMetadata {
  identifier: string;
  vendor: string;
  name: string;
  fieldCount: number;
  path: string;
  extension: string;
}

export interface ContentBlocksYaml {
  fields: Array<ContentBlockField>;
  group: string;
  name: string;
  vendor?: string;
  prefixFields: boolean;
  prefixType: string;
  table: string;
  typeField: string;
  typeName: string;
  title?: string;
  vendorPrefix?: string;
  priority?: number;
  basics?: Array<string>;
}

export interface ContentBlocksIcon {
  iconPath: string;
  iconProvider: string;
  iconIdentifier: string;
}

export interface ContentBlockDefinition {
  extPath: string;
  hostExtension: string;
  icon: ContentBlocksIcon;
  iconHideInMenu: ContentBlocksIcon;
  name: string;
  yaml: ContentBlocksYaml;
}

export interface DropField {
  data: {
    identifier: string,
    type: string
  },
  position: number,
  level: number,
  parent?: ContentBlockField
}
