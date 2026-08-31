import { describe, expect, it } from 'vitest'
import { activityTextProvider } from './activityText'

describe('activityTextProvider', () => {
  it('turns a Korean vlog moment into an English label and matching icon', () => {
    expect(activityTextProvider.present('다이소 출근')).toEqual({ english: 'Going to work at Daiso', icon: '💼' })
    expect(activityTextProvider.present('퇴근하고 카페')).toEqual({ english: 'Coffee after work', icon: '☕' })
    expect(activityTextProvider.present('저녁 운동')).toEqual({ english: 'Evening workout', icon: '🏃‍♀️' })
    expect(activityTextProvider.present('서진이랑 함께❤️')).toEqual({ english: 'With Seojin ❤', icon: '💗' })
    expect(activityTextProvider.present('서진이의 하루')).toEqual({ english: "Seojin's day", icon: '💗' })
    expect(activityTextProvider.present('머리핀을 꽂았어요❤️')).toEqual({ english: 'I put on a hair clip ❤', icon: '🎀' })
    expect(activityTextProvider.present('서진이랑 놀았어요')).toEqual({ english: 'I had fun with Seojin', icon: '💗' })
    expect(activityTextProvider.present('머리핀이 너무 좋아요')).toEqual({ english: 'I really love my hair clip', icon: '🎀' })
    expect(activityTextProvider.present('춤추는 서진이❤️')).toEqual({ english: 'Seojin is dancing ❤', icon: '💗' })
  })
})
