export interface ActivityTextProvider {
  readonly id: string
  present(text: string): { english: string; icon: string }
}

type Presentation = { english: string; icon: string }

const exactTranslations: Record<string, Presentation> = {
  '출근': { english: 'Going to work', icon: '💼' },
  '회사 출근': { english: 'Going to work', icon: '💼' },
  '다이소 출근': { english: 'Going to work at Daiso', icon: '💼' },
  '퇴근': { english: 'Off work', icon: '🌙' },
  '퇴근하고 카페': { english: 'Coffee after work', icon: '☕' },
  '퇴근 후 카페': { english: 'Coffee after work', icon: '☕' },
  '아침 준비': { english: 'Morning routine', icon: '☀️' },
  '모닝 커피': { english: 'Morning coffee', icon: '☕' },
  '점심': { english: 'Lunch break', icon: '🍴' },
  '저녁': { english: 'Dinner time', icon: '🍽️' },
  '운동': { english: 'Workout time', icon: '🏃‍♀️' },
  '아침 운동': { english: 'Morning workout', icon: '🏃‍♀️' },
  '저녁 운동': { english: 'Evening workout', icon: '🏃‍♀️' },
  '공부': { english: 'Study session', icon: '📚' },
  '영상 촬영': { english: 'Filming content', icon: '🎬' },
  '인터뷰': { english: 'Interview day', icon: '🎙️' },
  '집으로': { english: 'Going home', icon: '🏠' },
  '오늘의 하루': { english: 'A day in my life', icon: '💿' },
  '머리핀을 꽂았어요': { english: 'I put on a hair clip', icon: '🎀' },
  '머리핀 꽂았어요': { english: 'I put on a hair clip', icon: '🎀' },
  '머리핀이 너무 좋아요': { english: 'I really love my hair clip', icon: '🎀' },
  '머리핀이 좋아요': { english: 'I love my hair clip', icon: '🎀' },
  '머리를 묶었어요': { english: 'I tied my hair', icon: '🎀' },
  '옷을 입었어요': { english: 'I got dressed', icon: '👗' },
  '양치했어요': { english: 'I brushed my teeth', icon: '🪥' },
  '세수했어요': { english: 'I washed my face', icon: '🫧' },
  '샤워했어요': { english: 'I took a shower', icon: '🫧' },
  '화장했어요': { english: 'I did my makeup', icon: '💄' },
  '아침 먹었어요': { english: 'I had breakfast', icon: '🍴' },
  '점심 먹었어요': { english: 'I had lunch', icon: '🍴' },
  '저녁 먹었어요': { english: 'I had dinner', icon: '🍽️' },
  '잠들었어요': { english: 'Time to sleep', icon: '🌙' },
}

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
  const knownNames: Record<string, string> = { 서진: 'Seojin', 지민: 'Jimin', 수진: 'Sujin', 민지: 'Minji', 지수: 'Jisoo' }
  const compact = name.replace(/\s/g, '')
  const romanized = knownNames[compact] ?? romanizeKorean(compact)
  return romanized ? romanized.charAt(0).toUpperCase() + romanized.slice(1) : name
}

const nouns: Record<string, string> = {
  머리핀: 'a hair clip', 핀: 'a hair clip', 커피: 'coffee', 라떼: 'a latte', 물: 'water',
  아침: 'breakfast', 점심: 'lunch', 저녁: 'dinner', 밥: 'a meal', 빵: 'bread', 케이크: 'cake',
  아이스크림: 'ice cream', 옷: 'my outfit', 원피스: 'a dress', 신발: 'shoes', 책: 'a book',
  영화: 'a movie', 사진: 'photos', 영상: 'a video', 장난감: 'toys', 꽃: 'flowers', 선물: 'a gift',
}

const locations: Record<string, string> = {
  회사: 'work', 카페: 'a cafe', 집: 'home', 어린이집: 'daycare', 학교: 'school', 공원: 'the park',
  다이소: 'Daiso', 마트: 'the grocery store', 헬스장: 'the gym', 식당: 'a restaurant', 미용실: 'the salon',
}

const translateNoun = (value: string) => nouns[value.trim()] ?? nameInEnglish(value.trim())
const translateLocation = (value: string) => locations[value.trim()] ?? nameInEnglish(value.trim())

const iconRules: Array<{ pattern: RegExp; icon: string }> = [
  { pattern: /머리|핀|화장|옷|신발/, icon: '🎀' },
  { pattern: /아이|친구|함께|놀|이랑|의 하루|춤추는|춤춰/, icon: '💗' },
  { pattern: /출근|회사|오피스/, icon: '💼' },
  { pattern: /카페|커피|라떼/, icon: '☕' },
  { pattern: /아침|기상|일어나/, icon: '☀️' },
  { pattern: /점심|저녁|밥|식사|먹/, icon: '🍴' },
  { pattern: /운동|헬스|러닝|필라테스|요가/, icon: '🏃‍♀️' },
  { pattern: /공부|스터디|수업|책/, icon: '📚' },
  { pattern: /촬영|영상|콘텐츠|브이로그/, icon: '🎬' },
  { pattern: /집|귀가|잠|수면/, icon: '🏠' },
  { pattern: /여행|공항|기차/, icon: '✈️' },
]

