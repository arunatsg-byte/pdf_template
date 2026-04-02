export type ViewMode = 'design' | 'html' | 'split';
export type LayoutMode = 'single' | 'two-column';
export type WidthOption = 'full' | 'half';
export type FieldSource = 'json' | 'custom';
export type FieldControlType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'number'
  | 'tel'
  | 'date'
  | 'dropdown'
  | 'radio'
  | 'checkbox'
  | 'checkbox-group';
export type FieldAlignmentMode = 'inherit' | 'inline' | 'stacked';
export type ResolvedFieldAlignmentMode = 'inline' | 'stacked';
export type HorizontalAlign = 'inherit' | 'start' | 'end';
export type ResolvedHorizontalAlign = 'start' | 'end';
export type VerticalAlign = 'inherit' | 'start' | 'center';
export type ResolvedVerticalAlign = 'start' | 'center';
export type PageOrientation = 'portrait' | 'landscape';
export type PageRegionAlignment = 'start' | 'center' | 'end';
export type BlockKind =
  | 'field'
  | 'section'
  | 'paragraph'
  | 'note'
  | 'declaration'
  | 'divider'
  | 'static-label'
  | 'link'
  | 'page-break';
export type PaletteItemKind =
  | 'custom-field'
  | 'section'
  | 'paragraph'
  | 'note'
  | 'declaration'
  | 'divider'
  | 'static-label'
  | 'link'
  | 'page-break';

export interface JsonField {
  key: string;
  label: string;
  preview: string;
  type: 'string' | 'number' | 'boolean';
  value: string | number | boolean;
}

export interface ChoiceOption {
  id: string;
  label: string;
  value: string;
}

export interface ValidationConfig {
  minLength: string;
  maxLength: string;
  min: string;
  max: string;
  pattern: string;
  customError: string;
}

export interface FormLayoutSettings {
  defaultFieldLayout: ResolvedFieldAlignmentMode;
  defaultLabelWidth: number;
  defaultLabelAlign: ResolvedHorizontalAlign;
  defaultVerticalAlign: ResolvedVerticalAlign;
  rowGap: string;
}

export interface PageRegionConfig {
  enabled: boolean;
  eyebrow: string;
  title: string;
  body: string;
  metaText: string;
  logoUrl: string;
  showPageNumber: boolean;
  showDate: boolean;
  divider: boolean;
  align: PageRegionAlignment;
}

export interface PageSettings {
  size: 'A4';
  orientation: PageOrientation;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
  pageGap: string;
  headerHeight: string;
  footerHeight: string;
  autoPaginate: boolean;
  defaultHeader: PageRegionConfig;
  defaultFooter: PageRegionConfig;
}

export interface PageOverride {
  id: string;
  pageNumber: number;
  useCustomHeader: boolean;
  useCustomFooter: boolean;
  header: PageRegionConfig;
  footer: PageRegionConfig;
}

interface BaseBlock {
  id: string;
  kind: BlockKind;
  width: WidthOption;
}

export interface FieldBlock extends BaseBlock {
  kind: 'field';
  source: FieldSource;
  fieldKey: string | null;
  bindingKey: string;
  label: string;
  controlType: FieldControlType;
  placeholder: string;
  helperText: string;
  required: boolean;
  hideLabel: boolean;
  inline: boolean;
  defaultValue: string;
  options: ChoiceOption[];
  validation: ValidationConfig;
  alignmentMode: FieldAlignmentMode;
  labelWidth: number;
  labelAlign: HorizontalAlign;
  verticalAlign: VerticalAlign;
}

export interface SectionBlock extends BaseBlock {
  kind: 'section';
  title: string;
  subtitle: string;
}

export interface ParagraphBlock extends BaseBlock {
  kind: 'paragraph';
  content: string;
}

export interface NoteBlock extends BaseBlock {
  kind: 'note';
  content: string;
  emphasis: 'info' | 'warning';
}

export interface DeclarationBlock extends BaseBlock {
  kind: 'declaration';
  name: string;
  content: string;
  helperText: string;
  required: boolean;
  checkedByDefault: boolean;
}

export interface DividerBlock extends BaseBlock {
  kind: 'divider';
  style: 'line' | 'space';
}

export interface StaticLabelBlock extends BaseBlock {
  kind: 'static-label';
  content: string;
  tone: 'muted' | 'strong';
}

