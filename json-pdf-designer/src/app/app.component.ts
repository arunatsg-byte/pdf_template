import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

type ViewMode = 'design' | 'html' | 'split';
type DragItem =
  | { type: 'field'; fieldKey: string }
  | { type: 'block'; blockId: string }
  | null;

interface JsonField {
  key: string;
  label: string;
  preview: string;
  type: string;
  path: Array<string | number>;
}

interface TemplateBlock {
  id: string;
  fieldKey?: string;
  label: string;
  kind: 'field' | 'heading' | 'divider';
  width: 'full' | 'half';
  emphasis: 'default' | 'strong';
  visibleLabel: boolean;
  controlType: 'text' | 'label' | 'dropdown' | 'radio';
  required: boolean;
  optionsText: string;
}

interface ThemePreset {
  id: string;
  name: string;
  pageBackground: string;
  canvasBackground: string;
  panelBackground: string;
  accent: string;
  text: string;
  mutedText: string;
  border: string;
  headingFont: string;
  bodyFont: string;
  radius: string;
}

interface SavedTemplate {
  id: string;
  name: string;
  jsonInput: string;
  blocks: TemplateBlock[];
  themeId: string;
  updatedAt: string;
}

const SAMPLE_JSON = `{
  "userld": 12345,
  "username": "elara_quinn",
  "email": "elara.quinn@example.com",
  "firstName": "Elara",
  "lastName": "Doe",
  "age": 28,
  "isActive": true,
  "role": "user"
}`;

