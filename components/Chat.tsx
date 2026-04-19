'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  needsConfirm?: boolean   // 是否显示确认按钮
  confirmed?: boolean       // 是否已确认
  cancelled?: boolean       // 是否已取消（取消后不发给后端，防止幻觉）
}

interface Props {
  onDataChange: () => void
}

export default function Chat({ onDataChange }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // 发送消息到后端
  const sendToBackend = useCallback(async (msgs: Message[]) => {
    setLoading(true)
    try {
      // 过滤已取消的消息（含计划+取消操作），避免 LLM 以为自己做过操作
      const clean = msgs.filter((m) => !m.cancelled)
      // 只发最近 10 条 role + content 给后端，避免上下文污染和 token 浪费
      const recent = clean.slice(-10)
      const payload = recent.map((m) => ({ role: m.role, content: m.content }))
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
      })
      const data = await res.json()
      if (data.error) {
        setMessages([...msgs, { role: 'assistant', content: `❌ ${data.error}` }])
      } else {
        const hasConfirmTag = (data.reply as string).includes('[CONFIRM]')
        // 显示时去掉 [CONFIRM] 标记
        const displayContent = (data.reply as string).replace(/\s*\[CONFIRM\]\s*/g, '')
        setMessages([
          ...msgs,
          {
            role: 'assistant',
            content: displayContent,
            needsConfirm: hasConfirmTag || data.needsConfirm,
            confirmed: false,
          },
        ])
        // 如果 agent 调了工具，左侧数据可能变了
        if (data.toolCalls?.length > 0) onDataChange()
      }
    } catch (e: unknown) {
      setMessages([...msgs, { role: 'assistant', content: `❌ 网络错误: ${e}` }])
    } finally {
      setLoading(false)
    }
  }, [onDataChange])

  // 判断是否是取消意图
  const isCancelIntent = (text: string) => {
    const cancelWords = ['取消', '算了', '不要了', '不用了', '撤销', '放弃', 'cancel']
    const trimmed = text.trim().toLowerCase()
    return cancelWords.some((w) => trimmed === w || trimmed.startsWith(w))
  }

  // 取消最近的待确认计划：将计划消息标记为 cancelled，从上下文中隐去
  const cancelLastPlan = () => {
    // 找最近一条待确认的 assistant 消息
    const lastPlanIdx = [...messages].reverse().findIndex(
      (m) => m.role === 'assistant' && m.needsConfirm && !m.confirmed && !m.cancelled,
    )
    if (lastPlanIdx === -1) return messages // 没有待确认的
    const actualIdx = messages.length - 1 - lastPlanIdx
    return messages.map((m, i) =>
      i === actualIdx ? { ...m, needsConfirm: false, cancelled: true } : m,
    )
  }

  // 用户手动发送
  const send = async () => {
    const text = input.trim()
    if (!text || loading) return
    setInput('')

    // 检测取消意图
    if (isCancelIntent(text)) {
      const cleaned = cancelLastPlan()
      const cancelMsg: Message = { role: 'user', content: text }
      const cancelReply: Message = { role: 'assistant', content: '好的，已取消上次的操作计划。有什么其他需要随时告诉我~' }
      setMessages([...cleaned, cancelMsg, cancelReply])
      return
    }

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    await sendToBackend(newMessages)
  }

  // 点击确认按钮
  const handleConfirm = async (msgIndex: number) => {
    if (loading) return

    // 标记该消息已确认
    const updated = messages.map((m, i) =>
      i === msgIndex ? { ...m, confirmed: true, needsConfirm: false } : m,
    )

    // 追加一条 "确认" 消息
    const withConfirm: Message[] = [...updated, { role: 'user', content: '确认' }]
    setMessages(withConfirm)
    await sendToBackend(withConfirm)
  }

  // 渲染单条消息的文字内容
  const renderContent = (content: string) => {
    return content
  }

  return (
    <div className="flex flex-col h-full">
      {/* 标题 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold">� AI 助手</h2>
        <p className="text-xs text-gray-400">告诉我你要参加哪家公司的面试，我来帮你安排</p>
      </div>

      {/* 使用引导按钮 */}
      <div className="px-4 pt-3 pb-1">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className={`w-full py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${
            showGuide
              ? 'bg-amber-50 text-amber-700 border border-amber-200'
              : 'bg-gradient-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 animate-pulse hover:animate-none'
          }`}
        >
          {showGuide ? '收起引导 ▲' : '🚀 新手？点我看看怎么玩！'}
        </button>
      </div>

      {/* 展开的引导内容 */}
      {showGuide && (
        <div className="mx-4 mb-2 bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-gray-700 space-y-3">
          <p className="font-bold text-amber-800 text-sm">3 步体验完整功能：</p>

          <div className="space-y-2.5">
            <div className="flex gap-2">
              <span className="bg-amber-400 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">1</span>
              <div>
                <p className="font-semibold text-gray-900">对话创建申请</p>
                <p className="text-gray-500">在下方输入框输入：</p>
                <p className="bg-white rounded px-2 py-1 mt-1 text-indigo-600 font-mono border border-gray-100">
                  我要参加美团的前端开发岗，有笔试、一面、二面、HR面，笔试截止4月25号
                </p>
                <p className="text-gray-400 mt-1">AI 会列出执行计划 → 点击<span className="text-green-600 font-bold"> 确认执行 </span>按钮</p>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="bg-amber-400 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">2</span>
              <div>
                <p className="font-semibold text-gray-900">手动操作日历</p>
                <p className="text-gray-500">切换到左侧「日历」视图：</p>
                <ul className="text-gray-500 mt-1 space-y-0.5 list-none">
                  <li>&#8226; <strong>拖拽</strong>节点标签到其他日期/时段，松开即改时间</li>
                  <li>&#8226; <strong>点击</strong>节点标签，弹出编辑框可改名、改日期、标记完成、删除</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-2">
              <span className="bg-amber-400 text-white w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold">3</span>
              <div>
                <p className="font-semibold text-gray-900">AI 智能调度</p>
                <p className="text-gray-500">继续输入对话试试这些：</p>
                <div className="bg-white rounded px-2 py-1 mt-1 border border-gray-100 space-y-0.5 font-mono text-indigo-600">
                  <p>帮我把美团的面试往后推两天</p>
                  <p>帮我自动安排美团的面试时间</p>
                  <p>把笔试标记为已完成</p>
                  <p>我现在有哪些申请？</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-amber-100 text-amber-600 text-center">
            AI 操作和手动操作互不冲突，数据实时同步
          </div>
        </div>
      )}

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-300 mt-10 space-y-2">
            <p className="text-2xl">💬</p>
            <p className="text-sm">试试说：</p>
            <p className="text-xs italic">&quot;我要参加美团的前端岗，有笔试、一面、二面、HR面&quot;</p>
            <p className="text-xs italic">&quot;帮我把腾讯的一面移到下周三下午&quot;</p>
            <p className="text-xs italic">&quot;把明天的所有事往后推一天&quot;</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${m.role === 'user' ? '' : ''}`}>
              <div
                className={`rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${
                  m.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-800'
                }`}
              >
                {renderContent(m.content)}
              </div>

              {/* 确认按钮 — 只在 assistant 消息且需要确认时显示 */}
              {m.role === 'assistant' && m.needsConfirm && !m.confirmed && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleConfirm(i)}
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600 text-white text-xs px-4 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    ✅ 确认执行
                  </button>
                  <button
                    onClick={() => {
                      // 将该计划消息标记为 cancelled，从后续发送给 LLM 的上下文中移除
                      setMessages((prev) => [
                        ...prev.map((msg, idx) =>
                          idx === i ? { ...msg, needsConfirm: false, cancelled: true } : msg,
                        ),
                        { role: 'assistant' as const, content: '好的，已取消该操作计划。' },
                      ])
                    }}
                    disabled={loading}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs px-4 py-1.5 rounded-lg transition disabled:opacity-50"
                  >
                    ❌ 取消
                  </button>
                </div>
              )}
              {m.role === 'assistant' && m.confirmed && (
                <div className="mt-1 text-xs text-green-500">✅ 已确认</div>
              )}
              {m.role === 'assistant' && m.cancelled && (
                <div className="mt-1 text-xs text-gray-400 line-through">已取消，此消息不会影响后续对话</div>
              )}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-sm text-gray-400">
              思考中...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入区 */}
      <div className="p-3 border-t border-gray-200">
        <div className="flex gap-2">
          <input
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
            placeholder="输入消息... (Enter 发送)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50 hover:bg-indigo-700"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}
