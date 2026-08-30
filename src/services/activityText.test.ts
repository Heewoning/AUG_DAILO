import { describe, expect, it } from 'vitest'
import { activityTextProvider } from './activityText'

describe('activityTextProvider', () => {
  it('turns a Korean vlog moment into an English label and matching icon', () => {
    expect(activityTextProvider.present('다이소 출근')).toEqual({ english: 'Going to work at Daiso', icon: '💼' })
    expect(activityTextProvider.present('퇴근하고 카페')).toEqual({ english: 'After work coffee', icon: '🌙' })
    expect(activityTextProvider.present('저녁 운동')).toEqual({ english: 'Dinner time', icon: '🍽️' })
  })
})