const DEFAULT_THEME: ThemePreset = {
  id: 'theme-default',
  name: 'Sandstone Editorial',
  pageBackground: '#f4efe6',
  canvasBackground: '#fffdfa',
  panelBackground: '#fffaf4',
  accent: '#0b5d52',
  text: '#1f2933',
  mutedText: '#52606d',
  border: '#d9cbb8',
  headingFont: '"Iowan Old Style", "Palatino Linotype", serif',
  bodyFont: '"Avenir Next", "Segoe UI", sans-serif',
  radius: '20px'
};

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  readonly storageThemeKey = 'json-pdf-designer-themes';
  readonly storageTemplateKey = 'json-pdf-designer-templates';

  readonly sampleJson = SAMPLE_JSON;
  readonly fontChoices = [
    '"Avenir Next", "Segoe UI", sans-serif',
    '"Gill Sans", "Trebuchet MS", sans-serif',
    '"Iowan Old Style", "Palatino Linotype", serif',
    '"Georgia", "Times New Roman", serif'
  ];
  readonly controlTypes: Array<TemplateBlock['controlType']> = ['text', 'label', 'dropdown', 'radio'];

  viewMode: ViewMode = 'split';
  jsonInput = SAMPLE_JSON;
  templateName = 'Profile Summary';
  themeDraft: ThemePreset = { ...DEFAULT_THEME };
  statusMessage = 'Ready. Paste JSON or upload a file to start designing.';

  parsedJson: unknown = {};
  jsonFields: JsonField[] = [];
  blocks: TemplateBlock[] = [];
  dragItem: DragItem = null;

  themes: ThemePreset[] = [DEFAULT_THEME];
  selectedThemeId = DEFAULT_THEME.id;
  savedTemplates: SavedTemplate[] = [];

  ngOnInit(): void {
    this.loadSavedThemes();
    this.loadSavedTemplates();
    this.parseJsonInput();
  }

  get activeTheme(): ThemePreset {
    return this.themes.find((theme) => theme.id === this.selectedThemeId) ?? this.themes[0];
  }

  get previewDocument(): string {
    return this.buildThymeleafDocument(false);
  }

  get thymeleafMarkup(): string {
    return this.buildThymeleafDocument(true);
  }

  setViewMode(mode: ViewMode): void {
    this.viewMode = mode;
  }

  parseJsonInput(): void {
    try {
      this.parsedJson = JSON.parse(this.jsonInput);
      this.jsonFields = this.flattenJson(this.parsedJson);

      if (!this.jsonFields.length) {
        this.blocks = [];
        this.statusMessage = 'JSON loaded, but only nested empty objects or arrays were found.';
        return;
      }

      this.blocks = this.blocks
        .filter((block) => block.kind !== 'field' || this.jsonFields.some((field) => field.key === block.fieldKey))
        .map((block) => ({ ...block }));

      if (!this.blocks.length) {
        this.blocks = this.jsonFields.map((field, index) => this.createFieldBlock(field, index < 2 ? 'half' : 'full'));
      }

      this.statusMessage = `Loaded ${this.jsonFields.length} JSON properties into the designer canvas.`;
    } catch {
      this.statusMessage = 'The JSON could not be parsed. Please fix the syntax and try again.';
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.jsonInput = String(reader.result ?? '');
      this.parseJsonInput();
    };
    reader.readAsText(file);
    input.value = '';
  }

  startFieldDrag(fieldKey: string): void {
    this.dragItem = { type: 'field', fieldKey };
  }

  startBlockDrag(blockId: string): void {
    this.dragItem = { type: 'block', blockId };
  }

  clearDrag(): void {
    this.dragItem = null;
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  dropAt(index: number): void {
    if (!this.dragItem) {
      return;
    }

    if (this.dragItem.type === 'field') {
      const fieldKey = this.dragItem.fieldKey;
      const field = this.jsonFields.find((item) => item.key === fieldKey);
      if (field) {
        this.blocks.splice(index, 0, this.createFieldBlock(field));
        this.statusMessage = `${field.label} added to the layout.`;
      }
    }

    if (this.dragItem.type === 'block') {
      const blockId = this.dragItem.blockId;
      const currentIndex = this.blocks.findIndex((block) => block.id === blockId);
      if (currentIndex >= 0) {
        const [block] = this.blocks.splice(currentIndex, 1);
        const nextIndex = currentIndex < index ? index - 1 : index;
        this.blocks.splice(nextIndex, 0, block);
        this.statusMessage = `${block.label} moved in the layout.`;
      }
    }

    this.clearDrag();
  }

  addHeading(): void {
    this.blocks.push({
      id: this.createId(),
      kind: 'heading',
      label: 'Section Heading',
      width: 'full',
      emphasis: 'strong',
      visibleLabel: true,
      controlType: 'label',
      required: false,
      optionsText: ''
    });
  }

  addDivider(): void {
    this.blocks.push({
      id: this.createId(),
      kind: 'divider',
      label: 'Divider',
      width: 'full',
      emphasis: 'default',
      visibleLabel: false,
      controlType: 'label',
      required: false,
      optionsText: ''
    });
  }

  removeBlock(blockId: string): void {
    this.blocks = this.blocks.filter((block) => block.id !== blockId);
  }

  moveBlock(blockId: string, direction: -1 | 1): void {
    const index = this.blocks.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= this.blocks.length) {
      return;
    }

    const [block] = this.blocks.splice(index, 1);
    this.blocks.splice(nextIndex, 0, block);
  }

  applyTheme(themeId: string): void {
    const theme = this.themes.find((item) => item.id === themeId);
    if (!theme) {
      return;
    }

    this.selectedThemeId = theme.id;
    this.themeDraft = { ...theme };
    this.statusMessage = `${theme.name} applied to the current template.`;
  }

  saveTheme(): void {
    const shouldForkDefaultTheme = this.themeDraft.id === DEFAULT_THEME.id;
    const themeId = shouldForkDefaultTheme ? this.createId() : this.themeDraft.id || this.createId();
    const nextTheme: ThemePreset = { ...this.themeDraft, id: themeId };
    const existingIndex = this.themes.findIndex((theme) => theme.id === themeId);

    if (existingIndex >= 0) {
      this.themes[existingIndex] = nextTheme;
    } else {
      this.themes.push(nextTheme);
    }

    this.selectedThemeId = themeId;
    this.themeDraft = { ...nextTheme };
    this.persistThemes();
    this.statusMessage = `${nextTheme.name} saved for reuse across templates.`;
  }

  loadTemplate(templateId: string): void {
    const template = this.savedTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    this.templateName = template.name;
    this.jsonInput = template.jsonInput;
    this.blocks = structuredClone(template.blocks);
    this.parseJsonInput();
    this.applyTheme(template.themeId);
    this.statusMessage = `${template.name} loaded from your template library.`;
  }

  saveTemplate(): void {
    const nextTemplate: SavedTemplate = {
      id: this.createSlug(this.templateName),
      name: this.templateName.trim() || 'Untitled Template',
      jsonInput: this.jsonInput,
      blocks: structuredClone(this.blocks),
      themeId: this.selectedThemeId,
      updatedAt: new Date().toISOString()
    };

    const existingIndex = this.savedTemplates.findIndex((item) => item.id === nextTemplate.id);
    if (existingIndex >= 0) {
      this.savedTemplates[existingIndex] = nextTemplate;
    } else {
      this.savedTemplates.unshift(nextTemplate);
    }

    this.persistTemplates();
    this.statusMessage = `${nextTemplate.name} saved with ${this.activeTheme.name}.`;
  }

  resetWorkspace(): void {
    this.templateName = 'Profile Summary';
    this.jsonInput = this.sampleJson;
    this.selectedThemeId = DEFAULT_THEME.id;
    this.themeDraft = { ...this.themes.find((theme) => theme.id === DEFAULT_THEME.id) ?? DEFAULT_THEME };
    this.blocks = [];
    this.parseJsonInput();
  }

  getFieldForBlock(block: TemplateBlock): JsonField | undefined {
    return this.jsonFields.find((item) => item.key === block.fieldKey);
  }

  usesChoiceOptions(block: TemplateBlock): boolean {
    return block.controlType === 'dropdown' || block.controlType === 'radio';
  }

  private flattenJson(value: unknown, parentPath: Array<string | number> = []): JsonField[] {
    if (value === null || value === undefined) {
      return [];
    }

    if (Array.isArray(value)) {
      return value.flatMap((entry, index) => this.flattenJson(entry, [...parentPath, index]));
    }

    if (typeof value === 'object') {
      return Object.entries(value as Record<string, unknown>).flatMap(([key, entry]) =>
        this.flattenJson(entry, [...parentPath, key])
      );
    }

    const key = this.pathToKey(parentPath);
    return [
      {
        key,
        label: this.pathToLabel(parentPath),
        preview: String(value),
        type: typeof value,
        path: parentPath
      }
    ];
  }

  private createFieldBlock(field: JsonField, width: 'full' | 'half' = 'full'): TemplateBlock {
    return {
      id: this.createId(),
      fieldKey: field.key,
      label: field.label,
      kind: 'field',
      width,
      emphasis: 'default',
      visibleLabel: true,
      controlType: 'text',
      required: false,
      optionsText: field.preview
    };
  }

  private buildThymeleafDocument(useExpressions: boolean): string {
    const blocks = this.blocks
      .map((block) => this.renderBlock(block, useExpressions))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${this.escapeHtml(this.templateName)}</title>
  <style>
    body {
      margin: 0;
      padding: 24px;
      font-family: Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      line-height: 1.5;
    }
    h1,
    h2 {
      margin: 0 0 16px;
      font-family: Arial, sans-serif;
    }
    form {
      display: block;
    }
    .field-grid {
      display: block;
    }
    .field-card {
      margin-bottom: 10px;
    }
    .field-label {
      display: block;
      margin-bottom: 4px;
      color: #111827;
      font-size: 1rem;
      font-weight: 600;
    }
    .required-mark {
      color: #b42318;
      font-weight: 700;
      margin-right: 4px;
    }
    .field-value {
      font-size: 1rem;
      font-weight: 400;
      word-break: break-word;
    }
    .field-value.strong {
      font-weight: 700;
    }
    .field-input,
    .field-select {
      width: 100%;
      max-width: 320px;
      border: 1px solid #9ca3af;
      border-radius: 0;
      padding: 6px 8px;
      background: #fff;
      color: #111827;
      font: inherit;
    }
    .field-input.strong,
    .field-select.strong {
      border-width: 2px;
      border-color: #111827;
    }
    .radio-group {
      display: grid;
      gap: 6px;
    }
    .radio-option {
      display: flex;
      gap: 8px;
      align-items: center;
      font-weight: 400;
    }
    .section-heading {
      margin: 0 0 16px;
      padding-top: 0;
      border-top: 0;
      font-size: 1.25rem;
    }
    .divider {
      border-top: 1px solid #d1d5db;
      margin: 12px 0;
    }
    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }
  </style>
