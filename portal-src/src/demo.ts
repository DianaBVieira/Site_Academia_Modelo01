import type { UserProfile, WorkoutDay } from './types'
import type { StudentRecord, MeasurementRecord, PaymentRecord, PlanRecord, WorkoutTemplateRecord } from './database'

/* ── Dados fictícios para o modo demonstração (sem Firebase) ──────────────
   Usados quando VITE_FIREBASE_* está vazio (ver src/firebase.ts). Nada aqui
   é enviado a lugar nenhum — é só para mostrar o sistema funcionando pra
   um cliente em potencial. As imagens dos exercícios vêm do wger.de
   (Creative Commons, mesma fonte já usada pela biblioteca de exercícios).
   ─────────────────────────────────────────────────────────────────────── */

export const demoAdmin: UserProfile = { id: 'admin-demo', role: 'admin', name: 'Administradora Vértice', email: 'admin@vertice.demo', healthCompleted: true }
export const demoStudent: UserProfile = { id: 'aluna-camila', role: 'student', name: 'Camila Moreira', email: 'aluno@vertice.demo', birth: '1994-03-22', plan: 'Performance', dueDate: '2026-08-21', healthCompleted: true, objectives: ['Fortalecimento', 'Mobilidade'] }

// a mesma ficha que a Camila vê como aluna aparece pro admin em `demoStudents`
// abaixo (workoutDays) — não são dois conjuntos de dados desencontrados.
export const workouts: WorkoutDay[] = [
  { id: 'mon', weekday: 'Segunda', title: 'Pernas', status: 'available', exercises: [
    { id: 'agachamento', name: 'Agachamento livre', group: 'Pernas', sets: 3, reps: 12, suggestedWeight: '40 kg', restSeconds: 75, media: 'https://wger.de/media/exercise-images/977/3124c091-6395-4377-96c5-56048b627ceb.png', instructions: 'Desça controlando o quadril para trás, mantenha os joelhos alinhados aos pés e não perca a curvatura natural da lombar.', completedSets: 0 },
    { id: 'legpress', name: 'Leg press 45°', group: 'Pernas', sets: 3, reps: 12, suggestedWeight: '90 kg', restSeconds: 60, media: 'https://wger.de/media/exercise-images/146/8b284904-d072-4381-a256-4c81d8fd9c1f.png', instructions: 'Não trave os joelhos no topo e mantenha a lombar sempre apoiada no encosto.', completedSets: 0 },
    { id: 'cadext', name: 'Cadeira extensora', group: 'Quadríceps', sets: 3, reps: 15, suggestedWeight: '25 kg', restSeconds: 45, media: 'https://wger.de/media/exercise-images/369/78c915d1-e46d-4d30-8124-65d68664c3ef.png', instructions: 'Suba de forma controlada, pause um instante no topo e desça devagar.', completedSets: 0 },
  ]},
  { id: 'tue', weekday: 'Terça', title: 'Mobilidade', status: 'available', exercises: [
    { id: 'mobquadril', name: 'Mobilidade de quadril', group: 'Mobilidade', sets: 2, reps: 10, suggestedWeight: 'Peso corporal', restSeconds: 30, instructions: 'Movimentos amplos e lentos, sem forçar além do seu limite confortável.', completedSets: 0 },
    { id: 'gatocamelo', name: 'Gato-camelo', group: 'Coluna', sets: 2, reps: 12, suggestedWeight: 'Peso corporal', restSeconds: 30, instructions: 'Sincronize o movimento com a respiração, arredondando e arqueando a coluna devagar.', completedSets: 0 },
  ]},
  { id: 'wed', weekday: 'Quarta', title: 'Costas e ombros', status: 'available', exercises: [
    { id: 'puxada', name: 'Puxada frontal', group: 'Costas', sets: 3, reps: 12, suggestedWeight: '32 kg', restSeconds: 60, media: 'https://wger.de/media/exercise-images/1635/b8c34e3a-7474-41ea-99e3-8d7fdb1e12d6.png', instructions: 'Puxe a barra em direção ao peito, contraindo as escápulas, sem balançar o tronco.', completedSets: 0 },
    { id: 'remada', name: 'Remada baixa', group: 'Costas', sets: 3, reps: 10, suggestedWeight: '28 kg', restSeconds: 60, media: 'https://wger.de/media/exercise-images/110/Reverse-grip-bent-over-rows-1.png', instructions: 'Mantenha a coluna neutra e traga os cotovelos para trás, junto ao corpo.', completedSets: 0 },
    { id: 'desenvolvimento', name: 'Desenvolvimento com halteres', group: 'Ombros', sets: 3, reps: 10, suggestedWeight: '10 kg', restSeconds: 75, media: 'https://wger.de/media/exercise-images/129/b263c968-e067-4750-916a-d8758a7df23e.webp', instructions: 'Empurre os halteres para cima sem travar os cotovelos no topo do movimento.', completedSets: 0 },
    { id: 'encolhimento', name: 'Encolhimento de ombros', group: 'Trapézio', sets: 3, reps: 15, suggestedWeight: '16 kg', restSeconds: 45, media: 'https://wger.de/media/exercise-images/110/Reverse-grip-bent-over-rows-1.png', instructions: 'Suba os ombros em direção às orelhas e desça devagar, sem usar os braços.', completedSets: 0 },
  ]},
  { id: 'thu', weekday: 'Quinta', title: 'Descanso', status: 'rest', exercises: [] },
  { id: 'fri', weekday: 'Sexta', title: 'Peito e tríceps', status: 'available', exercises: [
    { id: 'supino', name: 'Supino reto com barra', group: 'Peitoral', sets: 3, reps: 10, suggestedWeight: '14 kg', restSeconds: 75, media: 'https://wger.de/media/exercise-images/100/Decline-bench-press-1.png', instructions: 'Desça a barra até a altura do peito, cotovelos em cerca de 45°.', completedSets: 0 },
    { id: 'crucifixo', name: 'Crucifixo inclinado', group: 'Peitoral', sets: 3, reps: 12, suggestedWeight: '8 kg', restSeconds: 60, media: 'https://wger.de/media/exercise-images/100/Decline-bench-press-1.png', instructions: 'Mantenha um leve dobra nos cotovelos durante todo o movimento.', completedSets: 0 },
    { id: 'triceps', name: 'Tríceps na polia', group: 'Tríceps', sets: 3, reps: 15, suggestedWeight: '20 kg', restSeconds: 45, media: 'https://wger.de/media/exercise-images/1298/ec4b83ec-5a8f-4303-9050-99ec4389bc2a.png', instructions: 'Cotovelos fixos ao lado do corpo, estenda completamente sem travar.', completedSets: 0 },
  ]},
  { id: 'sat', weekday: 'Sábado', title: 'Funcional', status: 'available', exercises: [
    { id: 'agachsalto', name: 'Agachamento com salto', group: 'Funcional', sets: 3, reps: 10, suggestedWeight: 'Peso corporal', restSeconds: 60, media: 'https://wger.de/media/exercise-images/285/4141e8b2-d9f2-4597-8ef0-7768127fd0ec.png', instructions: 'Aterrisse suavemente, absorvendo o impacto flexionando os joelhos.', completedSets: 0 },
    { id: 'prancha', name: 'Prancha', group: 'Core', sets: 3, reps: 1, suggestedWeight: '40s', restSeconds: 45, media: 'https://wger.de/media/exercise-images/976/94649ea6-bf58-4fd9-90c1-b2ec96ee20cd.png', instructions: 'Corpo alinhado da cabeça aos calcanhares, abdômen contraído.', completedSets: 0 },
  ]},
  { id: 'sun', weekday: 'Domingo', title: 'Descanso', status: 'rest', exercises: [] },
]

