import { deleteApp, initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail, signOut,
} from 'firebase/auth'
import {
  addDoc, collection, deleteDoc, doc, getDoc, getDocs, orderBy,
  query, serverTimestamp, setDoc, updateDoc, where, writeBatch,
  type DocumentData,
} from 'firebase/firestore'
import {
  deleteObject, getDownloadURL, ref, uploadBytes,
} from 'firebase/storage'
import { firebaseApp, db, firebaseEnabled, storage } from './firebase'
import type { AcademyRecord, HealthFormData, PaymentSituation, WorkoutDayPlan, WorkoutDay } from './types'
import { demoStudents, demoPlans, demoPayments, demoMeasurements, demoWorkoutTemplates } from './demo'

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled'

export interface StudentRecord {
  id: string
  name: string
  birth: string
  cpf: string
  email: string
  phone: string
  objective: string
  conditions: string
  plan: string
  dueDate: string
  monthlyFee: number
  payment: PaymentSituation
  healthCompleted: boolean
  workoutDue?: string
  workoutTemplate?: string
  workoutDays?: WorkoutDayPlan[]
  createdAt?: unknown
  updatedAt?: unknown
}

export interface MeasurementRecord {
  id?: string
  date: string
  weightKg: number
  heightCm?: number
  bodyFatPercent?: number
  leanMassKg?: number
  protocol?: string
  skinfolds?: Record<string, number>
  circumferences?: Record<string, number>
  notes?: string
}

export interface PaymentRecord {
  id?: string
  planId: string
  description: string
  amount: number
  dueDate: string
  paidAt?: string
  status: PaymentStatus
}

export interface WorkoutTemplateRecord {
  id?: string
  name: string
  days: WorkoutDayPlan[]
}

export interface PlanRecord {
  id?: string
  name: string
  price: string
  description: string
}

export interface ExerciseOverrideRecord {
  id?: string
  name?: string
  image?: string
  video?: string
  imageRemoved?: boolean
}

function database() {
  if (!firebaseEnabled || !db) throw new Error('Firebase ainda não foi configurado no arquivo .env.')
  return db
}

function bucket() {
  if (!firebaseEnabled || !storage) throw new Error('Firebase Storage ainda não foi configurado no arquivo .env.')
  return storage
}

export const paths = {
  user: (uid: string) => `users/${uid}`,
  academies: 'academies',
  academy: (academyId: string) => `academies/${academyId}`,
  students: (academyId: string) => `academies/${academyId}/students`,
  student: (academyId: string, uid: string) => `academies/${academyId}/students/${uid}`,
  health: (academyId: string, uid: string) => `academies/${academyId}/students/${uid}/health/current`,
  measurements: (academyId: string, uid: string) => `academies/${academyId}/students/${uid}/measurements`,
  workouts: (academyId: string, uid: string) => `academies/${academyId}/students/${uid}/workouts`,
  workoutLogs: (academyId: string, uid: string) => `academies/${academyId}/students/${uid}/workoutLogs`,
  payments: (academyId: string, uid: string) => `academies/${academyId}/students/${uid}/payments`,
  exercises: (academyId: string) => `academies/${academyId}/exercises`,
  plans: (academyId: string) => `academies/${academyId}/plans`,
  workoutTemplates: (academyId: string) => `academies/${academyId}/workoutTemplates`,
} as const

// --- Academias (uso do painel do dono da plataforma) ---

export async function listAcademies() {
  const snapshot = await getDocs(query(collection(database(), paths.academies), orderBy('name')))
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AcademyRecord))
}

export async function getAcademy(academyId: string) {
  const snapshot = await getDoc(doc(database(), paths.academy(academyId)))
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as AcademyRecord) : null
}

export async function updateAcademyStatus(academyId: string, active: boolean) {
  await updateDoc(doc(database(), paths.academy(academyId)), { active, updatedAt: serverTimestamp() })
}

export async function saveAcademyProfile(academyId: string, data: Partial<AcademyRecord>) {
  const { id, ...rest } = data
  await setDoc(doc(database(), paths.academy(academyId)), { ...rest, updatedAt: serverTimestamp() }, { merge: true })
}

// --- Alunos ---

