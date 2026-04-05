import {
  BuilderBlock,
  ChoiceOption,
  ControlAlign,
  DEFAULT_FORM_LAYOUT,
  DEFAULT_PAGE_SETTINGS,
  DEFAULT_THEME,
  DeclarationBlock,
  DividerBlock,
  FieldBlock,
  FONT_CHOICES,
  FormLayoutSettings,
  HorizontalAlign,
  JsonField,
  LayoutMode,
  LinkBlock,
  NoteBlock,
  PageBreakBlock,
  PageOverride,
  PageRegionConfig,
  PageSettings,
  ParagraphBlock,
  ResolvedFieldAlignmentMode,
  ResolvedHorizontalAlign,
  ResolvedVerticalAlign,
  SectionBlock,
  StaticLabelBlock,
  ThemePreset,
  VerticalAlign
} from './form-builder.models';
import {
  normalizeCssColor,
  normalizeCssLength,
  normalizeFontChoice,
  normalizeNumberInRange,
  normalizeString,
  normalizeUrl
} from './form-builder.sanitizers';

export interface PlannedPage {
  pageNumber: number;
  blocks: BuilderBlock[];
  header: PageRegionConfig;
  footer: PageRegionConfig;
  estimatedCapacity: number;
  estimatedUsage: number;
}

interface BuildFormDocumentOptions {
  blocks: BuilderBlock[];
  jsonFields: JsonField[];
  layoutMode: LayoutMode;
  theme: ThemePreset;
  title: string;
  useThymeleaf: boolean;
  formLayout: FormLayoutSettings;
  pageSettings: PageSettings;
  pageOverrides: PageOverride[];
  lockDesktopLayout?: boolean;
  includeEditorMetadata?: boolean;
}

interface BuildPagePlanOptions {
  blocks: BuilderBlock[];
  layoutMode: LayoutMode;
  title: string;
  pageSettings: PageSettings;
  pageOverrides: PageOverride[];
  formLayout: FormLayoutSettings;
}

interface ResolvedFieldLayout {
  mode: ResolvedFieldAlignmentMode;
  labelWidth: number;
  labelAlign: ResolvedHorizontalAlign;
  verticalAlign: ResolvedVerticalAlign;
  controlAlign: ControlAlign;
  controlWidth: number;
}

interface EstimatedPage {
  pageNumber: number;
  blocks: BuilderBlock[];
  estimatedUsage: number;
}

