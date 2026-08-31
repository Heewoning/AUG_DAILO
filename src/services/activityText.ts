export interface ActivityTextProvider {
  readonly id: string
  present(text: string): { english: string; icon: string }
}

const exactTranslations: Record<string, string> = {
  '출근': 'Going to work',
  '회사 출근': 'Going to work',
  '다이소 출근': 'Going to work at Daiso',
  '퇴근': 'Off work',
  '퇴근하고 카페': 'After work coffee',
  '아침 준비': 'Morning routine',
  '모닝 커피': 'Morning coffee',
  '점심': 'Lunch break',
  '저녁': 'Dinner time',
  '운동': 'Workout time',
  '공부': 'Study session',
  '영상 촬영': 'Content shoot',
  '인터뷰': 'Interview day',
  '집으로': 'Going home',
  '오늘의 하루': 'A day in my life',
}

const rules: Array<{ pattern: RegExp; english: string; icon: string }> = [
  { pattern: /출근|회사|오피스|office/i, english: 'Going to work', icon: '💼' },
  { pattern: /퇴근/, english: 'Off work', icon: '🌙' },
  { pattern: /카페|커피|라떼|coffee|cafe/i, english: 'Coffee break', icon: '☕' },
  { pattern: /아침|모닝|기상|일어나/, english: 'Morning routine', icon: '☀️' },
  { pattern: /점심|런치/, english: 'Lunch break', icon: '🍴' },
  { pattern: /저녁|디너|밥|식사/, english: 'Dinner time', icon: '🍽️' },
  { pattern: /운동|헬스|러닝|필라테스|요가|workout|gym/i, english: 'Workout time', icon: '🏃‍♀️' },
  { pattern: /공부|스터디|수업|과제/, english: 'Study session', icon: '📚' },
  { pattern: /촬영|콘텐츠|편집|브이로그/, english: 'Creating content', icon: '🎬' },
  { pattern: /인터뷰|면접/, english: 'Interview day', icon: '🎙️' },
  { pattern: /쇼핑|마트|다이소/, english: 'Shopping time', icon: '🛍️' },
  { pattern: /친구|데이트|약속/, english: 'Time together', icon: '💗' },
  { pattern: /여행|공항|기차/, english: 'Travel day', icon: '✈️' },
  { pattern: /지하철|버스|이동/, english: 'On the way', icon: '🚇' },
  { pattern: /집|귀가/, english: 'Going home', icon: '🏠' },
  { pattern: /잠|수면|취침/, english: 'Time to rest', icon: '🌙' },
  { pattern: /요리|베이킹/, english: 'Cooking time', icon: '🍳' },
  { pattern: /산책/, english: 'Evening walk', icon: '🌿' },
  { pattern: /N잡|부업|사이드|side job/i, english: 'Side job mode', icon: '💻' },
  { pattern: /하루/, english: 'A day in my life', icon: '💿' },
]

const initials = ['g', 'kk', 'n', 'd', 'tt', 'r', 'm', 'b', 'pp', 's', 'ss', '', 'j', 'jj', 'ch', 'k', 't', 'p', 'h']
const vowels = ['a', 'ae', 'ya', 'yae', 'eo', 'e', 'yeo', 'ye', 'o', 'wa', 'wae', 'oe', 'yo', 'u', 'wo', 'we', 'wi', 'yu', 'eu', 'ui', 'i']
const finals = ['', 'k', 'k', 'ks', 'n', 'n', 'nh', 't', 'l', 'lk', 'lm', 'lb', 'ls', 'lt', 'lp', 'lh', 'm', 'p', 'ps', 't', 't', 'ng', 't', 't', 'k', 't', 'p', 'h']

const romanizeKorean = (text: string) => Array.from(text).map((character) => {
  const code = character.charCodeAt(0) - 0xac00
  if (code < 0 || code > 11_171) return character
  const initial = Math.floor(code / 588)
  const vowel = Math.floor((code % 588) / 28)
  const final = code % 28
  return `${initials[initial]}${vowels[vowel]}${finals[final]}`
}).join('')

const nameInEnglish = (name: string) => {
  const romanized = romanizeKorean(name.replace(/\s/g, ''))
  return romanized ? romanized.charAt(0).toUpperCase() + romanized.slice(1) : name
}

const contextualTranslation = (text: string) => {
  const together = text.match(/^(.+?)(?:이랑|랑|와|과)\s*함께\s*(.*)$/)
  if (together) return { english: `With ${nameInEnglish(together[1])}${together[2] ? ` ${together[2]}` : ''}`, icon: '💗' }

  const possessive = text.match(/^(.+?)이?의\s*(아침|하루|저녁|생일|집|방)\s*(.*)$/)
  if (possessive) {
    const nouns: Record<string, string> = { 아침: 'morning', 하루: 'day', 저녁: 'evening', 생일: 'birthday', 집: 'home', 방: 'room' }
    return { english: `${nameInEnglish(possessive[1])}'s ${nouns[possessive[2]]}${possessive[3] ? ` ${romanizeKorean(possessive[3])}` : ''}`, icon: possessive[2] === '생일' ? '🎂' : '💗' }
  }

  const dayWith = text.match(/^(.+?)(?:와|과|이랑|랑)\s*(.+)$/)
  if (dayWith) return { english: `${romanizeKorean(dayWith[2])} with ${nameInEnglish(dayWith[1])}`, icon: '💗' }
  return undefined
}

class LocalKoreanActivityProvider implements ActivityTextProvider {
  readonly id = 'local-ko-en-v1'

  present(text: string) {
    const normalized = text.trim()
    if (!normalized) return { english: 'Write your moment', icon: '✦' }
    const contextual = contextualTranslation(normalized)
    if (contextual) return contextual
    const matched = rules.find(({ pattern }) => pattern.test(normalized))
    const english = exactTranslations[normalized] ?? matched?.english ?? (!/[가-힣]/.test(normalized) ? normalized : romanizeKorean(normalized))
    return { english, icon: matched?.icon ?? '✦' }
  }
}

export const activityTextProvider: ActivityTextProvider = new LocalKoreanActivityProvider()
