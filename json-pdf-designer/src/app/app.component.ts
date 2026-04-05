import { CommonModule } from '@angular/common';
import { AfterViewChecked, Component, ElementRef, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { buildFormDocument, buildPagePlan, PlannedPage } from './form-builder.renderer';
import {
  BuilderBlock,
  ChoiceOption,
  CONTROL_TYPE_OPTIONS,
  DEFAULT_FORM_LAYOUT,
  DEFAULT_PAGE_SETTINGS,
  DEFAULT_THEME,
  DeclarationBlock,
  DividerBlock,
  FIELD_ALIGNMENT_OPTIONS,
  FieldAlignmentMode,
  FieldBlock,
  FONT_CHOICES,
  FormLayoutSettings,
  HorizontalAlign,
  JsonField,
  LABEL_ALIGN_OPTIONS,
  LAYOUT_OPTIONS,
  LayoutMode,
  LinkBlock,
  MANUAL_BLOCKS,
  NoteBlock,
  PAGE_ORIENTATION_OPTIONS,
  PAGE_REGION_ALIGN_OPTIONS,
  PageBreakBlock,
  PageOverride,
  PageRegionConfig,
  PageSettings,
  PaletteItemKind,
  ParagraphBlock,
  RESOLVED_FIELD_ALIGNMENT_OPTIONS,
  RESOLVED_LABEL_ALIGN_OPTIONS,
  RESOLVED_VERTICAL_ALIGN_OPTIONS,
  SAMPLE_JSON,
  SavedTemplate,
  SectionBlock,
  StaticLabelBlock,
  ThemePreset,
  VERTICAL_ALIGN_OPTIONS,
  VerticalAlign,
  WIDTH_OPTIONS
} from './form-builder.models';
import {
  normalizeCssColor,
  normalizeCssLength,
  normalizeFontChoice,
  normalizeNumberInRange,
  normalizeString,
  normalizeUrl
} from './form-builder.sanitizers';

type DragItem =
  | { type: 'json-field'; fieldKey: string }
  | { type: 'palette-item'; kind: PaletteItemKind }
  | { type: 'existing-block'; blockId: string }
  | null;

type SettingsTab = 'data' | 'layout' | 'theme' | 'library';
type PaletteTab = 'fields' | 'blocks' | 'pages';
type PreviewMode = 'sample' | 'export';
type InspectorTab = 'content' | 'layout' | 'validation' | 'accessibility';
type AppThemeMode = 'light' | 'dark' | 'system';
type SidePanelTab = 'inspector' | 'html';
type ResizeHandle = 'left-center' | 'center-right';
type CopyFeedbackState = 'idle' | 'copied' | 'error';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, AfterViewChecked {
  @ViewChild('previewFocusFrame') previewFocusFrame?: ElementRef<HTMLIFrameElement>;
  @ViewChild('builderWorkspace') builderWorkspace?: ElementRef<HTMLElement>;
  @ViewChild('settingsPanelAnchor') settingsPanelAnchor?: ElementRef<HTMLElement>;
  @ViewChild('palettePanelAnchor') palettePanelAnchor?: ElementRef<HTMLElement>;
  @ViewChild('editorPanelAnchor') editorPanelAnchor?: ElementRef<HTMLElement>;

  private lastPreviewFrameDocument: string | null = null;
  private readonly builderHandleSizePx = 18;
  private readonly builderHandleSharePx = (this.builderHandleSizePx * 2) / 3;
  private readonly minPanelWidthPercent = 24;
  private readonly defaultPanelWidths = {
    left: 33.333,
    center: 33.334,
    right: 33.333
  };
  private thymeleafCopyFeedbackResetId: number | null = null;
  private resizeStartX = 0;
  private resizeStartWidths = { ...this.defaultPanelWidths };

  readonly storageThemeKey = 'json-pdf-designer-themes';
  readonly storageTemplateKey = 'json-pdf-designer-templates';
  readonly storageAppThemeKey = 'json-pdf-designer-app-theme';
  readonly storageGuideStateKey = 'json-pdf-designer-guide-state';

  readonly sampleJson = SAMPLE_JSON;
  readonly fontChoices = FONT_CHOICES;
  readonly controlTypeOptions = CONTROL_TYPE_OPTIONS;
  readonly widthOptions = WIDTH_OPTIONS;
  readonly layoutOptions = LAYOUT_OPTIONS;
  readonly manualBlocks = MANUAL_BLOCKS;
  readonly fieldAlignmentOptions = FIELD_ALIGNMENT_OPTIONS;
  readonly resolvedFieldAlignmentOptions = RESOLVED_FIELD_ALIGNMENT_OPTIONS;
  readonly labelAlignOptions = LABEL_ALIGN_OPTIONS;
  readonly resolvedLabelAlignOptions = RESOLVED_LABEL_ALIGN_OPTIONS;
  readonly verticalAlignOptions = VERTICAL_ALIGN_OPTIONS;
  readonly resolvedVerticalAlignOptions = RESOLVED_VERTICAL_ALIGN_OPTIONS;
  readonly pageOrientationOptions = PAGE_ORIENTATION_OPTIONS;
  readonly pageRegionAlignOptions = PAGE_REGION_ALIGN_OPTIONS;
  readonly settingsTabs: Array<{ value: SettingsTab; label: string; description: string }> = [
    { value: 'data', label: 'Data', description: 'Paste or upload a flat JSON payload and name the form.' },
    { value: 'layout', label: 'Layout', description: 'Tune page flow, spacing, headers, footers, and pagination.' },
    { value: 'theme', label: 'Theme', description: 'Shape the look and feel of the final document.' },
    { value: 'library', label: 'Library', description: 'Save reusable templates, import themes, and export HTML.' }
  ];
  readonly paletteTabs: Array<{ value: PaletteTab; label: string; description: string }> = [
    { value: 'fields', label: 'Fields', description: 'Bring payload fields into the form after loading JSON.' },
    { value: 'blocks', label: 'Content', description: 'Add headings, notes, dividers, custom inputs, and helpful copy.' },
    { value: 'pages', label: 'Pages', description: 'Review the page plan and place manual breaks when needed.' }
  ];
  readonly previewModes: Array<{ value: PreviewMode; label: string }> = [
    { value: 'sample', label: 'Sample Data' },
    { value: 'export', label: 'Browser Print Match' }
  ];
  readonly inspectorTabs: Array<{ value: InspectorTab; label: string }> = [
    { value: 'content', label: 'Content' },
    { value: 'layout', label: 'Layout' },
    { value: 'validation', label: 'Validation' },
    { value: 'accessibility', label: 'Accessibility' }
  ];
  readonly appThemeModes: Array<{ value: AppThemeMode; label: string }> = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ];
  readonly sidePanelTabs: Array<{ value: SidePanelTab; label: string }> = [
    { value: 'inspector', label: 'Edit' },
    { value: 'html', label: 'HTML' }
  ];

  settingsTab: SettingsTab = 'data';
  paletteTab: PaletteTab = 'fields';
  previewMode: PreviewMode = 'sample';
  inspectorTab: InspectorTab = 'content';
  appThemeMode: AppThemeMode = 'system';
  sidePanelTab: SidePanelTab = 'inspector';
  settingsExpanded = false;
  isPreviewFocusOpen = false;
  isGettingStartedOpen = true;
  activeResizeHandle: ResizeHandle | null = null;
  thymeleafCopyState: CopyFeedbackState = 'idle';
  jsonInput = SAMPLE_JSON;
  templateName = 'Accessible Application Form';
  layoutMode: LayoutMode = 'two-column';
  themeDraft: ThemePreset = structuredClone(DEFAULT_THEME);
  formLayout: FormLayoutSettings = structuredClone(DEFAULT_FORM_LAYOUT);
  pageSettings: PageSettings = structuredClone(DEFAULT_PAGE_SETTINGS);
  pageOverrides: PageOverride[] = [];
  selectedThemeId = DEFAULT_THEME.id;
  selectedPreviewPageNumber = 1;
  statusMessage = 'Ready. Start with the sample payload or open Data Setup to load your own flat JSON.';

  jsonFields: JsonField[] = [];
  blocks: BuilderBlock[] = [];
  selectedBlockId: string | null = null;
  dragItem: DragItem = null;
  panelWidths = { ...this.defaultPanelWidths };

  themes: ThemePreset[] = [DEFAULT_THEME];
  savedTemplates: SavedTemplate[] = [];

  ngOnInit(): void {
    this.loadAppThemeMode();
    this.loadGuideState();
    this.loadSavedThemes();
    this.loadSavedTemplates();
    this.resetWorkspace();
  }

  ngAfterViewChecked(): void {
    this.syncPreviewFrameDocument();
  }

  get activeTheme(): ThemePreset {
    return this.themeDraft;
  }

  get selectedBlock(): BuilderBlock | null {
    return this.blocks.find((block) => block.id === this.selectedBlockId) ?? null;
  }

  get selectedFieldBlock(): FieldBlock | null {
    const block = this.selectedBlock;
    return block?.kind === 'field' ? block : null;
  }

  get selectedSectionBlock(): SectionBlock | null {
    const block = this.selectedBlock;
    return block?.kind === 'section' ? block : null;
  }

  get selectedParagraphBlock(): ParagraphBlock | null {
    const block = this.selectedBlock;
    return block?.kind === 'paragraph' ? block : null;
  }

  get selectedNoteBlock(): NoteBlock | null {
    const block = this.selectedBlock;
    return block?.kind === 'note' ? block : null;
  }

  get selectedDeclarationBlock(): DeclarationBlock | null {
    const block = this.selectedBlock;
    return block?.kind === 'declaration' ? block : null;
  }

  get selectedDividerBlock(): DividerBlock | null {
    const block = this.selectedBlock;
    return block?.kind === 'divider' ? block : null;
  }

  get selectedStaticLabelBlock(): StaticLabelBlock | null {
    const block = this.selectedBlock;
    return block?.kind === 'static-label' ? block : null;
  }

  get selectedLinkBlock(): LinkBlock | null {
    const block = this.selectedBlock;
    return block?.kind === 'link' ? block : null;
  }

  get selectedPageBreakBlock(): PageBreakBlock | null {
    const block = this.selectedBlock;
    return block?.kind === 'page-break' ? block : null;
  }

  get pagePlan(): PlannedPage[] {
    return buildPagePlan({
      blocks: this.blocks,
      layoutMode: this.layoutMode,
      title: this.templateName.trim() || 'Untitled Form',
      pageSettings: this.pageSettings,
      pageOverrides: this.pageOverrides,
      formLayout: this.formLayout
    });
  }

  get selectedPreviewPage(): PlannedPage | null {
    return this.pagePlan.find((page) => page.pageNumber === this.selectedPreviewPageNumber) ?? this.pagePlan[0] ?? null;
  }

  get selectedPageOverride(): PageOverride | null {
    const pageNumber = this.selectedPreviewPage?.pageNumber;
    if (!pageNumber) {
      return null;
    }

    return this.pageOverrides.find((override) => override.pageNumber === pageNumber) ?? null;
  }

  get resolvedAppTheme(): 'light' | 'dark' {
    if (this.appThemeMode === 'system') {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    return this.appThemeMode;
  }

  get samplePreviewDocument(): string {
    return buildFormDocument({
      blocks: this.blocks,
      jsonFields: this.jsonFields,
      layoutMode: this.layoutMode,
      theme: this.activeTheme,
      title: this.templateName.trim() || 'Untitled Form',
      useThymeleaf: false,
      formLayout: this.formLayout,
      pageSettings: this.pageSettings,
      pageOverrides: this.pageOverrides,
      lockDesktopLayout: true
    });
  }

  get exportPreviewDocument(): string {
    return buildFormDocument({
      blocks: this.blocks,
      jsonFields: this.jsonFields,
      layoutMode: this.layoutMode,
      theme: this.activeTheme,
      title: this.templateName.trim() || 'Untitled Form',
      useThymeleaf: true,
      formLayout: this.formLayout,
      pageSettings: this.pageSettings,
      pageOverrides: this.pageOverrides,
      lockDesktopLayout: true
    });
  }

  get activePreviewDocument(): string {
    return this.previewMode === 'export' ? this.exportPreviewDocument : this.samplePreviewDocument;
  }

  get previewModeDescription(): string {
    return this.previewMode === 'export'
      ? 'Shows the locked browser-print layout so you can compare the downloaded HTML before export.'
      : 'Uses the same page structure with sample values so you can design the form faster.';
  }

  get activeSettingsTabDescription(): string {
    return this.settingsTabs.find((tab) => tab.value === this.settingsTab)?.description ?? '';
  }

  get activePaletteTabDescription(): string {
    return this.paletteTabs.find((tab) => tab.value === this.paletteTab)?.description ?? '';
  }

  get thymeleafMarkup(): string {
    return buildFormDocument({
      blocks: this.blocks,
      jsonFields: this.jsonFields,
      layoutMode: this.layoutMode,
      theme: this.activeTheme,
      title: this.templateName.trim() || 'Untitled Form',
      useThymeleaf: true,
      formLayout: this.formLayout,
      pageSettings: this.pageSettings,
      pageOverrides: this.pageOverrides,
      lockDesktopLayout: false
    });
  }

  get leftPanelBasis(): string {
    return this.formatPanelBasis(this.panelWidths.left);
  }

  get centerPanelBasis(): string {
    return this.formatPanelBasis(this.panelWidths.center);
  }

  get rightPanelBasis(): string {
    return this.formatPanelBasis(this.panelWidths.right);
  }

  setSettingsTab(tab: SettingsTab): void {
    this.settingsTab = tab;
    this.settingsExpanded = true;
    this.scrollPanelIntoView(this.settingsPanelAnchor);
  }

  setPaletteTab(tab: PaletteTab): void {
    this.paletteTab = tab;
  }

  openPaletteTab(tab: PaletteTab): void {
    this.paletteTab = tab;
    this.scrollPanelIntoView(this.palettePanelAnchor);
  }

  setPreviewMode(mode: PreviewMode): void {
    this.previewMode = mode;
  }

  setInspectorTab(tab: InspectorTab): void {
    this.inspectorTab = tab;
  }

  setAppThemeMode(mode: AppThemeMode): void {
    this.appThemeMode = mode;
    localStorage.setItem(this.storageAppThemeKey, mode);
  }

  setSidePanelTab(tab: SidePanelTab): void {
    this.sidePanelTab = tab;
  }

  openInspectorPanel(): void {
    if (!this.selectedBlockId && this.blocks.length) {
      this.selectedBlockId = this.blocks[0]?.id ?? null;
    }

    this.sidePanelTab = 'inspector';
    this.scrollPanelIntoView(this.editorPanelAnchor);
  }

  showGettingStarted(): void {
    this.isGettingStartedOpen = true;
    localStorage.setItem(this.storageGuideStateKey, 'open');
  }

  hideGettingStarted(): void {
    this.isGettingStartedOpen = false;
    localStorage.setItem(this.storageGuideStateKey, 'closed');
  }

  startPanelResize(handle: ResizeHandle, event: PointerEvent): void {
    if (!this.isDesktopWorkspace()) {
      return;
    }

    const workspace = this.builderWorkspace?.nativeElement;
    if (!workspace) {
      return;
    }

    event.preventDefault();
    this.activeResizeHandle = handle;
    this.resizeStartX = event.clientX;
    this.resizeStartWidths = { ...this.panelWidths };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    workspace.classList.add('is-resizing-panels');
  }

  onResizeHandleKeydown(handle: ResizeHandle, event: KeyboardEvent): void {
    if (!this.isDesktopWorkspace()) {
      return;
    }

    const direction = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!direction) {
      return;
    }

    event.preventDefault();
    this.resizePanels(handle, direction * (event.shiftKey ? 4 : 2));
  }

  resetPanelWidths(): void {
    this.panelWidths = { ...this.defaultPanelWidths };
  }

  collapseSettingsPanel(): void {
    this.settingsExpanded = false;
  }

  openPreviewFocus(pageNumber?: number): void {
    if (pageNumber) {
      this.selectedPreviewPageNumber = pageNumber;
    }

    this.syncSelectedPreviewPage();
    this.isPreviewFocusOpen = true;
    this.lastPreviewFrameDocument = null;
  }

  closePreviewFocus(): void {
    this.isPreviewFocusOpen = false;
    this.lastPreviewFrameDocument = null;
  }

  @HostListener('document:pointermove', ['$event'])
  onDocumentPointerMove(event: PointerEvent): void {
    if (!this.activeResizeHandle) {
      return;
    }

    const workspace = this.builderWorkspace?.nativeElement;
    if (!workspace) {
      return;
    }

    const availableWidth = workspace.getBoundingClientRect().width - this.builderHandleSizePx * 2;
    if (availableWidth <= 0) {
      return;
    }

    const deltaPercent = ((event.clientX - this.resizeStartX) / availableWidth) * 100;
    this.resizePanels(this.activeResizeHandle, deltaPercent, true);
  }

  @HostListener('document:pointerup')
  @HostListener('window:blur')
  stopPanelResize(): void {
    if (!this.activeResizeHandle) {
      return;
    }

    this.activeResizeHandle = null;
    this.builderWorkspace?.nativeElement.classList.remove('is-resizing-panels');
    document.body.style.removeProperty('cursor');
    document.body.style.removeProperty('user-select');
  }

  parseJsonInput(): void {
    try {
      const parsed = JSON.parse(this.jsonInput) as unknown;
      this.jsonFields = this.parseFlatJson(parsed);

      if (!this.jsonFields.length) {
        this.blocks = [];
        this.selectedBlockId = null;
        this.statusMessage = 'The JSON loaded, but this builder only found non-primitive values. Try a flat object with text, number, or boolean fields.';
        return;
      }

      const validFieldKeys = new Set(this.jsonFields.map((field) => field.key));
      this.blocks = this.blocks
        .map((block) => this.normalizeBlock(block))
        .filter(
          (block): block is BuilderBlock =>
            block !== null &&
            (block.kind !== 'field' || block.source !== 'json' || (block.fieldKey !== null && validFieldKeys.has(block.fieldKey)))
        );

      if (!this.blocks.length) {
        this.blocks = this.jsonFields.map((field, index) => this.createJsonFieldBlock(field, index < 2 ? 'half' : 'full'));
      }

      this.selectedBlockId = this.blocks[0]?.id ?? null;
      this.syncSelectedPreviewPage();
      this.settingsExpanded = false;
      this.statusMessage = `Loaded ${this.jsonFields.length} fields. Start dragging them into the form flow and add sections where the document needs structure.`;
    } catch (error) {
      this.statusMessage =
        error instanceof Error ? error.message : 'The JSON could not be parsed. Please provide a valid flat JSON object and try again.';
    }
  }

  onJsonFileSelected(event: Event): void {
    this.readUploadedText(event, (content) => {
      this.jsonInput = content;
      this.parseJsonInput();
    });
  }

  onTemplateImportSelected(event: Event): void {
    this.readUploadedText(event, (content) => {
      try {
        const parsed = JSON.parse(content) as unknown;
        const template = this.normalizeSavedTemplate(parsed);
        if (!template) {
          throw new Error();
        }
        this.upsertTemplate(template);
        this.loadTemplate(template.id);
        this.statusMessage = `${template.name} imported and loaded into the builder.`;
      } catch {
        this.statusMessage = 'The imported template file is not valid JSON for this builder.';
      }
    });
  }

  onThemeImportSelected(event: Event): void {
    this.readUploadedText(event, (content) => {
      try {
        const theme = JSON.parse(content) as ThemePreset;
        this.applyImportedTheme(theme);
        this.statusMessage = `${theme.name} imported into the theme library.`;
      } catch {
        this.statusMessage = 'The imported theme file is not valid JSON for this builder.';
      }
    });
  }

  startJsonFieldDrag(fieldKey: string): void {
    this.dragItem = { type: 'json-field', fieldKey };
  }

  startPaletteItemDrag(kind: PaletteItemKind): void {
    this.dragItem = { type: 'palette-item', kind };
  }

  startBlockDrag(blockId: string): void {
    this.dragItem = { type: 'existing-block', blockId };
  }

  clearDrag(): void {
    this.dragItem = null;
  }

  allowDrop(event: DragEvent): void {
    event.preventDefault();
  }

  dropAt(index: number): void {
    const dragItem = this.dragItem;

    if (!dragItem) {
      return;
    }

    if (dragItem.type === 'json-field') {
      const field = this.jsonFields.find((item) => item.key === dragItem.fieldKey);
      if (field) {
        const block = this.createJsonFieldBlock(field);
        this.insertBlock(index, block);
        this.statusMessage = `${field.label} was added to the canvas.`;
      }
    }

    if (dragItem.type === 'palette-item') {
      const block = this.createManualBlock(dragItem.kind);
      this.insertBlock(index, block);
      this.statusMessage = `${this.describePaletteItem(dragItem.kind)} was added to the canvas.`;
    }

    if (dragItem.type === 'existing-block') {
      const currentIndex = this.blocks.findIndex((block) => block.id === dragItem.blockId);
      if (currentIndex >= 0) {
        const [block] = this.blocks.splice(currentIndex, 1);
        const targetIndex = currentIndex < index ? index - 1 : index;
        this.blocks.splice(targetIndex, 0, block);
        this.selectedBlockId = block.id;
        this.statusMessage = `${this.getCanvasTitle(block)} was moved in the layout.`;
      }
    }

    this.syncSelectedPreviewPage();
    this.clearDrag();
  }

  addJsonField(fieldKey: string): void {
    const field = this.jsonFields.find((item) => item.key === fieldKey);
    if (!field) {
      return;
    }

    this.insertBlock(this.blocks.length, this.createJsonFieldBlock(field));
    this.statusMessage = `${field.label} was added to the canvas.`;
  }

  addManualBlock(kind: PaletteItemKind): void {
    this.insertBlock(this.blocks.length, this.createManualBlock(kind));
    this.statusMessage = `${this.describePaletteItem(kind)} was added to the canvas.`;
  }

  selectBlock(blockId: string): void {
    this.selectedBlockId = blockId;
    this.inspectorTab = 'content';
    this.sidePanelTab = 'inspector';
  }

  duplicateBlock(blockId: string): void {
    const block = this.blocks.find((item) => item.id === blockId);
    if (!block) {
      return;
    }

    const cloned = this.cloneBlock(block);
    const index = this.blocks.findIndex((item) => item.id === blockId);
    this.insertBlock(index + 1, cloned);
    this.statusMessage = `${this.getCanvasTitle(block)} was duplicated.`;
  }

  removeBlock(blockId: string): void {
    const index = this.blocks.findIndex((block) => block.id === blockId);
    if (index < 0) {
      return;
    }

    const [removed] = this.blocks.splice(index, 1);
    if (this.selectedBlockId === blockId) {
      this.selectedBlockId = this.blocks[index]?.id ?? this.blocks[index - 1]?.id ?? null;
    }

    this.syncSelectedPreviewPage();
    this.statusMessage = `${this.getCanvasTitle(removed)} was removed from the canvas.`;
  }

  moveBlock(blockId: string, direction: -1 | 1): void {
    const index = this.blocks.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= this.blocks.length) {
      return;
    }

    const [block] = this.blocks.splice(index, 1);
    this.blocks.splice(nextIndex, 0, block);
    this.selectedBlockId = block.id;
    this.syncSelectedPreviewPage();
  }

  selectPreviewPage(pageNumber: number): void {
    this.selectedPreviewPageNumber = pageNumber;
  }

  hasPageHeaderOverride(pageNumber: number): boolean {
    return this.pageOverrides.some((override) => override.pageNumber === pageNumber && override.useCustomHeader);
  }

  hasPageFooterOverride(pageNumber: number): boolean {
    return this.pageOverrides.some((override) => override.pageNumber === pageNumber && override.useCustomFooter);
  }

  togglePageHeaderOverride(pageNumber: number, enabled: boolean): void {
    const override = this.ensurePageOverride(pageNumber);
    override.useCustomHeader = enabled;
    if (enabled) {
      override.header = structuredClone(this.pageSettings.defaultHeader);
    }
    this.cleanupUnusedPageOverride(override);
  }

  togglePageFooterOverride(pageNumber: number, enabled: boolean): void {
    const override = this.ensurePageOverride(pageNumber);
    override.useCustomFooter = enabled;
    if (enabled) {
      override.footer = structuredClone(this.pageSettings.defaultFooter);
    }
    this.cleanupUnusedPageOverride(override);
  }

  applyTheme(themeId: string): void {
    const theme = this.themes.find((item) => item.id === themeId);
    if (!theme) {
      return;
    }

    this.selectedThemeId = theme.id;
    this.themeDraft = structuredClone(theme);
    this.statusMessage = `${theme.name} is now the active theme in the builder.`;
  }

  saveTheme(): void {
    const nextTheme = this.normalizeTheme(
      {
        ...this.themeDraft,
        id: this.themeDraft.id === DEFAULT_THEME.id ? this.createId() : this.themeDraft.id || this.createId()
      },
      this.themeDraft.name || 'Custom Theme'
    );
    const existingIndex = this.themes.findIndex((theme) => theme.id === nextTheme.id);

    if (existingIndex >= 0) {
      this.themes[existingIndex] = nextTheme;
    } else {
      this.themes.unshift(nextTheme);
    }

    this.selectedThemeId = nextTheme.id;
    this.themeDraft = structuredClone(nextTheme);
    this.persistThemes();
    this.statusMessage = `${nextTheme.name} was saved to the theme library.`;
  }

  exportCurrentTemplate(): void {
    const template = this.buildSavedTemplate();
    this.downloadFile(`${this.createSlug(template.name)}.template.json`, JSON.stringify(template, null, 2), 'application/json');
    this.statusMessage = `${template.name} was exported as a reusable template JSON file.`;
  }

  exportActiveTheme(): void {
    const theme = this.prepareThemeSnapshot();
    this.downloadFile(`${this.createSlug(theme.name)}.theme.json`, JSON.stringify(theme, null, 2), 'application/json');
    this.statusMessage = `${theme.name} was exported as a theme JSON file.`;
  }

  downloadThymeleafHtml(): void {
    const filename = `${this.createSlug(this.templateName || 'thymeleaf-form')}.html`;
    this.downloadFile(filename, this.thymeleafMarkup, 'text/html');
    this.statusMessage = 'The Thymeleaf HTML was downloaded.';
  }

  async copyThymeleafHtml(): Promise<void> {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(this.thymeleafMarkup);
      } else {
        this.copyTextWithFallback(this.thymeleafMarkup);
      }

      this.setThymeleafCopyState('copied');
      this.statusMessage = 'The Thymeleaf HTML was copied to the clipboard.';
    } catch {
      try {
        this.copyTextWithFallback(this.thymeleafMarkup);
        this.setThymeleafCopyState('copied');
        this.statusMessage = 'The Thymeleaf HTML was copied to the clipboard.';
      } catch {
        this.setThymeleafCopyState('error');
        this.statusMessage = 'Copy failed in this browser. Please use the textarea and copy manually.';
      }
    }
  }

  saveTemplate(): void {
    const template = this.buildSavedTemplate();
    this.upsertTemplate(template);
    this.persistTemplates();
    this.statusMessage = `${template.name} was saved to the template library.`;
  }

  loadTemplate(templateId: string): void {
    const template = this.savedTemplates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    this.templateName = template.name;
    this.jsonInput = template.jsonInput;
    this.layoutMode = template.layoutMode;
    this.formLayout = structuredClone(template.formLayout ?? DEFAULT_FORM_LAYOUT);
    this.pageSettings = structuredClone(template.pageSettings ?? DEFAULT_PAGE_SETTINGS);
    this.pageOverrides = structuredClone(template.pageOverrides ?? []);
    this.blocks = structuredClone(template.blocks).map((block) => this.normalizeBlock(block)).filter((block): block is BuilderBlock => block !== null);
    this.applyImportedTheme(template.themeSnapshot);
    this.parseJsonInput();
    this.blocks = structuredClone(template.blocks).map((block) => this.normalizeBlock(block)).filter((block): block is BuilderBlock => block !== null);
    this.selectedBlockId = this.blocks[0]?.id ?? null;
    this.paletteTab = 'fields';
    this.inspectorTab = 'content';
    this.sidePanelTab = 'inspector';
    this.settingsExpanded = false;
    this.isPreviewFocusOpen = false;
    this.selectedPreviewPageNumber = 1;
    this.syncSelectedPreviewPage();
    this.statusMessage = `${template.name} was loaded from the template library.`;
  }

  resetWorkspace(): void {
    this.templateName = 'Accessible Application Form';
    this.jsonInput = this.sampleJson;
    this.layoutMode = 'two-column';
    this.selectedThemeId = DEFAULT_THEME.id;
    this.themeDraft = structuredClone(DEFAULT_THEME);
    this.formLayout = structuredClone(DEFAULT_FORM_LAYOUT);
    this.pageSettings = structuredClone(DEFAULT_PAGE_SETTINGS);
    this.pageSettings.defaultHeader.title = this.templateName;
    this.pageOverrides = [];
    this.blocks = [];
    this.selectedBlockId = null;
    this.paletteTab = 'fields';
    this.inspectorTab = 'content';
    this.sidePanelTab = 'inspector';
    this.settingsExpanded = false;
    this.isPreviewFocusOpen = false;
    this.selectedPreviewPageNumber = 1;
    this.parseJsonInput();
  }

  onFieldControlTypeChange(block: FieldBlock): void {
    if (this.usesChoiceOptions(block) && !block.options.length) {
      block.options = this.createDefaultOptions(block.source === 'json' && block.fieldKey ? this.getFieldByKey(block.fieldKey) : undefined);
    }

    if (block.controlType === 'checkbox' && block.inline) {
      block.inline = false;
    }
  }

  addFieldOption(block: FieldBlock): void {
    block.options.push(this.createOption(`Option ${block.options.length + 1}`, `option-${block.options.length + 1}`));
  }

  removeFieldOption(block: FieldBlock, optionId: string): void {
    block.options = block.options.filter((option) => option.id !== optionId);
  }

  usesChoiceOptions(block: FieldBlock): boolean {
    return ['dropdown', 'radio', 'checkbox-group'].includes(block.controlType);
  }

  isInlineField(block: FieldBlock): boolean {
    return (block.alignmentMode === 'inherit' ? this.formLayout.defaultFieldLayout : block.alignmentMode) === 'inline';
  }

  updateSelectedFieldLabelWidth(value: number | string): void {
    const block = this.selectedFieldBlock;
    if (!block) {
      return;
    }

    block.labelWidth = this.normalizeNumber(value, block.labelWidth);
  }

  getFieldByKey(fieldKey: string | null): JsonField | undefined {
    if (!fieldKey) {
      return undefined;
    }

    return this.jsonFields.find((item) => item.key === fieldKey);
  }

  getBlockPageNumber(blockId: string): number | null {
    const page = this.pagePlan.find((item) => item.blocks.some((block) => block.id === blockId));
    return page?.pageNumber ?? null;
  }

  getCanvasTitle(block: BuilderBlock): string {
    switch (block.kind) {
      case 'field':
        return block.label;
      case 'section':
        return block.title;
      case 'paragraph':
        return 'Instruction paragraph';
      case 'note':
        return 'Mandatory note';
      case 'declaration':
        return 'Consent checkbox';
      case 'divider':
        return 'Divider';
      case 'static-label':
        return 'Static label';
      case 'link':
        return block.text || 'Link';
      case 'page-break':
        return block.title || 'Page break';
      default:
        return 'Block';
    }
  }

  getCanvasMeta(block: BuilderBlock): string {
    const pageNumber = this.getBlockPageNumber(block.id);
    const pageLabel = pageNumber ? ` • page ${pageNumber}` : '';

    switch (block.kind) {
      case 'field': {
        const fieldLayout = block.alignmentMode === 'inherit' ? this.formLayout.defaultFieldLayout : block.alignmentMode;
        return `${block.source === 'json' ? 'JSON field' : 'Custom field'} • ${block.controlType} • ${fieldLayout}${pageLabel}`;
      }
      case 'section':
        return `Section heading${pageLabel}`;
      case 'paragraph':
        return `Instruction paragraph${pageLabel}`;
      case 'note':
        return `Note • ${block.emphasis}${pageLabel}`;
      case 'declaration':
        return `Declaration checkbox${pageLabel}`;
      case 'divider':
        return `Divider • ${block.style}${pageLabel}`;
      case 'static-label':
        return `Static label • ${block.tone}${pageLabel}`;
      case 'link':
        return `Hyperlink${pageLabel}`;
      case 'page-break':
        return `Manual page divider`;
      default:
        return pageLabel.trim();
    }
  }

  getCanvasKindLabel(block: BuilderBlock): string {
    switch (block.kind) {
      case 'field':
        return block.source === 'json' ? 'JSON field' : 'Custom field';
      case 'section':
        return 'Section';
      case 'paragraph':
        return 'Paragraph';
      case 'note':
        return 'Note';
      case 'declaration':
        return 'Consent';
      case 'divider':
        return 'Divider';
      case 'static-label':
        return 'Label';
      case 'link':
        return 'Link';
      case 'page-break':
        return 'Page break';
      default:
        return 'Block';
    }
  }

  describePaletteItem(kind: PaletteItemKind): string {
    return this.manualBlocks.find((item) => item.kind === kind)?.title ?? 'Block';
  }

  private parseFlatJson(value: unknown): JsonField[] {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      throw new Error('Only flat JSON objects are supported in this version of the builder.');
    }

    return Object.entries(value as Record<string, unknown>).map(([key, rawValue]) => {
      if (Array.isArray(rawValue) || (rawValue !== null && typeof rawValue === 'object')) {
        throw new Error('Only flat JSON objects with primitive values are supported right now.');
      }

      const normalizedValue =
        rawValue === null ? '' : typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean' ? rawValue : '';
      const type = this.getJsonFieldType(normalizedValue);

      return {
        key,
        label: this.pathToLabel(key),
        preview: String(normalizedValue),
        type,
        value: normalizedValue
      };
    });
  }

  private getJsonFieldType(value: string | number | boolean): JsonField['type'] {
    if (typeof value === 'boolean') {
      return 'boolean';
    }

    if (typeof value === 'number') {
      return 'number';
    }

    return 'string';
  }

  private createJsonFieldBlock(field: JsonField, width: 'full' | 'half' = 'full'): FieldBlock {
    const controlType = this.inferControlType(field);

    return {
      id: this.createId(),
      kind: 'field',
      source: 'json',
      fieldKey: field.key,
      bindingKey: field.key,
      width,
      label: field.label,
      controlType,
      placeholder: controlType === 'checkbox' ? '' : `Enter ${field.label.toLowerCase()}`,
      helperText: '',
      required: false,
      hideLabel: false,
      inline: controlType === 'radio',
      defaultValue: field.preview,
      options: this.createDefaultOptions(field, controlType),
      validation: this.createValidationConfig(),
      alignmentMode: 'inherit',
      labelWidth: this.formLayout.defaultLabelWidth,
      labelAlign: 'inherit',
      verticalAlign: 'inherit'
    };
  }

  private createManualBlock(kind: PaletteItemKind): BuilderBlock {
    switch (kind) {
      case 'custom-field':
        return {
          id: this.createId(),
          kind: 'field',
          source: 'custom',
          fieldKey: null,
          bindingKey: `customField${this.blocks.length + 1}`,
          width: 'full',
          label: 'Custom Field',
          controlType: 'text',
          placeholder: 'Enter a value',
          helperText: '',
          required: false,
          hideLabel: false,
          inline: false,
          defaultValue: '',
          options: [this.createOption('Option 1', 'option-1'), this.createOption('Option 2', 'option-2')],
          validation: this.createValidationConfig(),
          alignmentMode: 'inherit',
          labelWidth: this.formLayout.defaultLabelWidth,
          labelAlign: 'inherit',
          verticalAlign: 'inherit'
        };
      case 'section':
        return {
          id: this.createId(),
          kind: 'section',
          title: 'Section Heading',
          subtitle: 'Use this area to orient the person filling out the form.',
          width: 'full'
        };
      case 'paragraph':
        return {
          id: this.createId(),
          kind: 'paragraph',
          content: 'Add an instruction or contextual note for this section of the form.',
          width: 'full'
        };
      case 'note':
        return {
          id: this.createId(),
          kind: 'note',
          content: 'Mandatory fields are marked with an asterisk. Complete them before submission.',
          emphasis: 'info',
          width: 'full'
        };
      case 'declaration':
        return {
          id: this.createId(),
          kind: 'declaration',
          name: `consent${this.blocks.length + 1}`,
          content: 'I confirm that the information provided in this form is accurate and complete.',
          helperText: '',
          required: true,
          checkedByDefault: false,
          width: 'full'
        };
      case 'divider':
        return {
          id: this.createId(),
          kind: 'divider',
          style: 'line',
          width: 'full'
        };
      case 'static-label':
        return {
          id: this.createId(),
          kind: 'static-label',
          content: 'Static supporting label',
          tone: 'strong',
          width: 'full'
        };
      case 'link':
        return {
          id: this.createId(),
          kind: 'link',
          text: 'Read the terms and conditions',
          href: 'https://example.com/terms',
          openInNewTab: true,
          width: 'full'
        };
      case 'page-break':
        return {
          id: this.createId(),
          kind: 'page-break',
          title: `Page Break ${this.pagePlan.length + 1}`,
          width: 'full'
        };
    }
  }

  private createValidationConfig() {
    return {
      minLength: '',
      maxLength: '',
      min: '',
      max: '',
      pattern: '',
      customError: ''
    };
  }

  private inferControlType(field: JsonField): FieldBlock['controlType'] {
    const key = field.key.toLowerCase();

    if (field.type === 'boolean') {
      return 'checkbox';
    }

    if (key.includes('email')) {
      return 'email';
    }

    if (key.includes('phone') || key.includes('mobile') || key.includes('tel')) {
      return 'tel';
    }

    if (key.includes('date')) {
      return 'date';
    }

    if (field.type === 'number') {
      return 'number';
    }

    return 'text';
  }

  private createDefaultOptions(field?: JsonField, controlType?: FieldBlock['controlType']): ChoiceOption[] {
    if (controlType === 'checkbox') {
      return [];
    }

    if (field?.type === 'boolean') {
      return [this.createOption('Yes', 'true'), this.createOption('No', 'false')];
    }

    if (field?.preview) {
      return [this.createOption(field.preview, field.preview)];
    }

    return [this.createOption('Option 1', 'option-1'), this.createOption('Option 2', 'option-2')];
  }

  private createOption(label: string, value: string): ChoiceOption {
    return {
      id: this.createId(),
      label,
      value
    };
  }

  private insertBlock(index: number, block: BuilderBlock): void {
    this.blocks.splice(index, 0, block);
    this.selectedBlockId = block.id;
    this.inspectorTab = 'content';
    this.sidePanelTab = 'inspector';
    this.syncSelectedPreviewPage();
  }

  private cloneBlock(block: BuilderBlock): BuilderBlock {
    const clone = structuredClone(block);
    clone.id = this.createId();

    if (clone.kind === 'field') {
      clone.options = clone.options.map((option) => ({ ...option, id: this.createId() }));
      clone.bindingKey = clone.source === 'custom' ? `${clone.bindingKey}Copy` : clone.bindingKey;
    }

    if (clone.kind === 'declaration') {
      clone.name = `${clone.name}Copy`;
    }

    if (clone.kind === 'page-break') {
      clone.title = `${clone.title} Copy`;
    }

    return clone;
  }

  private buildSavedTemplate(): SavedTemplate {
    const themeSnapshot = this.prepareThemeSnapshot();

    return {
      id: this.createSlug(this.templateName) || this.createId(),
      name: this.templateName.trim() || 'Untitled Template',
      jsonInput: this.jsonInput,
      layoutMode: this.layoutMode,
      blocks: structuredClone(this.blocks),
      themeId: themeSnapshot.id,
      themeSnapshot,
      formLayout: structuredClone(this.formLayout),
      pageSettings: structuredClone(this.pageSettings),
      pageOverrides: structuredClone(this.pageOverrides),
      updatedAt: new Date().toISOString()
    };
  }

  private prepareThemeSnapshot(): ThemePreset {
    return this.normalizeTheme(
      {
        ...this.themeDraft,
        id: this.themeDraft.id === DEFAULT_THEME.id ? this.createId() : this.themeDraft.id || this.createId()
      },
      this.themeDraft.name || 'Template Theme'
    );
  }

  private upsertTemplate(template: SavedTemplate): void {
    const existingIndex = this.savedTemplates.findIndex((item) => item.id === template.id);

    if (existingIndex >= 0) {
      this.savedTemplates[existingIndex] = template;
    } else {
      this.savedTemplates.unshift(template);
    }
  }

  private applyImportedTheme(theme: ThemePreset): void {
    const normalizedTheme = this.normalizeTheme(theme, 'Imported Theme');
    const existingIndex = this.themes.findIndex((item) => item.id === normalizedTheme.id);

    if (existingIndex >= 0) {
      this.themes[existingIndex] = normalizedTheme;
    } else {
      this.themes.unshift(normalizedTheme);
    }

    this.selectedThemeId = normalizedTheme.id;
    this.themeDraft = structuredClone(normalizedTheme);
    this.persistThemes();
  }

  private readUploadedText(event: Event, onLoad: (content: string) => void): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onLoad(String(reader.result ?? ''));
      input.value = '';
    };
    reader.readAsText(file);
  }

  private loadSavedThemes(): void {
    const raw = localStorage.getItem(this.storageThemeKey);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown[];
      const customThemes = parsed
        .map((theme) => this.normalizeTheme(theme, 'Saved Theme'))
        .filter((theme) => theme.id !== DEFAULT_THEME.id);
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
      const parsed = JSON.parse(raw) as unknown[];
      this.savedTemplates = parsed
        .map((entry) => this.normalizeSavedTemplate(entry))
        .filter((entry): entry is SavedTemplate => entry !== null);
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

  private loadAppThemeMode(): void {
    const stored = localStorage.getItem(this.storageAppThemeKey);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      this.appThemeMode = stored;
    }
  }

  private loadGuideState(): void {
    const stored = localStorage.getItem(this.storageGuideStateKey);
    if (stored === 'open' || stored === 'closed') {
      this.isGettingStartedOpen = stored === 'open';
    }
  }

  private formatPanelBasis(percent: number): string {
    return `calc(${percent.toFixed(3)}% - ${this.builderHandleSharePx.toFixed(3)}px)`;
  }

  private scrollPanelIntoView(panel?: ElementRef<HTMLElement>): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        panel?.nativeElement.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      });
    });
  }

  private setThymeleafCopyState(state: CopyFeedbackState): void {
    if (this.thymeleafCopyFeedbackResetId !== null) {
      window.clearTimeout(this.thymeleafCopyFeedbackResetId);
    }

    this.thymeleafCopyState = state;
    if (state === 'idle') {
      this.thymeleafCopyFeedbackResetId = null;
      return;
    }

    this.thymeleafCopyFeedbackResetId = window.setTimeout(() => {
      this.thymeleafCopyState = 'idle';
      this.thymeleafCopyFeedbackResetId = null;
    }, state === 'copied' ? 1800 : 2600);
  }

  private isDesktopWorkspace(): boolean {
    return window.innerWidth > 1180;
  }

  private resizePanels(handle: ResizeHandle, deltaPercent: number, fromPointer = false): void {
    const nextWidths = fromPointer ? { ...this.resizeStartWidths } : { ...this.panelWidths };

    if (handle === 'left-center') {
      const total = nextWidths.left + nextWidths.center;
      const left = this.clamp(nextWidths.left + deltaPercent, this.minPanelWidthPercent, total - this.minPanelWidthPercent);
      this.panelWidths = {
        left,
        center: total - left,
        right: nextWidths.right
      };
      return;
    }

    const total = nextWidths.center + nextWidths.right;
    const center = this.clamp(nextWidths.center + deltaPercent, this.minPanelWidthPercent, total - this.minPanelWidthPercent);
    this.panelWidths = {
      left: nextWidths.left,
      center,
      right: total - center
    };
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private downloadFile(filename: string, content: string, contentType: string): void {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  private copyTextWithFallback(content: string): void {
    const textarea = document.createElement('textarea');
    textarea.value = content;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  private ensurePageOverride(pageNumber: number): PageOverride {
    const existing = this.pageOverrides.find((override) => override.pageNumber === pageNumber);
    if (existing) {
      return existing;
    }

    const nextOverride: PageOverride = {
      id: this.createId(),
      pageNumber,
      useCustomHeader: false,
      useCustomFooter: false,
      header: structuredClone(this.pageSettings.defaultHeader),
      footer: structuredClone(this.pageSettings.defaultFooter)
    };
    this.pageOverrides.push(nextOverride);
    return nextOverride;
  }

  private cleanupUnusedPageOverride(override: PageOverride): void {
    if (!override.useCustomHeader && !override.useCustomFooter) {
      this.pageOverrides = this.pageOverrides.filter((item) => item.id !== override.id);
    }
  }

  private syncSelectedPreviewPage(): void {
    const totalPages = this.pagePlan.length || 1;
    if (this.selectedPreviewPageNumber > totalPages) {
      this.selectedPreviewPageNumber = totalPages;
    }
    if (this.selectedPreviewPageNumber < 1) {
      this.selectedPreviewPageNumber = 1;
    }
  }

  private syncPreviewFrameDocument(): void {
    if (!this.isPreviewFocusOpen) {
      this.lastPreviewFrameDocument = null;
      return;
    }

    const iframe = this.previewFocusFrame?.nativeElement;
    const previewDocument = this.activePreviewDocument;
    if (!iframe || this.lastPreviewFrameDocument === previewDocument) {
      return;
    }

    iframe.srcdoc = previewDocument;
    this.lastPreviewFrameDocument = previewDocument;
  }

  private normalizeSavedTemplate(raw: unknown): SavedTemplate | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const template = raw as Partial<SavedTemplate> & { blocks?: unknown[]; themeSnapshot?: ThemePreset };
    const blocks = Array.isArray(template.blocks)
      ? template.blocks.map((block) => this.normalizeBlock(block)).filter((block): block is BuilderBlock => block !== null)
      : [];

    const themeSnapshot = this.normalizeTheme(template.themeSnapshot, 'Imported Theme');

    return {
      id: typeof template.id === 'string' && template.id ? template.id : this.createId(),
      name: typeof template.name === 'string' && template.name ? template.name : 'Imported Template',
      jsonInput: typeof template.jsonInput === 'string' ? template.jsonInput : this.sampleJson,
      layoutMode: template.layoutMode === 'single' ? 'single' : 'two-column',
      blocks,
      themeId: typeof template.themeId === 'string' && template.themeId ? template.themeId : themeSnapshot.id,
      themeSnapshot,
      formLayout: this.normalizeFormLayout(template.formLayout),
      pageSettings: this.normalizePageSettings(template.pageSettings),
      pageOverrides: this.normalizePageOverrides(template.pageOverrides),
      updatedAt: typeof template.updatedAt === 'string' ? template.updatedAt : new Date().toISOString()
    };
  }

  private normalizeBlock(raw: unknown): BuilderBlock | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }

    const block = raw as Partial<BuilderBlock> & Record<string, unknown>;
    const rawKind = String(block['kind'] ?? '');
    const kind = rawKind === 'heading' ? 'section' : rawKind;
    const width = block.width === 'half' ? 'half' : 'full';

    if (kind === 'field') {
      return {
        id: typeof block.id === 'string' && block.id ? block.id : this.createId(),
        kind: 'field',
        source: block.source === 'custom' ? 'custom' : 'json',
        fieldKey: typeof block.fieldKey === 'string' ? block.fieldKey : null,
        bindingKey:
          typeof block.bindingKey === 'string' && block.bindingKey
            ? block.bindingKey
            : typeof block.fieldKey === 'string'
              ? block.fieldKey
              : this.createSlug(typeof block.label === 'string' ? block.label : 'field') || this.createId(),
        width,
        label: typeof block.label === 'string' ? block.label : 'Field',
        controlType: this.normalizeControlType(block.controlType),
        placeholder: typeof block.placeholder === 'string' ? block.placeholder : '',
        helperText: typeof block.helperText === 'string' ? block.helperText : '',
        required: Boolean(block.required),
        hideLabel: typeof block.hideLabel === 'boolean' ? block.hideLabel : block['visibleLabel'] === false,
        inline: Boolean(block.inline),
        defaultValue:
          typeof block.defaultValue === 'string'
            ? block.defaultValue
            : typeof block['optionsText'] === 'string'
              ? block['optionsText']
              : '',
        options: this.normalizeOptions(block.options, block['optionsText']),
        validation: {
          ...this.createValidationConfig(),
          ...(typeof block.validation === 'object' && block.validation ? (block.validation as object) : {})
        },
        alignmentMode: this.normalizeFieldAlignmentMode(block.alignmentMode),
        labelWidth: normalizeNumberInRange(block.labelWidth, DEFAULT_FORM_LAYOUT.defaultLabelWidth, 20, 48),
        labelAlign: this.normalizeHorizontalAlign(block.labelAlign),
        verticalAlign: this.normalizeVerticalAlign(block.verticalAlign)
      };
    }

    if (kind === 'section') {
      return {
        id: typeof block.id === 'string' && block.id ? block.id : this.createId(),
        kind: 'section',
        title:
          typeof block.title === 'string' && block.title
            ? block.title
            : typeof block.label === 'string' && block.label
              ? block.label
              : 'Section Heading',
        subtitle: typeof block.subtitle === 'string' ? block.subtitle : '',
        width: 'full'
      };
    }

    if (kind === 'paragraph') {
      return {
        id: typeof block.id === 'string' && block.id ? block.id : this.createId(),
        kind: 'paragraph',
        content: typeof block.content === 'string' ? block.content : 'Instruction paragraph',
        width
      };
    }

    if (kind === 'note') {
      return {
        id: typeof block.id === 'string' && block.id ? block.id : this.createId(),
        kind: 'note',
        content: typeof block.content === 'string' ? block.content : 'Important note',
        emphasis: block.emphasis === 'warning' ? 'warning' : 'info',
        width: 'full'
      };
    }

    if (kind === 'declaration') {
      return {
        id: typeof block.id === 'string' && block.id ? block.id : this.createId(),
        kind: 'declaration',
        name: typeof block.name === 'string' ? block.name : `consent${this.createId()}`,
        content: typeof block.content === 'string' ? block.content : 'I agree with the declaration above.',
        helperText: typeof block.helperText === 'string' ? block.helperText : '',
        required: Boolean(block.required),
        checkedByDefault: Boolean(block.checkedByDefault),
        width: 'full'
      };
    }

    if (kind === 'divider') {
      return {
        id: typeof block.id === 'string' && block.id ? block.id : this.createId(),
        kind: 'divider',
        style: block.style === 'space' ? 'space' : 'line',
        width: 'full'
      };
    }

    if (kind === 'static-label') {
      return {
        id: typeof block.id === 'string' && block.id ? block.id : this.createId(),
        kind: 'static-label',
        content: typeof block.content === 'string' ? block.content : 'Static label',
        tone: block.tone === 'muted' ? 'muted' : 'strong',
        width
      };
    }

    if (kind === 'link') {
      return {
        id: typeof block.id === 'string' && block.id ? block.id : this.createId(),
        kind: 'link',
        text: typeof block.text === 'string' ? block.text : 'Learn more',
        href: typeof block.href === 'string' ? block.href : 'https://example.com',
        openInNewTab: block.openInNewTab !== false,
        width: 'full'
      };
    }

    if (kind === 'page-break') {
      return {
        id: typeof block.id === 'string' && block.id ? block.id : this.createId(),
        kind: 'page-break',
        title: typeof block.title === 'string' && block.title ? block.title : 'Page Break',
        width: 'full'
      };
    }

    return null;
  }

  private normalizeOptions(rawOptions: unknown, fallbackText: unknown): ChoiceOption[] {
    if (Array.isArray(rawOptions) && rawOptions.length) {
      return rawOptions.map((option) => {
        if (option && typeof option === 'object') {
          const normalized = option as Partial<ChoiceOption>;
          return {
            id: typeof normalized.id === 'string' && normalized.id ? normalized.id : this.createId(),
            label: typeof normalized.label === 'string' ? normalized.label : typeof normalized.value === 'string' ? normalized.value : 'Option',
            value: typeof normalized.value === 'string' ? normalized.value : typeof normalized.label === 'string' ? normalized.label : 'option'
          };
        }

        return this.createOption(String(option), String(option));
      });
    }

    if (typeof fallbackText === 'string' && fallbackText.trim()) {
      return fallbackText
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item) => this.createOption(item, item));
    }

    return [this.createOption('Option 1', 'option-1'), this.createOption('Option 2', 'option-2')];
  }

  private normalizeFormLayout(raw: unknown): FormLayoutSettings {
    const layout = raw && typeof raw === 'object' ? (raw as Partial<FormLayoutSettings>) : {};

    return {
      defaultFieldLayout: layout.defaultFieldLayout === 'stacked' ? 'stacked' : 'inline',
      defaultLabelWidth: normalizeNumberInRange(layout.defaultLabelWidth, DEFAULT_FORM_LAYOUT.defaultLabelWidth, 20, 48),
      defaultLabelAlign: layout.defaultLabelAlign === 'end' ? 'end' : 'start',
      defaultVerticalAlign: layout.defaultVerticalAlign === 'start' ? 'start' : 'center',
      rowGap: normalizeCssLength(layout.rowGap, DEFAULT_FORM_LAYOUT.rowGap)
    };
  }

  private normalizePageSettings(raw: unknown): PageSettings {
    const settings = raw && typeof raw === 'object' ? (raw as Partial<PageSettings>) : {};

    return {
      size: 'A4',
      orientation: settings.orientation === 'landscape' ? 'landscape' : 'portrait',
      marginTop: normalizeCssLength(settings.marginTop, DEFAULT_PAGE_SETTINGS.marginTop),
      marginRight: normalizeCssLength(settings.marginRight, DEFAULT_PAGE_SETTINGS.marginRight),
      marginBottom: normalizeCssLength(settings.marginBottom, DEFAULT_PAGE_SETTINGS.marginBottom),
      marginLeft: normalizeCssLength(settings.marginLeft, DEFAULT_PAGE_SETTINGS.marginLeft),
      pageGap: normalizeCssLength(settings.pageGap, DEFAULT_PAGE_SETTINGS.pageGap),
      headerHeight: normalizeCssLength(settings.headerHeight, DEFAULT_PAGE_SETTINGS.headerHeight),
      footerHeight: normalizeCssLength(settings.footerHeight, DEFAULT_PAGE_SETTINGS.footerHeight),
      autoPaginate: typeof settings.autoPaginate === 'boolean' ? settings.autoPaginate : DEFAULT_PAGE_SETTINGS.autoPaginate,
      defaultHeader: this.normalizePageRegion(settings.defaultHeader, DEFAULT_PAGE_SETTINGS.defaultHeader),
      defaultFooter: this.normalizePageRegion(settings.defaultFooter, DEFAULT_PAGE_SETTINGS.defaultFooter)
    };
  }

  private normalizePageOverrides(raw: unknown): PageOverride[] {
    if (!Array.isArray(raw)) {
      return [];
    }

    return raw.map((entry) => {
      const override = entry as Partial<PageOverride>;
      return {
        id: typeof override.id === 'string' && override.id ? override.id : this.createId(),
        pageNumber: Math.max(1, Math.round(this.normalizeNumber(override.pageNumber, 1))),
        useCustomHeader: Boolean(override.useCustomHeader),
        useCustomFooter: Boolean(override.useCustomFooter),
        header: this.normalizePageRegion(override.header, DEFAULT_PAGE_SETTINGS.defaultHeader),
        footer: this.normalizePageRegion(override.footer, DEFAULT_PAGE_SETTINGS.defaultFooter)
      };
    });
  }

  private normalizePageRegion(raw: unknown, defaults: PageRegionConfig): PageRegionConfig {
    const region = raw && typeof raw === 'object' ? (raw as Partial<PageRegionConfig>) : {};

    return {
      enabled: typeof region.enabled === 'boolean' ? region.enabled : defaults.enabled,
      eyebrow: normalizeString(region.eyebrow, defaults.eyebrow),
      title: normalizeString(region.title, defaults.title),
      body: normalizeString(region.body, defaults.body),
      metaText: normalizeString(region.metaText, defaults.metaText),
      logoUrl: normalizeUrl(region.logoUrl, { allowRelative: true, allowDataImage: true }),
      showPageNumber: typeof region.showPageNumber === 'boolean' ? region.showPageNumber : defaults.showPageNumber,
      showDate: typeof region.showDate === 'boolean' ? region.showDate : defaults.showDate,
      divider: typeof region.divider === 'boolean' ? region.divider : defaults.divider,
      align: region.align === 'center' ? 'center' : region.align === 'end' ? 'end' : 'start'
    };
  }

  private normalizeTheme(raw: unknown, fallbackName = 'Imported Theme'): ThemePreset {
    const theme = raw && typeof raw === 'object' ? (raw as Partial<ThemePreset>) : {};
    const normalizedName = normalizeString(theme.name, fallbackName).trim();

    return {
      id: typeof theme.id === 'string' && theme.id ? theme.id : this.createId(),
      name: normalizedName || fallbackName,
      pageBackground: normalizeCssColor(theme.pageBackground, DEFAULT_THEME.pageBackground),
      surfaceBackground: normalizeCssColor(theme.surfaceBackground, DEFAULT_THEME.surfaceBackground),
      panelBackground: normalizeCssColor(theme.panelBackground, DEFAULT_THEME.panelBackground),
      sectionBackground: normalizeCssColor(theme.sectionBackground, DEFAULT_THEME.sectionBackground),
      sectionText: normalizeCssColor(theme.sectionText, DEFAULT_THEME.sectionText),
      primary: normalizeCssColor(theme.primary, DEFAULT_THEME.primary),
      primaryText: normalizeCssColor(theme.primaryText, DEFAULT_THEME.primaryText),
      text: normalizeCssColor(theme.text, DEFAULT_THEME.text),
      mutedText: normalizeCssColor(theme.mutedText, DEFAULT_THEME.mutedText),
      labelText: normalizeCssColor(theme.labelText, DEFAULT_THEME.labelText),
      border: normalizeCssColor(theme.border, DEFAULT_THEME.border),
      inputBackground: normalizeCssColor(theme.inputBackground, DEFAULT_THEME.inputBackground),
      inputText: normalizeCssColor(theme.inputText, DEFAULT_THEME.inputText),
      focus: normalizeCssColor(theme.focus, DEFAULT_THEME.focus),
      required: normalizeCssColor(theme.required, DEFAULT_THEME.required),
      error: normalizeCssColor(theme.error, DEFAULT_THEME.error),
      noteBackground: normalizeCssColor(theme.noteBackground, DEFAULT_THEME.noteBackground),
      noteBorder: normalizeCssColor(theme.noteBorder, DEFAULT_THEME.noteBorder),
      link: normalizeCssColor(theme.link, DEFAULT_THEME.link),
      radius: normalizeCssLength(theme.radius, DEFAULT_THEME.radius),
      headingFont: normalizeFontChoice(theme.headingFont, DEFAULT_THEME.headingFont, FONT_CHOICES),
      bodyFont: normalizeFontChoice(theme.bodyFont, DEFAULT_THEME.bodyFont, FONT_CHOICES)
    };
  }

  private normalizeControlType(value: unknown): FieldBlock['controlType'] {
    const allowed = ['text', 'textarea', 'email', 'number', 'tel', 'date', 'dropdown', 'radio', 'checkbox', 'checkbox-group'];
    return allowed.includes(String(value)) ? (value as FieldBlock['controlType']) : 'text';
  }

  private normalizeFieldAlignmentMode(value: unknown): FieldAlignmentMode {
    return value === 'inline' || value === 'stacked' ? value : 'inherit';
  }

  private normalizeHorizontalAlign(value: unknown): HorizontalAlign {
    return value === 'start' || value === 'end' ? value : 'inherit';
  }

  private normalizeVerticalAlign(value: unknown): VerticalAlign {
    return value === 'start' || value === 'center' ? value : 'inherit';
  }

  private normalizeNumber(value: unknown, fallback: number): number {
    const normalized = Number(value);
    return Number.isFinite(normalized) ? normalized : fallback;
  }

  private pathToLabel(key: string): string {
    const normalized = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[._-]+/g, ' ');
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  private createSlug(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  private createId(): string {
    return Math.random().toString(36).slice(2, 10);
  }
}