// Cria a conta de acesso do aluno sem derrubar a sessão do administrador logado:
// usa uma instância secundária e isolada do Firebase Auth só para este cadastro,
// nunca revela a senha temporária e envia um link para o aluno definir a própria senha.
export async function createStudentAccount(email: string) {
  if (!firebaseApp) throw new Error('Firebase ainda não foi configurado no arquivo .env.')
  const secondary = initializeApp(firebaseApp.options, `invite-${Date.now()}`)
  try {
    const secondaryAuth = getAuth(secondary)
    const credential = await createUserWithEmailAndPassword(secondaryAuth, email, crypto.randomUUID())
    await sendPasswordResetEmail(secondaryAuth, email)
    await signOut(secondaryAuth)
    return credential.user.uid
  } finally {
    await deleteApp(secondary)
  }
}

export async function createStudent(academyId: string, student: Omit<StudentRecord, 'id'>) {
  const uid = await createStudentAccount(student.email)
  await saveStudent(academyId, { ...student, id: uid })
  return uid
}

export async function saveStudent(academyId: string, student: StudentRecord) {
  const store = database()
  const { id, ...data } = student
  const batch = writeBatch(store)
  batch.set(doc(store, paths.user(id)), {
    name: student.name, email: student.email, role: 'student', academyId, updatedAt: serverTimestamp(),
  }, { merge: true })
  batch.set(doc(store, paths.student(academyId, id)), {
    ...data, role: 'student', updatedAt: serverTimestamp(),
    ...(!student.createdAt ? { createdAt: serverTimestamp() } : {}),
  }, { merge: true })
  await batch.commit()
}

export async function listStudents(academyId: string) {
  if (!firebaseEnabled) return demoStudents
  const snapshot = await getDocs(query(collection(database(), paths.students(academyId)), orderBy('name')))
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as StudentRecord))
}

export async function getStudent(academyId: string, uid: string) {
  if (!firebaseEnabled) return demoStudents.find(s => s.id === uid) || null
  const snapshot = await getDoc(doc(database(), paths.student(academyId, uid)))
  return snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as StudentRecord) : null
}

export async function deleteStudent(academyId: string, uid: string) {
  const store = database()
  const batch = writeBatch(store)
  batch.delete(doc(store, paths.student(academyId, uid)))
  batch.delete(doc(store, paths.user(uid)))
  await batch.commit()
}

export async function saveHealthForm(academyId: string, uid: string, form: HealthFormData) {
  await setDoc(doc(database(), paths.health(academyId, uid)), {
    ...form, completedAt: serverTimestamp(), updatedAt: serverTimestamp(),
  }, { merge: true })
  await updateDoc(doc(database(), paths.student(academyId, uid)), { healthCompleted: true, updatedAt: serverTimestamp() })
}

export async function getHealthForm(academyId: string, uid: string) {
  const snapshot = await getDoc(doc(database(), paths.health(academyId, uid)))
  return snapshot.exists() ? snapshot.data() as HealthFormData : null
}

async function addStudentDocument<T extends DocumentData>(academyId: string, uid: string, child: 'measurements' | 'payments' | 'workoutLogs', data: T) {
  return addDoc(collection(database(), `${paths.student(academyId, uid)}/${child}`), {
    ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })
}

export const addMeasurement = (academyId: string, uid: string, value: MeasurementRecord) => addStudentDocument(academyId, uid, 'measurements', value)
export const addPayment = (academyId: string, uid: string, value: PaymentRecord) => addStudentDocument(academyId, uid, 'payments', value)

export async function listMeasurements(academyId: string, uid: string) {
  if (!firebaseEnabled) return [...(demoMeasurements[uid] || [])].reverse()
  const snapshot = await getDocs(query(collection(database(), paths.measurements(academyId, uid)), orderBy('date', 'desc')))
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as MeasurementRecord))
}

