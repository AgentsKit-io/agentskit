import { expect, test } from '@playwright/test'
import { CASE_IDS } from '../src/Harness'

for (const caseId of CASE_IDS) {
  test(`visual: ${caseId}`, async ({ page }) => {
    await page.goto(`/?case=${caseId}`)
    const frame = page.locator('[data-case-frame]')
    await expect(frame).toBeVisible()
    // Disable caret blink + animations via CSS injection so screenshots
    // are byte-stable across runs.
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
          caret-color: transparent !important;
        }
      `,
    })
    await expect(frame).toHaveScreenshot(`${caseId}.png`)
  })
}
