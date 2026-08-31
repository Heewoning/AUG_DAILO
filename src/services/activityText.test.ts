import { describe, expect, it } from 'vitest'
import { activityTextProvider } from './activityText'

describe('activityTextProvider', () => {
  it('turns a Korean vlog moment into an English label and matching icon', () => {
    expect(activityTextProvider.present('다이소 출근')).toEqual({ english: 'Going to work at Daiso', icon: '💼' })
    expect(activityTextProvider.present('퇴근하고 카페')).toEqual({ english: 'After work coffee', icon: '🌙' })
    expect(activityTextProvider.present('저녁 운동')).toEqual({ english: 'Dinner time', icon: '🍽️' })
    expect(activityTextProvider.present('서진이랑 함께❤️')).toEqual({ english: 'With Seojin ❤️', icon: '💗' })
    expect(activityTextProvider.present('서진이의 하루')).toEqual({ english: "Seojin's day", icon: '💗' })
  })
})
