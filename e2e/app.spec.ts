import { expect, test } from '@playwright/test'

test('home to upload thumbnails to editor flow works', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: /CREATE VLOG/ })).toBeVisible()
  await page.getByRole('button', { name: /CREATE VLOG/ }).click()
  await expect(page.getByText('CHOOSE_YOUR_DAY.EXE')).toBeVisible()
  await page.getByRole('button', { name: /N-Job Day/ }).click()

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

  await page.locator('input[type=file]').setInputFiles({
    name: 'morning-coffee.webm',
    mimeType: 'video/webm',
    buffer: Buffer.from(videoBytes),
  })
  await expect(page.getByAltText('morning-coffee.webm 대표 장면')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByLabel('morning-coffee.webm 미리보기')).toBeVisible()
  await page.getByRole('button', { name: /AI EDIT 시작/ }).click()
  await expect(page.getByText('MY_DAY_IS_RUNNING.EXE')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByText('USER VOICE ONLY')).toHaveCount(0)
})

test('mobile home keeps the primary action and navigation reachable', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByRole('button', { name: /CREATE VLOG/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: '주요 메뉴' })).toBeVisible()
  await page.getByRole('button', { name: /CREATE VLOG/ }).click()
  await expect(page.getByRole('button', { name: /영상 선택하기/ })).toBeVisible()
})
