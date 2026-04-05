import { buildFormDocument } from './form-builder.renderer';
import { DEFAULT_FORM_LAYOUT, DEFAULT_PAGE_SETTINGS, DEFAULT_THEME, FieldBlock, LinkBlock } from './form-builder.models';

describe('form-builder.renderer', () => {
  it('falls back to safe theme and layout values when unsafe CSS-like input is provided', () => {
    const html = buildFormDocument({
      blocks: [],
      jsonFields: [],
      layoutMode: 'single',
      theme: {
        ...DEFAULT_THEME,
        pageBackground: 'not-a-color',
        radius: '18px} body { display:none',
        headingFont: 'Bad Font',
        bodyFont: 'Another Bad Font'
      },
      title: 'Unsafe Theme Demo',
      useThymeleaf: false,
      formLayout: {
        ...DEFAULT_FORM_LAYOUT,
        rowGap: '16px} body { display:none'
      },
      pageSettings: {
        ...DEFAULT_PAGE_SETTINGS,
        marginTop: '18mm} body { display:none'
      },
      pageOverrides: []
    });

    expect(html).toContain(`--page-background: ${DEFAULT_THEME.pageBackground};`);
    expect(html).toContain(`--radius: ${DEFAULT_THEME.radius};`);
    expect(html).toContain(`--heading-font: ${DEFAULT_THEME.headingFont};`);
    expect(html).toContain(`--body-font: ${DEFAULT_THEME.bodyFont};`);
    expect(html).not.toContain('18mm} body');
    expect(html).not.toContain('16px} body');
    expect(html).not.toContain('display:none');
  });

  it('drops unsafe link urls but keeps the label visible', () => {
    const unsafeLink: LinkBlock = {
      id: 'link-unsafe',
      kind: 'link',
      text: 'Support portal',
      href: 'javascript:alert(1)',
      openInNewTab: true,
      width: 'full'
    };

    const html = buildFormDocument({
      blocks: [unsafeLink],
      jsonFields: [],
      layoutMode: 'single',
      theme: DEFAULT_THEME,
      title: 'Unsafe Link Demo',
      useThymeleaf: false,
      formLayout: DEFAULT_FORM_LAYOUT,
      pageSettings: DEFAULT_PAGE_SETTINGS,
      pageOverrides: []
    });

    expect(html).not.toContain('href="javascript:alert(1)"');
    expect(html).not.toContain('target="_blank"');
    expect(html).toContain('<span class="inline-link">Support portal</span>');
  });

  it('keeps allowed link protocols in exported markup', () => {
    const mailtoLink: LinkBlock = {
      id: 'link-mailto',
      kind: 'link',
      text: 'Email support',
      href: 'mailto:support@example.com',
      openInNewTab: false,
      width: 'full'
    };

    const html = buildFormDocument({
      blocks: [mailtoLink],
      jsonFields: [],
      layoutMode: 'single',
      theme: DEFAULT_THEME,
      title: 'Allowed Link Demo',
      useThymeleaf: false,
      formLayout: DEFAULT_FORM_LAYOUT,
      pageSettings: DEFAULT_PAGE_SETTINGS,
      pageOverrides: []
    });

    expect(html).toContain('href="mailto:support@example.com"');
    expect(html).toContain('>Email support</a>');
  });

  it('renders stacked labels without marker indentation and applies custom field box alignment', () => {
    const emailField: FieldBlock = {
      id: 'field-email',
      kind: 'field',
      source: 'json',
      fieldKey: 'email',
      bindingKey: 'email',
      width: 'half',
      label: 'Email',
      controlType: 'email',
      placeholder: 'Enter email',
      helperText: '',
      required: false,
      hideLabel: false,
      inline: false,
      defaultValue: 'elara.quinn@example.com',
      options: [],
      validation: {
        minLength: '',
        maxLength: '',
        min: '',
        max: '',
        pattern: '',
        customError: ''
      },
      alignmentMode: 'stacked',
      labelWidth: 34,
      labelAlign: 'center',
      verticalAlign: 'start',
      controlAlign: 'end',
      controlWidth: 72
    };

    const html = buildFormDocument({
      blocks: [emailField],
      jsonFields: [
        {
          key: 'email',
          label: 'Email',
          preview: 'elara.quinn@example.com',
          type: 'string',
          value: 'elara.quinn@example.com'
        }
      ],
      layoutMode: 'two-column',
      theme: DEFAULT_THEME,
      title: 'Alignment Demo',
      useThymeleaf: false,
      formLayout: DEFAULT_FORM_LAYOUT,
      pageSettings: DEFAULT_PAGE_SETTINGS,
      pageOverrides: []
    });

    expect(html).toContain('--field-control-justify:end; --field-control-width:72%;');
    expect(html).toContain('<span class="field-label-shell">');
    expect(html).not.toContain('field-label-shell has-marker');
  });
});