// mesma ficha acima, no formato usado pelo painel do administrador
// (WorkoutDayPlan) — é o que a instrutora "montou" pra Camila.
const workoutDaysForCamila = workouts
  .filter(day => day.status !== 'rest')
  .map((day, i) => ({
    day: day.weekday,
    color: ['blue', 'green', 'purple', 'orange', 'pink'][i % 5],
    exercises: day.exercises.map(ex => ({ name: ex.name, sets: ex.sets, reps: String(ex.reps), restSeconds: ex.restSeconds })),
  }))

export const demoStudents: StudentRecord[] = [
  { id: 'aluna-camila', name: 'Camila Moreira', birth: '1994-03-22', cpf: '111.222.333-44', email: 'aluno@vertice.demo', phone: '(27) 99900-0001', objective: 'Fortalecimento e mobilidade', conditions: 'Nenhuma condição relatada', plan: 'Performance', dueDate: '2026-08-21', monthlyFee: 229, payment: 'Ativo', healthCompleted: true, workoutDue: '2026-09-15', workoutTemplate: 'Full body — foco em força', workoutDays: workoutDaysForCamila },
  { id: 'aluno-rodrigo', name: 'Rodrigo Alencar', birth: '1988-11-05', cpf: '222.333.444-55', email: 'rodrigo.alencar@vertice.demo', phone: '(27) 99900-0002', objective: 'Reabilitação de hérnia de disco', conditions: 'Hérnia de disco (liberado pelo ortopedista)', plan: 'Individual', dueDate: '2026-09-02', monthlyFee: 480, payment: 'Ativo', healthCompleted: true, workoutDue: '2026-08-20', workoutTemplate: 'Reabilitação — coluna' },
  { id: 'aluna-vera', name: 'Vera Santiago', birth: '1965-07-14', cpf: '333.444.555-66', email: 'vera.santiago@vertice.demo', phone: '(27) 99900-0003', objective: 'Qualidade de vida na terceira idade', conditions: 'Hipertensão controlada', plan: 'Essencial', dueDate: '2026-08-05', monthlyFee: 149, payment: 'Pendente', healthCompleted: true, workoutDue: '2026-08-25', workoutTemplate: 'Mobilidade e equilíbrio' },
  { id: 'aluno-bruno', name: 'Bruno Kowalski', birth: '1997-01-30', cpf: '444.555.666-77', email: 'bruno.kowalski@vertice.demo', phone: '(27) 99900-0004', objective: 'Ganho de massa muscular', conditions: 'Nenhuma condição relatada', plan: 'Performance', dueDate: '2026-07-30', monthlyFee: 229, payment: 'Vencido', healthCompleted: true, workoutDue: '2026-08-10', workoutTemplate: 'Hipertrofia — upper/lower' },
  { id: 'aluna-ana', name: 'Ana Beatriz Lima', birth: '2001-09-18', cpf: '555.666.777-88', email: 'ana.lima@vertice.demo', phone: '(27) 99900-0005', objective: 'Emagrecimento', conditions: 'Nenhuma condição relatada', plan: 'Essencial', dueDate: '2026-08-14', monthlyFee: 149, payment: 'Ativo', healthCompleted: false, workoutDue: '2026-08-18', workoutTemplate: 'Condicionamento geral' },
  { id: 'aluno-felipe', name: 'Felipe Nogueira', birth: '1992-05-09', cpf: '666.777.888-99', email: 'felipe.nogueira@vertice.demo', phone: '(27) 99900-0006', objective: 'Preparação para maratona', conditions: 'Nenhuma condição relatada', plan: 'Individual', dueDate: '2026-08-18', monthlyFee: 480, payment: 'Ativo', healthCompleted: true, workoutDue: '2026-08-22', workoutTemplate: 'Corrida e força de apoio' },
  { id: 'aluna-juliana', name: 'Juliana Prado', birth: '1990-12-02', cpf: '777.888.999-00', email: 'juliana.prado@vertice.demo', phone: '(27) 99900-0007', objective: 'Retorno pós-gestação', conditions: 'Diástase abdominal (acompanhamento com fisioterapeuta)', plan: 'Performance', dueDate: '2026-07-28', monthlyFee: 229, payment: 'Vencido', healthCompleted: true, workoutDue: '2026-08-05', workoutTemplate: 'Fortalecimento de core' },
  { id: 'aluno-marcos', name: 'Marcos Vinícius', birth: '1985-04-27', cpf: '888.999.000-11', email: 'marcos.vinicius@vertice.demo', phone: '(27) 99900-0008', objective: 'Condicionamento geral', conditions: 'Nenhuma condição relatada', plan: 'Essencial', dueDate: '2026-08-09', monthlyFee: 149, payment: 'Pendente', healthCompleted: false, workoutDue: '2026-08-30', workoutTemplate: 'Iniciante — adaptação' },
]