</head>
<body>
  <main role="main" aria-labelledby="template-title">
    <h2 id="template-title">${this.escapeHtml(this.templateName)}</h2>
    <section aria-label="Template content">
      <form>
        <div class="field-grid">
          ${blocks}
        </div>
      </form>
    </section>
  </main>
</body>
</html>`;
  }

  private renderBlock(block: TemplateBlock, useExpressions: boolean): string {
    if (block.kind === 'heading') {
      return `<h2 class="section-heading">${this.escapeHtml(block.label)}</h2>`;
    }

    if (block.kind === 'divider') {
      return `<div class="divider" role="separator" aria-hidden="true"></div>`;
    }

    const field = this.jsonFields.find((item) => item.key === block.fieldKey);
    if (!field) {
      return '';
    }

    const fieldValue = this.buildThymeleafValue(field.path);
    const previewValue = this.escapeHtml(field.preview);
    const fieldId = this.createFieldDomId(field);
    const fieldName = this.createFieldName(field);
    const labelMarkup = block.visibleLabel
      ? `<label id="${block.id}-label" class="field-label" for="${fieldId}">${block.required ? '<span class="required-mark" aria-hidden="true">*</span><span class="sr-only">Required </span>' : ''}${this.escapeHtml(block.label)}:</label>`
      : `<span class="sr-only">${this.escapeHtml(block.label)}${block.required ? ' required' : ''}</span>`;

    return `<article class="field-card ${block.width}" aria-label="${this.escapeHtml(block.label)}">
  ${labelMarkup}
  ${this.renderFieldControl(block, fieldValue, previewValue, useExpressions, fieldId, fieldName)}
