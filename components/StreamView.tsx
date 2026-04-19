'use client'

import { useState } from 'react'
import type { Application, Stage } from '@/lib/types'
import StagePopover from './StagePopover'

interface Props {
  applications: Application[]
  onRefresh: () => void
  onDelete: (id: string) => void
  onUpdateStage: (stageId: string, patch: Partial<Stage>) => Promise<void>
  onDeleteStageCascade: (stageId: string) => Promise<void>
}

export default function StreamView({ applications, onRefresh, onDelete, onUpdateStage, onDeleteStageCascade }: Props) {
  const [popover, setPopover] = useState<{
    stage: Stage
    company: string
    anchor: HTMLElement
  } | null>(null)

  const handleStageClick = (e: React.MouseEvent, stage: Stage, company: string) => {
    setPopover({ stage, company, anchor: e.currentTarget as HTMLElement })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold">事件流</h2>
        <button onClick={onRefresh} className="text-sm text-indigo-600 hover:underline">刷新</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {applications.length === 0 && (
          <p className="text-gray-400 text-center mt-10">暂无申请，通过右侧对话或新建按钮添加</p>
        )}
        {applications.map((app) => {
          const stages = app.stages || []
          const done = stages.filter((s) => s.status === 'done').length
          const total = stages.length
          const pct = total > 0 ? Math.round((done / total) * 100) : 0

          return (
            <div key={app.id} className="bg-white rounded-lg border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-base">{app.company}</h3>
                <button
                  onClick={() => onDelete(app.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >删除</button>
              </div>

              {/* 进度条 */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-500 h-2 rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">{done}/{total}</span>
              </div>

              {/* 链式节点 */}
              <div className="space-y-1">
                {stages.map((s, i) => {
                  const isConflict =
                    s.deadline_date && s.planned_date && s.planned_date > s.deadline_date
                  return (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 -mx-1 transition"
                      onClick={(e) => handleStageClick(e, s, app.company)}
                    >
                      {/* 连线 */}
                      <div className="flex flex-col items-center w-4">
                        <div
                          className={`w-3 h-3 rounded-full border-2 ${
                            s.status === 'done'
                              ? 'bg-green-500 border-green-500'
                              : isConflict
                              ? 'bg-red-500 border-red-500'
                              : 'bg-white border-gray-400'
                          }`}
                        />
                        {i < stages.length - 1 && (
                          <div className="w-px h-4 bg-gray-300" />
                        )}
                      </div>
                      <span className={`flex-1 ${s.status === 'done' ? 'line-through text-gray-400' : ''} ${isConflict ? 'text-red-600 font-medium' : ''}`}>
                        {s.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {s.planned_date
                          ? `${s.planned_date} ${s.planned_slot || ''}`
                          : '未安排'}
                      </span>
                      {s.deadline_date && (
                        <span className={`text-xs ${isConflict ? 'text-red-500 font-medium' : 'text-gray-300'}`}>
                          截止{s.deadline_date}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Popover */}
      {popover && (
        <StagePopover
          stage={popover.stage}
          company={popover.company}
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