export async function saveWorkout(academyId: string, uid: string, workout: WorkoutDay & { dueDate?: string; templateId?: string }) {
  await setDoc(doc(database(), `${paths.workouts(academyId, uid)}/${workout.id}`), {
    ...workout, updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function listWorkouts(academyId: string, uid: string) {
  const snapshot = await getDocs(collection(database(), paths.workouts(academyId, uid)))
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as WorkoutDay))
}

export async function saveWorkoutProgress(academyId: string, uid: string, workoutId: string, exerciseId: string, completedSets: number) {
  const logId = `${workoutId}_${exerciseId}_${new Date().toISOString().slice(0, 10)}`
  await setDoc(doc(database(), `${paths.workoutLogs(academyId, uid)}/${logId}`), {
    workoutId, exerciseId, completedSets, performedOn: new Date().toISOString().slice(0, 10), updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function listPayments(academyId: string, uid: string, status?: PaymentStatus) {
  if (!firebaseEnabled) {
    const items = demoPayments[uid] || []
    return status ? items.filter(p => p.status === status) : items
  }
  const base = collection(database(), paths.payments(academyId, uid))
  const paymentQuery = status ? query(base, where('status', '==', status), orderBy('dueDate', 'desc')) : query(base, orderBy('dueDate', 'desc'))
  const snapshot = await getDocs(paymentQuery)
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PaymentRecord))
}

export async function updatePaymentStatus(academyId: string, uid: string, paymentId: string, status: PaymentStatus) {
  await updateDoc(doc(database(), `${paths.payments(academyId, uid)}/${paymentId}`), {
    status, ...(status === 'paid' ? { paidAt: new Date().toISOString().slice(0, 10) } : {}), updatedAt: serverTimestamp(),
  })
}

// --- Planos da academia ---

export async function listPlans(academyId: string) {
  if (!firebaseEnabled) return demoPlans
  const snapshot = await getDocs(query(collection(database(), paths.plans(academyId)), orderBy('name')))
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PlanRecord))
}

export async function savePlan(academyId: string, plan: PlanRecord) {
  const { id, ...data } = plan
  const reference = id ? doc(database(), `${paths.plans(academyId)}/${id}`) : doc(collection(database(), paths.plans(academyId)))
  await setDoc(reference, { ...data, updatedAt: serverTimestamp() }, { merge: true })
  return reference.id
}

export async function removePlan(academyId: string, id: string) {
  await deleteDoc(doc(database(), `${paths.plans(academyId)}/${id}`))
}

// --- Modelos de treino ---

export async function listWorkoutTemplates(academyId: string) {
  if (!firebaseEnabled) return demoWorkoutTemplates
  const snapshot = await getDocs(collection(database(), paths.workoutTemplates(academyId)))
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as WorkoutTemplateRecord))
}

export async function saveWorkoutTemplate(academyId: string, template: WorkoutTemplateRecord) {
  const { id, ...data } = template
  const reference = id ? doc(database(), `${paths.workoutTemplates(academyId)}/${id}`) : doc(collection(database(), paths.workoutTemplates(academyId)))
  await setDoc(reference, { ...data, updatedAt: serverTimestamp() }, { merge: true })
  return reference.id
}

export async function removeWorkoutTemplate(academyId: string, id: string) {
  await deleteDoc(doc(database(), `${paths.workoutTemplates(academyId)}/${id}`))
}

// --- Biblioteca de exercícios (personalizações por academia) ---

export async function listExerciseOverrides(academyId: string) {
  const snapshot = await getDocs(collection(database(), paths.exercises(academyId)))
  const result: Record<string, ExerciseOverrideRecord> = {}
  snapshot.docs.forEach(item => { result[item.id] = { id: item.id, ...item.data() } as ExerciseOverrideRecord })
  return result
}

export async function saveExerciseOverride(academyId: string, exerciseId: string | number, data: ExerciseOverrideRecord) {
  const { id, ...rest } = data
  await setDoc(doc(database(), `${paths.exercises(academyId)}/${exerciseId}`), { ...rest, updatedAt: serverTimestamp() }, { merge: true })
}

// --- Upload de mídia de exercício (Firebase Storage) ---

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const MAX_EXERCISE_MEDIA_BYTES = 50 * 1024 * 1024

export async function uploadExerciseMedia(academyId: string, file: File, kind: 'image' | 'video') {
  const allowed = kind === 'image' ? ALLOWED_IMAGE_TYPES : ALLOWED_VIDEO_TYPES
  if (!allowed.includes(file.type)) throw new Error(kind === 'image' ? 'Selecione um arquivo de imagem válido (JPEG, PNG, WEBP ou GIF).' : 'Selecione um arquivo de vídeo válido (MP4, WEBM ou MOV).')
  if (file.size > MAX_EXERCISE_MEDIA_BYTES) throw new Error('O arquivo excede o limite de 50 MB.')
  const extension = file.name.includes('.') ? file.name.slice(file.name.lastIndexOf('.')) : ''
  const fileName = `${crypto.randomUUID()}${extension}`
  const fileRef = ref(bucket(), `academies/${academyId}/exercise-media/${fileName}`)
  await uploadBytes(fileRef, file, { contentType: file.type })
  return getDownloadURL(fileRef)
}

export async function deleteExerciseMedia(url: string) {
  try { await deleteObject(ref(bucket(), url)) } catch { /* arquivo já pode ter sido removido */ }
}