export function buildFormDocument({
  blocks,
  jsonFields,
  layoutMode,
  theme,
  title,
  useThymeleaf,
  formLayout,
  pageSettings,
  pageOverrides,
  lockDesktopLayout = false,
  includeEditorMetadata = false
}: BuildFormDocumentOptions): string {
  const safeTitle = title.trim() || 'Untitled Form';
  const safeTheme = normalizeThemeForRender(theme);
  const safeFormLayout = normalizeFormLayoutForRender(formLayout);
  const safePageSettings = normalizePageSettingsForRender(pageSettings);
  const fieldMap = new Map(jsonFields.map((field) => [field.key, field]));
  const pagePlan = buildPagePlan({
    blocks,
    layoutMode,
    title: safeTitle,
    pageSettings: safePageSettings,
    pageOverrides,
    formLayout: safeFormLayout
  });

  const pagesMarkup = pagePlan
    .map((page) => {
      const pageBlocks = page.blocks
        .map((block) => renderBlock(block, fieldMap, layoutMode, useThymeleaf, safeFormLayout, includeEditorMetadata))
        .filter(Boolean)
        .join('\n');

      return `<section class="print-page" aria-label="Page ${page.pageNumber}"${includeEditorMetadata ? ` data-page-number="${page.pageNumber}"` : ''}>
  ${renderPageRegion(page.header, page.pageNumber, pagePlan.length, 'header')}
  <div class="page-content">
    <div class="form-grid ${layoutMode === 'two-column' ? 'two-column' : 'single-column'}">
      ${pageBlocks}
    </div>
  </div>
  ${renderPageRegion(page.footer, page.pageNumber, pagePlan.length, 'footer')}
</section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en" xmlns:th="http://www.thymeleaf.org">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(safeTitle)}</title>
  <style>
    :root {
      --page-width: ${safePageSettings.orientation === 'portrait' ? '210mm' : '297mm'};
      --page-height: ${safePageSettings.orientation === 'portrait' ? '297mm' : '210mm'};
      --page-gap: ${escapeCss(safePageSettings.pageGap)};
      --page-margin-top: ${escapeCss(safePageSettings.marginTop)};
      --page-margin-right: ${escapeCss(safePageSettings.marginRight)};
      --page-margin-bottom: ${escapeCss(safePageSettings.marginBottom)};
      --page-margin-left: ${escapeCss(safePageSettings.marginLeft)};
      --page-header-height: ${escapeCss(safePageSettings.headerHeight)};
      --page-footer-height: ${escapeCss(safePageSettings.footerHeight)};
      --page-background: ${escapeCss(safeTheme.pageBackground)};
      --surface-background: ${escapeCss(safeTheme.surfaceBackground)};
      --panel-background: ${escapeCss(safeTheme.panelBackground)};
      --section-background: ${escapeCss(safeTheme.sectionBackground)};
      --section-text: ${escapeCss(safeTheme.sectionText)};
      --primary: ${escapeCss(safeTheme.primary)};
      --primary-text: ${escapeCss(safeTheme.primaryText)};
      --text-color: ${escapeCss(safeTheme.text)};
      --muted-text: ${escapeCss(safeTheme.mutedText)};
      --label-text: ${escapeCss(safeTheme.labelText)};
      --border-color: ${escapeCss(safeTheme.border)};
      --input-background: ${escapeCss(safeTheme.inputBackground)};
      --input-text: ${escapeCss(safeTheme.inputText)};
      --focus-color: ${escapeCss(safeTheme.focus)};
      --required-color: ${escapeCss(safeTheme.required)};
      --error-color: ${escapeCss(safeTheme.error)};
      --note-background: ${escapeCss(safeTheme.noteBackground)};
      --note-border: ${escapeCss(safeTheme.noteBorder)};
      --link-color: ${escapeCss(safeTheme.link)};
      --radius: ${escapeCss(safeTheme.radius)};
      --heading-font: ${safeTheme.headingFont};
      --body-font: ${safeTheme.bodyFont};
      --form-row-gap: ${escapeCss(safeFormLayout.rowGap)};
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      min-height: 100%;
    }

    body {
      padding: 24px;
      background:
        radial-gradient(circle at top left, color-mix(in srgb, var(--primary) 18%, transparent), transparent 28%),
        linear-gradient(180deg, var(--page-background), color-mix(in srgb, var(--page-background) 72%, white));
      color: var(--text-color);
      font-family: var(--body-font);
      line-height: 1.5;
    }

    .document-stack {
      display: grid;
      gap: var(--page-gap);
      justify-content: center;
    }

    .print-page {
      width: var(--page-width);
      min-height: var(--page-height);
      padding: var(--page-margin-top) var(--page-margin-right) var(--page-margin-bottom) var(--page-margin-left);
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 14px;
      background: var(--surface-background);
      border-radius: 24px;
      border: 1px solid color-mix(in srgb, var(--border-color) 86%, white);
      box-shadow: 0 28px 70px rgba(15, 23, 42, 0.14);
      overflow: hidden;
      position: relative;
    }

    .page-region {
      display: grid;
      gap: 6px;
      align-content: start;
      color: var(--text-color);
      min-height: 0;
    }

    .page-region[data-kind='header'] {
      min-height: var(--page-header-height);
    }

    .page-region[data-kind='footer'] {
      min-height: var(--page-footer-height);
      margin-top: 8px;
    }

    .page-region.with-divider {
      padding-bottom: 10px;
      border-bottom: 1px solid color-mix(in srgb, var(--border-color) 88%, white);
    }

    .page-region.footer-divider {
      padding-top: 10px;
      border-top: 1px solid color-mix(in srgb, var(--border-color) 88%, white);
      border-bottom: 0;
    }

    .page-region.start {
      justify-items: start;
      text-align: left;
    }

    .page-region.center {
      justify-items: center;
      text-align: center;
    }

    .page-region.end {
      justify-items: end;
      text-align: right;
    }

    .page-region-brand {
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 100%;
    }

    .page-region-logo {
      max-width: 52px;
      max-height: 52px;
      object-fit: contain;
      border-radius: 12px;
    }

    .page-region-eyebrow {
      margin: 0;
      color: var(--primary);
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .page-region-title {
      margin: 0;
      font-family: var(--heading-font);
      font-size: 1.1rem;
      line-height: 1.2;
    }

    .page-region-body,
    .page-region-meta {
      margin: 0;
      color: var(--muted-text);
      font-size: 0.9rem;
    }

    .page-region-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 12px;
    }

    .page-content {
      min-height: 0;
      display: grid;
      align-content: start;
    }

    .form-grid {
      display: grid;
      gap: var(--form-row-gap);
      grid-template-columns: 1fr;
      align-content: start;
    }

    .form-grid.two-column {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      column-gap: 20px;
    }

    .block-span-full,
    .page-break-placeholder {
      grid-column: 1 / -1;
    }

    .section-block {
      grid-column: 1 / -1;
      display: grid;
      gap: 8px;
      padding: 18px 20px;
      border-radius: 22px;
      background: linear-gradient(135deg, var(--section-background), color-mix(in srgb, var(--primary) 74%, black));
      color: var(--section-text);
      box-shadow: 0 20px 42px rgba(15, 23, 42, 0.12);
    }

    .section-block h2 {
      margin: 0;
      font-family: var(--heading-font);
      font-size: 1.28rem;
    }

    .section-block p {
      margin: 0;
      opacity: 0.92;
    }

    .paragraph-block,
    .static-label-block {
      margin: 0;
      color: var(--muted-text);
    }

    .static-label-block strong {
      color: var(--text-color);
    }

    .note-block {
      padding: 14px 16px;
      border: 1px solid var(--note-border);
      border-radius: 18px;
      background: linear-gradient(180deg, var(--note-background), color-mix(in srgb, white 55%, var(--note-background)));
    }

    .note-block.warning {
      border-left: 5px solid var(--required-color);
    }

    .divider-block.line {
      border-top: 1px solid color-mix(in srgb, var(--border-color) 86%, white);
      min-height: 1px;
    }

    .divider-block.space {
      min-height: 16px;
    }

    .field-block,
    .declaration-block {
      display: grid;
      gap: 10px;
      min-width: 0;
    }

    .field-block .field-row {
      display: grid;
      gap: 12px 16px;
      min-width: 0;
    }

    .field-block.inline-mode .field-row {
      grid-template-columns: minmax(120px, calc(var(--field-label-width) * 1%)) minmax(0, 1fr);
      align-items: var(--field-row-align);
    }

    .field-block.stacked-mode .field-row {
      grid-template-columns: 1fr;
      align-items: start;
    }

    .field-label-cell {
      min-width: 0;
      display: grid;
      align-items: start;
    }

    .field-label-shell {
      width: fit-content;
      max-width: 100%;
      min-width: 0;
      display: inline-block;
      position: relative;
      overflow: visible;
    }

    .field-label-shell.has-marker {
      padding-left: 0;
    }

    .field-label-marker {
      position: absolute;
      right: calc(100% + 0.2rem);
      top: 0.08em;
      color: var(--required-color);
      font-weight: 900;
      line-height: 1;
      text-align: left;
    }

    .field-label-cell.center .field-label-shell {
      display: inline-grid;
      grid-template-columns: 0.72rem auto 0.72rem;
      column-gap: 0.18rem;
      align-items: center;
    }

    .field-label-cell.center .field-label-shell::before,
    .field-label-cell.center .field-label-shell::after {
      content: '';
      width: 0.72rem;
    }

    .field-label-cell.center .field-label-shell.has-marker::before {
      content: '*';
      color: var(--required-color);
      font-weight: 900;
      line-height: 1;
      text-align: left;
    }

    .field-label-cell.center .field-label-shell .field-label-marker {
      display: none;
    }

    .field-label-cell.center .field-label-shell .field-label-text {
      grid-column: 2;
    }

    .field-label-text {
      min-width: 0;
    }

    .field-label-cell.start {
      justify-items: start;
      text-align: left;
    }

    .field-label-cell.center {
      justify-items: center;
      text-align: center;
    }

    .field-label-cell.end {
      justify-items: end;
      text-align: right;
    }

    .field-label-cell.start .field-label-text {
      text-align: left;
    }

    .field-label-cell.center .field-label-text {
      text-align: center;
    }

    .field-label-cell.end .field-label-text {
      text-align: right;
    }

    .field-control-cell {
      min-width: 0;
      display: grid;
      gap: 8px;
    }

    .field-control-shell {
      width: min(100%, var(--field-control-width));
      min-width: 0;
      justify-self: var(--field-control-justify);
      display: grid;
      gap: 8px;
    }

    .field-block label,
    .field-block legend,
    .declaration-text {
      color: var(--label-text);
      font-weight: 800;
      font-size: 0.95rem;
    }

    .required-indicator {
      color: var(--required-color);
      margin-right: 4px;
    }

    .field-help {
      margin: 0;
      color: var(--muted-text);
      font-size: 0.85rem;
    }

    input[type='text'],
    input[type='email'],
    input[type='number'],
    input[type='tel'],
    input[type='date'],
    textarea,
    select {
      width: 100%;
      border: 1px solid color-mix(in srgb, var(--border-color) 82%, white);
      border-radius: 14px;
      padding: 12px 13px;
      background: var(--input-background);
      color: var(--input-text);
      font: inherit;
      box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
    }

    textarea {
      min-height: 112px;
      resize: vertical;
    }

    input:focus,
    textarea:focus,
    select:focus {
      outline: 3px solid color-mix(in srgb, var(--focus-color) 38%, white);
      outline-offset: 1px;
      border-color: var(--focus-color);
    }

    fieldset.choice-group {
      margin: 0;
      padding: 0;
      border: 0;
      min-width: 0;
    }

    .choice-options {
      display: grid;
      gap: 10px;
      margin-top: 8px;
    }

    .choice-options.inline {
      grid-template-columns: repeat(auto-fit, minmax(140px, max-content));
      gap: 10px 18px;
    }

    .choice-option,
    .checkbox-row {
      display: flex;
      gap: 10px;
      align-items: start;
      color: var(--text-color);
    }

    .checkbox-control {
      min-height: 44px;
      display: flex;
      align-items: center;
    }

    .checkbox-row input,
    .choice-option input,
    .checkbox-control input {
      width: auto;
      margin: 0;
    }

    .declaration-block {
      padding: 12px 14px;
      border-radius: 18px;
      background: color-mix(in srgb, var(--panel-background) 82%, white);
      border: 1px solid color-mix(in srgb, var(--border-color) 84%, white);
    }

    .link-block a,
    .inline-link {
      color: var(--link-color);
      font-weight: 700;
      text-decoration-thickness: 2px;
    }

    .visually-hidden {
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

    ${lockDesktopLayout
      ? ''
      : `@media screen and (max-width: 900px) {
      body {
        padding: 16px;
      }

      .print-page {
        width: 100%;
        min-height: auto;
      }

      .form-grid.two-column,
      .field-block.inline-mode .field-row,
      .choice-options.inline {
        grid-template-columns: 1fr;
      }

      .field-label-cell.end {
        justify-items: start;
        text-align: left;
      }
    }`}

    @page {
      size: ${safePageSettings.size} ${safePageSettings.orientation};
      margin: 0;
    }

    @media print {
      body {
        padding: 0;
        background: white;
      }

      .document-stack {
        gap: 0;
      }

      .print-page {
        border-radius: 0;
        box-shadow: none;
        border: 0;
        page-break-after: always;
      }

      .print-page:last-child {
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <main class="document-stack" role="main" aria-label="${escapeAttribute(safeTitle)} printable form">
    ${pagesMarkup}
  </main>
</body>
</html>`;
}

export function buildPagePlan({
  blocks,
  layoutMode,
  title,
  pageSettings,
  pageOverrides,
  formLayout
}: BuildPagePlanOptions): PlannedPage[] {
  const safeTitle = title.trim() || 'Untitled Form';
  const safePageSettings = normalizePageSettingsForRender(pageSettings);
  const safeFormLayout = normalizeFormLayoutForRender(formLayout);
  const capacity = estimatePageCapacity(safePageSettings);
  const estimatedPages: EstimatedPage[] = [];
  let currentPage = createEstimatedPage(1);

  for (const block of blocks) {
    if (block.kind === 'page-break') {
      estimatedPages.push(currentPage);
      currentPage = createEstimatedPage(currentPage.pageNumber + 1);
      continue;
    }

    const blockEstimate = estimateBlockUnits(block, layoutMode, safeFormLayout);
    if (safePageSettings.autoPaginate && currentPage.blocks.length > 0 && currentPage.estimatedUsage + blockEstimate > capacity) {
      estimatedPages.push(currentPage);
      currentPage = createEstimatedPage(currentPage.pageNumber + 1);
    }

    currentPage.blocks.push(block);
    currentPage.estimatedUsage += blockEstimate;
  }

  if (currentPage.blocks.length || !estimatedPages.length) {
    estimatedPages.push(currentPage);
  }

  return estimatedPages.map((page) => {
    const override = pageOverrides.find((entry) => entry.pageNumber === page.pageNumber);

    return {
      pageNumber: page.pageNumber,
      blocks: page.blocks,
      header: resolvePageRegion(safePageSettings.defaultHeader, override, 'header', page.pageNumber, safeTitle),
      footer: resolvePageRegion(safePageSettings.defaultFooter, override, 'footer', page.pageNumber, safeTitle),
      estimatedCapacity: capacity,
      estimatedUsage: page.estimatedUsage
    };
  });
}

export function resolveFieldLayout(block: FieldBlock, formLayout: FormLayoutSettings): ResolvedFieldLayout {
  const safeFormLayout = normalizeFormLayoutForRender(formLayout);
  return {
    mode: block.alignmentMode === 'inherit' ? safeFormLayout.defaultFieldLayout : block.alignmentMode,
    labelWidth: normalizeNumberInRange(block.labelWidth, safeFormLayout.defaultLabelWidth, 20, 48),
    labelAlign: resolveHorizontalAlign(block.labelAlign, safeFormLayout.defaultLabelAlign),
    verticalAlign: resolveVerticalAlign(block.verticalAlign, safeFormLayout.defaultVerticalAlign),
    controlAlign: resolveControlAlign(block.controlAlign),
    controlWidth: normalizeNumberInRange(block.controlWidth, 100, 50, 100)
  };
}

function createEstimatedPage(pageNumber: number): EstimatedPage {
  return {
    pageNumber,
    blocks: [],
    estimatedUsage: 0
  };
}

function resolvePageRegion(
  defaults: PageRegionConfig,
  override: PageOverride | undefined,
  region: 'header' | 'footer',
  pageNumber: number,
  title: string
): PageRegionConfig {
  const useCustom = region === 'header' ? override?.useCustomHeader : override?.useCustomFooter;
  const customRegion = region === 'header' ? override?.header : override?.footer;
  const merged = {
    ...defaults,
    ...(useCustom && customRegion ? customRegion : {})
  };

  if (region === 'header' && !merged.title.trim()) {
    merged.title = title;
  }

  if (pageNumber === 1 && region === 'header' && !merged.body.trim() && title.trim()) {
    merged.body = 'Review each section before printing or exporting the document.';
  }

  return merged;
}

function renderPageRegion(
  region: PageRegionConfig,
  pageNumber: number,
  totalPages: number,
  kind: 'header' | 'footer'
): string {
  if (!region.enabled) {
    return `<div class="page-region ${region.align}" data-kind="${kind}"></div>`;
  }

  const tokens = [
    region.metaText.trim() ? formatTextContent(region.metaText) : '',
    region.showPageNumber ? `Page ${pageNumber} of ${totalPages}` : '',
    region.showDate ? escapeHtml(formatCurrentDate()) : ''
  ].filter(Boolean);

  const dividerClass = region.divider ? (kind === 'header' ? 'with-divider' : 'with-divider footer-divider') : '';
  const safeLogoUrl = normalizeUrl(region.logoUrl, { allowRelative: true, allowDataImage: true });
  const logoMarkup = safeLogoUrl
    ? `<img class="page-region-logo" src="${escapeAttribute(safeLogoUrl)}" alt="" />`
    : '';
  const textMarkup = region.eyebrow.trim() || region.title.trim() || region.body.trim()
    ? `<div class="page-region-copy">
  ${region.eyebrow.trim() ? `<p class="page-region-eyebrow">${escapeHtml(region.eyebrow)}</p>` : ''}
  ${region.title.trim() ? `<p class="page-region-title">${escapeHtml(region.title)}</p>` : ''}
  ${region.body.trim() ? `<p class="page-region-body">${formatTextContent(region.body)}</p>` : ''}
</div>`
    : '';

  return `<div class="page-region ${region.align} ${dividerClass}" data-kind="${kind}">
  ${logoMarkup || textMarkup ? `<div class="page-region-brand">${logoMarkup}${textMarkup}</div>` : ''}
  ${tokens.length ? `<div class="page-region-meta">${tokens.map((token) => `<span>${token}</span>`).join('')}</div>` : ''}
</div>`;
}

function renderBlock(
  block: BuilderBlock,
  fieldMap: Map<string, JsonField>,
  layoutMode: LayoutMode,
  useThymeleaf: boolean,
  formLayout: FormLayoutSettings,
  includeEditorMetadata: boolean
): string {
  switch (block.kind) {
    case 'field':
      return renderFieldBlock(block, fieldMap, layoutMode, useThymeleaf, formLayout, includeEditorMetadata);
    case 'section':
      return renderSectionBlock(block, includeEditorMetadata);
    case 'paragraph':
      return renderParagraphBlock(block, includeEditorMetadata);
    case 'note':
      return renderNoteBlock(block, includeEditorMetadata);
    case 'declaration':
      return renderDeclarationBlock(block, useThymeleaf, includeEditorMetadata);
    case 'divider':
      return renderDividerBlock(block, includeEditorMetadata);
    case 'static-label':
      return renderStaticLabelBlock(block, includeEditorMetadata);
    case 'link':
      return renderLinkBlock(block, includeEditorMetadata);
    case 'page-break':
      return renderPageBreakPlaceholder(block);
    default:
      return '';
  }
}

function renderEditorBlockMetadata(blockId: string, kind: BuilderBlock['kind'], includeEditorMetadata: boolean): string {
  return includeEditorMetadata ? ` data-block-id="${escapeAttribute(blockId)}" data-block-kind="${kind}"` : '';
}

function renderEditorPartMetadata(part: 'label' | 'control', includeEditorMetadata: boolean): string {
  return includeEditorMetadata ? ` data-editor-part="${part}"` : '';
}

function renderSectionBlock(block: SectionBlock, includeEditorMetadata: boolean): string {
  return `<section class="section-block block-span-full" aria-label="${escapeAttribute(block.title)}"${renderEditorBlockMetadata(block.id, block.kind, includeEditorMetadata)}>
  <h2>${escapeHtml(block.title)}</h2>
  ${block.subtitle.trim() ? `<p>${formatTextContent(block.subtitle)}</p>` : ''}
</section>`;
}

function renderParagraphBlock(block: ParagraphBlock, includeEditorMetadata: boolean): string {
  return `<p class="paragraph-block ${widthClass(block.width)}"${renderEditorBlockMetadata(block.id, block.kind, includeEditorMetadata)}>${formatTextContent(block.content)}</p>`;
}

function renderNoteBlock(block: NoteBlock, includeEditorMetadata: boolean): string {
  return `<aside class="note-block ${block.emphasis} block-span-full" role="note"${renderEditorBlockMetadata(block.id, block.kind, includeEditorMetadata)}>${formatTextContent(block.content)}</aside>`;
}

function renderDeclarationBlock(block: DeclarationBlock, useThymeleaf: boolean, includeEditorMetadata: boolean): string {
  const id = `declaration-${slugify(block.name || block.id)}-${block.id}`;
  const checkedAttribute = useThymeleaf
    ? ` th:checked="\${payload['${escapeForThymeleaf(block.name || block.id)}']}"`
    : block.checkedByDefault
      ? ' checked'
      : '';
  const requiredAttribute = block.required ? ' required aria-required="true"' : '';
  const helperMarkup = block.helperText.trim()
    ? `<p class="field-help" id="${id}-help">${formatTextContent(block.helperText)}</p>`
    : '';
  const describedBy = block.helperText.trim() ? ` aria-describedby="${id}-help"` : '';

  return `<div class="declaration-block block-span-full"${renderEditorBlockMetadata(block.id, block.kind, includeEditorMetadata)}>
  <label class="checkbox-row" for="${id}">
    <input id="${id}" name="${escapeAttribute(block.name || slugify(block.content) || block.id)}" type="checkbox"${checkedAttribute}${requiredAttribute}${describedBy} />
    <span class="declaration-text">${block.required ? '<span class="required-indicator" aria-hidden="true">*</span>' : ''}${formatTextContent(block.content)}</span>
  </label>
  ${helperMarkup}
</div>`;
}

function renderDividerBlock(block: DividerBlock, includeEditorMetadata: boolean): string {
  return `<div class="divider-block ${block.style} block-span-full" role="separator" aria-hidden="true"${renderEditorBlockMetadata(block.id, block.kind, includeEditorMetadata)}></div>`;
}

function renderStaticLabelBlock(block: StaticLabelBlock, includeEditorMetadata: boolean): string {
  const tag = block.tone === 'strong' ? 'strong' : 'span';
  return `<p class="static-label-block ${widthClass(block.width)}"${renderEditorBlockMetadata(block.id, block.kind, includeEditorMetadata)}><${tag}>${formatTextContent(block.content)}</${tag}></p>`;
}

function renderLinkBlock(block: LinkBlock, includeEditorMetadata: boolean): string {
  const safeHref = normalizeUrl(block.href, { allowRelative: true, allowedProtocols: ['http:', 'https:', 'mailto:', 'tel:'] });
  const linkText = block.text.trim() || 'Learn more';
  if (!safeHref) {
    return `<p class="link-block block-span-full"${renderEditorBlockMetadata(block.id, block.kind, includeEditorMetadata)}><span class="inline-link">${escapeHtml(linkText)}</span></p>`;
  }

  const rel = block.openInNewTab ? ' rel="noreferrer noopener"' : '';
  const target = block.openInNewTab ? ' target="_blank"' : '';
  return `<p class="link-block block-span-full"${renderEditorBlockMetadata(block.id, block.kind, includeEditorMetadata)}><a href="${escapeAttribute(safeHref)}"${target}${rel}>${escapeHtml(linkText)}</a></p>`;
}

function renderPageBreakPlaceholder(_block: PageBreakBlock): string {
  return '';
}

function renderFieldBlock(
  block: FieldBlock,
  fieldMap: Map<string, JsonField>,
  layoutMode: LayoutMode,
  useThymeleaf: boolean,
  formLayout: FormLayoutSettings,
  includeEditorMetadata: boolean
): string {
  const bindingKey = block.bindingKey.trim() || block.fieldKey || block.id;
  const sourceField = block.fieldKey ? fieldMap.get(block.fieldKey) : undefined;
  const previewValue = buildPreviewValue(block, sourceField);
  const expression = buildThymeleafExpression(bindingKey);
  const fieldId = `field-${slugify(bindingKey)}-${block.id}`;
  const helpId = `${fieldId}-help`;
  const helperMarkup = block.helperText.trim() ? `<p class="field-help" id="${helpId}">${formatTextContent(block.helperText)}</p>` : '';
  const describedBy = block.helperText.trim() ? ` aria-describedby="${helpId}"` : '';
  const validationAttributes = renderValidationAttributes(block);
  const dataError = block.validation.customError.trim()
    ? ` data-error-message="${escapeAttribute(block.validation.customError)}"`
    : '';
  const width = layoutMode === 'single' ? 'full' : block.width;
  const wrapperClass = `field-block ${widthClass(width)}`;
  const layout = resolveFieldLayout(block, formLayout);
  const fieldClass = `${wrapperClass} ${layout.mode}-mode`;
  const layoutStyle = `style="--field-label-width:${layout.labelWidth}; --field-row-align:${layout.verticalAlign === 'center' ? 'center' : 'start'}; --field-control-justify:${layout.controlAlign}; --field-control-width:${layout.controlWidth}%;"`;
  const labelClass = `field-label-cell ${layout.labelAlign}`;
  const blockMetadata = renderEditorBlockMetadata(block.id, block.kind, includeEditorMetadata);
  const labelMetadata = renderEditorPartMetadata('label', includeEditorMetadata);
  const controlMetadata = renderEditorPartMetadata('control', includeEditorMetadata);

  if (block.controlType === 'radio' || block.controlType === 'checkbox-group') {
    const optionsMarkup = renderChoiceOptions(block.controlType, block.options, expression, previewValue, fieldId, bindingKey, useThymeleaf);
    const legendMarkup = block.hideLabel
      ? `<span class="visually-hidden">${escapeHtml(block.label)}</span>`
      : renderFieldLabelShell(block.label, block.required);
    return `<fieldset class="choice-group ${fieldClass}" ${layoutStyle}${blockMetadata}>
  <div class="field-row">
    <legend class="${labelClass}"${labelMetadata}>${legendMarkup}</legend>
    <div class="field-control-cell">
      <div class="field-control-shell"${controlMetadata}>
        ${helperMarkup}
        <div class="choice-options ${block.inline ? 'inline' : ''}">${optionsMarkup}</div>
      </div>
    </div>
  </div>
</fieldset>`;
  }

  if (block.controlType === 'checkbox') {
    const checkedAttribute = useThymeleaf
      ? ` th:checked="${expression}"`
      : isTruthyPreviewValue(previewValue) || previewValue === 'true'
        ? ' checked'
        : '';
    const checkboxLabelMarkup = block.hideLabel
      ? `<span class="visually-hidden"${labelMetadata}>${escapeHtml(block.label)}</span>`
      : `<label class="${labelClass}" for="${fieldId}"${labelMetadata}>${renderFieldLabelShell(block.label, block.required)}</label>`;
    return `<div class="${fieldClass}" ${layoutStyle}${blockMetadata}>
  <div class="field-row">
    ${checkboxLabelMarkup}
    <div class="field-control-cell">
      <div class="field-control-shell"${controlMetadata}>
        <div class="checkbox-control">
          <input id="${fieldId}" name="${escapeAttribute(bindingKey)}" type="checkbox"${checkedAttribute}${block.required ? ' required aria-required="true"' : ''}${describedBy}${dataError} />
        </div>
        ${helperMarkup}
      </div>
    </div>
  </div>
</div>`;
  }

  const labelMarkup = block.hideLabel
    ? `<span class="visually-hidden">${escapeHtml(block.label)}</span>`
    : `<label for="${fieldId}">${renderFieldLabelShell(block.label, block.required)}</label>`;

  if (block.controlType === 'dropdown') {
    return `<div class="${fieldClass}" ${layoutStyle}${blockMetadata}>
  <div class="field-row">
    <div class="${labelClass}"${labelMetadata}>${labelMarkup}</div>
    <div class="field-control-cell">
      <div class="field-control-shell"${controlMetadata}>
        <select id="${fieldId}" name="${escapeAttribute(bindingKey)}"${describedBy}${block.required ? ' required aria-required="true"' : ''}${dataError}>
          ${renderSelectOptions(block.options, expression, previewValue, useThymeleaf)}
        </select>
        ${helperMarkup}
      </div>
    </div>
  </div>
</div>`;
  }

  if (block.controlType === 'textarea') {
    const content = useThymeleaf ? expression : escapeHtml(previewValue);
    const thymeleafAttribute = useThymeleaf ? ` th:text="${expression}"` : '';
    return `<div class="${fieldClass}" ${layoutStyle}${blockMetadata}>
  <div class="field-row">
    <div class="${labelClass}"${labelMetadata}>${labelMarkup}</div>
    <div class="field-control-cell">
      <div class="field-control-shell"${controlMetadata}>
        <textarea id="${fieldId}" name="${escapeAttribute(bindingKey)}" placeholder="${escapeAttribute(block.placeholder)}"${describedBy}${block.required ? ' required aria-required="true"' : ''}${validationAttributes}${dataError}${thymeleafAttribute}>${content}</textarea>
        ${helperMarkup}
      </div>
    </div>
  </div>
</div>`;
  }

  const inputType = block.controlType;
  const valueAttribute = useThymeleaf
    ? ` th:value="${expression}"`
    : ` value="${escapeAttribute(previewValue)}"`;

  return `<div class="${fieldClass}" ${layoutStyle}${blockMetadata}>
  <div class="field-row">
    <div class="${labelClass}"${labelMetadata}>${labelMarkup}</div>
    <div class="field-control-cell">
      <div class="field-control-shell"${controlMetadata}>
        <input id="${fieldId}" name="${escapeAttribute(bindingKey)}" type="${inputType}" placeholder="${escapeAttribute(block.placeholder)}"${valueAttribute}${describedBy}${block.required ? ' required aria-required="true"' : ''}${validationAttributes}${dataError} />
        ${helperMarkup}
      </div>
    </div>
  </div>
</div>`;
}

function renderChoiceOptions(
  controlType: 'radio' | 'checkbox-group',
  options: ChoiceOption[],
  expression: string,
  previewValue: string,
  fieldId: string,
  bindingKey: string,
  useThymeleaf: boolean
): string {
  return options
    .map((option, index) => {
      const optionId = `${fieldId}-${index}`;
      const checkedAttribute = useThymeleaf
        ? controlType === 'radio'
          ? ` th:checked="${expression} == '${escapeForThymeleaf(option.value)}'"`
          : ` th:checked="\${payload['${escapeForThymeleaf(bindingKey)}']} != null and #lists.contains(payload['${escapeForThymeleaf(bindingKey)}'], '${escapeForThymeleaf(option.value)}')"`
        : controlType === 'radio'
          ? option.value === previewValue
            ? ' checked'
            : ''
          : splitPreviewValues(previewValue).includes(option.value)
            ? ' checked'
            : '';

      return `<label class="choice-option" for="${optionId}">
  <input id="${optionId}" name="${escapeAttribute(bindingKey)}${controlType === 'checkbox-group' ? '[]' : ''}" type="${controlType === 'radio' ? 'radio' : 'checkbox'}" value="${escapeAttribute(option.value)}"${checkedAttribute} />
  <span>${escapeHtml(option.label)}</span>
</label>`;
    })
    .join('\n');
}

function renderSelectOptions(
  options: ChoiceOption[],
  expression: string,
  previewValue: string,
  useThymeleaf: boolean
): string {
  return options
    .map((option) => {
      const selectedAttribute = useThymeleaf
        ? ` th:selected="${expression} == '${escapeForThymeleaf(option.value)}'"`
        : option.value === previewValue
          ? ' selected'
          : '';
      return `<option value="${escapeAttribute(option.value)}"${selectedAttribute}>${escapeHtml(option.label)}</option>`;
    })
    .join('\n');
}

function renderValidationAttributes(block: FieldBlock): string {
  return [
    block.validation.minLength.trim() ? ` minlength="${escapeAttribute(block.validation.minLength)}"` : '',
    block.validation.maxLength.trim() ? ` maxlength="${escapeAttribute(block.validation.maxLength)}"` : '',
    block.validation.min.trim() ? ` min="${escapeAttribute(block.validation.min)}"` : '',
    block.validation.max.trim() ? ` max="${escapeAttribute(block.validation.max)}"` : '',
    block.validation.pattern.trim() ? ` pattern="${escapeAttribute(block.validation.pattern)}"` : ''
  ].join('');
}

function renderFieldLabelShell(label: string, required: boolean): string {
  return `<span class="field-label-shell${required ? ' has-marker' : ''}">
    ${required ? renderFieldMarker() : ''}
    <span class="field-label-text">${escapeHtml(label)}</span>
  </span>`;
}

function renderFieldMarker(): string {
  return '<span class="field-label-marker" aria-hidden="true">*</span>';
}

function buildPreviewValue(block: FieldBlock, sourceField?: JsonField): string {
  if (block.defaultValue.trim()) {
    return block.defaultValue;
  }

  if (!sourceField) {
    return '';
  }

  return String(sourceField.value);
}

function buildThymeleafExpression(bindingKey: string): string {
  return `\${payload['${escapeForThymeleaf(bindingKey)}']}`;
}

function estimatePageCapacity(pageSettings: PageSettings): number {
  const baseHeight = pageSettings.orientation === 'portrait' ? 297 : 210;
  const usableHeight =
    baseHeight -
    parseCssLength(pageSettings.marginTop) -
    parseCssLength(pageSettings.marginBottom) -
    parseCssLength(pageSettings.headerHeight) -
    parseCssLength(pageSettings.footerHeight);

  return Math.max(6, usableHeight / 11.5);
}

function estimateBlockUnits(block: BuilderBlock, layoutMode: LayoutMode, formLayout: FormLayoutSettings): number {
  switch (block.kind) {
    case 'field': {
      const layout = resolveFieldLayout(block, formLayout);
      if (block.controlType === 'textarea') {
        return layout.mode === 'inline' ? 2.1 : 2.5;
      }

      if (block.controlType === 'radio' || block.controlType === 'checkbox-group') {
        return layout.mode === 'inline' ? 1.8 : 2.2;
      }

      if (block.controlType === 'checkbox') {
        return 1.2;
      }

      return layoutMode === 'two-column' && block.width === 'half' && layout.mode === 'inline' ? 1.05 : 1.3;
    }
    case 'section':
      return 1.9;
    case 'paragraph':
      return 1.2 + Math.ceil(block.content.length / 180) * 0.35;
    case 'note':
      return 1.5 + Math.ceil(block.content.length / 200) * 0.35;
    case 'declaration':
      return 1.4 + Math.ceil(block.content.length / 190) * 0.25;
    case 'divider':
      return block.style === 'space' ? 0.35 : 0.28;
    case 'static-label':
      return 0.75;
    case 'link':
      return 0.7;
    case 'page-break':
      return 0;
    default:
      return 1;
  }
}

function splitPreviewValues(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function widthClass(width: 'full' | 'half'): string {
  return width === 'full' ? 'block-span-full' : 'block-span-half';
}

function isTruthyPreviewValue(value: string): boolean {
  return value === 'true' || value === '1' || value.toLowerCase() === 'yes';
}

function resolveHorizontalAlign(value: HorizontalAlign, fallback: ResolvedHorizontalAlign): ResolvedHorizontalAlign {
  return value === 'inherit' ? fallback : value;
}

function resolveControlAlign(value: ControlAlign): ControlAlign {
  return value === 'center' || value === 'end' ? value : 'start';
}

function resolveVerticalAlign(value: VerticalAlign, fallback: ResolvedVerticalAlign): ResolvedVerticalAlign {
  return value === 'inherit' ? fallback : value;
}

function parseCssLength(value: string): number {
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function formatCurrentDate(): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date());
}

function slugify(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function formatTextContent(value: string): string {
  return escapeHtml(value).replace(/\n/g, '<br />');
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('\n', ' ');
}

function escapeCss(value: string): string {
  return value.replaceAll(';', '').replaceAll('\n', '');
}

function escapeForThymeleaf(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function normalizeThemeForRender(theme: ThemePreset): ThemePreset {
  return {
    id: typeof theme.id === 'string' && theme.id ? theme.id : DEFAULT_THEME.id,
    name: normalizeString(theme.name, DEFAULT_THEME.name),
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

function normalizeFormLayoutForRender(formLayout: FormLayoutSettings): FormLayoutSettings {
  return {
    defaultFieldLayout: formLayout.defaultFieldLayout === 'stacked' ? 'stacked' : DEFAULT_FORM_LAYOUT.defaultFieldLayout,
    defaultLabelWidth: normalizeNumberInRange(formLayout.defaultLabelWidth, DEFAULT_FORM_LAYOUT.defaultLabelWidth, 20, 48),
    defaultLabelAlign:
      formLayout.defaultLabelAlign === 'center'
        ? 'center'
        : formLayout.defaultLabelAlign === 'end'
          ? 'end'
          : DEFAULT_FORM_LAYOUT.defaultLabelAlign,
    defaultVerticalAlign: formLayout.defaultVerticalAlign === 'start' ? 'start' : DEFAULT_FORM_LAYOUT.defaultVerticalAlign,
    rowGap: normalizeCssLength(formLayout.rowGap, DEFAULT_FORM_LAYOUT.rowGap)
  };
}

function normalizePageSettingsForRender(pageSettings: PageSettings): PageSettings {
  return {
    size: 'A4',
    orientation: pageSettings.orientation === 'landscape' ? 'landscape' : DEFAULT_PAGE_SETTINGS.orientation,
    marginTop: normalizeCssLength(pageSettings.marginTop, DEFAULT_PAGE_SETTINGS.marginTop),
    marginRight: normalizeCssLength(pageSettings.marginRight, DEFAULT_PAGE_SETTINGS.marginRight),
    marginBottom: normalizeCssLength(pageSettings.marginBottom, DEFAULT_PAGE_SETTINGS.marginBottom),
    marginLeft: normalizeCssLength(pageSettings.marginLeft, DEFAULT_PAGE_SETTINGS.marginLeft),
    pageGap: normalizeCssLength(pageSettings.pageGap, DEFAULT_PAGE_SETTINGS.pageGap),
    headerHeight: normalizeCssLength(pageSettings.headerHeight, DEFAULT_PAGE_SETTINGS.headerHeight),
    footerHeight: normalizeCssLength(pageSettings.footerHeight, DEFAULT_PAGE_SETTINGS.footerHeight),
    autoPaginate: pageSettings.autoPaginate,
    defaultHeader: normalizePageRegionForRender(pageSettings.defaultHeader, DEFAULT_PAGE_SETTINGS.defaultHeader),
    defaultFooter: normalizePageRegionForRender(pageSettings.defaultFooter, DEFAULT_PAGE_SETTINGS.defaultFooter)
  };
}

function normalizePageRegionForRender(region: PageRegionConfig, fallback: PageRegionConfig): PageRegionConfig {
  return {
    enabled: region.enabled,
    eyebrow: normalizeString(region.eyebrow, fallback.eyebrow),
    title: normalizeString(region.title, fallback.title),
    body: normalizeString(region.body, fallback.body),
    metaText: normalizeString(region.metaText, fallback.metaText),
    logoUrl: normalizeUrl(region.logoUrl, { allowRelative: true, allowDataImage: true }),
    showPageNumber: region.showPageNumber,
    showDate: region.showDate,
    divider: region.divider,
    align: region.align === 'center' || region.align === 'end' ? region.align : fallback.align
  };
}
