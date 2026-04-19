'use client'

import { useState, useRef, useEffect } from 'react'
import type { Stage } from '@/lib/types'

interface Props {
  stage: Stage
  company: string
  anchorEl: HTMLElement | null
  onClose: () => void
  onUpdate: (stageId: string, patch: Partial<Stage>) => Promise<void>
  onDeleteCascade: (stageId: string) => Promise<void>
}

export default function StagePopover({ stage, company, anchorEl, onClose, onUpdate, onDeleteCascade }: Props) {
  const [name, setName] = useState(stage.name)
  const [plannedDate, setPlannedDate] = useState(stage.planned_date || '')
  const [plannedSlot, setPlannedSlot] = useState(stage.planned_slot || 'AM')
  const [saving, setSaving] = useState(false)
  const popRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // 计算位置
  const rect = anchorEl?.getBoundingClientRect()
  const style: React.CSSProperties = rect
    ? {
        position: 'fixed',
        top: rect.bottom + 4,
        left: Math.min(rect.left, window.innerWidth - 280),
        zIndex: 50,
      }
    : { display: 'none' }

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(stage.id, {
      name: name.trim() || stage.name,
      planned_date: plannedDate || null,
      planned_slot: plannedSlot as 'AM' | 'PM',
    })
    setSaving(false)
    onClose()
  }

  const handleDelete = async () => {
    if (!confirm(`删除「${stage.name}」及其后续所有节点？`)) return
    setSaving(true)
    await onDeleteCascade(stage.id)
    setSaving(false)
    onClose()
  }

  const handleStatusToggle = async () => {
    const newStatus = stage.status === 'done' ? 'pending' : 'done'
    await onUpdate(stage.id, { status: newStatus })
    onClose()
  }

  const isConflict = stage.deadline_date && plannedDate && plannedDate > stage.deadline_date

  return (
    <div ref={popRef} style={style} className="w-[264px] bg-white rounded-xl shadow-xl border border-gray-200 p-3 space-y-3">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{company}</span>
        <button onClick={onClose} className="text-gray-300 hover:text-gray-500 text-sm">✕</button>
      </div>

      {/* 流程名 */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">流程名称</label>
        <input
          className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      {/* 计划日期 + 时段 */}
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="text-xs text-gray-500 mb-1 block">计划日期</label>
          <input
            type="date"
            className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300 ${
              isConflict ? 'border-red-400 bg-red-50' : 'border-gray-300'
            }`}
            value={plannedDate}
            onChange={(e) => setPlannedDate(e.target.value)}
          />
        </div>
        <div className="w-20">
          <label className="text-xs text-gray-500 mb-1 block">时段</label>
          <select
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-300"
            value={plannedSlot}
            onChange={(e) => setPlannedSlot(e.target.value as 'AM' | 'PM')}
          >
            <option value="AM">上午</option>
            <option value="PM">下午</option>
          </select>
        </div>
      </div>

      {/* 截止日期（只读） */}
      {stage.deadline_date && (
        <div className={`text-xs ${isConflict ? 'text-red-500 font-medium' : 'text-gray-400'}`}>
          截止日期：{stage.deadline_date} {stage.deadline_slot || ''}
          {isConflict && ' ⚠️ 已超期'}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 rounded-lg transition disabled:opacity-50"
        >
          保存
        </button>
        <button
          onClick={handleStatusToggle}
          disabled={saving}
          className={`text-xs py-1.5 px-3 rounded-lg transition disabled:opacity-50 ${
            stage.status === 'done'
              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
              : 'bg-green-100 text-green-700 hover:bg-green-200'
          }`}
        >
          {stage.status === 'done' ? '撤销完成' : '标记完成'}
        </button>
      </div>
      <button
        onClick={handleDelete}
        disabled={saving}
        className="w-full text-xs text-red-500 hover:text-red-700 hover:bg-red-50 py-1.5 rounded-lg transition disabled:opacity-50"
      >
        🗑 删除此节点及后续节点
      </button>
    </div>
  )
}
