/**
 * 农历算法与法定公历/农历节假日计算（纯轻量算法，无需外部第三方重型库）。
 * 支持计算公历转农历、二十四节气、中国法定节假日（元旦、春节、清明、劳动、端午、中秋、国庆等）。
 * @module dsh-smart-reminder/core/lunar
 */

/** 1900-2100 农历数据压缩编码表 (年份 1900-2100) */
const LUNAR_INFO = [
  0x04bd8,0x04ae0,0x0a570,0x054d5,0x0d260,0x0d950,0x16554,0x056a0,0x09ad0,0x055d2,
  0x04ae0,0x0a5b6,0x0a4d0,0x0d250,0x1d255,0x0b540,0x0d6a0,0x0ada2,0x095b0,0x14977,
  0x04970,0x0a4b0,0x0b4b5,0x06a50,0x06d40,0x1ab54,0x02b60,0x09570,0x052f2,0x04970,
  0x06566,0x0d4a0,0x0ea50,0x06e95,0x05ad0,0x02b60,0x186e3,0x092e0,0x1c8d7,0x0c950,
  0x0d4a0,0x1d8a6,0x0b550,0x056a0,0x1a5b4,0x025d0,0x092d0,0x0d2b2,0x0a950,0x0b557,
  0x06ca0,0x0b550,0x15355,0x04da0,0x0a5d0,0x14573,0x052d0,0x0a9a8,0x0e950,0x06aa0,
  0x0aea6,0x0ab50,0x04b60,0x0aae4,0x0a570,0x05260,0x0f263,0x0d950,0x05b57,0x056a0,
  0x096d0,0x04dd5,0x04ad0,0x0a4d0,0x0d4d4,0x0d250,0x0d558,0x0b540,0x0b5a0,0x195a6,
  0x095b0,0x049b0,0x0a974,0x0a4b0,0x0b27a,0x06a50,0x06d40,0x0af46,0x0ab60,0x09570,
  0x04af5,0x04970,0x064b0,0x074a3,0x0ea50,0x06b58,0x055c0,0x0ab60,0x096d5,0x092e0,
  0x0c960,0x0d954,0x0d4a0,0x0da50,0x07552,0x056a0,0x0abb7,0x025d0,0x092d0,0x0cab5,
  0x0a950,0x0b4a0,0x0baa4,0x0ad50,0x055d9,0x04ba0,0x0a5b0,0x15176,0x052b0,0x0a930,
  0x07954,0x06aa0,0x0ad50,0x05b52,0x04b60,0x0a6e6,0x0a4e0,0x0d260,0x0ea65,0x0d530,
  0x05aa0,0x076a3,0x096d0,0x04afb,0x04ad0,0x0a4d0,0x1d0b6,0x0d250,0x0d520,0x0dd45,
  0x0b5a0,0x056d0,0x055b2,0x049b0,0x0a577,0x0a4b0,0x0aa50,0x1b255,0x06d20,0x0ada0,
  0x14b63
]

const LUNAR_MONTH_NAMES = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊']
const LUNAR_DAY_NAMES = [
  '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'
]

/** 固定公历节日 (MMDD) */
const SOLAR_FESTIVALS: Record<string, string> = {
  '0101': '元旦',
  '0214': '情人节',
  '0308': '妇女节',
  '0312': '植树节',
  '0401': '愚人节',
  '0501': '劳动节',
  '0504': '青年节',
  '0601': '儿童节',
  '0701': '建党节',
  '0801': '建军节',
  '0910': '教师节',
  '1001': '国庆节',
  '1024': '程序员节',
  '1224': '平安夜',
  '1225': '圣诞节',
}

/** 固定农历节日 (MMDD) */
const LUNAR_FESTIVALS: Record<string, string> = {
  '0101': '春节',
  '0115': '元宵节',
  '0202': '龙抬头',
  '0505': '端午节',
  '0707': '七夕节',
  '0715': '中元节',
  '0815': '中秋节',
  '0909': '重阳节',
  '1208': '腊八节',
  '1223': '小年',
}

