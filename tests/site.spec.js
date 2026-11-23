const { test, expect } = require('@playwright/test');

const pages = [
  'index.html',
  'about.html',
  'academics.html',
  'achievements.html',
  'admissions.html',
  'gallery.html',
  'contact.html',
  'environment.html',
  'activities.html',
  'campuses.html',
];

test('all pages load without missing local assets or page errors', async ({ page }) => {
  test.setTimeout(180_000);
  for (const path of pages) {
    const failures = [];
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().includes('Failed to load resource')) {
        failures.push(`console: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => failures.push(`page: ${error.message}`));
    page.on('response', (response) => {
      if (response.url().startsWith('http://127.0.0.1:4173/') && response.status() >= 400) {
        failures.push(`${response.status()} ${response.url()}`);
      }
    });

    await page.goto(`/${path}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('h1')).toHaveCount(1);
    const localSources = await page.locator('img[src]').evaluateAll((images) =>
      [...new Set(images.map((image) => image.getAttribute('src')).filter((source) => source && !source.startsWith('http')))]
    );
    for (const source of localSources) {
      const response = await page.request.get(`/${source}`);
      expect(response.ok(), `${path} has missing ${source}`).toBeTruthy();
    }
    expect(failures, `${path} has runtime or network errors`).toEqual([]);
  }
});

test('mobile drawer and academics tabs work', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/index.html');
  await page.locator('#menu-toggle').click();
  await expect(page.locator('#mobile-drawer')).toHaveClass(/open/);
  await expect(page.locator('#drawer-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.locator('#mobile-drawer')).not.toHaveClass(/open/);

  await page.goto('/academics.html');
  await page.locator('#tab-primary').click();
  await expect(page.locator('#panel-primary')).toBeVisible();
  await expect(page.locator('#tab-primary')).toHaveAttribute('aria-selected', 'true');
});

test('homepage hero controls and programme links work', async ({ page }) => {
  await page.goto('/index.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('[data-hero-slide].is-active h1')).toContainText('Growing Minds.');
  await expect(page.locator('.school-highlights a')).toHaveCount(3);

  await page.locator('[data-hero-next]').click();
  await expect(page.locator('[data-hero-slide].is-active h2')).toContainText('Nursery Foundations.');
});

test('gallery lightbox opens and closes', async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto('/gallery.html');
  await page.locator('[data-gallery-item]').first().click();
  await expect(page.locator('#lightbox')).toHaveAttribute('open', '');
  await page.keyboard.press('Escape');
  await expect(page.locator('#lightbox')).not.toHaveAttribute('open', '');
});

test('admissions form reports validation errors', async ({ page }) => {
  await page.goto('/admissions.html');
  await page.locator('[data-enquiry-form] button[type="submit"]').click();
  await expect(page.locator('[aria-invalid="true"]')).not.toHaveCount(0);
});

for (const width of [360, 390, 430, 768, 1024, 1280, 1440, 1920]) {
  test(`no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/index.html');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
  });
}
