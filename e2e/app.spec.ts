import { expect, test } from '@playwright/test'

test('theme selection opens the video page without a blank screen', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('dailo:projects:v1', JSON.stringify([{ id: 'old-project', title: 'OLD_DAY.EXE', clips: [{}] }]))
  })
  await page.goto('./')
  await page.getByRole('button', { name: /영상 만들기 시작/ }).click()
  const nextButton = page.getByRole('button', { name: /^다음/ })
  await expect(nextButton).toBeDisabled()
  await page.getByRole('button', { name: /N잡 데이/ }).click()
  await expect(nextButton).toBeEnabled()
  await nextButton.click()
  await expect(page.getByText('STEP 02')).toBeVisible()
  await expect(page.getByRole('button', { name: /내 영상 고르기/ })).toBeVisible()
  await expect(page.locator('.app-error-screen')).toHaveCount(0)
})

test('home to upload thumbnails to editor flow works', async ({ page }) => {
  test.setTimeout(120_000)
  test.skip(test.info().project.name === 'iphone-webkit', 'WebKit 테스트 런타임은 canvas.captureStream 테스트 픽스처 생성을 지원하지 않음')
  await page.addInitScript(() => {
    Object.defineProperty(window, 'showDirectoryPicker', { value: undefined })
    Object.defineProperty(navigator, 'canShare', { value: () => true })
    Object.defineProperty(navigator, 'share', { value: async () => { (window as Window & { __dailoShared?: boolean }).__dailoShared = true } })
  })
  await page.goto('./')
  await expect(page.getByRole('button', { name: /영상 만들기 시작/ })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)
  await page.getByRole('button', { name: /영상 만들기 시작/ }).click()
  await expect(page.getByText('STEP 01')).toBeVisible()
  await page.getByRole('button', { name: /N잡 데이/ }).click()
  await expect(page.getByRole('button', { name: /^다음/ })).toBeEnabled()
  await page.getByRole('button', { name: /^다음/ }).click()
  await expect(page.getByText('STEP 02')).toBeVisible()

  const videoBytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas')
    canvas.width = 180
    canvas.height = 320
    const context = canvas.getContext('2d')!
    context.fillStyle = '#f4cf63'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.fillStyle = '#174d9b'
    context.fillRect(18, 50, 144, 110)
    context.fillStyle = '#3d2a21'
    context.font = 'bold 20px monospace'
    context.fillText('COFFEE.EXE', 25, 220)
    const stream = canvas.captureStream(12)
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8' })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => chunks.push(event.data)
    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: 'video/webm' }))
    })
    recorder.start()
    await new Promise((resolve) => window.setTimeout(resolve, 700))
    recorder.stop()
    const blob = await finished
    stream.getTracks().forEach((track) => track.stop())
    return Array.from(new Uint8Array(await blob.arrayBuffer()))
  })

  await page.locator('input[type=file]').setInputFiles([
    { name: 'morning-coffee.webm', mimeType: 'video/webm', buffer: Buffer.from(videoBytes) },
    { name: 'office.webm', mimeType: 'video/webm', buffer: Buffer.from(videoBytes) },
    { name: 'side-job.webm', mimeType: 'video/webm', buffer: Buffer.from(videoBytes) },
    { name: 'night.webm', mimeType: 'video/webm', buffer: Buffer.from(videoBytes) },
  ])
  await expect(page.getByAltText('morning-coffee.webm 대표 장면')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByAltText('night.webm 대표 장면')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByLabel('morning-coffee.webm 미리보기')).toBeVisible()
  await page.locator('.drop-zone input[type=file]').setInputFiles({
    name: 'morning-coffee.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from(videoBytes),
  })
  await expect(page.getByText(/중복 영상은 추가하지 않았어요/)).toBeVisible()
  await expect(page.locator('.thumbnail-grid article')).toHaveCount(4)
  await expect(page.getByRole('button', { name: /꾸미기 시작/ })).toBeEnabled()
  await page.getByRole('button', { name: /꾸미기 시작/ }).click()
  await expect(page.getByText('MY_DAY_IS_RUNNING.EXE')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('USER VOICE ONLY')).toHaveCount(0)
  await expect(page.locator('.reference-cover-overlay')).toBeVisible()
  await page.getByRole('button', { name: '장면·자막', exact: true }).click()
  for (let index = 0; index < 4; index += 1) {
    await page.locator('.clip-sidebar-card__select').nth(index).click()
    await expect.poll(() => page.locator('.phone-preview video').evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1)
    await expect(page.locator('.editor-media-retry')).toHaveCount(0)
  }
  await page.locator('.clip-sidebar-card__select').first().click()
  await expect.poll(() => page.locator('.phone-preview video').evaluate((video: HTMLVideoElement) => ({ readyState: video.readyState, source: video.currentSrc }))).toMatchObject({ readyState: expect.any(Number), source: expect.stringMatching(/^blob:/) })
  const timeInput = page.getByLabel('선택한 클립 시간')
  await expect(timeInput).toBeVisible()
  expect(await timeInput.inputValue()).toMatch(/^\d{2}:\d{2}$/)
  if ((page.viewportSize()?.width ?? 1000) <= 600) {
    const previewBox = await page.locator('.preview-column').boundingBox()
    const inspectorBox = await page.locator('.inspector').boundingBox()
    const clipStripBox = await page.locator('.clip-sidebar').boundingBox()
    expect(previewBox?.y).toBeLessThan(clipStripBox?.y ?? 0)
    expect(clipStripBox?.y).toBeLessThan(inspectorBox?.y ?? 0)
    expect(previewBox?.height).toBeGreaterThanOrEqual(270)
  }
  await page.getByLabel('선택한 클립 문구').fill('다이소 출근')
  await expect(page.getByText('Going to work at Daiso', { exact: true })).toBeVisible()
  await expect(page.locator('.reference-scene-overlay')).toContainText('Going to work at Daiso')
  if ((page.viewportSize()?.width ?? 1000) <= 600) {
    expect(await page.locator('.reference-scene-overlay time').evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize))).toBeLessThanOrEqual(28)
    const previewBox = await page.locator('.preview-column').boundingBox()
    expect(previewBox?.height).toBeLessThanOrEqual(165)
    await expect(page.locator('.editor-quest-bar')).toBeHidden()
    await expect(page.locator('.app-shell--editor .bottom-nav')).toBeHidden()
    await expect(page.locator('.clip-sidebar')).toBeHidden()
  }
  await page.waitForTimeout(350)
  await expect(page.locator('.xp-scene-tag')).toBeHidden()
  await expect(page.locator('.reference-scene-overlay time')).toBeVisible()
  await expect(page.locator('.reference-scene-overlay strong')).toBeVisible()
  await expect(page.getByRole('button', { name: /설명 녹음/ })).toHaveCount(0)
  await page.getByLabel('선택한 클립 문구').fill('머리핀을 꽂았어요❤️')
  await expect(page.getByLabel('영어 자막')).toHaveValue(/I put on a hair clip/)
  await page.getByLabel('영어 자막').fill('')
  await expect(page.getByLabel('영어 자막')).toHaveValue('')
  await expect(page.locator('.scene-overlay-copy > small')).toHaveText('')
  await page.getByLabel('영어 자막').blur()
  await page.getByRole('button', { name: '자동 번역' }).click()
  await expect(page.getByLabel('영어 자막')).toHaveValue(/I put on a hair clip/)
  await page.getByRole('button', { name: '전환', exact: true }).click()
  await page.locator('.transition-list button').filter({ hasText: 'FLASH' }).click()
  await expect(page.locator('.preview-transition--flash')).toHaveCount(1)
  await expect.poll(() => page.locator('.phone-preview video').evaluate((video: HTMLVideoElement) => video.readyState)).toBeGreaterThanOrEqual(1)
  await expect(page.locator('.editor-media-retry')).toHaveCount(0)

  await page.getByRole('button', { name: '말풍선', exact: true }).click()
  await page.getByRole('button', { name: '충전 바', exact: true }).click()
  await page.getByLabel('말풍선 시작 시간').fill('0')
  await page.getByLabel('말풍선 유지 시간').fill('0.3')
  await page.getByLabel('말풍선 유지 시간').blur()
  await expect(page.locator('.xp-vlog-widget--energy-bar')).toBeVisible()
  const widgetBox = await page.locator('.xp-vlog-widget').boundingBox()
  const phoneBox = await page.locator('.phone-preview').boundingBox()
  expect(widgetBox?.x).toBeGreaterThanOrEqual(phoneBox?.x ?? 0)
  expect((widgetBox?.x ?? 0) + (widgetBox?.width ?? 0)).toBeLessThanOrEqual((phoneBox?.x ?? 0) + (phoneBox?.width ?? 0))

  await page.getByRole('button', { name: /영상 만들기/ }).click()
  await expect(page.getByText('오늘의 영상이 완성됐어요')).toBeVisible({ timeout: 90_000 })
  await expect(page.locator('.export-result-preview')).toBeVisible()
  const dialogBox = await page.locator('.render-dialog').boundingBox()
  expect(dialogBox?.y).toBeGreaterThanOrEqual(0)
  expect((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0)).toBeLessThanOrEqual(page.viewportSize()?.height ?? 0)
  await page.getByRole('button', { name: '갤러리에 저장' }).click()
  await expect.poll(() => page.evaluate(() => Boolean((window as Window & { __dailoShared?: boolean }).__dailoShared))).toBe(true)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'DAILO 폴더' }).click()
  const result = await downloadPromise
  expect(result.suggestedFilename()).toMatch(/^DAY_IN_LIFE_\d{8}\.(webm|mp4)$/)
  await page.getByRole('button', { name: '닫기' }).click()
  await page.getByRole('button', { name: '내 영상' }).click()
  await expect(page.getByText('완성한 브이로그')).toBeVisible()
  await page.getByRole('button', { name: /오늘의 하루.EXE/ }).click()
  await expect(page.locator('.archive-player video')).toBeVisible({ timeout: 10_000 })
})

test('mobile home keeps the primary action and navigation reachable', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: /영상 만들기 시작/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /지난 영상 이어서/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible()
  expect(await page.evaluate(() => window.innerWidth > 600 || document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)
  await page.getByRole('button', { name: /영상 만들기 시작/ }).click()
  expect(await page.evaluate(() => window.innerWidth > 600 || document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)
  await page.getByRole('button', { name: /내가 직접 적기/ }).click()
  await page.getByLabel('나의 테마 이름').fill('학교 끝나고 친구와')
  await expect(page.getByLabel('나의 테마 이름')).toHaveValue('학교 끝나고 친구와')
  await page.getByLabel('나의 테마 이름').fill('')
  await expect(page.getByRole('button', { name: /^다음/ })).toBeVisible()
  await page.getByRole('button', { name: /^다음/ }).click()
  await expect(page.getByRole('button', { name: /내 영상 고르기/ })).toBeVisible()
})
