import OpenAI from 'openai'
import dayjs from 'dayjs'
import { agentTools } from './tools'
import {
  createApplication,
  listApplications,
  listStagesInRange,
  listStagesByApplication,
  updateStage,
  getStage,
  getApplication,
} from '@/lib/db'
import type { Stage } from '@/lib/types'

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
})

const MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'

const SYSTEM_PROMPT = `你是一个求职申请管理助手。你可以帮用户：
1. 创建新的求职申请（包含公司名、岗位名和流程节点链：笔试→一面→二面→HR面→offer等）
2. 查看日历上的安排
3. 自动为没有计划时间的节点安排合理的时间
4. 批量移动事件（"帮我把字节的面试往后推两天"、"把明天的所有事往后移一天"）
5. 更新某个节点的状态（完成、跳过）

规则：
- 日期格式统一用 YYYY-MM-DD
- 时段只有 AM（上午）和 PM（下午）
- 如果用户提到"上午"用AM，"下午"用PM，不指定默认用AM
- 如果移动后 planned_date 超过了 deadline_date，仍然执行，但在回复中**明确警告用户**该节点已超期
- 当用户说"帮我安排"或没有指定计划时间时，调用 auto_schedule
- 回复简洁友好，使用中文

**公司+岗位命名规则（非常重要）：**
- 创建申请时，**必须同时获取公司名和岗位名**
- 如果用户只说了公司名没说岗位，你必须**主动追问**岗位名称，例如："请问你应聘的是什么岗位？比如前端开发、后端开发、算法工程师等"
- 系统会自动将两者组合为"公司名_岗位名"（如"字节跳动_前端开发"）作为唯一标识
- 如果该公司+岗位已存在，创建会失败，你需要告知用户已有该申请计划
- 在日历和对话中显示的名称就是这个组合名

**数据准确性（最最最重要！违反此规则等于严重 BUG）：**
- 历史对话中的工具结果**全部视为过期数据**，绝不可引用
- 执行任何操作前，**必须先调用** list_applications 或 list_stages_in_range 获取最新数据
- 描述操作计划时，公司名、岗位名、节点名**必须且只能**从**本轮最新一次工具返回结果**中逐字复制，严禁从历史对话、用户消息或自身记忆中拼凑
- 如果用户说"把19号的事移到20号"，你必须先查询19号有什么，然后**只用查询结果中的 company 字段原文**来描述计划
- 举例：查询结果返回 company="腾讯_后端开发"，你就必须写"腾讯_后端开发"，即使用户或历史对话中提到过"字节跳动"，也绝不能写"字节跳动"

**确认机制（非常重要）：**
- 当需要执行写操作（创建、修改、删除、移动）时，你必须**先描述你打算做什么**，然后在回复末尾加上标记 [CONFIRM]
- 描述时要清晰列出即将执行的操作细节（公司名_岗位名、节点、日期等）
- **不要在描述阶段调用任何工具！只描述计划。**
- 只有当用户回复"确认"、"好的"、"可以"、"执行"、"OK"等肯定性确认后，你才真正调用工具执行操作
- 如果用户只是查询（查看日历、列出申请），不需要确认，直接调用查询工具并回复
- 如果用户修改了你的计划（比如"不要二面"、"改成下午"），根据修改重新描述计划并再次附上 [CONFIRM]

今天是 ${dayjs().format('YYYY-MM-DD')}（${['日','一','二','三','四','五','六'][dayjs().day()]}）。`

// 判断用户消息是否是确认
function isConfirmation(text: string): boolean {
  const confirmWords = ['确认', '好的', '可以', '执行', '没问题', '行', 'ok', 'OK', 'yes', 'Yes', '对', '是的', '确定', '同意']
  const trimmed = text.trim()
  return confirmWords.some((w) => trimmed === w || trimmed.startsWith(w))
}

