// Only run this Playwright test when explicitly enabled via env.
// This prevents Vitest from trying to execute Playwright's `test()` during local unit runs.
if (process.env.PLAYWRIGHT_E2E === '1') {
  const { test, expect } = require('@playwright/test')

  test('marketplace api flow (create -> apply -> list)', async ({ request }) => {
  // create a new item (ownerId allowed via body)
  const create = await request.post('/api/marketplace', { data: { title: 'E2E Test Item', ownerId: 'owner-e2e' } })
  expect(create.ok()).toBeTruthy()
  const j = await create.json()
  expect(j?.item?.id).toBeTruthy()
  const itemId = j.item.id

  // apply to item
  const apply = await request.post('/api/marketplace/apply', { data: { itemId, applicantName: 'E2E Applicant' } })
  expect(apply.ok()).toBeTruthy()

  // ensure the application exists when listing
  const list = await request.get('/api/marketplace/apply')
  expect(list.ok()).toBeTruthy()
  const listJson = await list.json()
  const found = (listJson.applications || []).find((a:any) => String(a.itemId) === String(itemId))
  expect(found).toBeTruthy()
  })
}
