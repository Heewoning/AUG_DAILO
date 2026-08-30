import { describe, expect, it } from 'vitest'
import { readCapturedAt } from './mediaMetadata'

const box = (type: string, payload: Uint8Array) => {
  const bytes = new Uint8Array(8 + payload.length)
  const view = new DataView(bytes.buffer)
  view.setUint32(0, bytes.length)
  bytes.set(new TextEncoder().encode(type), 4)
  bytes.set(payload, 8)
  return bytes
}

describe('readCapturedAt', () => {
  it('uses the embedded MP4 movie creation time instead of the selected file time', async () => {
    const captured = new Date('2024-05-17T08:45:00.000Z')
    const mvhdPayload = new Uint8Array(20)
    new DataView(mvhdPayload.buffer).setUint32(4, Math.floor(captured.getTime() / 1000) + 2_082_844_800)
    const file = new File([box('ftyp', new Uint8Array(4)), box('moov', box('mvhd', mvhdPayload))], 'day.mov', {
      type: 'video/quicktime',
      lastModified: new Date('2026-08-30T12:00:00.000Z').getTime(),
    })

    const result = await readCapturedAt(file)
    expect(result.source).toBe('embedded-metadata')
    expect(result.date.toISOString()).toBe(captured.toISOString())
  })
})