// 判断是否是只读工具
const READ_ONLY_TOOLS = new Set(['list_applications', 'list_stages_in_range'])

// ── 工具执行器 ─────────────────────────────────────────────
function executeTool(name: string, args: Record<string, unknown>): string {
  console.log(`[agent] tool: ${name}`, JSON.stringify(args))
  try {
    switch (name) {
      case 'create_application': {
        const company = args.company as string
        const position = args.position as string | undefined
        const companyLabel = position ? `${company}_${position}` : company
        const app = createApplication({
          company: companyLabel,
          note: (args.note as string) || null,
          stages: (args.stages as Array<{ name: string; deadline_date?: string | null; deadline_slot?: 'AM' | 'PM' | null; planned_date?: string | null; planned_slot?: 'AM' | 'PM' | null; note?: string | null }>) || [],
        })
        return JSON.stringify({ ok: true, application: app })
      }
      case 'update_stage': {
        const s = updateStage(args.stage_id as string, {
          planned_date: args.planned_date as string | undefined,
          planned_slot: args.planned_slot as 'AM' | 'PM' | undefined,
          status: args.status as 'pending' | 'done' | 'skipped' | undefined,
          note: args.note as string | undefined,
        })
        if (!s) return JSON.stringify({ error: '节点不存在' })
        // 检查冲突
        const conflict =
          s.deadline_date && s.planned_date && s.planned_date > s.deadline_date
        return JSON.stringify({ ok: true, stage: s, conflict })
      }
      case 'bulk_shift': {
        const results = doBulkShift(args)
        return JSON.stringify(results)
      }
      case 'list_applications': {
        return JSON.stringify({ applications: listApplications() })
      }
      case 'list_stages_in_range': {
        const stages = listStagesInRange(args.from as string, args.to as string)
        return JSON.stringify({ stages })
      }
      case 'auto_schedule': {
        const result = doAutoSchedule(args.application_id as string)
        return JSON.stringify(result)
      }
      default:
        return JSON.stringify({ error: `unknown tool: ${name}` })
    }
  } catch (e: unknown) {
    console.error(`[agent] tool error: ${name}`, e)
    return JSON.stringify({ error: String(e) })
  }
}

// ── bulk_shift 实现 ──────────────────────────────────────────
function doBulkShift(args: Record<string, unknown>) {
  let stages: Stage[] = []

  if (args.stage_id) {
    const s = getStage(args.stage_id as string)
    if (s) stages = [s]
  } else if (args.application_id) {
    stages = listStagesByApplication(args.application_id as string)
  } else if (args.source_date) {
    stages = listStagesInRange(args.source_date as string, args.source_date as string)
  }

  // 只移动有 planned_date 的节点
  const toMove = stages.filter((s) => s.planned_date)
  const conflicts: string[] = []
  const moved: Stage[] = []

  for (const s of toMove) {
    let newDate = s.planned_date!
    let newSlot = s.planned_slot

    if (args.target_date) {
      newDate = args.target_date as string
    } else if (args.delta_days !== undefined) {
      newDate = dayjs(s.planned_date).add(args.delta_days as number, 'day').format('YYYY-MM-DD')
    }
    if (args.target_slot) newSlot = args.target_slot as 'AM' | 'PM'

    const updated = updateStage(s.id, { planned_date: newDate, planned_slot: newSlot })
    if (updated) {
      moved.push(updated)
      if (updated.deadline_date && newDate > updated.deadline_date) {
        conflicts.push(`⚠️ "${updated.name}" 移到 ${newDate} 已超过截止日期 ${updated.deadline_date}`)
      }
    }
  }

  return { ok: true, moved_count: moved.length, conflicts, moved }
}

