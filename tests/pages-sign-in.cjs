// Run after a shared-mode build with BASE_PATH=/Turnpike_Projects.
// Mimic Pages without redirecting slashless URLs; no Supabase emails are sent.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const root = path.resolve('build');
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://local').pathname;
    const relative = pathname === '/Turnpike_Projects' || pathname === '/Turnpike_Projects/'
      ? 'index.html' : pathname.startsWith('/Turnpike_Projects/')
        ? pathname.slice('/Turnpike_Projects/'.length) : '';
    const file = path.resolve(root, relative);
    if (!relative || !file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end(); return;
    }
    const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.jpg': 'image/jpeg' };
    response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
    response.end(fs.readFileSync(file));
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [], failedAssets = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400 && /\.(css|js|png|jpg)(\?|$)/.test(response.url())) failedAssets.push(response.url());
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    for (const suffix of ['', '/']) {
      await page.goto(origin + '/Turnpike_Projects' + suffix);
      await page.locator('.app-shell[data-hydrated="true"]').waitFor();
      await page.getByRole('heading', { name: 'Sign in to Turnpike' }).waitFor();
      assert.ok((await page.locator('body').evaluate(el => getComputedStyle(el).fontFamily)).includes('sans-serif'));
      assert.equal(await page.locator('.sidebar').isVisible(), false);
      assert.ok(await page.locator('.sign-in-brand img').evaluate(el => el.naturalWidth > 0));
      assert.ok((await page.locator('.sign-in-card').boundingBox()).width <= 460);
    }
    await page.screenshot({ path: '/tmp/turnpike-sign-in-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.screenshot({ path: '/tmp/turnpike-sign-in-mobile.png', fullPage: true });
    await page.route('**/auth/v1/otp*', async route => {
      const request = route.request();
      const body = request.postDataJSON();
      assert.equal(body.email, 'tester@example.com');
      assert.equal(body.create_user, false);
      assert.equal(new URL(request.url()).searchParams.get('redirect_to'), origin + '/Turnpike_Projects/');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.getByLabel('Email address', { exact: true }).fill('tester@example.com');
    await page.getByRole('button', { name: 'Email me a sign-in link' }).click();
    await page.locator('.notice').filter({ hasText: 'Check your email for a sign-in link.' }).waitFor();
    await page.getByText('Use a password instead', { exact: true }).click();
    assert.equal(await page.getByLabel('Password', { exact: true }).isVisible(), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(failedAssets, []);
    console.log('PASS: Pages assets on slashless and trailing-slash URLs, desktop/mobile layout, mocked email sign-in and password option.');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