export interface LinkBlock extends BaseBlock {
  kind: 'link';
  text: string;
  href: string;
  openInNewTab: boolean;
}

export interface PageBreakBlock extends BaseBlock {
  kind: 'page-break';
  title: string;
}

export type BuilderBlock =
  | FieldBlock
  | SectionBlock
  | ParagraphBlock
  | NoteBlock
  | DeclarationBlock
  | DividerBlock
  | StaticLabelBlock
  | LinkBlock
  | PageBreakBlock;

export interface ThemePreset {
  id: string;
  name: string;
  pageBackground: string;
  surfaceBackground: string;
  panelBackground: string;
  sectionBackground: string;
  sectionText: string;
  primary: string;
  primaryText: string;
  text: string;
  mutedText: string;
  labelText: string;
  border: string;
  inputBackground: string;
  inputText: string;
  focus: string;
  required: string;
  error: string;
  noteBackground: string;
  noteBorder: string;
  link: string;
  radius: string;
  headingFont: string;
  bodyFont: string;
}

export interface SavedTemplate {
  id: string;
  name: string;
  jsonInput: string;
  layoutMode: LayoutMode;
  blocks: BuilderBlock[];
  themeId: string;
  themeSnapshot: ThemePreset;
  formLayout: FormLayoutSettings;
  pageSettings: PageSettings;
  pageOverrides: PageOverride[];
  updatedAt: string;
}

export interface PaletteItem {
  kind: PaletteItemKind;
  title: string;
  description: string;
}

export interface SelectOption<T extends string> {
  value: T;
  label: string;
}

export const SAMPLE_JSON = `{
  "userld": 12345,
  "username": "elara_quinn",
  "email": "elara.quinn@example.com",
  "firstName": "Elara",
  "lastName": "Doe",
  "age": 28,
  "isActive": true,
  "role": "user"
}`;

export const DEFAULT_THEME: ThemePreset = {
  id: 'theme-default',
  name: 'Citi Enterprise Blue',
  pageBackground: '#f3f7fb',
  surfaceBackground: '#ffffff',
  panelBackground: '#f7f9fc',
  sectionBackground: '#0f3d75',
  sectionText: '#ffffff',
  primary: '#005aa8',
  primaryText: '#ffffff',
  text: '#112b5f',
  mutedText: '#5f7194',
  labelText: '#14376d',
  border: '#c8d6e8',
  inputBackground: '#ffffff',
  inputText: '#112b5f',
  focus: '#005aa8',
  required: '#c61f36',
  error: '#c61f36',
  noteBackground: '#edf4fb',
  noteBorder: '#b8cde7',
  link: '#005aa8',
  radius: '16px',
  headingFont: '"Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif',
  bodyFont: '"Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif'
};

export const DEFAULT_FORM_LAYOUT: FormLayoutSettings = {
  defaultFieldLayout: 'inline',
  defaultLabelWidth: 34,
  defaultLabelAlign: 'start',
  defaultVerticalAlign: 'center',
  rowGap: '16px'
};

export const DEFAULT_PAGE_REGION: PageRegionConfig = {
  enabled: false,
  eyebrow: '',
  title: '',
  body: '',
  metaText: '',
  logoUrl: '',
  showPageNumber: false,
  showDate: false,
  divider: false,
  align: 'start'
};

export const DEFAULT_PAGE_SETTINGS: PageSettings = {
  size: 'A4',
  orientation: 'portrait',
  marginTop: '18mm',
  marginRight: '16mm',
  marginBottom: '18mm',
  marginLeft: '16mm',
  pageGap: '24px',
  headerHeight: '18mm',
  footerHeight: '16mm',
  autoPaginate: true,
  defaultHeader: {
    ...DEFAULT_PAGE_REGION,
    enabled: true,
    title: 'Accessible Application Form',
    body: 'Complete the following sections carefully before printing.',
    showPageNumber: true,
    divider: true
  },
  defaultFooter: {
    ...DEFAULT_PAGE_REGION,
    enabled: true,
    body: 'Generated from the ADA-first Thymeleaf builder.',
    showPageNumber: true,
    showDate: true,
    divider: true,
    align: 'end'
  }
};

export const FONT_CHOICES = [
  '"Avenir Next", "Helvetica Neue", "Segoe UI", Arial, sans-serif',
  '"Helvetica Neue", "Segoe UI", Arial, sans-serif',
  '"Segoe UI", Arial, sans-serif',
  'Arial, sans-serif'
];