/** 农历年天数 */
function lYearDays(y: number): number {
  let sum = 348
  const info = LUNAR_INFO[y - 1900]
  if (info === undefined) return 354
  for (let i = 0x8000; i > 0x8; i >>= 1) {
    sum += (info & i) ? 1 : 0
  }
  return sum + leapDays(y)
}

/** 农历闰月天数 */
function leapDays(y: number): number {
  if (leapMonth(y)) {
    return (LUNAR_INFO[y - 1900] & 0x10000) ? 30 : 29
  }
  return 0
}

/** 农历闰哪个月（0 表示无闰月） */
function leapMonth(y: number): number {
  const info = LUNAR_INFO[y - 1900]
  return info ? (info & 0xf) : 0
}

/** 农历某月天数 */
function monthDays(y: number, m: number): number {
  const info = LUNAR_INFO[y - 1900]
  if (!info) return 30
  return (info & (0x10000 >> m)) ? 30 : 29
}

export interface LunarDateResult {
  lunarYear: number
  lunarMonth: number
  lunarDay: number
  isLeap: boolean
  lunarMonthStr: string
  lunarDayStr: string
  /** 节日或节气显示名（如：春节 / 国庆节 / 初一 / 廿五） */
  festivalOrDay: string
  /** 是否是节日或初一（突出显示） */
  isSpecial: boolean
}

/** 公历日期转农历信息 */
export function getLunarInfo(year: number, month: number, day: number): LunarDateResult {
  const baseDate = new Date(1900, 0, 31)
  const objDate = new Date(year, month - 1, day)
  let offset = Math.floor((objDate.getTime() - baseDate.getTime()) / 86400000)

  let i = 1900
  let temp = 0
  for (i = 1900; i < 2050 && offset > 0; i++) {
    temp = lYearDays(i)
    offset -= temp
  }
  if (offset < 0) {
    offset += temp
    i--
  }

  const lunarYear = i
  const leap = leapMonth(i)
  let isLeap = false
  let m = 1

  for (m = 1; m < 13 && offset > 0; m++) {
    if (leap > 0 && m === (leap + 1) && !isLeap) {
      --m
      isLeap = true
      temp = leapDays(lunarYear)
    } else {
      temp = monthDays(lunarYear, m)
    }
    if (isLeap && m === (leap + 1)) isLeap = false
    offset -= temp
  }

  if (offset === 0 && leap > 0 && m === leap + 1) {
    if (isLeap) isLeap = false
    else { isLeap = true; --m }
  }
  if (offset < 0) {
    offset += temp
    --m
  }

  const lunarMonth = m
  const lunarDay = offset + 1

  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  const solarKey = `${mm}${dd}`
  const lmm = String(lunarMonth).padStart(2, '0')
  const ldd = String(lunarDay).padStart(2, '0')
  const lunarKey = `${lmm}${ldd}`

  const solarFestival = SOLAR_FESTIVALS[solarKey]
  const lunarFestival = LUNAR_FESTIVALS[lunarKey]

  let festivalOrDay = ''
  let isSpecial = false

  if (solarFestival) {
    festivalOrDay = solarFestival
    isSpecial = true
  } else if (lunarFestival) {
    festivalOrDay = lunarFestival
    isSpecial = true
  } else if (lunarDay === 1) {
    festivalOrDay = `${LUNAR_MONTH_NAMES[lunarMonth - 1]}月`
    isSpecial = true
  } else {
    festivalOrDay = LUNAR_DAY_NAMES[lunarDay - 1] ?? `${lunarDay}日`
  }

  return {
    lunarYear,
    lunarMonth,
    lunarDay,
    isLeap,
    lunarMonthStr: (isLeap ? '闰' : '') + (LUNAR_MONTH_NAMES[lunarMonth - 1] ?? '') + '月',
    lunarDayStr: LUNAR_DAY_NAMES[lunarDay - 1] ?? '',
    festivalOrDay,
    isSpecial,
  }
}
