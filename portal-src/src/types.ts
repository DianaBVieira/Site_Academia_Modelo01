export type Role = 'owner' | 'admin' | 'student'
export type PaymentSituation = 'Ativo' | 'Pendente' | 'Vencido'

export interface UserProfile {
  id: string
  role: Role
  academyId?: string
  name: string
  email: string
  birth?: string
  cpf?: string
  plan?: string
  dueDate?: string
  healthCompleted: boolean
  objective?: string
  objectives?: string[]
}

export interface WorkoutExercisePlan {
  name: string
  sets: number
  reps: string
  restSeconds: number
}
export type WorkoutEntry = string | WorkoutExercisePlan
export interface WorkoutDayPlan {
  day: string
  color: string
  exercises: WorkoutEntry[]
}

export interface AcademyRecord {
  id: string
  name: string
  slug: string
  contactEmail?: string
  phone?: string
  active: boolean
  createdAt?: unknown
}

export interface HealthFormData {
  conditions: string[]
  medications: string
  surgeries: string
  pain: string
  mobility: string
  restrictions: string
  emergencyName: string
  emergencyPhone: string
  consent: boolean
}

export interface Exercise {
  id: string
  name: string
  group: string
  sets: number
  reps: number
  suggestedWeight: string
  restSeconds: number
  media?: string
  instructions: string
  completedSets: number
}

export interface WorkoutDay {
  id: string
  weekday: string
  title: string
  status: 'available' | 'rest' | 'done'
  exercises: Exercise[]
}
