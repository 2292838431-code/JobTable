'use client'

import { useMemo, useState, useRef, DragEvent } from 'react'
import dayjs from 'dayjs'
import type { Application, Stage } from '@/lib/types'
import StagePopover from './StagePopover'

interface Props {
  applications: Application[]
  currentMonth: dayjs.Dayjs
  onPrev: () => void
  onNext: () => void
  onUpdateStage: (stageId: string, patch: Partial<Stage>) => Promise<void>
  onDeleteStageCascade: (stageId: string) => Promise<void>
}

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

type StageWithCompany = Stage & { company: string }

export default function CalendarView({
  applications,
  currentMonth,
  onPrev,
  onNext,
  onUpdateStage,
  onDeleteStageCascade,
}: Props) {
  const [popover, setPopover] = useState<{
    stage: StageWithCompany
    anchor: HTMLElement
  } | null>(null)

  // 正在拖动的 stage id
  const dragRef = useRef<string | null>(null)

  const allStages = useMemo(() => {
    const map = new Map<string, StageWithCompany[]>()
    for (const app of applications) {
      for (const s of app.stages || []) {
        if (!s.planned_date) continue
        const key = s.planned_date
        if (!map.has(key)) map.set(key, [])
        map.get(key)!.push({ ...s, company: app.company })
      }
    }
    return map
  }, [applications])

  // 构建日历网格
  const startOfMonth = currentMonth.startOf('month')
  let gridStart = startOfMonth.startOf('week').add(1, 'day')
  if (gridStart.isAfter(startOfMonth)) gridStart = gridStart.subtract(7, 'day')
  const days: dayjs.Dayjs[] = []
  let d = gridStart
  while (days.length < 42) {
    days.push(d)
    d = d.add(1, 'day')
  }

  const today = dayjs().format('YYYY-MM-DD')

  // ── 拖拽处理 ───────────────────────────────────────────
  const handleDragStart = (e: DragEvent, stageId: string) => {
    dragRef.current = stageId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', stageId)
  }

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: DragEvent, date: string, slot: 'AM' | 'PM') => {
    e.preventDefault()
    const stageId = dragRef.current || e.dataTransfer.getData('text/plain')
    dragRef.current = null
    if (!stageId) return
    await onUpdateStage(stageId, { planned_date: date, planned_slot: slot })
  }

  // ── 点击节点弹出 Popover ──────────────────────────────────
  const handlePillClick = (e: React.MouseEvent, stage: StageWithCompany) => {
    e.stopPropagation()
    setPopover({ stage, anchor: e.currentTarget as HTMLElement })
  }

  return (
    <div className="flex flex-col h-full">
      {/* 月份导航 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <button onClick={onPrev} className="px-2 py-1 rounded hover:bg-gray-100 text-lg">←</button>
        <h2 className="text-lg font-semibold">{currentMonth.format('YYYY 年 M 月')}</h2>
        <button onClick={onNext} className="px-2 py-1 rounded hover:bg-gray-100 text-lg">→</button>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 border-b border-gray-200">
        {WEEKDAYS.map((w) => (
          <div key={w} className="text-center text-xs text-gray-500 py-2 font-medium">{w}</div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7 flex-1 auto-rows-fr">
        {days.map((day) => {
          const dateStr = day.format('YYYY-MM-DD')
          const isCurrentMonth = day.month() === currentMonth.month()
          const isToday = dateStr === today
          const stages = allStages.get(dateStr) || []
          const amStages = stages.filter((s) => s.planned_slot === 'AM')
          const pmStages = stages.filter((s) => s.planned_slot !== 'AM')

          return (
            <div
              key={dateStr}
              className={`border-b border-r border-gray-100 p-1 min-h-[80px] flex flex-col ${
                !isCurrentMonth ? 'bg-gray-50/50 opacity-40' : ''
              } ${isToday ? 'bg-indigo-50/50' : ''}`}
            >
              <div className={`text-xs mb-1 ${isToday ? 'text-indigo-600 font-bold' : 'text-gray-500'}`}>
                {day.date()}
              </div>
              {/* AM 区域 */}
              <div
                className="flex-1 rounded px-0.5 transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dateStr, 'AM')}
              >
                {amStages.map((s) => (
                  <StagePill
                    key={s.id}
                    stage={s}
                    company={s.company}
                    onClick={(e) => handlePillClick(e, s)}
                    onDragStart={(e) => handleDragStart(e, s.id)}
                  />
                ))}
              </div>
              {/* PM 区域 */}
              <div
                className="flex-1 rounded px-0.5 border-t border-dashed border-gray-200 transition-colors"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dateStr, 'PM')}
              >
                {pmStages.map((s) => (
                  <StagePill
                    key={s.id}
                    stage={s}
                    company={s.company}
                    onClick={(e) => handlePillClick(e, s)}
                    onDragStart={(e) => handleDragStart(e, s.id)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Popover */}
      {popover && (
        <StagePopover
          stage={popover.stage}
          company={popover.stage.company}
          anchorEl={popover.anchor}
          onClose={() => setPopover(null)}
          onUpdate={async (id, patch) => {
            await onUpdateStage(id, patch)
            setPopover(null)
          }}
          onDeleteCascade={async (id) => {
            await onDeleteStageCascade(id)
            setPopover(null)
          }}
        />
      )}
    </div>
  )
}

function StagePill({
  stage,
  company,
  onClick,
  onDragStart,
}: {
  stage: Stage
  company: string
  onClick: (e: React.MouseEvent) => void
  onDragStart: (e: DragEvent<HTMLDivElement>) => void
}) {
  const isConflict = stage.deadline_date && stage.planned_date && stage.planned_date > stage.deadline_date
  const isDone = stage.status === 'done'

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className={`text-[10px] leading-tight rounded px-1 py-0.5 mb-0.5 truncate cursor-grab active:cursor-grabbing select-none ${
        isConflict
          ? 'bg-red-100 text-red-700 border border-red-300'
          : isDone
          ? 'bg-green-100 text-green-700 line-through'
          : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
      }`}
      title={`${company} · ${stage.name}${stage.deadline_date ? ` (截止: ${stage.deadline_date})` : ''}\n拖拽可移动到其他日期`}
    >
      {company}·{stage.name}
    </div>
  )
}
