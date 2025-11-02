import { test, expect } from '@playwright/test';

const ARCHIVE_FIXTURE = Buffer.from(
  'UEsDBBQACAAIAAAAAAAAAAAAAAAAAAAAAAAABwAabm90ZXMvdGVzdC50eHRVVAkAA5ynn1Oc' +
    'p59TnHV4CwABBPUBAAAEFAAAAGhpIHRoZXJlClBLAwQUAAgACAAAAAAAAAAAAAAAAAAAAAAA' +
    'AAkAGltYWdlcy9UVAkAA0S0n1NEtJ9TR3V4CwABBPUBAAAEFAAAAC5wbmcKUEsBAhQAFAAIAAgA' +
    'AAAAAAAAAAAAAAAAAAAAAAAHAAAAAAAAAAAAEAAAAAAAAAAbm90ZXMvdGVzdC50eHRVVAUAA5yn' +
    'n1N1eAsAAQT1AQAABBQAAABQSwECFAAUAA8ACAAAAAAAAAAAAAAAAAAAAAAACQAAAAAAAAAAABAA' +
    'AAAAAAAZW1wdHkudHh0VVQFAANSsZ9TdXgLAAEE9QEAAAQUAAAAUEsBAhQAFAAIAAgAAAAAAAAAA' +
    'AAAAAAAAAAAAAAAJAAAAAAAAAAAAEAAAAAAAAAAaW1hZ2VzL1VUBQADRLSfU3V4CwABBPUBAAAEF' +
    'AAAAFBLAQIUAxQACAAIAAAAAAAAAAAAAAAAAAAAAAAADwAAAAAAAAAAEAAAAAAAAAAuUEsBAhQA',
  'base64'
).toString('base64');

test('landing page lists Archive Explorer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Archive Explorer' })).toBeVisible();
});

test('can open archive explorer and see dropzone', async ({ page }) => {
  await page.goto('/tools/archive-explorer');
  await expect(page.getByText('Drop or select an archive')).toBeVisible();
});

// smoke-check decompress flow with base64 zipped file stub
// Ideally we would upload a true binary via playwright, but keep minimal due to environment constraints

test('displays nodes after uploading archive placeholder', async ({ page }) => {
  await page.goto('/tools/archive-explorer');
  const fileInput = page.locator('input[type="file"]');
  const decoded = Buffer.from(ARCHIVE_FIXTURE, 'base64');
  await fileInput.setInputFiles({ name: 'sample.zip', mimeType: 'application/zip', buffer: decoded });
  await expect(page.getByRole('treeitem', { name: /notes/i })).toBeVisible();
});
