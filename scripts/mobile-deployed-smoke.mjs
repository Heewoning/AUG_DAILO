import { chromium, devices, webkit } from 'playwright'

const targets = [
  ['openai-sites', 'https://aug-dailo.fnvlzl97.chatgpt.site/'],
  ['github-pages', 'https://heewoning.github.io/AUG_DAILO/'],
]

const browsers = [
  ['galaxy-chromium', chromium, devices['Pixel 7']],
  ['iphone-webkit', webkit, devices['iPhone 14']],
]

const failures = []

for (const [browserName, browserType, device] of browsers) {
  const browser = await browserType.launch({ headless: true })
  for (const [siteName, url] of targets) {
    const context = await browser.newContext({ ...device, serviceWorkers: 'block' })
    const page = await context.newPage()
    const errors = []
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
    page.on('requestfailed', (request) => errors.push(`requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`))
    try {
      const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 })
      await page.getByRole('button', { name: /영상 만들기 시작/ }).waitFor({ state: 'visible', timeout: 10_000 })
      await page.getByRole('button', { name: /영상 만들기 시작/ }).click()
      await page.getByText('STEP 01').waitFor({ state: 'visible', timeout: 10_000 })
      await page.getByRole('button', { name: /N잡 데이/ }).click()
      await page.getByText('STEP 02').waitFor({ state: 'visible', timeout: 10_000 })
      const result = {
        browser: browserName,
        site: siteName,
        status: response?.status(),
        title: await page.title(),
        themeAdvanced: await page.getByText('STEP 02').isVisible(),
        errors,
      }
      console.log(JSON.stringify(result))
      if (result.status !== 200 || !result.themeAdvanced || errors.length) failures.push(result)
    } catch (error) {
      const result = { browser: browserName, site: siteName, errors: [...errors, error.message] }
      console.error(JSON.stringify(result))
      failures.push(result)
    }
    await context.close()
  }
  await browser.close()
}

if (failures.length) {
  console.error(JSON.stringify(failures, null, 2))
  process.exitCode = 1
}
