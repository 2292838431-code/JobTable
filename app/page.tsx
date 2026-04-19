'use client'

import { useState, useEffect, useCallback } from 'react'
import dayjs from 'dayjs'
import CalendarView from '@/components/CalendarView'
import StreamView from '@/components/StreamView'
import Chat from '@/components/Chat'
import AboutModal from '@/components/AboutModal'
import type { Application, Stage } from '@/lib/types'

type ViewMode = 'calendar' | 'stream'

export default function Home() {
  const [apps, setApps] = useState<Application[]>([])
  const [view, setView] = useState<ViewMode>('calendar')
  const [month, setMonth] = useState(dayjs())
  const [showAbout, setShowAbout] = useState(false)

  const fetchApps = useCallback(async () => {
    try {
      const res = await fetch('/api/applications')
      const data = await res.json()
      setApps(data)
    } catch (e) {
      console.error('fetch apps error', e)
    }
  }, [])

  useEffect(() => {
    fetchApps()
  }, [fetchApps])

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该申请？')) return
    await fetch(`/api/applications/${id}`, { method: 'DELETE' })
    fetchApps()
  }

  const handleUpdateStage = useCallback(async (stageId: string, patch: Partial<Stage>) => {
    await fetch(`/api/stages/${stageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    await fetchApps()
  }, [fetchApps])

  const handleDeleteStageCascade = useCallback(async (stageId: string) => {
    await fetch(`/api/stages/${stageId}?cascade=true`, { method: 'DELETE' })
    await fetchApps()
  }, [fetchApps])

  return (
    <div className="h-screen flex flex-col">
      {/* 顶栏 */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-indigo-600">📋 求职看板<span className="text-sm font-normal text-gray-400 ml-2">（西南大学 - 谷昊林 - 作品）</span></h1>
          <button
            onClick={() => setShowAbout(true)}
            className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-amber-400 via-orange-400 to-red-400 text-white hover:from-amber-500 hover:via-orange-500 hover:to-red-500 transition-all shadow-md hover:shadow-lg animate-pulse hover:animate-none ring-2 ring-orange-300/50"
          >
            &#11088; 项目简介
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('calendar')}
            className={`px-3 py-1 rounded text-sm ${
              view === 'calendar' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            日历
          </button>
          <button
            onClick={() => setView('stream')}
            className={`px-3 py-1 rounded text-sm ${
              view === 'stream' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            事件流
          </button>
        </div>
      </header>

      {/* 主体：左侧日历/事件流 + 右侧聊天 */}
      <div className="flex flex-1 min-h-0">
        {/* 左侧 */}
        <div className="flex-1 overflow-hidden border-r border-gray-200">
          {view === 'calendar' ? (
            <CalendarView
              applications={apps}
              currentMonth={month}
              onPrev={() => setMonth(month.subtract(1, 'month'))}
              onNext={() => setMonth(month.add(1, 'month'))}
              onUpdateStage={handleUpdateStage}
              onDeleteStageCascade={handleDeleteStageCascade}
            />
          ) : (
            <StreamView
              applications={apps}
              onRefresh={fetchApps}
              onDelete={handleDelete}
              onUpdateStage={handleUpdateStage}
              onDeleteStageCascade={handleDeleteStageCascade}
            />
          )}
        </div>

        {/* 右侧聊天 */}
        <div className="w-[400px] shrink-0 bg-gray-50">
          <Chat onDataChange={fetchApps} />
        </div>
      </div>

      {/* 项目简介弹窗 */}
      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}
    </div>
  )
}
