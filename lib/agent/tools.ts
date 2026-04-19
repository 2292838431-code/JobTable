import type { ChatCompletionTool } from 'openai/resources/chat/completions'

export const agentTools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_application',
      description:
        '创建一个新的求职申请，并设置链式流程节点。必须同时提供公司名和岗位名。系统会将两者组合为"公司名_岗位名"作为唯一标识。如果该公司+岗位已存在，会返回错误。每个节点包含名称、截止日期、截止时段(AM/PM)、计划日期、计划时段。如果用户没有指定计划日期，留空由系统自动安排。',
      parameters: {
        type: 'object',
        required: ['company', 'position', 'stages'],
        properties: {
          company: { type: 'string', description: '公司名称，如"字节跳动"' },
          position: { type: 'string', description: '岗位名称，如"前端开发"、"后端开发"、"算法工程师"' },
          note: { type: 'string', description: '备注' },
          stages: {
            type: 'array',
            items: {
              type: 'object',
              required: ['name'],
              properties: {
                name: { type: 'string', description: '流程节点名称，如"笔试"、"一面"、"二面"' },
                deadline_date: { type: 'string', description: '截止日期 YYYY-MM-DD，可为null' },
                deadline_slot: { type: 'string', enum: ['AM', 'PM'], description: '截止时段' },
                planned_date: { type: 'string', description: '计划完成日期 YYYY-MM-DD，可为null' },
                planned_slot: { type: 'string', enum: ['AM', 'PM'], description: '计划完成时段' },
              },
            },
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_stage',
      description: '更新某个流程节点的计划时间、状态或备注。',
      parameters: {
        type: 'object',
        required: ['stage_id'],
        properties: {
          stage_id: { type: 'string' },
          planned_date: { type: 'string', description: 'YYYY-MM-DD' },
          planned_slot: { type: 'string', enum: ['AM', 'PM'] },
          status: { type: 'string', enum: ['pending', 'done', 'skipped'] },
          note: { type: 'string' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'bulk_shift',
      description:
        '批量移动事件。可以按申请ID移动整个申请的所有节点，也可以按日期移动某一天的所有节点。支持：移到指定日期、或偏移N天。如果移动后超过截止日期，仍然执行移动但在结果中标记冲突。',
      parameters: {
        type: 'object',
        properties: {
          application_id: { type: 'string', description: '按申请ID筛选（可选）' },
          source_date: { type: 'string', description: '按原计划日期筛选 YYYY-MM-DD（可选）' },
          stage_id: { type: 'string', description: '只移动特定节点（可选）' },
          target_date: { type: 'string', description: '目标日期 YYYY-MM-DD（和delta_days二选一）' },
          target_slot: { type: 'string', enum: ['AM', 'PM'] },
          delta_days: { type: 'number', description: '偏移天数，正数往后推，负数往前移' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_applications',
      description: '列出所有求职申请及其流程节点。',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_stages_in_range',
      description: '查询某段日期范围内的所有流程节点。',
      parameters: {
        type: 'object',
        required: ['from', 'to'],
        properties: {
          from: { type: 'string', description: '起始日期 YYYY-MM-DD' },
          to: { type: 'string', description: '结束日期 YYYY-MM-DD' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'auto_schedule',
      description:
        '自动为某个申请中没有计划日期的节点安排时间。会查看日历空闲时段，在今天到截止日期之间均匀分布。',
      parameters: {
        type: 'object',
        required: ['application_id'],
        properties: {
          application_id: { type: 'string' },
        },
      },
    },
  },
]