export const demoPlans: PlanRecord[] = [
  { id: 'plano-essencial', name: 'Essencial', price: 'R$ 149/mês', description: 'Musculação livre, avaliação inicial e ficha revisada a cada 8 semanas.' },
  { id: 'plano-performance', name: 'Performance', price: 'R$ 229/mês', description: 'Tudo do Essencial + aulas de mobilidade e acompanhamento quinzenal.' },
  { id: 'plano-individual', name: 'Individual', price: 'R$ 480/mês', description: 'Tudo do Performance + 2 sessões semanais de personal.' },
]

export const demoPayments: Record<string, PaymentRecord[]> = {
  'aluna-camila': [{ id: 'pg-1', planId: 'plano-performance', description: 'Mensalidade Performance — agosto', amount: 229, dueDate: '2026-08-21', status: 'paid', paidAt: '2026-07-18' }],
  'aluna-vera': [{ id: 'pg-2', planId: 'plano-essencial', description: 'Mensalidade Essencial — agosto', amount: 149, dueDate: '2026-08-05', status: 'pending' }],
  'aluno-bruno': [{ id: 'pg-3', planId: 'plano-performance', description: 'Mensalidade Performance — julho', amount: 229, dueDate: '2026-07-30', status: 'overdue' }],
  'aluna-juliana': [{ id: 'pg-4', planId: 'plano-performance', description: 'Mensalidade Performance — julho', amount: 229, dueDate: '2026-07-28', status: 'overdue' }],
  'aluno-marcos': [{ id: 'pg-5', planId: 'plano-essencial', description: 'Mensalidade Essencial — agosto', amount: 149, dueDate: '2026-08-09', status: 'pending' }],
}

export const demoMeasurements: Record<string, MeasurementRecord[]> = {
  'aluna-camila': [
    { date: '2026-04-10', weightKg: 75.1, bodyFatPercent: 30.2, leanMassKg: 48.8 },
    { date: '2026-05-12', weightKg: 74.3, bodyFatPercent: 29.3, leanMassKg: 49.2 },
    { date: '2026-06-14', weightKg: 73.2, bodyFatPercent: 28.5, leanMassKg: 49.7 },
    { date: '2026-07-12', weightKg: 72.4, bodyFatPercent: 27.8, leanMassKg: 50.1 },
  ],
}

export const demoWorkoutTemplates: WorkoutTemplateRecord[] = [
  { id: 'tpl-fullbody', name: 'Full body — foco em força', days: workoutDaysForCamila },
]
