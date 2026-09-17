/**
 * 自然语言时间速记解析器（支持中 / 英 / 西三语）。
 *
 * 核心特性：
 * 1. 纯函数设计，无副作用，零第三方依赖；
 * 2. 智能提取时间关键词与提醒正文（自动清除多余的时间修饰词）；
 * 3. 支持相对时间（如 30分钟后、2小时后、半小时后）；
 * 4. 支持日常相对日期（如 今天、明天、后天、大后天、明早、明晚、今晚）；
 * 5. 支持星期周期（如 周五下午3点、下周三上午10点、este viernes a las 15:00）；
 * 6. 支持 24 小时制与 12 小时制（如 下午3点半、15:30、3:30pm）。
 *
 * @module dsh-smart-reminder/core/quick-parser
 */

export interface ParsedQuickAddResult {
  /** 纯净的事项标题（已剥离时间词）。 */
  title: string
  /** 计算出的目标触发时间戳 (毫秒)。若未解析到时间，则返回 null。 */
  dueAt: number | null
  /** 格式化的目标时间字符串 YYYY-MM-DD HH:mm，未解析出时间时为 null。 */
  dueTimeStr: string | null
  /** 匹配到的原始时间模式摘要（供 UI 提示与确认反馈）。 */
  matchedTimeText?: string
}

/**
 * 格式化 Date 实例为标准 YYYY-MM-DD HH:mm 格式。
 *
 * @param date 目标日期对象
 * @returns 格式化后的时间字符串
 */