const sentenceTranslation = (text: string): string | undefined => {
  let match = text.match(/^(.+?)(?:이랑|랑|와|과)\s*함께$/)
  if (match) return `With ${nameInEnglish(match[1])}`

  match = text.match(/^춤추는\s*(.+?)이?$/)
  if (match) return `${nameInEnglish(match[1])} is dancing`

  match = text.match(/^(.+?)(?:이|가)\s*(?:춤춰요|춤췄어요|춤추고 있어요)$/)
  if (match) return `${nameInEnglish(match[1])} is dancing`

  match = text.match(/^(.+?)(?:이|가)\s*너무\s*(좋아요|예뻐요|귀여워요)$/)
  if (match) {
    const object = translateNoun(match[1])
    if (match[2] === '예뻐요') return `${object.replace(/^a /, 'The ')} looks so pretty`
    if (match[2] === '귀여워요') return `${object.replace(/^a /, 'The ')} is so cute`
    return `I really love ${object}`
  }

  match = text.match(/^(.+?)(?:이랑|랑|와|과)\s*(?:놀았어요|놀았어|놀기)$/)
  if (match) return `I had fun with ${nameInEnglish(match[1])}`

  match = text.match(/^(.+?)이?의\s*(아침|하루|저녁|생일)$/)
  if (match) {
    const moments: Record<string, string> = { 아침: 'morning', 하루: 'day', 저녁: 'evening', 생일: 'birthday' }
    return `${nameInEnglish(match[1])}'s ${moments[match[2]]}`
  }

  match = text.match(/^(.+?)(?:에|으로)\s*(?:갔어요|갔어|가기)$/)
  if (match) return `Went to ${translateLocation(match[1])}`

  const actions: Array<{ pattern: RegExp; verb: (object: string) => string }> = [
    { pattern: /^(.+?)(?:을|를)?\s*(?:먹었어요|먹었어)$/, verb: (object) => `I had ${translateNoun(object)}` },
    { pattern: /^(.+?)(?:을|를)?\s*(?:마셨어요|마셨어)$/, verb: (object) => `I had ${translateNoun(object)}` },
    { pattern: /^(.+?)(?:을|를)?\s*(?:샀어요|샀어)$/, verb: (object) => `I bought ${translateNoun(object)}` },
    { pattern: /^(.+?)(?:을|를)?\s*(?:입었어요|입었어)$/, verb: (object) => `I wore ${translateNoun(object)}` },
    { pattern: /^(.+?)(?:을|를)?\s*(?:꽂았어요|꽂았어)$/, verb: (object) => `I put on ${translateNoun(object)}` },
    { pattern: /^(.+?)(?:을|를)?\s*(?:봤어요|봤어)$/, verb: (object) => `I watched ${translateNoun(object)}` },
    { pattern: /^(.+?)(?:을|를)?\s*(?:만들었어요|만들었어)$/, verb: (object) => `I made ${translateNoun(object)}` },
  ]
  for (const action of actions) {
    match = text.match(action.pattern)
    if (match) return action.verb(match[1])
  }

  const keywordRules: Array<{ pattern: RegExp; english: string }> = [
    { pattern: /퇴근/, english: 'Off work' },
    { pattern: /출근|회사|오피스/, english: 'Going to work' },
    { pattern: /카페|커피|라떼/, english: 'Coffee break' },
    { pattern: /아침|모닝|기상|일어나/, english: 'Morning routine' },
    { pattern: /점심|런치/, english: 'Lunch break' },
    { pattern: /저녁|디너|식사/, english: 'Dinner time' },
    { pattern: /운동|헬스|러닝|필라테스|요가/, english: 'Workout time' },
    { pattern: /공부|스터디|수업|과제/, english: 'Study session' },
    { pattern: /촬영|콘텐츠|편집|브이로그/, english: 'Creating content' },
    { pattern: /쇼핑|마트|다이소/, english: 'Shopping time' },
    { pattern: /산책/, english: 'Taking a walk' },
    { pattern: /잠|수면|취침/, english: 'Time to rest' },
    { pattern: /집|귀가/, english: 'Going home' },
  ]
  return keywordRules.find(({ pattern }) => pattern.test(text))?.english
}

class LocalKoreanActivityProvider implements ActivityTextProvider {
  readonly id = 'local-ko-en-v2'

  present(text: string): Presentation {
    const emoji = text.match(/\p{Extended_Pictographic}/gu)?.join(' ') ?? ''
    const normalized = text.replace(/\p{Extended_Pictographic}/gu, '').replace(/\uFE0F/gu, '').trim()
    if (!normalized) return { english: 'Write your moment', icon: '✦' }
    if (!/[가-힣]/.test(normalized)) return { english: text.trim(), icon: '✦' }
    const exact = exactTranslations[normalized]
    const icon = exact?.icon ?? iconRules.find(({ pattern }) => pattern.test(normalized))?.icon ?? '✦'
    const english = exact?.english ?? sentenceTranslation(normalized) ?? 'Add your English caption'
    return { english: `${english}${emoji ? ` ${emoji}` : ''}`, icon }
  }
}

export const activityTextProvider: ActivityTextProvider = new LocalKoreanActivityProvider()
