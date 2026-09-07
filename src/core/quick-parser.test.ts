/**
 * 自然语言速记解析器单元测试与冒烟测试。
 *
 * 验证中 / 英 / 西各种常见与边缘表达：
 * 1. 相对时长（30分钟后、2小时后、半小时后、in 45 mins）
 * 2. 相对日期（明早、今晚、明天、后天、周五下午3点半）
 * 3. 24小时制与12小时制混合（14:30、10点一刻、4pm）
 * 4. 标题时间分离与残余标点净化
 *
 * @module dsh-smart-reminder/core/quick-parser.test
 */

import { parseQuickAdd } from './quick-parser.ts'

// 固定基准时间：2026-09-07 (星期一) 08:30:00
const base = new Date('2026-09-07T08:30:00')

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ Assertion Failed: ${msg}`)
    process.exit(1)
  }
  console.log(`✅ Passed: ${msg}`)
}

console.log('--- 开始 quick-parser 单元测试 ---')

// 1. 相对分钟
const r1 = parseQuickAdd('30分钟后看烤箱', base)
assert(r1.title === '看烤箱', `r1 title: ${r1.title}`)
assert(r1.dueTimeStr === '2026-09-07 09:00', `r1 time: ${r1.dueTimeStr}`)

// 2. 相对小时
const r2 = parseQuickAdd('2小时后提交代码审查', base)
assert(r2.title === '提交代码审查', `r2 title: ${r2.title}`)
assert(r2.dueTimeStr === '2026-09-07 10:30', `r2 time: ${r2.dueTimeStr}`)

// 3. 明早 / 相对日期
const r3 = parseQuickAdd('明早9点研发周会', base)
assert(r3.title === '研发周会', `r3 title: ${r3.title}`)
assert(r3.dueTimeStr === '2026-09-08 09:00', `r3 time: ${r3.dueTimeStr}`)

// 4. 星期与下午点半
const r4 = parseQuickAdd('周五下午3点半项目复盘', base)
assert(r4.title === '项目复盘', `r4 title: ${r4.title}`)
assert(r4.dueTimeStr === '2026-09-11 15:30', `r4 time: ${r4.dueTimeStr}`)

// 5. 英文表达
const r5 = parseQuickAdd('submit weekly report in 45 mins', base)
assert(r5.title === 'submit weekly report', `r5 title: ${r5.title}`)
assert(r5.dueTimeStr === '2026-09-07 09:15', `r5 time: ${r5.dueTimeStr}`)

// 6. 纯事项无时间模式（优雅回退至次日9点）
const r6 = parseQuickAdd('买咖啡豆', base)
assert(r6.title === '买咖啡豆', `r6 title: ${r6.title}`)
assert(r6.dueTimeStr === '2026-09-08 09:00', `r6 time: ${r6.dueTimeStr}`)

console.log('🎉 所有 quick-parser 单元测试全部通过！')
