# JobBoard — AI 驱动的求职管理看板

> **西南大学 · 谷昊林 · 个人作品**
>
> 一款以 LLM Agent 为核心交互方式的求职流程管理工具，支持自然语言对话创建申请、智能批量调度日程，同时提供日历拖拽与点击编辑的传统操作方式。

---

## 目录

- [产品定位](#产品定位)
- [技术栈](#技术栈)
- [项目结构](#项目结构)
- [核心架构设计](#核心架构设计)
- [已实现功能](#已实现功能)
- [开发历程](#开发历程)
- [部署指南](#部署指南)
- [环境变量](#环境变量)

---

## 产品定位

传统日程管理工具（滴答清单、手机语音助手等）以**手动逐条操作**为核心，当求职事件超过 20 条时操作极其繁琐。

本产品通过 LLM 驱动实现了：
- **一句话创建整条流程链**（笔试→一面→二面→HR面→Offer）
- **自然语言批量操作**（"把明天的事往后推一天"）
- **AI 自动排期**（空闲时段智能分配，冲突检测）
- **Agent + 手动双轨操作**，对话与 UI 完全解耦，数据始终一致

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Next.js 14 (App Router) + React 18 + TypeScript + TailwindCSS |
| 后端 | Next.js API Routes (Node.js Runtime) |
| 数据库 | SQLite (better-sqlite3) — 零配置，本地即跑 |
| AI | DeepSeek Chat API + OpenAI Function Calling 协议 |
| Agent | 纯手写 ReAct 循环（无 LangChain / LangGraph 依赖） |
| 部署 | Docker + Zeabur |

---

## 项目结构

```
JobBoard/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # 根布局（HTML、全局样式）
│   ├── page.tsx                  # 主页面（日历/事件流 + 聊天面板）
│   ├── globals.css               # TailwindCSS 全局样式
│   └── api/                      # API Routes（后端接口）
│       ├── applications/
│       │   ├── route.ts          # GET 列表 + POST 创建申请
│       │   └── [id]/route.ts     # GET/PATCH/DELETE 单个申请
│       ├── stages/
│       │   └── [id]/route.ts     # GET/PATCH/DELETE 单个节点（支持级联删除）
│       └── chat/
│           └── route.ts          # POST 对话接口（调用 Agent）
│
├── components/                   # React 组件
│   ├── CalendarView.tsx          # 日历视图（拖拽排期 + 点击编辑）
│   ├── StreamView.tsx            # 事件流视图（链式节点进度）
│   ├── Chat.tsx                  # AI 聊天面板（确认机制 + 取消机制）
│   ├── StagePopover.tsx          # 节点编辑弹窗（名称/日期/状态/删除）
│   └── AboutModal.tsx            # 项目简介弹窗（竞品分析 + 未来规划）
│
├── lib/                          # 核心逻辑
│   ├── types.ts                  # TypeScript 类型定义
│   ├── db.ts                     # SQLite 数据库（CRUD + 批量移动 + 自动排期）
│   ├── seed.ts                   # 演示数据预埋（数据库为空时自动播种）
│   └── agent/
│       ├── tools.ts              # Agent 工具定义（6 个 Function Calling 工具）
│       └── runner.ts             # Agent 执行器（ReAct 循环 + 确认机制）
│
├── Dockerfile                    # Docker 多阶段构建（Zeabur 部署用）
├── .dockerignore
├── next.config.js                # Next.js 配置（standalone 输出 + better-sqlite3 外部包）
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── .env.local.example            # 环境变量模板
```

---

## 核心架构设计

### 1. Agent 架构（纯手写 ReAct 循环）

```
用户输入 → Chat.tsx → /api/chat → runner.ts
                                      │
                                      ├─ 发送 messages + tools 给 DeepSeek API
                                      ├─ 解析返回：文本回复 / tool_calls
                                      ├─ 若有 tool_calls → executeTool() 执行
                                      ├─ 将工具结果追加到 messages，继续循环
                                      └─ 最终返回纯文本回复给前端
```

**不依赖 LangChain**，完全手写 ReAct 循环，约 280 行代码实现完整 Agent。

### 2. 六个 Function Calling 工具

| 工具 | 类型 | 功能 |
|------|------|------|
| `create_application` | 写 | 创建申请（公司名_岗位名 + 流程链） |
| `update_stage` | 写 | 更新节点（日期、时段、状态） |
| `bulk_shift` | 写 | 批量移动（某天/某公司的事件整体偏移） |
| `auto_schedule` | 写 | 自动排期（均匀分布 + AM/PM 交替） |
| `list_applications` | 读 | 列出所有申请及节点 |
| `list_stages_in_range` | 读 | 查询日期范围内的节点（JOIN 返回公司名） |

### 3. 两阶段确认机制

```
用户: "帮我创建美团的前端岗申请"
  ↓
Agent: 描述执行计划 + [CONFIRM] 标记
  ↓
前端: 渲染「✅ 确认执行」和「❌ 取消」按钮
  ↓
用户点击确认 → 追加 "确认" 消息 → Agent 真正执行工具
用户点击取消 → 计划消息标记 cancelled，从上下文中移除（防幻觉）
```

### 4. 防幻觉机制

| 机制 | 说明 |
|------|------|
| 取消即清除 | 被取消的计划消息标记 `cancelled`，发给 LLM 时过滤掉 |
| 上下文窗口 | 仅发送最近 10 条消息，避免长对话污染 |
| 强制刷新数据 | Agent 每次操作前必须查询最新数据库状态 |
| JOIN 查询 | `list_stages_in_range` 返回 `company` 字段，LLM 无需猜测 |
| Prompt 约束 | 公司名必须从工具结果中逐字复制，禁止从记忆中拼凑 |

### 5. 防重复机制

- 创建申请时必须同时提供公司名和岗位名
- 系统自动组合为 `公司名_岗位名`（如 `美团_前端开发`）
- 数据库 UNIQUE 索引 + 代码层 duplicate check 双重保障
- Agent 被要求在用户未提供岗位时主动追问

### 6. 数据库单例（globalThis）

```ts
// 防止 Next.js 热重载导致数据库连接丢失
const globalForDb = globalThis as unknown as { __jobboard_db?: Database.Database }
```

---

## 已实现功能

| 功能 | 说明 |
|------|------|
| AI 对话创建申请 | 自然语言 → 结构化数据，一句话创建整条流程链 |
| 日历视图 | AM/PM 双时段，超期标红警告 |
| 事件流视图 | 链式节点进度可视化（pending/done/skipped） |
| 拖拽排期 | 日历上拖动节点标签修改时间 |
| 点击编辑 | Popover 弹窗修改名称、日期、时段、状态 |
| 级联删除 | 删除节点时可选删除后续所有节点 |
| 批量移动 | "把明天的事往后推一天"，一句话完成 |
| 自动排期 | AI 在今天到截止日之间均匀分布，AM/PM 交替 |
| 防重复机制 | 公司_岗位联合唯一标识，防止重复创建 |
| 两阶段确认 | 写操作需用户确认后才执行，防误操作 |
| 取消机制 | 取消后从上下文中移除计划消息，防 LLM 幻觉 |
| 上下文管理 | 10 条消息窗口 + 操作前强制查询最新数据 |
| 演示数据预埋 | 数据库为空时自动播种 3 条演示数据 |

---

## 开发历程

### 阶段一：基础框架搭建

1. **初始化 Next.js 14 项目**，配置 TypeScript + TailwindCSS
2. **设计数据模型**：`Application`（申请）→ `Stage`（节点）一对多关系
3. **实现 SQLite 数据层**：使用 better-sqlite3，包含完整 CRUD、批量移动（bulk_shift）、自动排期（auto_schedule）
4. **搭建 API Routes**：RESTful 接口覆盖申请和节点的增删改查

### 阶段二：Agent 核心实现

5. **定义 6 个 Function Calling 工具**：覆盖创建、更新、批量移动、自动排期、查询等操作
6. **手写 ReAct 循环**：不依赖 LangChain，纯代码实现 messages 构建 → API 调用 → tool_calls 解析 → 工具执行 → 结果回填的完整循环
7. **设计 System Prompt**：包含日期格式规则、时段规则、确认机制、数据准确性约束等

### 阶段三：前端交互

8. **实现日历视图**：按周展示，AM/PM 双行，超期节点标红
9. **实现事件流视图**：按申请分组，链式节点展示进度
10. **实现聊天面板**：消息气泡、加载状态、引导面板
11. **添加拖拽功能**：日历中拖动节点到其他日期/时段
12. **添加 StagePopover**：点击节点弹出编辑框，支持改名、改日期、改状态、删除

### 阶段四：确认机制与安全

13. **实现两阶段确认**：Agent 描述计划 + `[CONFIRM]` 标记 → 前端渲染确认/取消按钮 → 确认后才执行
14. **区分读写操作**：查询操作直接执行，写操作需确认
15. **上下文管理**：仅发送最近 10 条消息，避免 token 浪费和上下文污染
16. **取消机制**：取消后将计划消息标记为 `cancelled`，从发送给 LLM 的上下文中过滤掉，防止幻觉

### 阶段五：防重复与数据准确性

17. **公司+岗位联合唯一标识**：`create_application` 新增 `position` 参数，自动拼接为 `公司名_岗位名`
18. **数据库 UNIQUE 索引 + 代码层 duplicate check**：双重防重名
19. **JOIN 查询**：`list_stages_in_range` 返回 `company` 字段，LLM 不再需要猜测公司名
20. **强化 Prompt**：公司名必须从工具结果中逐字复制，禁止从记忆中拼凑

### 阶段六：UI 优化与演示准备

21. **项目简介弹窗**：技术架构、LLM 策略详解、功能列表、竞品分析、未来规划
22. **竞品对比表**：与滴答清单、手机语音助手的 7 维度功能对比
23. **未来规划**：邮件转发解析、钉钉/飞书接入、语音输入、多 Agent 框架
24. **演示数据预埋**：`seedIfEmpty` 在数据库为空时自动创建 3 条演示申请
25. **globalThis 单例**：修复 Next.js 热重载导致数据库连接丢失的问题

### 阶段七：部署

26. **Dockerfile 多阶段构建**：base（编译依赖）→ deps（npm ci）→ builder（next build）→ runner（standalone 产物）
27. **Zeabur 部署**：GitHub 仓库关联，环境变量配置

---

## 部署指南

### 本地开发

```bash
# 1. 安装依赖
npm install

# 2. 配置环境变量
cp .env.local.example .env.local
# 编辑 .env.local，填入 DEEPSEEK_API_KEY

# 3. 启动开发服务器
npm run dev
# 访问 http://localhost:3000
```

### Zeabur / Docker 部署

```bash
# 构建镜像
docker build -t jobboard .

# 运行容器
docker run -p 3000:3000 \
  -e DEEPSEEK_API_KEY=sk-xxx \
  -e DEEPSEEK_MODEL=deepseek-chat \
  jobboard
```

Zeabur 部署时在控制台 Variables 中添加环境变量即可。

---

## 环境变量

| 变量 | 必填 | 默认值 | 说明 |
|------|------|--------|------|
| `DEEPSEEK_API_KEY` | ✅ | — | DeepSeek API 密钥 |
| `DEEPSEEK_MODEL` | ❌ | `deepseek-chat` | 模型名称 |
| `DB_PATH` | ❌ | `./data/jobboard.db` | SQLite 数据库文件路径 |

---

## 许可

本项目为个人学习作品，仅供参考。