export function formatQuickDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${h}:${min}`
}

/**
 * 解析用户单行输入的自然语言文本。
 *
 * @param input 用户输入的原始字符串（例如："明早10点研发周会"、"周五下午5点交周报"、"tomorrow 3pm review"）
 * @param baseDate 参照基准时间，默认为当前系统时刻
 * @returns 解析结果，包含纯净标题和计算出的到期时间戳
 */
export function parseQuickAdd(input: string, baseDate: Date = new Date()): ParsedQuickAddResult {
  const raw = input.trim()
  if (!raw) {
    return { title: '', dueAt: null, dueTimeStr: null }
  }

  let workingTitle = raw
  let targetDate = new Date(baseDate.getTime())
  let matchedTimeText = ''
  let timeDetected = false

  /** 中文时间数字（一到二十三 + 两）转阿拉伯数字。解析失败返回 NaN。 */
  function cnToInt(text: string): number {
    if (/^\d+$/.test(text)) return parseInt(text, 10)
    if (text === '两') return 2
    if (text === '十') return 10
    const m = text.match(/^(二十([一二三四])?)|(十[一二三四五六七八九]?)?$|^十$/)
    if (m !== null) {
      if (text === '二十') return 20
      if (text.length === 3 && text.startsWith('二十')) return 20 + (text[2] === '一' ? 1 : text[2] === '二' ? 2 : text[2] === '三' ? 3 : 4)
      if (text.length === 2 && text.startsWith('十')) {
        const c = text[1]
        return c === '一' ? 11 : c === '二' ? 12 : c === '三' ? 13 : c === '四' ? 14 : c === '五' ? 15 : c === '六' ? 16 : c === '七' ? 17 : c === '八' ? 18 : 19
      }
    }
    const single: Record<string, number> = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }
    if (single[text] !== undefined) return single[text]
    return NaN
  }

  // --------------------------------------------------------------------------
  // 1. 相对时长模式（如：30分钟后、2小时后、半小时后、in 30 mins、en 2 horas）
  // --------------------------------------------------------------------------
  const relMinutesMatchZh = workingTitle.match(/(?:(?:在|过)?\s*(\d+|半)\s*(?:个)?(?:分钟|分|mins?|m)\s*(?:之后|后)?)/i)
  const relHoursMatchZh = workingTitle.match(/(?:(?:在|过)?\s*(\d+|半)\s*(?:个)?(?:小时|钟头|hours?|h)\s*(?:之后|后)?)/i)
  const relMinutesMatchEn = workingTitle.match(/\bin\s+(\d+)\s*(?:mins?|minutes?)\b/i)
  const relHoursMatchEn = workingTitle.match(/\bin\s+(\d+)\s*(?:hours?|hrs?)\b/i)
  const relHoursMatchEs = workingTitle.match(/\ben\s+(\d+)\s*(?:horas?)\b/i)
  const relMinutesMatchEs = workingTitle.match(/\ben\s+(\d+)\s*(?:minutos?)\b/i)

  if (relMinutesMatchZh && relMinutesMatchZh[0]) {
    const valStr = relMinutesMatchZh[1]
    const mins = valStr === '半' ? 30 : parseInt(valStr, 10)
    targetDate = new Date(baseDate.getTime() + mins * 60 * 1000)
    matchedTimeText = relMinutesMatchZh[0]
    workingTitle = workingTitle.replace(relMinutesMatchZh[0], ' ')
    timeDetected = true
  } else if (relHoursMatchZh && relHoursMatchZh[0]) {
    const valStr = relHoursMatchZh[1]
    const hrs = valStr === '半' ? 0.5 : parseFloat(valStr)
    targetDate = new Date(baseDate.getTime() + Math.round(hrs * 60 * 60 * 1000))
    matchedTimeText = relHoursMatchZh[0]
    workingTitle = workingTitle.replace(relHoursMatchZh[0], ' ')
    timeDetected = true
  } else if (relMinutesMatchEn && relMinutesMatchEn[0]) {
    const mins = parseInt(relMinutesMatchEn[1], 10)
    targetDate = new Date(baseDate.getTime() + mins * 60 * 1000)
    matchedTimeText = relMinutesMatchEn[0]
    workingTitle = workingTitle.replace(relMinutesMatchEn[0], ' ')
    timeDetected = true
  } else if (relHoursMatchEn && relHoursMatchEn[0]) {
    const hrs = parseInt(relHoursMatchEn[1], 10)
    targetDate = new Date(baseDate.getTime() + hrs * 3600 * 1000)
    matchedTimeText = relHoursMatchEn[0]
    workingTitle = workingTitle.replace(relHoursMatchEn[0], ' ')
    timeDetected = true
  } else if (relMinutesMatchEs && relMinutesMatchEs[0]) {
    const mins = parseInt(relMinutesMatchEs[1], 10)
    targetDate = new Date(baseDate.getTime() + mins * 60 * 1000)
    matchedTimeText = relMinutesMatchEs[0]
    workingTitle = workingTitle.replace(relMinutesMatchEs[0], ' ')
    timeDetected = true
  } else if (relHoursMatchEs && relHoursMatchEs[0]) {
    const hrs = parseInt(relHoursMatchEs[1], 10)
    targetDate = new Date(baseDate.getTime() + hrs * 3600 * 1000)
    matchedTimeText = relHoursMatchEs[0]
    workingTitle = workingTitle.replace(relHoursMatchEs[0], ' ')
    timeDetected = true
  }

  // --------------------------------------------------------------------------
  // 2. 日期偏置匹配（今天、明天、后天、周几、tomorrow、mañana 等）
  // --------------------------------------------------------------------------
  let dayOffset = 0
  let dayOffsetMatched = false
  let defaultHour = 10
  let defaultMinute = 0

  if (!timeDetected) {
    // 中文日期
    if (/(大后天|pasado mañana)/i.test(workingTitle)) {
      dayOffset = 3
      dayOffsetMatched = true
      matchedTimeText += ' 大后天'
      workingTitle = workingTitle.replace(/(大后天|pasado mañana)/gi, ' ')
    } else if (/(后天)/i.test(workingTitle)) {
      dayOffset = 2
      dayOffsetMatched = true
      matchedTimeText += ' 后天'
      workingTitle = workingTitle.replace(/(后天)/gi, ' ')
    } else if (/(明天|明早|明晚|tomorrow|mañana)/i.test(workingTitle)) {
      dayOffset = 1
      dayOffsetMatched = true
      matchedTimeText += ' 明天'
      if (/明早/i.test(workingTitle)) defaultHour = 9
      if (/明晚/i.test(workingTitle)) defaultHour = 19
      workingTitle = workingTitle.replace(/(明天|明早|明晚|tomorrow|mañana)/gi, ' ')
    } else if (/(今天|今早|今晚|today|hoy)/i.test(workingTitle)) {
      dayOffset = 0
      dayOffsetMatched = true
      matchedTimeText += ' 今天'
      if (/今早/i.test(workingTitle)) defaultHour = 9
      if (/今晚/i.test(workingTitle)) defaultHour = 20
      workingTitle = workingTitle.replace(/(今天|今早|今晚|today|hoy)/gi, ' ')
    }

    // 星期几匹配（周一至周日、礼拜几、星期几、next monday 等）
    const weekMatch = workingTitle.match(/(?:下)?(?:周|星期|礼拜)([一二三四五六日天1234567])/i)
    if (weekMatch && weekMatch[0]) {
      const map: Record<string, number> = {
        '一': 1, '1': 1,
        '二': 2, '2': 2,
        '三': 3, '3': 3,
        '四': 4, '4': 4,
        '五': 5, '5': 5,
        '六': 6, '6': 6,
        '日': 0, '天': 0, '7': 0,
      }
      const targetDay = map[weekMatch[1]]
      if (targetDay !== undefined) {
        const currentDay = baseDate.getDay()
        let diff = targetDay - currentDay
        if (weekMatch[0].startsWith('下')) {
          diff += 7
        } else if (diff <= 0) {
          diff += 7
        }
        dayOffset = diff
        dayOffsetMatched = true
        matchedTimeText += ` ${weekMatch[0]}`
        workingTitle = workingTitle.replace(weekMatch[0], ' ')
      }
    }

    // ------------------------------------------------------------------------
    // 3. 具体时分匹配（如：上午10点、下午3点半、14:30、9点、18点45分）
    // ------------------------------------------------------------------------
    let hour = defaultHour
    let minute = defaultMinute
    let specificTimeFound = false

    // 中文时段修饰（上午 / 中午 / 下午 / 晚上 / 早上 / 傍晚）
    let isPmModifier = false
    let isAmModifier = false
    const periodMatch = workingTitle.match(/(上午|早上|早晨|中午|下午|傍晚|晚上|夜里)/i)
    if (periodMatch && periodMatch[0]) {
      const p = periodMatch[0]
      if (['下午', '傍晚', '晚上', '夜里'].includes(p)) {
        isPmModifier = true
      } else if (['上午', '早上', '早晨'].includes(p)) {
        isAmModifier = true
      }
      matchedTimeText += ` ${p}`
      workingTitle = workingTitle.replace(p, ' ')
    }

    // 匹配 "14:30" 或 "9:00"
    const colonTimeMatch = workingTitle.match(/\b(\d{1,2}):(\d{2})\b/)
    // 匹配 "10点"、"10点半"、"10点45分"、"10点一刻"，以及中文数字 "三点"、"三点半"。
    // 不识别中文数字会漏掉「下午三点提醒我开会」一类常见写法——
    // 时段修正也就跟着失效，整句回退到 fallback（明天 09:00），体感像是「乱跳」。
    const zhTimeMatch = workingTitle.match(
      /(\d{1,2}|[一二两三四五六七八九十]+)\s*(?:点|时)\s*(?:(?:半|一刻)|(\d{1,2})\s*(?:分)?)?/,
    )
    // 匹配 "3pm"、"11am"
    const enAmPmMatch = workingTitle.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)

    if (colonTimeMatch && colonTimeMatch[0]) {
      hour = parseInt(colonTimeMatch[1], 10)
      minute = parseInt(colonTimeMatch[2], 10)
      specificTimeFound = true
      matchedTimeText += ` ${colonTimeMatch[0]}`
      workingTitle = workingTitle.replace(colonTimeMatch[0], ' ')
    } else if (zhTimeMatch && zhTimeMatch[0]) {
      // zhTimeMatch[1] 可能是阿拉伯数字或中文数字（如「三点」「三」「三点半」）。
      const hourStr = zhTimeMatch[1]
      hour = /^\d+$/.test(hourStr) ? parseInt(hourStr, 10) : cnToInt(hourStr)
      if (zhTimeMatch[0].includes('半')) {
        minute = 30
      } else if (zhTimeMatch[0].includes('一刻')) {
        minute = 15
      } else if (zhTimeMatch[2]) {
        minute = parseInt(zhTimeMatch[2], 10)
      } else {
        minute = 0
      }
      specificTimeFound = true
      matchedTimeText += ` ${zhTimeMatch[0]}`
      workingTitle = workingTitle.replace(zhTimeMatch[0], ' ')
    } else if (enAmPmMatch && enAmPmMatch[0]) {
      hour = parseInt(enAmPmMatch[1], 10)
      minute = enAmPmMatch[2] ? parseInt(enAmPmMatch[2], 10) : 0
      const ampm = enAmPmMatch[3].toLowerCase()
      if (ampm === 'pm' && hour < 12) hour += 12
      if (ampm === 'am' && hour === 12) hour = 0
      specificTimeFound = true
      matchedTimeText += ` ${enAmPmMatch[0]}`
      workingTitle = workingTitle.replace(enAmPmMatch[0], ' ')
    }

    // 结合时段修饰微调小时（如“下午3点” -> 15点）
    if (isPmModifier && hour < 12) {
      hour += 12
    } else if (isAmModifier && hour === 12) {
      hour = 0
    }

    if (dayOffsetMatched || specificTimeFound) {
      targetDate.setDate(targetDate.getDate() + dayOffset)
      targetDate.setHours(hour, minute, 0, 0)
      timeDetected = true
    }
  }

  // --------------------------------------------------------------------------
  // 4. 清理标题残余符号（多余空格、逗号、连词、英文介词 in/at/on/en 等）
  // --------------------------------------------------------------------------
  let cleanTitle = workingTitle
    .replace(/\b(?:in|at|on|en)\b/gi, ' ')
    .replace(/^[,，、\s\-_:：]+/, '')
    .replace(/[,，、\s\-_:：]+$/, '')
    .replace(/\s+/g, ' ')
    .trim()

  // 若标题被全部剥离干净（例如纯输入“明早10点”），则保底回退原始输入
  if (!cleanTitle) {
    cleanTitle = raw
  }

  // 若完全没有命中时间模式，默认设定为明天上午 09:00（符合日常 GTD 直觉）
  if (!timeDetected) {
    const fallbackDate = new Date(baseDate.getTime())
    fallbackDate.setDate(fallbackDate.getDate() + 1)
    fallbackDate.setHours(9, 0, 0, 0)
    return {
      title: cleanTitle,
      dueAt: fallbackDate.getTime(),
      dueTimeStr: formatQuickDate(fallbackDate),
      matchedTimeText: undefined,
    }
  }

  // 边界安全防护：如果未指定具体日期且指定时间已落在今天之前，则自动推迟到次日同一时刻
  if (targetDate.getTime() <= baseDate.getTime() && !dayOffsetMatched) {
    targetDate.setDate(targetDate.getDate() + 1)
  }

  return {
    title: cleanTitle,
    dueAt: targetDate.getTime(),
    dueTimeStr: formatQuickDate(targetDate),
    matchedTimeText: matchedTimeText.trim() || undefined,
  }
}
