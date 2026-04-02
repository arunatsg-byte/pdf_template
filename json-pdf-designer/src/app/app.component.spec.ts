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
    expect(compiled.querySelector('h1')?.textContent).toContain('Compose accessible A4 forms with real page structure.');
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

    expect(previewFrame?.getAttribute('sandbox')).toBe('');
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

    app.setPreviewMode('export');
    fixture.detectChanges();

    expect(previewFrame?.srcdoc).toContain('th:value=');
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

  it('keeps the primary preview and download actions pinned in a floating dock during editing', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const dock = compiled.querySelector('.floating-action-dock');

    expect(dock).toBeTruthy();
    expect(dock?.textContent).toContain('Open Preview Studio');
    expect(dock?.textContent).toContain('Download HTML');
  });
});
