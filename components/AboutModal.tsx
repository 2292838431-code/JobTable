'use client'

interface Props {
  onClose: () => void
}

export default function AboutModal({ onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩 */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* 弹窗 */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] overflow-y-auto">
        {/* 顶部渐变 */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-t-2xl px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">JobBoard — AI 求职管家</h2>
              <p className="text-indigo-200 text-sm mt-1">LLM-Driven Job Application Management Dashboard</p>
            </div>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white text-2xl leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="px-8 py-6 space-y-6 text-sm text-gray-700 leading-relaxed">

          {/* 产品定位 */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2">产品定位</h3>
            <p>
              一款<strong>以 AI Agent 为核心交互方式</strong>的求职流程管理工具。
              用户可以通过<strong>自然语言对话</strong>创建申请、安排面试时间、批量调整日程，
              也可以在日历和事件流视图中<strong>手动拖拽、点击编辑</strong>，两种操作方式完全解耦、互不冲突。
            </p>
          </section>

          {/* 核心架构 */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2">技术架构</h3>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-xs space-y-1">
              <p><span className="text-indigo-600 font-bold">前端</span> &nbsp; Next.js 14 (App Router) + React 18 + TypeScript + TailwindCSS</p>
              <p><span className="text-indigo-600 font-bold">后端</span> &nbsp; Next.js API Routes (Node.js Runtime)</p>
              <p><span className="text-indigo-600 font-bold">数据库</span> &nbsp; SQLite (better-sqlite3) — 零配置，本地即跑</p>
              <p><span className="text-indigo-600 font-bold">AI</span> &nbsp;&nbsp;&nbsp; DeepSeek Chat API + OpenAI Function Calling 协议</p>
              <p><span className="text-indigo-600 font-bold">Agent</span> &nbsp; 纯手写 ReAct 循环（无 LangChain / LangGraph 依赖）</p>
            </div>
          </section>

          {/* LLM 驱动策略 — 重点 */}
          <section>
            <h3 className="text-base font-bold text-indigo-600 mb-2">
              ★ LLM 驱动的日历管理策略
            </h3>
            <div className="space-y-3">
              <div className="border-l-4 border-indigo-400 pl-4">
                <p className="font-semibold text-gray-900">1. Function Calling 工具调用</p>
                <p>
                  定义 6 个标准化工具（create_application / update_stage / bulk_shift /
                  list_applications / list_stages_in_range / auto_schedule），
                  LLM 根据用户意图自主选择调用哪个工具，生成结构化 JSON 参数，由后端代码执行数据库操作。
                  <strong>LLM 不直接接触数据库</strong>，仅作为"决策大脑"。
                </p>
              </div>
              <div className="border-l-4 border-indigo-400 pl-4">
                <p className="font-semibold text-gray-900">2. 两阶段确认机制</p>
                <p>
                  写操作（创建、修改、删除、移动）不会立即执行。LLM 先用自然语言描述执行计划，
                  前端渲染<strong>确认按钮</strong>，用户点击确认（或输入"确认"）后才真正调用工具。
                  避免 AI 误操作，把控制权交还用户。
                </p>
              </div>
              <div className="border-l-4 border-indigo-400 pl-4">
                <p className="font-semibold text-gray-900">3. 实时数据感知 + 上下文去污染</p>
                <p>
                  Agent 每次操作前强制查询数据库最新状态，不依赖历史对话中的过期工具结果。
                  前端对话窗口限制为最近 10 条消息，避免长对话的上下文污染和 token 浪费。
                </p>
              </div>
              <div className="border-l-4 border-indigo-400 pl-4">
                <p className="font-semibold text-gray-900">4. 智能调度算法</p>
                <p>
                  auto_schedule 工具为未安排时间的节点在今天到截止日之间均匀分布，
                  AM/PM 交替分配，自动检测超期冲突并标红警告。
                </p>
              </div>
            </div>
          </section>

          {/* 已实现功能 */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2">已实现功能</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                ['AI 对话创建申请', '自然语言 → 结构化数据'],
                ['日历视图', 'AM/PM 双时段 + 超期标红'],
                ['事件流视图', '链式节点进度可视化'],
                ['拖拽排期', '日历上拖动节点修改时间'],
                ['点击编辑', 'Popover 修改名称/日期/状态'],
                ['级联删除', '删除节点及后续所有节点'],
                ['批量移动', '"把明天的事往后推一天"'],
                ['自动排期', '空闲时段智能分配'],
                ['防重复机制', '公司_岗位联合唯一标识'],
                ['确认机制', 'LLM 操作需用户确认'],
                ['上下文管理', '10 条窗口 + 强制刷新'],
              ].map(([title, desc]) => (
                <div key={title} className="bg-gray-50 rounded-lg px-3 py-2">
                  <p className="font-medium text-gray-900 text-xs">{title}</p>
                  <p className="text-gray-500 text-xs">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* 产品亮点 */}
          <section>
            <h3 className="text-base font-bold text-gray-900 mb-2">产品亮点</h3>
            <ul className="space-y-1.5">
              <li className="flex gap-2">
                <span className="text-indigo-500 shrink-0">&#9679;</span>
                <span><strong>Agent + 手动双轨操作</strong> — 对话和 UI 操作完全解耦，数据始终一致</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500 shrink-0">&#9679;</span>
                <span><strong>零框架 Agent</strong> — 不依赖 LangChain，纯手写 ReAct 循环，完全可控</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500 shrink-0">&#9679;</span>
                <span><strong>安全优先</strong> — 两阶段确认防误操作，上下文窗口防数据污染</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500 shrink-0">&#9679;</span>
                <span><strong>全栈 TypeScript</strong> — 前后端统一语言，API Routes 零部署成本</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-500 shrink-0">&#9679;</span>
                <span><strong>轻量高效</strong> — SQLite 零配置，单命令启动，适合快速原型验证</span>
              </li>
            </ul>
          </section>

          {/* 竞品分析 */}
          <section>
            <h3 className="text-base font-bold text-red-500 mb-2">★ 与现有产品的差异化分析</h3>
            <p className="mb-3 text-gray-600">
              市面上的日程管理工具普遍以<strong>手动逐条操作</strong>为核心交互，当事件量大时操作极其繁琐。
              本产品通过 LLM 驱动实现了<strong>批量智能操作</strong>，从根本上解决了这一痛点。
            </p>
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-semibold text-gray-700 w-[22%]">功能对比</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-400 w-[26%]">滴答清单</th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-400 w-[26%]">手机语音助手</th>
                    <th className="px-3 py-2 text-left font-semibold text-indigo-600 w-[26%]">本产品 ✦</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[
                    ['创建事件', '手动填写表单', '语音创建单条', 'AI 对话一次创建整条链'],
                    ['批量移动', '逐条拖拽 ✗', '不支持 ✗', '"把明天的事往后推一天" ✓'],
                    ['自动排期', '不支持 ✗', '不支持 ✗', 'AI 均匀分布+冲突检测 ✓'],
                    ['链式流程', '不支持', '不支持', '笔试→一面→二面→HR 链式管理'],
                    ['智能理解', '关键词搜索', '简单语义匹配', 'LLM 深度语义理解+推理'],
                    ['批量修改', '全选→逐项改', '不支持 ✗', '一句话批量修改日期/状态'],
                    ['操作确认', '无（直接执行）', '无', '两阶段确认，防误操作'],
                  ].map(([feature, dida, voice, ours]) => (
                    <tr key={feature}>
                      <td className="px-3 py-1.5 font-medium text-gray-800">{feature}</td>
                      <td className="px-3 py-1.5 text-gray-400">{dida}</td>
                      <td className="px-3 py-1.5 text-gray-400">{voice}</td>
                      <td className="px-3 py-1.5 text-indigo-600 font-medium">{ours}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="font-semibold text-red-700 text-xs mb-1">核心痛点解决：</p>
              <p className="text-red-600 text-xs">
                传统工具在事件量 &gt;20 条时，手动逐条调整极为耗时（每条约 30s，20 条需 10 分钟）。
                本产品通过 LLM 驱动的<strong>批量操作 + 自动排期 + 一键生成</strong>，
                同样操作仅需<strong>一句话 + 一次确认（约 5 秒）</strong>，效率提升 <strong>100 倍以上</strong>。
              </p>
            </div>
          </section>

          {/* 未来规划 */}
          <section>
            <h3 className="text-base font-bold text-purple-600 mb-2">🚀 未来规划</h3>
            <div className="space-y-2.5">
              <div className="flex gap-3 items-start bg-purple-50 rounded-lg p-3">
                <span className="text-lg shrink-0">📧</span>
                <div>
                  <p className="font-semibold text-gray-900 text-xs">邮件转发智能解析</p>
                  <p className="text-gray-500 text-xs">用户收到面试邮件后，直接转发给 AI 助手，自动提取公司名、岗位、时间等关键信息，一键生成完整的事件安排，无需手动输入。</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-purple-50 rounded-lg p-3">
                <span className="text-lg shrink-0">🔗</span>
                <div>
                  <p className="font-semibold text-gray-900 text-xs">接入钉钉 / 飞书等企业应用</p>
                  <p className="text-gray-500 text-xs">一键导入钉钉日历、飞书日程等第三方事件流，打通企业协作生态，统一管理求职与工作事务。</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-purple-50 rounded-lg p-3">
                <span className="text-lg shrink-0">🎙️</span>
                <div>
                  <p className="font-semibold text-gray-900 text-xs">语音输入</p>
                  <p className="text-gray-500 text-xs">移动端支持语音输入，用户在手机上直接说话即可创建、修改、查询事件，随时随地管理日程。</p>
                </div>
              </div>
              <div className="flex gap-3 items-start bg-purple-50 rounded-lg p-3">
                <span className="text-lg shrink-0">🧠</span>
                <div>
                  <p className="font-semibold text-gray-900 text-xs">多 Agent 框架 + 长期记忆</p>
                  <p className="text-gray-500 text-xs">
                    设计多 Agent 协作架构：调度 Agent 负责安排、评审 Agent 评估合理性、记忆 Agent 构建用户画像。
                    系统可学习用户习惯（如"上午效率更高"），自动将重要面试安排在用户最佳状态的时间段，实现真正的个性化智能调度。
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 底部 */}
          <div className="text-center text-xs text-gray-400 pt-2 border-t border-gray-100">
            Built with Next.js 14 + DeepSeek API &nbsp;|&nbsp; 2026
          </div>
        </div>
      </div>
    </div>
  )
}
