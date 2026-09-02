/**
 * dsh-smart-reminder 冒烟测试套件
 */

import { getLunarInfo } from '../src/core/lunar.ts'
import { generateIcalString } from '../src/core/ical.ts'
import { ReminderStore } from '../src/host/store.ts'
import { unlinkSync, existsSync } from 'node:fs'

let failures = 0
function check(label, condition) {
  if (condition) console.log(`  ✅ ${label}`)
  else {
    console.error(`  ❌ ${label}`)
    failures += 1
  }
}

console.log('=== [1] 农历与法定节假日计算测试 ===')
const spring2026 = getLunarInfo(2026, 2, 17)
console.log('2026-02-17 农历:', spring2026.lunarMonthStr + spring2026.lunarDayStr, '| 节日:', spring2026.festivalOrDay)
check('农历春节计算正确', spring2026.festivalOrDay.includes('春节') || spring2026.lunarDay === 1)

const nationalDay = getLunarInfo(2026, 10, 1)
console.log('2026-10-01 公历节日:', nationalDay.festivalOrDay)
check('国庆节识别正确', nationalDay.festivalOrDay === '国庆节')

console.log('\n=== [2] 提醒事项存储、Checklist 与 Snooze 测试 ===')
const testDbPath = '/tmp/test_reminders.json'
if (existsSync(testDbPath)) unlinkSync(testDbPath)

const store = new ReminderStore(testDbPath)
const item1 = store.add({
  title: '开周会',
  description: '讨论 Q3 目标',
  dueAt: Date.now() + 60_000,
  dueTimeStr: '2026-09-01 16:30',
  notifySystem: true,
  repeat: 'none',
})
check('提醒添加成功', store.getAll().length === 1 && store.get(item1.id)?.title === '开周会')

store.update(item1.id, { title: '开月会' })
check('提醒更新成功', store.get(item1.id)?.title === '开月会')

const completed = store.toggleComplete(item1.id)
check('Checklist 打勾完成', completed?.status === 'completed' && completed.completedAt !== undefined)
const restored = store.toggleComplete(item1.id)
check('Checklist 可恢复待办', restored?.status === 'pending')

const snoozed = store.snooze(item1.id, 15)
check('Snooze 推迟 15 分钟', snoozed?.status === 'pending' && snoozed.snoozeCount === 1 && snoozed.dueAt > Date.now())

console.log('\n=== [3] 离线补发与 iCal 导出测试 ===')
const missed = store.add({
  title: '错过的提醒',
  dueAt: Date.now() - 10 * 60_000,
  dueTimeStr: '2026-09-01 10:00',
  notifySystem: true,
  repeat: 'none',
})
check('离线错过事项被检测', store.getMissedCatchup().some((item) => item.id === missed.id))

const weekly = store.add({
  title: '周报',
  dueAt: Date.now() + 3_600_000,
  dueTimeStr: '2026-09-04 17:00',
  notifySystem: true,
  repeat: 'weekly',
})
const ics = generateIcalString(store.getAll())
check('iCal 基础日历格式正确', ics.includes('BEGIN:VCALENDAR') && ics.includes('END:VCALENDAR'))
check('iCal 包含循环规则', ics.includes('RRULE:FREQ=WEEKLY'))
check('iCal 包含闹钟规则', ics.includes('BEGIN:VALARM'))

store.delete(item1.id)
check('提醒删除成功', store.get(item1.id) === undefined)

if (existsSync(testDbPath)) unlinkSync(testDbPath)
console.log(failures === 0 ? '\n🎉 全部通过' : `\n💥 ${failures} 项失败`)
process.exit(failures === 0 ? 0 : 1)