</article>`;
  }

  private renderFieldControl(
    block: TemplateBlock,
    fieldValue: string,
    previewValue: string,
    useExpressions: boolean,
    fieldId: string,
    fieldName: string
  ): string {
    const requiredAttribute = block.required ? ' required aria-required="true"' : '';

    if (block.controlType === 'label') {
      const thymeleafAttribute = useExpressions ? ` th:text="${fieldValue}"` : '';
      const value = useExpressions ? fieldValue : previewValue;
      return `<div class="field-value ${block.emphasis === 'strong' ? 'strong' : ''}"${thymeleafAttribute}>${value}</div>`;
    }

    if (block.controlType === 'text') {
      const valueAttribute = useExpressions ? ` th:value="${fieldValue}"` : ` value="${previewValue}"`;
      return `<input id="${fieldId}" name="${fieldName}" class="field-input ${block.emphasis === 'strong' ? 'strong' : ''}" type="text"${valueAttribute}${requiredAttribute} />`;
    }

    const options = this.parseOptions(block.optionsText, previewValue);

    if (block.controlType === 'dropdown') {
      const optionMarkup = options
        .map((option) => {
          const selectedAttribute = useExpressions
            ? ` th:selected="${fieldValue} == '${this.escapeAttribute(option)}'"`
            : option === previewValue ? ' selected' : '';
          return `<option value="${this.escapeAttribute(option)}"${selectedAttribute}>${this.escapeHtml(option)}</option>`;
        })
        .join('');

      return `<select id="${fieldId}" name="${fieldName}" class="field-select ${block.emphasis === 'strong' ? 'strong' : ''}"${requiredAttribute}>${optionMarkup}</select>`;
    }

    const radioName = fieldName;
    return `<div class="radio-group" role="radiogroup" aria-labelledby="${block.id}-label">
${options
  .map((option, index) => {
    const checkedAttribute = useExpressions
      ? ` th:checked="${fieldValue} == '${this.escapeAttribute(option)}'"`
      : option === previewValue ? ' checked' : '';
    return `  <label class="radio-option" for="${fieldId}-${index}">
    <input id="${fieldId}-${index}" type="radio" name="${radioName}" value="${this.escapeAttribute(option)}"${checkedAttribute}${requiredAttribute} />
    <span>${this.escapeHtml(option)}</span>
  </label>`;
  })
  .join('\n')}
</div>`;
  }

  private buildThymeleafValue(path: Array<string | number>): string {
    const accessor = path
      .map((part) => (typeof part === 'number' ? `[${part}]` : `['${String(part).replace(/'/g, "\\'")}']`))
      .join('');
    return `\${payload${accessor}}`;
  }

  private pathToKey(path: Array<string | number>): string {
    return path.map((part) => String(part)).join('.');
  }

  private createFieldDomId(field: JsonField): string {
    return this.pathToKey(field.path).replace(/[^a-zA-Z0-9_-]+/g, '').toLowerCase() || this.createId();
  }

  private createFieldName(field: JsonField): string {
    return this.pathToKey(field.path).replace(/[^a-zA-Z0-9_-]+/g, '_').toLowerCase();
  }

  private pathToLabel(path: Array<string | number>): string {
    return path
      .map((part) => String(part))
      .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' '))
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' / ');
  }

  private parseOptions(optionsText: string, fallbackValue: string): string[] {
    const options = optionsText
      .split(',')
      .map((option) => option.trim())
      .filter(Boolean);

    return options.length ? options : [fallbackValue];
  }

  private loadSavedThemes(): void {
    const raw = localStorage.getItem(this.storageThemeKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as ThemePreset[];
      const customThemes = parsed.filter((theme) => theme.id !== DEFAULT_THEME.id);
      this.themes = [DEFAULT_THEME, ...customThemes];
    } catch {
      this.themes = [DEFAULT_THEME];
    }
  }

  private loadSavedTemplates(): void {
    const raw = localStorage.getItem(this.storageTemplateKey);
    if (!raw) {
      return;
    }

    try {
      this.savedTemplates = JSON.parse(raw) as SavedTemplate[];
    } catch {
      this.savedTemplates = [];
    }
  }

  private persistThemes(): void {
    localStorage.setItem(this.storageThemeKey, JSON.stringify(this.themes));
  }

  private persistTemplates(): void {
    localStorage.setItem(this.storageTemplateKey, JSON.stringify(this.savedTemplates));
  }

  private createSlug(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || this.createId();
  }

  private createId(): string {
    return Math.random().toString(36).slice(2, 10);
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  private escapeAttribute(value: string): string {
    return this.escapeHtml(value).replaceAll('\n', ' ');
  }
}
