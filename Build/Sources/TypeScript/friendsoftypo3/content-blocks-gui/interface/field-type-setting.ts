// TODO: how to handle dynamic properties?
export interface FieldTypeItems {
  label: string;
  value?: string;
  labelChecked?: string;
  labelUnchecked?: string;
  invertStateDisplay?: boolean;
  lower?: number;
  upper?: number;
  step?: number;
  width?: number;
}

export interface FieldTypeProperty {
  name: string;
  dataType: string;
  required?: boolean;
  default?: string;
  items?: Array<FieldTypeItems>;
}

export interface FieldTypeSetting {
  icon: string;
  type: string;
  properties: Array<FieldTypeProperty>;
}
