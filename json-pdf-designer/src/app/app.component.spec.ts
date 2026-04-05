import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { DEFAULT_THEME } from './form-builder.models';

describe('AppComponent', () => {
  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [AppComponent]
    }).compileComponents();
  });

  it('creates the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;

    expect(app).toBeTruthy();
  });

  it('loads JSON fields from the starter sample and generates Thymeleaf bindings', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    expect(app.jsonFields.length).toBeGreaterThan(0);
    expect(app.thymeleafMarkup).toContain("th:value=\"${payload['username']}\"");
    expect(app.thymeleafMarkup).toContain('Accessible Application Form');
  });

  it('adds manual blocks into the builder canvas', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const initialCount = app.blocks.length;
    app.addManualBlock('section');
    app.addManualBlock('declaration');

    expect(app.blocks.length).toBe(initialCount + 2);
    expect(app.blocks.some((block) => block.kind === 'section')).toBeTrue();
    expect(app.blocks.some((block) => block.kind === 'declaration')).toBeTrue();
  });

  it('supports manual page breaks in the page plan', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.addManualBlock('page-break');
    app.addManualBlock('paragraph');

    expect(app.pagePlan.length).toBeGreaterThan(1);
  });

  it('renders the updated builder heading', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Thymeleaf Form Portal');
  });

  it('normalizes stored themes before loading them into the builder', () => {
    localStorage.setItem(
      'json-pdf-designer-themes',
      JSON.stringify([
        {
          id: 'theme-unsafe',
          name: 'Unsafe Theme',
          pageBackground: 'not-a-color',
          headingFont: 'Bad Font',
          bodyFont: 'Another Bad Font',
          radius: '12px} body { display:none'
        }
      ])
    );

    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const storedTheme = app.themes.find((theme) => theme.id === 'theme-unsafe');
    expect(storedTheme).toBeTruthy();
    expect(storedTheme?.pageBackground).toBe(DEFAULT_THEME.pageBackground);
    expect(storedTheme?.headingFont).toBe(DEFAULT_THEME.headingFont);
    expect(storedTheme?.bodyFont).toBe(DEFAULT_THEME.bodyFont);
    expect(storedTheme?.radius).toBe(DEFAULT_THEME.radius);
  });

  it('sandboxes the live preview iframe', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.openPreviewFocus();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const previewFrame = compiled.querySelector('iframe[title="Live form preview"]');

    expect(previewFrame?.getAttribute('sandbox')).toBe('allow-same-origin');
    expect(previewFrame?.getAttribute('referrerpolicy')).toBe('no-referrer');
  });

  it('loads the rendered HTML document into the preview studio iframe and keeps it in sync', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.openPreviewFocus();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const previewFrame = compiled.querySelector('iframe[title="Live form preview"]') as HTMLIFrameElement | null;

    expect(previewFrame).toBeTruthy();
    expect(previewFrame?.srcdoc).toContain('<!DOCTYPE html>');
    expect(previewFrame?.srcdoc).toContain('Accessible Application Form');
    expect(previewFrame?.srcdoc).toContain('data-block-id=');

    app.setPreviewMode('export');
    fixture.detectChanges();

    expect(previewFrame?.srcdoc).toContain('th:value=');
  });

  it('keeps editor metadata out of the downloaded thymeleaf export', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    expect(app.samplePreviewDocument).toContain('data-block-id=');
    expect(app.thymeleafMarkup).not.toContain('data-block-id=');
  });

  it('pins the preview studio to the viewport instead of flowing to the bottom of the page', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.openPreviewFocus();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dialog = compiled.querySelector('.preview-dialog') as HTMLElement | null;

    expect(dialog).toBeTruthy();
    expect(getComputedStyle(dialog!).position).toBe('fixed');
    expect(dialog!.getBoundingClientRect().top).toBeLessThan(40);
  });

  it('opens data setup from quick start and scrolls the setup panel into view', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const scrollSpy = spyOn(app.settingsPanelAnchor!.nativeElement, 'scrollIntoView');
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });

    app.setSettingsTab('data');

    expect(app.settingsExpanded).toBeTrue();
    expect(app.settingsTab).toBe('data');
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('opens the palette panel from quick start and scrolls to the Add to form column', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    const scrollSpy = spyOn(app.palettePanelAnchor!.nativeElement, 'scrollIntoView');
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });

    app.openPaletteTab('fields');

    expect(app.paletteTab).toBe('fields');
    expect(scrollSpy).toHaveBeenCalled();
  });

  it('opens the inspector from quick start and selects the first block when needed', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    fixture.detectChanges();

    app.selectedBlockId = null;
    const scrollSpy = spyOn(app.editorPanelAnchor!.nativeElement, 'scrollIntoView');
    spyOn(window, 'requestAnimationFrame').and.callFake((callback: FrameRequestCallback): number => {
      callback(0);
      return 0;
    });

    app.openInspectorPanel();

    expect(app.sidePanelTab).toBe('inspector');
    expect(app.selectedBlockId === (app.blocks[0]?.id ?? null)).toBeTrue();
    expect(scrollSpy).toHaveBeenCalled();
  });
});
