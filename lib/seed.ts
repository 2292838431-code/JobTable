import { createApplication, listApplications, updateStage } from './db'

/**
 * 预埋演示数据 — 仅在数据库为空时执行
 *
 * 刻意选了三个**不同领域**的流程，用来体现本工具是通用的
 * 「多阶段流程管理」，而不是绑定某一个具体场景：
 *   1. 产品研发  —— 需求到上线
 *   2. 科研申报  —— 选题到会评
 *   3. 学术会议  —— 征稿到举办
 *
 * 它们的共同结构是：N 个对象 × M 个阶段 × 各自的截止时间。
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

  // 1. 产品发布流程 —— 时间完整，部分已完成
  createApplication({
    subject: '智能仓储系统_上线',
    note: '二期迭代',
    stages: [
      { name: '需求评审', planned_date: fmt(addDays(today, -2)), planned_slot: 'AM', deadline_date: fmt(addDays(today, -1)), deadline_slot: 'PM' },
      { name: '方案设计', planned_date: fmt(addDays(today, 1)), planned_slot: 'PM', deadline_date: fmt(addDays(today, 5)), deadline_slot: 'PM' },
      { name: '开发联调', planned_date: fmt(addDays(today, 4)), planned_slot: 'AM', deadline_date: fmt(addDays(today, 10)), deadline_slot: 'PM' },
      { name: '测试回归', planned_date: fmt(addDays(today, 7)), planned_slot: 'PM', deadline_date: fmt(addDays(today, 14)), deadline_slot: 'PM' },
      { name: '正式发布', deadline_date: fmt(addDays(today, 18)), deadline_slot: 'PM' },
    ],
  })

  // 2. 科研项目申报 —— 部分阶段未排期（可演示 auto_schedule）
  createApplication({
    subject: '国自然青年基金_申报',
    note: '单位内审环节最紧',
    stages: [
      { name: '选题论证', planned_date: fmt(addDays(today, 0)), planned_slot: 'AM', deadline_date: fmt(addDays(today, 2)), deadline_slot: 'PM' },
      { name: '初稿撰写', planned_date: fmt(addDays(today, 3)), planned_slot: 'AM', deadline_date: fmt(addDays(today, 9)), deadline_slot: 'PM' },
      { name: '单位内审', deadline_date: fmt(addDays(today, 14)), deadline_slot: 'PM' },
      { name: '系统提交', deadline_date: fmt(addDays(today, 20)), deadline_slot: 'PM' },
      { name: '会评答辩', deadline_date: fmt(addDays(today, 28)), deadline_slot: 'PM' },
    ],
  })

  // 3. 学术会议筹备 —— 征稿到举办，跨度最长
  createApplication({
    subject: 'ICML 2027_投稿',
    note: '投稿截止是硬约束',
    stages: [
      { name: '实验补全', planned_date: fmt(addDays(today, 2)), planned_slot: 'PM', deadline_date: fmt(addDays(today, 3)), deadline_slot: 'PM' },
      { name: '论文成稿', deadline_date: fmt(addDays(today, 10)), deadline_slot: 'PM' },
      { name: '内部预审', deadline_date: fmt(addDays(today, 16)), deadline_slot: 'PM' },
      { name: '系统投稿', deadline_date: fmt(addDays(today, 22)), deadline_slot: 'PM' },
      { name: 'Rebuttal', deadline_date: fmt(addDays(today, 40)), deadline_slot: 'PM' },
    ],
  })

  // 把第一条的首个阶段标记为已完成（演示「已完成」状态）
  const sample = listApplications().find((a) => a.subject === '智能仓储系统_上线')
  if (sample?.stages?.[0]) {
    updateStage(sample.stages[0].id, { status: 'done' })
  }

  console.log('[seed] 已预埋 3 条演示数据（多场景）')
}