export const CONTROL_TYPE_OPTIONS: Array<SelectOption<FieldControlType>> = [
  { value: 'text', label: 'Text input' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'email', label: 'Email input' },
  { value: 'number', label: 'Number input' },
  { value: 'tel', label: 'Telephone input' },
  { value: 'date', label: 'Date input' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'radio', label: 'Radio group' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'checkbox-group', label: 'Checkbox group' }
];

export const WIDTH_OPTIONS: Array<SelectOption<WidthOption>> = [
  { value: 'full', label: 'Full width' },
  { value: 'half', label: 'Half width' }
];

export const LAYOUT_OPTIONS: Array<SelectOption<LayoutMode>> = [
  { value: 'single', label: 'Single column' },
  { value: 'two-column', label: 'Two columns' }
];

export const VIEW_MODE_OPTIONS: Array<SelectOption<ViewMode>> = [
  { value: 'design', label: 'Designer' },
  { value: 'html', label: 'Generate HTML' },
  { value: 'split', label: 'Side by side' }
];

export const FIELD_ALIGNMENT_OPTIONS: Array<SelectOption<FieldAlignmentMode>> = [
  { value: 'inherit', label: 'Use global setting' },
  { value: 'inline', label: 'Label and field inline' },
  { value: 'stacked', label: 'Label above field' }
];

export const RESOLVED_FIELD_ALIGNMENT_OPTIONS: Array<SelectOption<ResolvedFieldAlignmentMode>> = [
  { value: 'inline', label: 'Label and field inline' },
  { value: 'stacked', label: 'Label above field' }
];

export const LABEL_ALIGN_OPTIONS: Array<SelectOption<HorizontalAlign>> = [
  { value: 'inherit', label: 'Use global setting' },
  { value: 'start', label: 'Align left' },
  { value: 'end', label: 'Align right' }
];

export const RESOLVED_LABEL_ALIGN_OPTIONS: Array<SelectOption<ResolvedHorizontalAlign>> = [
  { value: 'start', label: 'Align left' },
  { value: 'end', label: 'Align right' }
];

export const VERTICAL_ALIGN_OPTIONS: Array<SelectOption<VerticalAlign>> = [
  { value: 'inherit', label: 'Use global setting' },
  { value: 'start', label: 'Align top' },
  { value: 'center', label: 'Align center' }
];

export const RESOLVED_VERTICAL_ALIGN_OPTIONS: Array<SelectOption<ResolvedVerticalAlign>> = [
  { value: 'start', label: 'Align top' },
  { value: 'center', label: 'Align center' }
];

export const PAGE_ORIENTATION_OPTIONS: Array<SelectOption<PageOrientation>> = [
  { value: 'portrait', label: 'Portrait' },
  { value: 'landscape', label: 'Landscape' }
];

export const PAGE_REGION_ALIGN_OPTIONS: Array<SelectOption<PageRegionAlignment>> = [
  { value: 'start', label: 'Align left' },
  { value: 'center', label: 'Align center' },
  { value: 'end', label: 'Align right' }
];

export const MANUAL_BLOCKS: PaletteItem[] = [
  {
    kind: 'custom-field',
    title: 'Custom field',
    description: 'Create an editable field that is not tied to the input JSON.'
  },
  {
    kind: 'section',
    title: 'Section heading',
    description: 'Add a major grouping title and optional subtitle.'
  },
  {
    kind: 'paragraph',
    title: 'Instruction paragraph',
    description: 'Insert explanatory text or process guidance.'
  },
  {
    kind: 'note',
    title: 'Mandatory note',
    description: 'Highlight a warning or helpful message block.'
  },
  {
    kind: 'declaration',
    title: 'Consent checkbox',
    description: 'Add a declaration or agreement checkbox.'
  },
  {
    kind: 'divider',
    title: 'Divider',
    description: 'Separate groups of content with spacing or a line.'
  },
  {
    kind: 'static-label',
    title: 'Static label',
    description: 'Add a plain text label or short note.'
  },
  {
    kind: 'link',
    title: 'Link',
    description: 'Add a standalone hyperlink block.'
  },
  {
    kind: 'page-break',
    title: 'Page break',
    description: 'Force the next block to start on a new A4 page.'
  }
];
