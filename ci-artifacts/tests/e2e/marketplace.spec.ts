// Only run this Playwright test when explicitly enabled via env.
// This prevents Vitest from trying to execute Playwright's `test()` during unit runs.
// Early exit for Vitest or when the env flag is not set.
if (process.env.VITEST || process.env.PLAYWRIGHT_E2E !== '1') {
  // Provide a skipped suite so Vitest considers the file handled
  try {
    // Use Vitest globals if available
    if (typeof describe === 'function') {
      // @ts-ignore
      describe.skip('playwright e2e (disabled)', () => { /* noop */ })
    } else {
      const { describe } = require('vitest')
      describe.skip('playwright e2e (disabled)', () => {})
    }
  } catch {}
} else {
  const { test, expect } = require('@playwright/test')

  test('marketplace api flow (create -> apply -> list)', async ({ request }) => {
    const create = await request.post('/api/marketplace', { data: { title: 'E2E Test Item', ownerId: 'owner-e2e' } })
    expect(create.ok()).toBeTruthy()
    const j = await create.json()
    expect(j?.item?.id).toBeTruthy()
    const itemId = j.item.id

    const apply = await request.post('/api/marketplace/apply', { data: { itemId, applicantName: 'E2E Applicant' } })
    expect(apply.ok()).toBeTruthy()

    const list = await request.get('/api/marketplace/apply')
    expect(list.ok()).toBeTruthy()
    const listJson = await list.json()
    const found = (listJson.applications || []).find((a:any) => String(a.itemId) === String(itemId))
    expect(found).toBeTruthy()
  })
}
