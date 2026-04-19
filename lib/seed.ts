import { createApplication, listApplications, updateStage } from './db'

/**
 * 预埋演示数据 — 仅在数据库为空时执行
 * 让访客打开页面就能看到日历和事件流中有内容
 */
export function seedIfEmpty() {
  const apps = listApplications()
  if (apps.length > 0) return // 已有数据，跳过

  const today = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const addDays = (d: Date, n: number) => {
    const r = new Date(d)
    r.setDate(r.getDate() + n)
    return r
  }

  // 1. 美团_前端开发 — 有完整的时间安排，部分已完成
  createApplication({
    company: '美团_前端开发',
    note: '秋招提前批',
    stages: [
      { name: '笔试', planned_date: fmt(addDays(today, -2)), planned_slot: 'AM', deadline_date: fmt(addDays(today, -1)), deadline_slot: 'PM' },
      { name: '一面', planned_date: fmt(addDays(today, 1)), planned_slot: 'PM', deadline_date: fmt(addDays(today, 5)), deadline_slot: 'PM' },
      { name: '二面', planned_date: fmt(addDays(today, 4)), planned_slot: 'AM', deadline_date: fmt(addDays(today, 10)), deadline_slot: 'PM' },
      { name: 'HR面', planned_date: fmt(addDays(today, 7)), planned_slot: 'PM', deadline_date: fmt(addDays(today, 14)), deadline_slot: 'PM' },
    ],
  })

  // 2. 腾讯_后端开发 — 有时间安排
  createApplication({
    company: '腾讯_后端开发',
    note: '校招正式批',
    stages: [
      { name: '笔试', planned_date: fmt(addDays(today, 0)), planned_slot: 'AM', deadline_date: fmt(addDays(today, 2)), deadline_slot: 'PM' },
      { name: '一面', planned_date: fmt(addDays(today, 3)), planned_slot: 'AM', deadline_date: fmt(addDays(today, 7)), deadline_slot: 'PM' },
      { name: '二面', planned_date: fmt(addDays(today, 6)), planned_slot: 'PM', deadline_date: fmt(addDays(today, 12)), deadline_slot: 'PM' },
      { name: 'HR面', deadline_date: fmt(addDays(today, 18)), deadline_slot: 'PM' },
      { name: 'Offer', deadline_date: fmt(addDays(today, 25)), deadline_slot: 'PM' },
    ],
  })

  // 3. 阿里巴巴_算法工程师 — 部分未安排时间（可演示 auto_schedule）
  createApplication({
    company: '阿里巴巴_算法工程师',
    note: '实习转正',
    stages: [
      { name: '笔试', planned_date: fmt(addDays(today, 2)), planned_slot: 'PM', deadline_date: fmt(addDays(today, 3)), deadline_slot: 'PM' },
      { name: '一面', deadline_date: fmt(addDays(today, 10)), deadline_slot: 'PM' },
      { name: '二面', deadline_date: fmt(addDays(today, 16)), deadline_slot: 'PM' },
      { name: '终面', deadline_date: fmt(addDays(today, 22)), deadline_slot: 'PM' },
    ],
  })

  // 把美团笔试标记为 done（演示已完成状态）
  const meituan = listApplications().find((a) => a.company === '美团_前端开发')
  if (meituan?.stages?.[0]) {
    updateStage(meituan.stages[0].id, { status: 'done' })
  }

  console.log('[seed] 已预埋 3 条演示数据')
}