// ── auto_schedule 实现 ───────────────────────────────────────
function doAutoSchedule(applicationId: string) {
  const app = getApplication(applicationId)
  if (!app) return { error: '申请不存在' }

  const stages = app.stages || []
  const unscheduled = stages.filter((s) => !s.planned_date && s.status === 'pending')
  if (unscheduled.length === 0) return { ok: true, message: '所有节点都已有计划时间', scheduled: [] }

  const today = dayjs()
  const scheduled: Stage[] = []
  const conflicts: string[] = []

  for (const s of unscheduled) {
    const deadline = s.deadline_date ? dayjs(s.deadline_date) : today.add(14, 'day')
    const daysAvailable = Math.max(deadline.diff(today, 'day'), 1)
    // 在 today 和 deadline 之间均匀分配
    const idx = unscheduled.indexOf(s)
    const step = Math.floor((daysAvailable * idx) / unscheduled.length)
    const planned = today.add(step, 'day').format('YYYY-MM-DD')
    const slot: 'AM' | 'PM' = idx % 2 === 0 ? 'AM' : 'PM'

    const updated = updateStage(s.id, { planned_date: planned, planned_slot: slot })
    if (updated) {
      scheduled.push(updated)
      if (updated.deadline_date && planned > updated.deadline_date) {
        conflicts.push(`⚠️ "${updated.name}" 安排在 ${planned}，超过截止 ${updated.deadline_date}`)
      }
    }
  }

  return { ok: true, scheduled, conflicts }
}

// ── 主对话接口（支持两阶段确认）────────────────────────────────
export async function runAgent(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
): Promise<{
  reply: string
  toolCalls: Array<{ name: string; args: string; result: string }>
  needsConfirm: boolean
}> {
  const fullMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ]

  // 检测最后一条用户消息是否是确认
  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user')
  const userConfirmed = lastUserMsg ? isConfirmation(lastUserMsg.content) : false

  const toolCalls: Array<{ name: string; args: string; result: string }> = []
  let maxIterations = 5

  while (maxIterations-- > 0) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages: fullMessages,
      tools: agentTools,
      tool_choice: 'auto',
    })

    const choice = response.choices[0]
    if (!choice) break

    const msg = choice.message

    // 如果有 tool_calls
    if (msg.tool_calls && msg.tool_calls.length > 0) {
      // 检查是否全部是只读工具
      const allReadOnly = msg.tool_calls.every((tc) => READ_ONLY_TOOLS.has(tc.function.name))

      if (allReadOnly || userConfirmed) {
        // 只读查询 或 用户已确认 → 直接执行
        fullMessages.push(msg as OpenAI.Chat.ChatCompletionMessageParam)
        for (const tc of msg.tool_calls) {
          const args = tc.function.arguments
          const parsed = JSON.parse(args)
          const result = executeTool(tc.function.name, parsed)
          toolCalls.push({ name: tc.function.name, args, result })
          fullMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: result,
          })
        }
        continue
      } else {
        // 写操作但用户未确认 → 不执行工具，要求 LLM 重新只描述计划
        // 把 tool_calls 去掉，强制 LLM 用文字回答
        fullMessages.push({
          role: 'assistant',
          content: '',
        } as OpenAI.Chat.ChatCompletionMessageParam)
        // 注入提醒
        fullMessages.push({
          role: 'user',
          content: '请不要直接执行操作。先用文字描述你打算做什么，最后加上 [CONFIRM] 标记，等我确认后再执行。',
        })
        // 禁用工具，强制文字输出
        const retry = await client.chat.completions.create({
          model: MODEL,
          messages: fullMessages,
        })
        const retryMsg = retry.choices[0]?.message
        const reply = retryMsg?.content || ''
        const needsConfirm = reply.includes('[CONFIRM]')
        return { reply, toolCalls: [], needsConfirm }
      }
    }

    // 无 tool_calls = 最终回复
    const reply = msg.content || ''
    const needsConfirm = reply.includes('[CONFIRM]')
    return { reply, toolCalls, needsConfirm }
  }

  return { reply: '抱歉，处理超时了，请重试。', toolCalls, needsConfirm: false }
}
