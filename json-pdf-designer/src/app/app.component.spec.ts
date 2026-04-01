import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';

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
});
