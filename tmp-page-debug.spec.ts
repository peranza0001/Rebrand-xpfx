import { test } from '@playwright/test';

test('debug live page', async ({ page }) => {
  page.on('console', msg => console.log('BROWSER_CONSOLE', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE_ERROR', err.toString()));
  page.on('requestfailed', req => console.log('REQUEST_FAILED', req.url(), req.failure()?.errorText));
  page.on('response', res => {
    const url = res.url();
    if (url.includes('/assets/') || url.endsWith('.js') || url.endsWith('.css')) {
      console.log('RESPONSE', res.status(), url, res.headers()['content-type']);
    }
  });

  const response = await page.goto('https://web-production-94f970.up.railway.app', { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('FINAL_STATUS', response && response.status());
  await page.waitForTimeout(5000);
  console.log('TITLE', await page.title());
  console.log('ROOT_HTML', await page.locator('#root').innerHTML());
  console.log('BODY_TEXT', await page.locator('body').innerText());
});
