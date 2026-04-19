export type Slot = 'AM' | 'PM'
export type StageStatus = 'pending' | 'done' | 'skipped'

export interface Stage {
  id: string
  application_id: string
  order_index: number
  name: string
  deadline_date: string | null    // ISO YYYY-MM-DD
  deadline_slot: Slot | null
  planned_date: string | null
  planned_slot: Slot | null
  status: StageStatus
  note: string | null
  created_at: string
  updated_at: string
  company?: string              // JOIN 查询时附带
}

export interface Application {
  id: string
  company: string
  note: string | null
  created_at: string
  updated_at: string
  stages?: Stage[]
}
