import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarDays,
  Check,
  ChevronRight,
  CreditCard,
  Dumbbell,
  HeartPulse,
  Pencil,
  Plus,
  RefreshCw,
  Ruler,
  Search,
  Trash2,
  UserRound,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { exerciseName } from "./ExerciseLibrary";
import type { WgerExercise } from "./ExerciseLibrary";
import {
  addMeasurement,
  addPayment,
  createStudent,
  deleteStudent,
  getHealthForm,
  listExerciseOverrides,
  listMeasurements,
  listPlans,
  listStudents,
  listWorkoutTemplates,
  removePlan,
  removeWorkoutTemplate,
  saveStudent,
  savePlan,
  saveWorkoutTemplate,
  type ExerciseOverrideRecord,
  type MeasurementRecord,
  type PlanRecord,
  type StudentRecord,
  type WorkoutTemplateRecord,
} from "./database";
import type { HealthFormData, PaymentSituation, WorkoutDayPlan, WorkoutEntry, WorkoutExercisePlan } from "./types";

type Status = PaymentSituation;
type View = "inicio" | "alunos" | "planos" | "pagamentos" | "saude";
type BodyMeasurement = {
  id: string;
  studentId: string;
  date: string;
  weight: number;
  height: number;
  age: number;
  sex: "male" | "female";
  method: "jp3" | "jp4" | "jp7" | "dw";
  bodyFat: number;
  muscleMass: number;
  waist: number;
  abdomen: number;
  hip: number;
  chest: number;
  arm: number;
  thigh: number;
  calf: number;
  foldChest: number;
  foldAbdominal: number;
  foldThigh: number;
  foldTriceps: number;
  foldBiceps: number;
  foldSubscapular: number;
  foldSuprailiac: number;
  foldMidaxillary: number;
  notes: string;
};

export default function AdminWorkspace({
  academyId,
  onOpenLibrary,
}: {
  academyId: string;
  onOpenLibrary: () => void;
}) {
  const [view, setView] = useState<View>("inicio");
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [studentsError, setStudentsError] = useState("");
  const [editing, setEditing] = useState<StudentRecord | null>(null);
  const [healthStudent, setHealthStudent] = useState<StudentRecord | null>(
    null,
  );
  const [workoutStudent, setWorkoutStudent] = useState<StudentRecord | null>(
    null,
  );
  const [measurementStudent, setMeasurementStudent] =
    useState<StudentRecord | null>(null);
  const [query, setQuery] = useState("");
  const [plans, setPlans] = useState<PlanRecord[]>([]);
  const [editingPlan, setEditingPlan] = useState<PlanRecord | null>(null);

  async function refreshStudents() {
    setLoadingStudents(true);
    setStudentsError("");
    try {
      setStudents(await listStudents(academyId));
    } catch {
      setStudentsError("Não foi possível carregar os alunos agora.");
    } finally {
      setLoadingStudents(false);
    }
  }
  async function refreshPlans() {
    try {
      setPlans(await listPlans(academyId));
    } catch {
      /* mantém a lista anterior em caso de falha temporária */
    }
  }
  useEffect(() => {
    refreshStudents();
    refreshPlans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academyId]);

  async function save(student: StudentRecord) {
    try {
      if (student.id) await saveStudent(academyId, student);
      else await createStudent(academyId, student);
      await refreshStudents();
      setEditing(null);
    } catch {
      alert(
        "Não foi possível salvar o aluno agora. Confira a conexão e tente novamente.",
      );
    }
  }
  async function remove(student: StudentRecord) {
    if (!confirm(`Excluir ${student.name}?`)) return;
    try {
      await deleteStudent(academyId, student.id);
      await refreshStudents();
    } catch {
      alert("Não foi possível excluir o aluno agora.");
    }
  }
  async function markPaid(student: StudentRecord) {
    try {
      await saveStudent(academyId, { ...student, payment: "Ativo" });
      await addPayment(academyId, student.id, {
        planId: student.plan,
        description: `Mensalidade ${student.plan}`,
        amount: student.monthlyFee,
        dueDate: student.dueDate,
        status: "paid",
      });
      await refreshStudents();
    } catch {
      alert("Não foi possível registrar o pagamento agora.");
    }
  }
  const filtered = useMemo(
    () =>
      students.filter((item) =>
        `${item.name} ${item.email} ${item.cpf}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [students, query],
  );
  return (
    <main className="page admin-workspace">
      <nav className="admin-nav">
        {(
          [
            ["inicio", "Visão geral"],
            ["alunos", "Alunos"],
            ["planos", "Planos"],
            ["pagamentos", "Pagamentos"],
            ["saude", "Saúde e cuidados"],
          ] as [View, string][]
        ).map(([id, label]) => (
          <button
            className={view === id ? "active" : ""}
            onClick={() => setView(id)}
            key={id}
          >
            {label}
          </button>
        ))}
        <button onClick={onOpenLibrary}>Exercícios</button>
      </nav>
      {view === "inicio" && (
        <Dashboard
          students={students}
          onNavigate={setView}
          onOpenLibrary={onOpenLibrary}
        />
      )}
      {view === "alunos" && (
        <>
          <PageHead
            eyebrow="Gestão de alunos"
            title="Alunos cadastrados"
            text="Dados pessoais, objetivos, planos e vencimentos"
          >
            <button
              className="primary"
              onClick={() => setEditing(blankStudent())}
            >
              <Plus size={18} /> Cadastrar aluno
            </button>
          </PageHead>
          <div className="admin-search">
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nome, CPF ou e-mail"
            />
          </div>
          {loadingStudents && (
            <div className="library-state">
              <RefreshCw className="spin" /> Carregando alunos...
            </div>
          )}
          {studentsError && (
            <div className="library-state error">
              {studentsError}
              <button className="secondary" onClick={refreshStudents}>
                Tentar novamente
              </button>
            </div>
          )}
          {!loadingStudents && !studentsError && (
          <section className="students-table">
            <div className="table-head">
              <span>Aluno</span>
              <span>Objetivo</span>
              <span>Plano</span>
              <span>Vencimento</span>
              <span>Situação</span>
              <span />
            </div>
            {filtered.map((student) => (
              <div className="table-row" key={student.id}>
                <div className="student-cell">
                  <span className="avatar">{student.name[0]}</span>
                  <div>
                    <strong>{student.name}</strong>
                    <small>{student.email}</small>
                  </div>
                </div>
                <span>{student.objective}</span>
                <span>{student.plan}</span>
                <span>
                  {new Date(student.dueDate + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                  )}
                </span>
                <span
                  className={`status status-${student.payment.toLowerCase()}`}
                >
                  {student.payment}
                </span>
                <div className="row-actions">
                  <button
                    aria-label={`Registrar medidas de ${student.name}`}
                    title="Peso e medidas"
                    onClick={() => setMeasurementStudent(student)}
                  >
                    <Ruler />
                  </button>
                  <button
                    aria-label={`Editar ${student.name}`}
                    onClick={() => setEditing(student)}
                  >
                    <Pencil />
                  </button>
                  <button
                    aria-label={`Excluir ${student.name}`}
                    onClick={() => remove(student)}
                  >
                    <Trash2 />
                  </button>
                </div>
              </div>
            ))}
          </section>
          )}
        </>
      )}
      {view === "planos" && (
        <>
          <PageHead
            eyebrow="Planos"
            title="Planos da academia"
            text="Valores e condições comerciais desta academia"
          >
            <button
              className="primary"
              onClick={() => setEditingPlan({ name: "", price: "", description: "" })}
            >
              <Plus size={18} /> Novo plano
            </button>
          </PageHead>
          <section className="plan-management">
            {plans.map((plan) => (
              <article key={plan.id}>
                <WalletCards />
                <span>Plano</span>
                <h3>{plan.name}</h3>
                <strong>{plan.price}</strong>
                <p>{plan.description}</p>
                <button className="secondary" onClick={() => setEditingPlan(plan)}>
                  <Pencil size={16} /> Editar plano
                </button>
              </article>
            ))}
            {plans.length === 0 && (
              <p className="muted">Nenhum plano cadastrado ainda.</p>
            )}
          </section>
        </>
      )}
      {view === "pagamentos" && (
        <>
          <PageHead
            eyebrow="Financeiro"
            title="Pagamentos"
            text="Acompanhe mensalidades e vencimentos"
          >
            <button className="primary">
              <Plus size={18} /> Registrar pagamento
            </button>
          </PageHead>
          <section className="payment-summary">
            <article>
              <span>Recebido no mês</span>
              <strong>
                R${" "}
                {students
                  .filter((s) => s.payment === "Ativo")
                  .reduce((sum, s) => sum + s.monthlyFee, 0)
                  .toFixed(2)
                  .replace(".", ",")}
              </strong>
            </article>
            <article>
              <span>Pendente</span>
              <strong>
                {students.filter((s) => s.payment === "Pendente").length}
              </strong>
            </article>
            <article>
              <span>Vencido</span>
              <strong>
                {students.filter((s) => s.payment === "Vencido").length}
              </strong>
            </article>
          </section>
          <section className="students-table payment-table">
            {students.map((student) => (
              <div className="table-row" key={student.id}>
                <div className="student-cell">
                  <CreditCard />
                  <div>
                    <strong>{student.name}</strong>
                    <small>{student.plan}</small>
                  </div>
                </div>
                <span>
                  R$ {student.monthlyFee.toFixed(2).replace(".", ",")}
                </span>
                <span>
                  Vence{" "}
                  {new Date(student.dueDate + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                  )}
                </span>
                <span
                  className={`status status-${student.payment.toLowerCase()}`}
                >
                  {student.payment}
                </span>
                <button
                  className="secondary"
                  disabled={student.payment === "Ativo"}
                  onClick={() => markPaid(student)}
                >
                  <Check size={15} /> Marcar como pago
                </button>
              </div>
            ))}
          </section>
        </>
      )}
      {view === "saude" && (
        <>
          <PageHead
            eyebrow="Cuidado individual"
            title="Saúde e cuidados"
            text="Consulte a ficha antes de montar ou renovar o treino"
          />
          <section className="health-list compact-health-list">
            {students.map((student) => (
              <article key={student.id}>
                <div className="health-main-row">
                  <div className="student-cell">
                    <HeartPulse />
                    <div>
                      <strong>{student.name}</strong>
                      <small>{student.objective}</small>
                    </div>
                  </div>
                  <div className="health-condition">
                    <span>Condições informadas</span>
                    <p>{student.conditions}</p>
                  </div>
                </div>
                <div className="health-actions">
                  <span
                    className={`health-fill-status ${student.healthCompleted ? "filled" : "pending"}`}
                  >
                    {student.healthCompleted ? "Preenchido" : "Pendente"}
                  </span>
                  <button
                    className="secondary"
                    disabled={!student.healthCompleted}
                    onClick={() => setHealthStudent(student)}
                  >
                    Ver ficha <ChevronRight size={14} />
                  </button>
                  <WorkoutStatus
                    student={student}
                    disabled={!student.healthCompleted}
                    onClick={() => setWorkoutStudent(student)}
                  />
                </div>
              </article>
            ))}
          </section>
        </>
      )}
      {editing && (
        <StudentEditor
          student={editing}
          plans={plans}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
      {healthStudent && (
        <HealthDetail
          student={healthStudent}
          academyId={academyId}
          onClose={() => setHealthStudent(null)}
        />
      )}
      {measurementStudent && (
        <MeasurementEditor
          student={measurementStudent}
          academyId={academyId}
          onClose={() => setMeasurementStudent(null)}
        />
      )}
      {workoutStudent && (
        <WorkoutBuilder
          student={workoutStudent}
          academyId={academyId}
          onClose={() => setWorkoutStudent(null)}
          onSave={async (due, template, days) => {
            try {
              await saveStudent(academyId, {
                ...workoutStudent,
                workoutDue: due,
                workoutTemplate: template,
                workoutDays: days,
              });
              await refreshStudents();
            } catch {
              alert("Não foi possível salvar o treino agora.");
            }
            setWorkoutStudent(null);
          }}
        />
      )}
      {editingPlan && (
        <PlanEditor
          plan={editingPlan}
          onClose={() => setEditingPlan(null)}
          onSave={async (plan) => {
            try {
              await savePlan(academyId, plan);
              await refreshPlans();
              setEditingPlan(null);
            } catch {
              alert("Não foi possível salvar o plano agora.");
            }
          }}
          onRemove={
            editingPlan.id
              ? async () => {
                  try {
                    await removePlan(academyId, editingPlan.id!);
                    await refreshPlans();
                    setEditingPlan(null);
                  } catch {
                    alert("Não foi possível excluir o plano agora.");
                  }
                }
              : undefined
          }
        />
      )}
    </main>
  );
}

function Dashboard({
  students,
  onNavigate,
  onOpenLibrary,
}: {
  students: StudentRecord[];
  onNavigate: (view: View) => void;
  onOpenLibrary: () => void;
}) {
  return (
    <>
      <PageHead
        eyebrow="Visão geral"
        title="Olá, Administrador"
        text="Acompanhe alunos, vencimentos e avaliações"
      >
        <button className="primary" onClick={() => onNavigate("alunos")}>
          <Plus size={18} /> Cadastrar aluno
        </button>
      </PageHead>
      <section className="stats">
        <Summary
          icon={<Users />}
          label="Alunos ativos"
          value={String(students.length)}
        />
        <Summary
          icon={<CalendarDays />}
          label="Pagamentos pendentes"
          value={String(students.filter((s) => s.payment !== "Ativo").length)}
        />
        <Summary
          icon={<HeartPulse />}
          label="Anamneses pendentes"
          value={String(students.filter((s) => !s.healthCompleted).length)}
        />
        <Summary icon={<Activity />} label="Treinos hoje" value="31" />
      </section>
      <section className="admin-module-grid">
        <button onClick={() => onNavigate("alunos")}>
          <UserRound />
          <strong>Alunos</strong>
          <span>Cadastros, planos e vencimentos</span>
        </button>
        <button onClick={() => onNavigate("saude")}>
          <HeartPulse />
          <strong>Saúde e cuidados</strong>
          <span>Anamneses e alertas</span>
        </button>
        <button onClick={onOpenLibrary}>
          <Dumbbell />
          <strong>Treinos e exercícios</strong>
          <span>Fichas e biblioteca integrada</span>
        </button>
        <button onClick={() => onNavigate("pagamentos")}>
          <WalletCards />
          <strong>Planos e pagamentos</strong>
          <span>Controle financeiro</span>
        </button>
      </section>
    </>
  );
}
function PageHead({
  eyebrow,
  title,
  text,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="muted">{text}</p>
      </div>
      {children}
    </div>
  );
}
function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <article className="stat">
      <div className="stat-icon">{icon}</div>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}
function blankStudent(): StudentRecord {
  return {
    id: "",
    name: "",
    birth: "",
    cpf: "",
    email: "",
    phone: "",
    objective: "Emagrecimento",
    conditions: "Aguardando preenchimento do aluno",
    plan: "Mensal",
    dueDate: new Date().toISOString().slice(0, 10),
    monthlyFee: 139.9,
    payment: "Pendente",
    healthCompleted: false,
  };
}

const standardObjectives = [
  "Emagrecimento",
  "Ganho de massa",
  "Condicionamento",
  "Fortalecimento",
  "Mobilidade",
  "Reabilitação",
  "Controle de dores",
  "Qualidade de vida",
];
function StudentEditor({
  student,
  plans,
  onClose,
  onSave,
}: {
  student: StudentRecord;
  plans: PlanRecord[];
  onClose: () => void;
  onSave: (student: StudentRecord) => void | Promise<void>;
}) {
  const [form, setForm] = useState(student);
  const [saving, setSaving] = useState(false);
  const custom = !standardObjectives.includes(form.objective);
  return (
    <div className="editor-overlay">
      <section
        className="student-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Cadastro do aluno"
      >
        <header>
          <div>
            <p className="eyebrow">Cadastro</p>
            <h2>{student.id ? "Editar aluno" : "Novo aluno"}</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="student-form">
          <label>
            Nome completo
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label>
            Data de nascimento
            <input
              type="date"
              value={form.birth}
              onChange={(e) => setForm({ ...form, birth: e.target.value })}
            />
          </label>
          <label>
            CPF
            <input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: e.target.value })}
            />
          </label>
          <label>
            E-mail
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </label>
          <label>
            Telefone
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </label>
          <label>
            Objetivo
            <select
              value={custom ? "Outro objetivo" : form.objective}
              onChange={(e) =>
                setForm({
                  ...form,
                  objective:
                    e.target.value === "Outro objetivo" ? "" : e.target.value,
                })
              }
            >
              {standardObjectives.map((o) => (
                <option key={o}>{o}</option>
              ))}
              <option>Outro objetivo</option>
            </select>
          </label>
          {custom && (
            <label className="custom-objective">
              Escreva ou edite o objetivo
              <input
                autoFocus
                value={form.objective}
                onChange={(e) =>
                  setForm({ ...form, objective: e.target.value })
                }
                placeholder="Ex.: preparação para corrida"
              />
            </label>
          )}
          <label>
            Plano
            <select
              value={form.plan}
              onChange={(e) => setForm({ ...form, plan: e.target.value })}
            >
              {plans.map((p) => (
                <option key={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <label>
            Vencimento
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            />
          </label>
          <label>
            Mensalidade
            <input
              type="number"
              step="0.01"
              value={form.monthlyFee}
              onChange={(e) =>
                setForm({ ...form, monthlyFee: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Situação
            <select
              value={form.payment}
              onChange={(e) =>
                setForm({ ...form, payment: e.target.value as Status })
              }
            >
              <option>Ativo</option>
              <option>Pendente</option>
              <option>Vencido</option>
            </select>
          </label>
        </div>
        <p className="invite-note">
          {student.id
            ? "Alterações são salvas imediatamente para este aluno."
            : "Ao salvar, criamos o acesso do aluno e enviamos um e-mail para que ele defina a própria senha."}
        </p>
        <footer>
          <button className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary"
            disabled={
              !form.name || !form.email || !form.cpf || !form.objective || saving
            }
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(form);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Salvando..." : "Salvar aluno"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function PlanEditor({
  plan,
  onClose,
  onSave,
  onRemove,
}: {
  plan: PlanRecord;
  onClose: () => void;
  onSave: (plan: PlanRecord) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
}) {
  const [form, setForm] = useState(plan);
  const [saving, setSaving] = useState(false);
  return (
    <div className="editor-overlay">
      <section
        className="student-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Cadastro do plano"
      >
        <header>
          <div>
            <p className="eyebrow">Planos</p>
            <h2>{plan.id ? "Editar plano" : "Novo plano"}</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="student-form">
          <label>
            Nome do plano
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex.: Mensal"
            />
          </label>
          <label>
            Valor exibido
            <input
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              placeholder="Ex.: R$ 139,90"
            />
          </label>
          <label className="full">
            Condições
            <input
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Ex.: Renovação mensal"
            />
          </label>
        </div>
        <footer>
          {onRemove && (
            <button
              className="danger-button"
              onClick={async () => {
                setSaving(true);
                try {
                  await onRemove();
                } finally {
                  setSaving(false);
                }
              }}
            >
              <Trash2 size={16} /> Excluir plano
            </button>
          )}
          <button className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary"
            disabled={!form.name || !form.price || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await onSave(form);
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Salvando..." : "Salvar plano"}
          </button>
        </footer>
      </section>
    </div>
  );
}

const emptyMeasurement = (studentId: string): BodyMeasurement => ({
  id: crypto.randomUUID(),
  studentId,
  date: new Date().toISOString().slice(0, 10),
  weight: 0,
  height: 0,
  age: 0,
  sex: "female",
  method: "jp3",
  bodyFat: 0,
  muscleMass: 0,
  waist: 0,
  abdomen: 0,
  hip: 0,
  chest: 0,
  arm: 0,
  thigh: 0,
  calf: 0,
  foldChest: 0,
  foldAbdominal: 0,
  foldThigh: 0,
  foldTriceps: 0,
  foldBiceps: 0,
  foldSubscapular: 0,
  foldSuprailiac: 0,
  foldMidaxillary: 0,
  notes: "",
});

type FoldKey =
  | "foldChest"
  | "foldAbdominal"
  | "foldThigh"
  | "foldTriceps"
  | "foldBiceps"
  | "foldSubscapular"
  | "foldSuprailiac"
  | "foldMidaxillary";
const foldInfo: Record<
  FoldKey,
  { label: string; instruction: string; x: number; y: number; side?: "front" | "back" }
> = {
  foldChest: { label: "Peitoral", instruction: "Dobra diagonal entre a axila e o mamilo; nas mulheres, use aproximadamente 1/3 dessa distância.", x: 55, y: 31 },
  foldAbdominal: { label: "Abdominal", instruction: "Dobra vertical cerca de 2 cm à direita do umbigo.", x: 54, y: 49 },
  foldThigh: { label: "Coxa", instruction: "Dobra vertical na linha média anterior da coxa, entre o quadril e o joelho.", x: 55, y: 69 },
  foldTriceps: { label: "Tríceps", instruction: "Dobra vertical na parte posterior do braço, no ponto médio entre ombro e cotovelo.", x: 70, y: 35 },
  foldBiceps: { label: "Bíceps", instruction: "Dobra vertical na face anterior do braço, no mesmo nível usado para o tríceps.", x: 30, y: 35 },
  foldSubscapular: { label: "Subescapular", instruction: "Dobra diagonal 1 a 2 cm abaixo do ângulo inferior da escápula.", x: 43, y: 38, side: "back" },
  foldSuprailiac: { label: "Supra-ilíaca", instruction: "Dobra diagonal acima da crista ilíaca, seguindo a linha natural da dobra.", x: 66, y: 52 },
  foldMidaxillary: { label: "Axilar média", instruction: "Dobra vertical na linha axilar média, na altura do apêndice xifoide.", x: 68, y: 42 },
};
const foldImages: Partial<Record<FoldKey, string>> = {
  foldChest: "measurement/chest.png",
  foldAbdominal: "measurement/abdominal.png",
  foldThigh: "measurement/thigh.png",
  foldTriceps: "measurement/triceps.png",
  foldSubscapular: "measurement/subscapular.png",
  foldSuprailiac: "measurement/suprailiac.png",
  foldMidaxillary: "measurement/midaxillary.png",
  foldBiceps: "measurement/biceps.png",
};
function durninCoefficients(sex: "male" | "female", age: number) {
  if (sex === "male") {
    if (age < 17) return [1.1533, 0.0643];
    if (age < 20) return [1.162, 0.063];
    if (age < 30) return [1.1631, 0.0632];
    if (age < 40) return [1.1422, 0.0544];
    if (age < 50) return [1.162, 0.07];
    return [1.1715, 0.0779];
  }
  if (age < 17) return [1.1369, 0.0598];
  if (age < 20) return [1.1549, 0.0678];
  if (age < 30) return [1.1599, 0.0717];
  if (age < 40) return [1.1423, 0.0632];
  if (age < 50) return [1.1333, 0.0612];
  return [1.1339, 0.0645];
}
function BodyFatProtocol({ form, setForm }: { form: BodyMeasurement; setForm: React.Dispatch<React.SetStateAction<BodyMeasurement>> }) {
  const sites: FoldKey[] =
    form.method === "jp3"
      ? form.sex === "male"
        ? ["foldChest", "foldAbdominal", "foldThigh"]
        : ["foldTriceps", "foldSuprailiac", "foldThigh"]
      : form.method === "jp7"
        ? ["foldChest", "foldMidaxillary", "foldTriceps", "foldSubscapular", "foldAbdominal", "foldSuprailiac", "foldThigh"]
        : ["foldBiceps", "foldTriceps", "foldSubscapular", "foldSuprailiac"];
  const sum = sites.reduce((total, key) => total + Number(form[key] || 0), 0);
  let density = 0;
  if (sum > 0 && form.age > 0) {
    if (form.method === "jp3") density = form.sex === "male" ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * form.age : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * form.age;
    else if (form.method === "jp7") density = form.sex === "male" ? 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * form.age : 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * form.age;
    else { const [constant, slope] = durninCoefficients(form.sex, form.age); density = constant - slope * Math.log10(sum); }
  }
  const bodyFat = density > 0 ? Math.max(0, 495 / density - 450) : 0;
  const bmi = form.weight > 0 && form.height > 0 ? form.weight / (form.height / 100) ** 2 : 0;
  const fatMass = bodyFat && form.weight ? (bodyFat / 100) * form.weight : 0;
  const leanMass = form.weight && fatMass ? form.weight - fatMass : 0;
  const complete = sites.every((key) => Number(form[key]) > 0) && form.age > 0 && form.weight > 0 && form.height > 0;
  function applyCalculation() { if (!complete) return; setForm((current) => ({ ...current, bodyFat: Number(bodyFat.toFixed(1)), muscleMass: Number(leanMass.toFixed(1)) })); }
  return <section className="fat-calculator"><div className="calculator-note"><strong>Como fazer a avaliação</strong><span>Escolha o protocolo, confirme sexo e idade e meça cada dobra três vezes com adipômetro calibrado. Registre a média em milímetros.</span></div><div className="method-selector"><button className={form.method === "jp3" ? "active" : ""} onClick={() => setForm({ ...form, method: "jp3" })}><strong>Jackson–Pollock 3 dobras</strong><small>Mais rápido • pontos variam conforme o sexo</small></button><button className={form.method === "jp7" ? "active" : ""} onClick={() => setForm({ ...form, method: "jp7" })}><strong>Jackson–Pollock 7 dobras</strong><small>Mais completo • sete pontos corporais</small></button><button className={form.method === "dw" ? "active" : ""} onClick={() => setForm({ ...form, method: "dw" })}><strong>Durnin–Womersley</strong><small>Quatro dobras • coeficiente por idade</small></button></div><div className="calculator-person"><div className="person-data"><label>Sexo<select value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value as "male" | "female" })}><option value="female">Mulher</option><option value="male">Homem</option></select></label><label>Idade<input type="number" min="16" max="100" value={form.age || ""} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })}/></label><label>Peso corporal<input type="number" min="0" step="0.1" value={form.weight || ""} onChange={(event) => setForm({ ...form, weight: Number(event.target.value) })}/></label><label>Altura<input type="number" min="0" step="0.1" value={form.height || ""} onChange={(event) => setForm({ ...form, height: Number(event.target.value) })}/></label><div className="fold-inputs">{sites.map((key) => <label key={key}>{foldInfo[key].label}<span><input type="number" min="0" step="0.1" value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })}/><small>mm</small></span></label>)}</div></div><div className="measurement-guide"><h3>Onde medir as dobras</h3><div className="body-map"><svg viewBox="0 0 200 360" role="img" aria-label="Mapa anatômico dos pontos de medição"><defs><linearGradient id="skinTone" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d9b49c"/><stop offset="1" stopColor="#ae806b"/></linearGradient></defs><ellipse cx="100" cy="38" rx="25" ry="29" fill="url(#skinTone)"/><path d="M72 72 Q100 58 128 72 L142 170 Q124 196 118 218 L128 334 Q113 346 101 334 L96 224 L91 334 Q76 345 65 332 L77 218 Q68 192 57 170Z" fill="url(#skinTone)"/><path d="M67 82 Q48 91 42 126 L28 204 Q35 216 45 207 L65 139" fill="none" stroke="#bd9079" strokeWidth="18" strokeLinecap="round"/><path d="M133 82 Q152 91 158 126 L172 204 Q165 216 155 207 L135 139" fill="none" stroke="#bd9079" strokeWidth="18" strokeLinecap="round"/>{sites.map((key) => <g key={key}><circle cx={foldInfo[key].x * 2} cy={foldInfo[key].y * 3.4} r="7" fill="#39c765" stroke="white" strokeWidth="4"/><text x={foldInfo[key].x * 2 + (foldInfo[key].x > 60 ? -8 : 9)} y={foldInfo[key].y * 3.4 - 10} textAnchor={foldInfo[key].x > 60 ? "end" : "start"} fontSize="10" fontWeight="700" fill="#157f38">{foldInfo[key].label}</text></g>)}</svg></div><ul>{sites.map((key) => <li key={key}><strong>{foldInfo[key].label}:</strong> {foldInfo[key].instruction}</li>)}</ul></div></div><div className="calculation-results"><article><span>IMC automático</span><strong>{bmi ? bmi.toFixed(1) : "—"}</strong></article><article><span>Soma das dobras</span><strong>{sum ? `${sum.toFixed(1)} mm` : "—"}</strong></article><article><span>Densidade corporal</span><strong>{density ? density.toFixed(4) : "—"}</strong></article><article><span>Gordura estimada</span><strong>{bodyFat ? `${bodyFat.toFixed(1)}%` : "—"}</strong></article><article><span>Massa de gordura</span><strong>{fatMass ? `${fatMass.toFixed(1)} kg` : "—"}</strong></article><article><span>Massa livre de gordura</span><strong>{leanMass ? `${leanMass.toFixed(1)} kg` : "—"}</strong></article></div><button className="primary calculator-action" disabled={!complete} onClick={applyCalculation}><Activity/> Calcular e usar resultado</button><p className="calculator-disclaimer">Estimativa antropométrica para acompanhamento profissional. A precisão depende da técnica, do adipômetro e da adequação do protocolo à pessoa avaliada.</p></section>;
}
function BodyFatProtocolTabs({
  form,
  setForm,
}: {
  form: BodyMeasurement;
  setForm: React.Dispatch<React.SetStateAction<BodyMeasurement>>;
}) {
  const methods = [
    { id: "jp7" as const, tab: "1. Jackson–Pollock 7", name: "Jackson-Pollock 7 dobras", description: "Peitoral, axilar média, tríceps, subescapular, abdominal, supra-ilíaca e coxa." },
    { id: "dw" as const, tab: "2. Durnin–Womersley", name: "Durnin-Womersley 4 dobras", description: "Bíceps, tríceps, subescapular e supra-ilíaca, com coeficientes por sexo e faixa etária." },
    { id: "jp3" as const, tab: "3. Jackson–Pollock 3", name: "Jackson-Pollock 3 dobras", description: "Homens: peitoral, abdominal e coxa. Mulheres: tríceps, supra-ilíaca e coxa." },
    { id: "jp4" as const, tab: "4. Jackson–Pollock 4", name: "Jackson-Pollock 4 dobras", description: "Abdominal, tríceps, supra-ilíaca e coxa para ambos os sexos." },
  ];
  const selected = methods.find((item) => item.id === form.method)!;
  const sites: FoldKey[] =
    form.method === "jp3"
      ? form.sex === "male"
        ? ["foldChest", "foldAbdominal", "foldThigh"]
        : ["foldTriceps", "foldSuprailiac", "foldThigh"]
      : form.method === "jp4"
        ? ["foldAbdominal", "foldTriceps", "foldSuprailiac", "foldThigh"]
        : form.method === "jp7"
          ? ["foldChest", "foldMidaxillary", "foldTriceps", "foldSubscapular", "foldAbdominal", "foldSuprailiac", "foldThigh"]
          : ["foldBiceps", "foldTriceps", "foldSubscapular", "foldSuprailiac"];
  const sum = sites.reduce((total, key) => total + Number(form[key] || 0), 0);
  let density = 0;
  if (sum > 0 && form.age > 0) {
    if (form.method === "jp3")
      density = form.sex === "male"
        ? 1.10938 - 0.0008267 * sum + 0.0000016 * sum ** 2 - 0.0002574 * form.age
        : 1.0994921 - 0.0009929 * sum + 0.0000023 * sum ** 2 - 0.0001392 * form.age;
    else if (form.method === "jp4")
      density = form.sex === "male"
        ? 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * form.age
        : 1.096095 - 0.0006952 * sum + 0.0000011 * sum ** 2 - 0.0000714 * form.age;
    else if (form.method === "jp7")
      density = form.sex === "male"
        ? 1.112 - 0.00043499 * sum + 0.00000055 * sum ** 2 - 0.00028826 * form.age
        : 1.097 - 0.00046971 * sum + 0.00000056 * sum ** 2 - 0.00012828 * form.age;
    else {
      const [constant, slope] = durninCoefficients(form.sex, form.age);
      density = constant - slope * Math.log10(sum);
    }
  }
  const bodyFat = density > 0 ? Math.max(0, 495 / density - 450) : 0;
  const bmi = form.weight > 0 && form.height > 0 ? form.weight / (form.height / 100) ** 2 : 0;
  const fatMass = bodyFat && form.weight ? (bodyFat / 100) * form.weight : 0;
  const leanMass = form.weight && fatMass ? form.weight - fatMass : 0;
  const complete = sites.every((key) => Number(form[key]) > 0) && form.age > 0 && form.weight > 0 && form.height > 0;
  function applyCalculation() {
    if (!complete) return;
    setForm((current) => {
      const withoutOldMethod = current.notes.replace(/Método utilizado:.*?(\n|$)/g, "").trim();
      return {
        ...current,
        bodyFat: Number(bodyFat.toFixed(1)),
        muscleMass: Number(leanMass.toFixed(1)),
        notes: `${withoutOldMethod}${withoutOldMethod ? "\n" : ""}Método utilizado: ${selected.name} • Conversão: Equação de Siri`,
      };
    });
  }
  return (
    <section className="fat-calculator protocol-tabs-calculator">
      <div className="calculator-note">
        <strong>Como fazer a avaliação</strong>
        <span>Escolha uma aba, confirme sexo e idade e faça de duas a três leituras por dobra. Use a média em milímetros e mantenha lado, horário, hidratação e avaliador consistentes.</span>
      </div>
      <div className="method-tabs" role="tablist" aria-label="Método de cálculo de gordura corporal">
        {methods.map((method) => (
          <button key={method.id} role="tab" aria-selected={form.method === method.id} className={form.method === method.id ? "active" : ""} onClick={() => setForm({ ...form, method: method.id })}>
            {method.tab}
          </button>
        ))}
      </div>
      <div className="active-method-summary"><strong>{selected.name}</strong><span>{selected.description}</span></div>
      <div className="calculator-person">
        <div className="person-data">
          <label>Sexo<select value={form.sex} onChange={(event) => setForm({ ...form, sex: event.target.value as "male" | "female" })}><option value="female">Mulher</option><option value="male">Homem</option></select></label>
          <label>Idade<input type="number" min="16" max="100" value={form.age || ""} onChange={(event) => setForm({ ...form, age: Number(event.target.value) })}/></label>
          <label>Peso corporal (kg)<input type="number" min="0" step="0.1" value={form.weight || ""} onChange={(event) => setForm({ ...form, weight: Number(event.target.value) })}/></label>
          <label>Altura (cm)<input type="number" min="0" step="0.1" value={form.height || ""} onChange={(event) => setForm({ ...form, height: Number(event.target.value) })}/></label>
          <div className="fold-inputs">
            {sites.map((key) => <label key={key}>{foldInfo[key].label}<span><input type="number" min="0" step="0.1" value={form[key] || ""} onChange={(event) => setForm({ ...form, [key]: Number(event.target.value) })}/><small>mm</small></span></label>)}
          </div>
        </div>
        <div className="measurement-guide">
          <h3>Onde medir as dobras</h3>
          <div className="fold-photo-grid">
            {sites.map((key) => (
              <figure className="fold-photo-card" key={key}>
                {foldImages[key] ? (
                  <img src={`${import.meta.env.BASE_URL}${foldImages[key]}`} alt={`Local de medição: ${foldInfo[key].label}`} loading="lazy" />
                ) : (
                  <div className="fold-photo-placeholder"><span>{foldInfo[key].label}</span></div>
                )}
                <figcaption><strong>{foldInfo[key].label}</strong><span>{foldInfo[key].instruction}</span></figcaption>
              </figure>
            ))}
          </div>
        </div>
      </div>
      <div className="calculation-results">
        <article><span>IMC automático</span><strong>{bmi ? bmi.toFixed(1) : "—"}</strong></article>
        <article><span>Soma das dobras</span><strong>{sum ? `${sum.toFixed(1)} mm` : "—"}</strong></article>
        {form.method === "dw" && <article><span>Log10 da soma</span><strong>{sum ? Math.log10(sum).toFixed(4) : "—"}</strong></article>}
        <article><span>Densidade corporal</span><strong>{density ? density.toFixed(4) : "—"}</strong></article>
        <article><span>Gordura estimada</span><strong>{bodyFat ? `${bodyFat.toFixed(1)}%` : "—"}</strong></article>
        <article><span>Massa de gordura</span><strong>{fatMass ? `${fatMass.toFixed(1)} kg` : "—"}</strong></article>
        <article><span>Massa livre de gordura</span><strong>{leanMass ? `${leanMass.toFixed(1)} kg` : "—"}</strong></article>
      </div>
      <button className="primary calculator-action" disabled={!complete} onClick={applyCalculation}><Activity/> Calcular e usar resultado</button>
      <p className="calculator-disclaimer">Estimativa antropométrica para acompanhamento profissional. A precisão depende da técnica, calibração do adipômetro e adequação do protocolo à pessoa avaliada.</p>
    </section>
  );
}

function protocolLabel(method: BodyMeasurement["method"]) {
  return method === "jp3"
    ? "Jackson-Pollock 3 dobras"
    : method === "jp4"
      ? "Jackson-Pollock 4 dobras"
      : method === "jp7"
        ? "Jackson-Pollock 7 dobras"
        : "Durnin-Womersley 4 dobras";
}
function methodFromProtocol(protocol?: string): BodyMeasurement["method"] {
  if (protocol?.includes("7")) return "jp7";
  if (protocol?.includes("4")) return "jp4";
  if (protocol?.includes("Durnin")) return "dw";
  return "jp3";
}
function recordToMeasurement(
  record: MeasurementRecord,
  studentId: string,
  fallbackAge: number,
  fallbackSex: BodyMeasurement["sex"],
): BodyMeasurement {
  const circumferences = record.circumferences || {};
  const folds = record.skinfolds || {};
  return {
    id: record.id || crypto.randomUUID(),
    studentId,
    date: record.date,
    weight: record.weightKg,
    height: record.heightCm || 0,
    age: fallbackAge,
    sex: fallbackSex,
    method: methodFromProtocol(record.protocol),
    bodyFat: record.bodyFatPercent || 0,
    muscleMass: record.leanMassKg || 0,
    waist: circumferences.waist || 0,
    abdomen: circumferences.abdomen || 0,
    hip: circumferences.hip || 0,
    chest: circumferences.chest || 0,
    arm: circumferences.arm || 0,
    thigh: circumferences.thigh || 0,
    calf: circumferences.calf || 0,
    foldChest: folds.chest || 0,
    foldAbdominal: folds.abdominal || 0,
    foldThigh: folds.thigh || 0,
    foldTriceps: folds.triceps || 0,
    foldBiceps: folds.biceps || 0,
    foldSubscapular: folds.subscapular || 0,
    foldSuprailiac: folds.suprailiac || 0,
    foldMidaxillary: folds.midaxillary || 0,
    notes: record.notes || "",
  };
}

function MeasurementEditor({
  student,
  academyId,
  onClose,
}: {
  student: StudentRecord;
  academyId: string;
  onClose: () => void;
}) {
  const startAge = student.birth
    ? Math.max(0, new Date().getFullYear() - new Date(student.birth + "T12:00:00").getFullYear())
    : 0;
  const [form, setForm] = useState<BodyMeasurement>(() => ({
    ...emptyMeasurement(student.id),
    age: startAge,
  }));
  const [records, setRecords] = useState<BodyMeasurement[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(true);

  async function loadRecords() {
    setLoadingRecords(true);
    try {
      const items = await listMeasurements(academyId, student.id);
      setRecords(items.map((item) => recordToMeasurement(item, student.id, form.age || startAge, form.sex)));
    } catch {
      /* mantém o histórico anterior em caso de falha temporária */
    } finally {
      setLoadingRecords(false);
    }
  }
  useEffect(() => {
    loadRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academyId, student.id]);

  const number = (key: keyof BodyMeasurement, value: string) =>
    setForm({ ...form, [key]: Number(value) });
  async function save() {
    try {
      await addMeasurement(academyId, student.id, {
        date: form.date,
        weightKg: form.weight,
        heightCm: form.height,
        bodyFatPercent: form.bodyFat,
        leanMassKg: form.muscleMass,
        protocol: protocolLabel(form.method),
        circumferences: {
          waist: form.waist,
          abdomen: form.abdomen,
          hip: form.hip,
          chest: form.chest,
          arm: form.arm,
          thigh: form.thigh,
          calf: form.calf,
        },
        skinfolds: {
          chest: form.foldChest,
          abdominal: form.foldAbdominal,
          thigh: form.foldThigh,
          triceps: form.foldTriceps,
          biceps: form.foldBiceps,
          subscapular: form.foldSubscapular,
          suprailiac: form.foldSuprailiac,
          midaxillary: form.foldMidaxillary,
        },
        notes: form.notes,
      });
      await loadRecords();
      setForm({
        ...emptyMeasurement(student.id),
        age: form.age,
        sex: form.sex,
        method: form.method,
      });
    } catch {
      alert("Não foi possível salvar a avaliação agora. Confira a conexão e tente novamente.");
    }
  }
  const groups: [string, [keyof BodyMeasurement, string, string][]][] = [
    [
      "Dados principais",
      [
        ["weight", "Peso", "kg"],
        ["height", "Altura", "cm"],
        ["bodyFat", "Gordura corporal", "%"],
        ["muscleMass", "Massa muscular", "kg"],
      ],
    ],
    [
      "Circunferências",
      [
        ["waist", "Cintura", "cm"],
        ["abdomen", "Abdômen", "cm"],
        ["hip", "Quadril", "cm"],
        ["chest", "Tórax", "cm"],
        ["arm", "Braço", "cm"],
        ["thigh", "Coxa", "cm"],
        ["calf", "Panturrilha", "cm"],
      ],
    ],
  ];
  return (
    <div className="editor-overlay">
      <section
        className="measurement-editor"
        role="dialog"
        aria-modal="true"
        aria-label="Registrar peso e medidas"
      >
        <header>
          <div>
            <p className="eyebrow">Avaliação corporal</p>
            <h2>{student.name}</h2>
            <p>Registre peso, circunferências e dobras na mesma data.</p>
          </div>
          <button aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </header>
        <label className="measurement-date">
          Data da avaliação
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        <BodyFatProtocolTabs form={form} setForm={setForm} />
        {groups.map(([title, fields]) => (
          <div className="measurement-group" key={title}>
            <h3>{title}</h3>
            <div>
              {fields.map(([key, label, unit]) => (
                <label key={key}>
                  {label}
                  <span>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={String(form[key] || "")}
                      onChange={(e) => number(key, e.target.value)}
                      placeholder="0"
                    />
                    <small>{unit}</small>
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
        <label>
          Observações
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Protocolo utilizado, condições da avaliação ou observações"
          />
        </label>
        <footer>
          <button className="secondary" onClick={onClose}>
            Fechar
          </button>
          <button
            className="primary"
            disabled={!form.weight || !form.date}
            onClick={save}
          >
            <Check /> Salvar avaliação
          </button>
        </footer>
        {loadingRecords && <p className="muted">Carregando histórico...</p>}
        {records.length > 0 && (
          <div className="measurement-mini-history">
            <h3>Registros anteriores</h3>
            {records.map((record) => (
              <button key={record.id} onClick={() => setForm(record)}>
                <strong>
                  {new Date(record.date + "T12:00:00").toLocaleDateString(
                    "pt-BR",
                  )}
                </strong>
                <span>{record.weight} kg</span>
                <span>{record.bodyFat || "—"}% gordura</span>
                <Pencil size={14} />
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function WorkoutStatus({
  student,
  onClick,
  disabled = false,
}: {
  student: StudentRecord;
  onClick: () => void;
  disabled?: boolean;
}) {
  const expired =
    student.workoutDue &&
    student.workoutDue < new Date().toISOString().slice(0, 10);
  const type = !student.workoutDue ? "create" : expired ? "expired" : "ready";
  return (
    <button
      className={`workout-status workout-${type}`}
      disabled={disabled}
      title={
        disabled
          ? "O aluno precisa preencher a ficha de saúde antes do treino."
          : ""
      }
      onClick={onClick}
    >
      {disabled
        ? "Aguardar saúde"
        : type === "create"
          ? "Criar treino"
          : type === "expired"
            ? "Treino Venc."
            : "Treino criado"}
    </button>
  );
}
function HealthDetail({
  student,
  academyId,
  onClose,
}: {
  student: StudentRecord;
  academyId: string;
  onClose: () => void;
}) {
  const [form, setFormState] = useState<HealthFormData | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const result = await getHealthForm(academyId, student.id);
        if (active) setFormState(result);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [academyId, student.id]);

  return (
    <div className="editor-overlay">
      <section
        className="health-detail"
        role="dialog"
        aria-modal="true"
        aria-label="Ficha de saúde"
      >
        <header>
          <div>
            <p className="eyebrow">Ficha de saúde</p>
            <h2>{student.name}</h2>
          </div>
          <button aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </header>
        {loading && <p className="muted">Carregando ficha...</p>}
        {!loading && !form && (
          <p className="muted">
            O aluno ainda não preencheu a ficha de saúde.
          </p>
        )}
        {!loading && form && (
          <div className="health-detail-grid">
            <article>
              <span>Objetivo principal</span>
              <strong>{student.objective}</strong>
            </article>
            <article>
              <span>Condições informadas</span>
              <strong>
                {form.conditions.length
                  ? form.conditions.join(", ")
                  : "Nenhuma condição informada."}
              </strong>
            </article>
            <article>
              <span>Medicamentos</span>
              <p>{form.medications || "Nenhum medicamento informado."}</p>
            </article>
            <article>
              <span>Cirurgias ou tratamentos</span>
              <p>{form.surgeries || "Nenhuma cirurgia informada."}</p>
            </article>
            <article>
              <span>Dores atuais</span>
              <p>{form.pain || "Nenhuma dor informada."}</p>
            </article>
            <article>
              <span>Limitações de mobilidade</span>
              <p>{form.mobility || "Nenhuma limitação informada."}</p>
            </article>
            <article>
              <span>Restrições médicas</span>
              <p>{form.restrictions || "Nenhuma restrição informada."}</p>
            </article>
            <article>
              <span>Contato de emergência</span>
              <p>
                {form.emergencyName || "Não informado"}
                {form.emergencyPhone ? ` • ${form.emergencyPhone}` : ""}
              </p>
            </article>
            <article>
              <span>Consentimento</span>
              <p>
                {form.consent
                  ? "Autorização confirmada pelo aluno."
                  : "Consentimento pendente."}
              </p>
            </article>
          </div>
        )}
        <footer>
          <button className="primary" onClick={onClose}>
            Fechar ficha
          </button>
        </footer>
      </section>
    </div>
  );
}

const defaultWorkoutTemplates: Record<string, WorkoutDayPlan[]> = {
  "Iniciante • primeiras 3 semanas • massa muscular": [
    {
      day: "Segunda",
      color: "pink",
      exercises: [
        "Supino máquina • 3×12",
        "Puxada frontal • 3×12",
        "Leg press • 3×15",
      ],
    },
    {
      day: "Terça",
      color: "green",
      exercises: [
        "Agachamento no banco • 3×12",
        "Remada baixa • 3×12",
        "Prancha • 3×30s",
      ],
    },
    {
      day: "Quarta",
      color: "pink",
      exercises: [
        "Desenvolvimento com halteres • 3×12",
        "Rosca direta • 3×12",
        "Tríceps na polia • 3×12",
      ],
    },
    {
      day: "Quinta",
      color: "yellow",
      exercises: [
        "Elevação pélvica • 3×15",
        "Cadeira extensora • 3×12",
        "Panturrilha • 3×15",
      ],
    },
    {
      day: "Sexta",
      color: "pink",
      exercises: [
        "Supino inclinado • 3×12",
        "Remada máquina • 3×12",
        "Abdominal • 3×15",
      ],
    },
  ],
  "Emagrecimento • condicionamento": [
    {
      day: "Segunda",
      color: "pink",
      exercises: [
        "Circuito funcional • 4 voltas",
        "Agachamento • 15",
        "Remada • 12",
      ],
    },
    {
      day: "Terça",
      color: "green",
      exercises: ["Caminhada intervalada • 30 min", "Mobilidade • 10 min"],
    },
    {
      day: "Quinta",
      color: "yellow",
      exercises: ["Circuito membros inferiores • 4 voltas", "Prancha • 30s"],
    },
  ],
  "Mobilidade e reabilitação": [
    {
      day: "Segunda",
      color: "pink",
      exercises: [
        "Mobilidade de ombros • 2×10",
        "Ponte • 3×12",
        "Caminhada leve • 15 min",
      ],
    },
    {
      day: "Quarta",
      color: "green",
      exercises: [
        "Mobilidade de quadril • 2×10",
        "Sentar e levantar • 3×10",
        "Respiração diafragmática",
      ],
    },
    {
      day: "Sexta",
      color: "yellow",
      exercises: [
        "Alongamentos ativos",
        "Equilíbrio assistido • 3×20s",
        "Caminhada leve • 20 min",
      ],
    },
  ],
};
function normalizeExercise(entry: WorkoutEntry): WorkoutExercisePlan {
  if (typeof entry !== "string") return entry;
  const [name, prescription = "3×12"] = entry
    .split("•")
    .map((value) => value.trim());
  const match = prescription.match(/(\d+)\s*[×x]\s*([\d\w]+)/i);
  return {
    name,
    sets: Number(match?.[1] || 3),
    reps: match?.[2] || "12",
    restSeconds: 60,
  };
}
function normalizeDays(days: WorkoutDayPlan[]): WorkoutDayPlan[] {
  return days.map((day) => ({
    ...day,
    exercises: day.exercises.map(normalizeExercise),
  }));
}
function WorkoutBuilder({
  student,
  academyId,
  onClose,
  onSave,
}: {
  student: StudentRecord;
  academyId: string;
  onClose: () => void;
  onSave: (due: string, template: string, days: WorkoutDayPlan[]) => void;
}) {
  const [customTemplates, setCustomTemplates] = useState<WorkoutTemplateRecord[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const templates = useMemo(() => {
    const merged: Record<string, WorkoutDayPlan[]> = { ...defaultWorkoutTemplates };
    customTemplates.forEach((item) => { merged[item.name] = item.days; });
    return merged;
  }, [customTemplates]);

  async function refreshTemplates() {
    setLoadingTemplates(true);
    try {
      setCustomTemplates(await listWorkoutTemplates(academyId));
    } catch {
      /* mantém os modelos padrão em caso de falha temporária */
    } finally {
      setLoadingTemplates(false);
    }
  }
  useEffect(() => {
    refreshTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [academyId]);

  const initialTemplate =
    student.workoutTemplate && templates[student.workoutTemplate]
      ? student.workoutTemplate
      : Object.keys(templates)[0];
  const [template, setTemplate] = useState(initialTemplate);
  const [due, setDue] = useState(
    student.workoutDue ||
      new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10),
  );
  const [days, setDays] = useState<WorkoutDayPlan[]>(
    normalizeDays(student.workoutDays || templates[initialTemplate]),
  );
  const [pickerDay, setPickerDay] = useState<number | null>(null);
  const [catalog, setCatalog] = useState<WgerExercise[]>([]);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  useEffect(() => {
    fetch("https://wger.de/api/v2/exerciseinfo/?limit=300&language=7")
      .then((r) => r.json())
      .then((data) =>
        setCatalog(
          data.results.filter(
            (item: WgerExercise) =>
              item.translations.length &&
              (item.images.length || item.videos.length),
          ),
        ),
      )
      .catch(() => setCatalog([]));
  }, []);
  function choose(name: string) {
    setTemplate(name);
    setDays(normalizeDays(structuredClone(templates[name])));
  }
  async function saveTemplate() {
    const name = newTemplateName.trim();
    if (!name) return;
    try {
      const existing = customTemplates.find((item) => item.name === name);
      await saveWorkoutTemplate(academyId, { id: existing?.id, name, days: structuredClone(days) });
      await refreshTemplates();
      setTemplate(name);
      setNewTemplateName("");
      setShowTemplateSave(false);
    } catch {
      alert("Não foi possível salvar o modelo agora.");
    }
  }
  async function deleteTemplate(name: string) {
    if (defaultWorkoutTemplates[name]) return;
    const existing = customTemplates.find((item) => item.name === name);
    if (!existing?.id) return;
    try {
      await removeWorkoutTemplate(academyId, existing.id);
      await refreshTemplates();
      const fallback = Object.keys(defaultWorkoutTemplates)[0];
      setTemplate(fallback);
      setDays(structuredClone(defaultWorkoutTemplates[fallback]));
    } catch {
      alert("Não foi possível excluir o modelo agora.");
    }
  }
  const customNames = Object.keys(templates).filter(
    (name) => !defaultWorkoutTemplates[name],
  );
  const [overrides, setOverrides] = useState<
    Record<string, ExerciseOverrideRecord>
  >({});
  useEffect(() => {
    listExerciseOverrides(academyId)
      .then(setOverrides)
      .catch(() => {
        /* mantém a biblioteca sem personalizações em caso de falha temporária */
      });
  }, [academyId]);
  const visibleCatalog = useMemo(
    () =>
      catalog
        .filter((item) =>
          (overrides[item.id]?.name || exerciseName(item))
            .toLowerCase()
            .includes(catalogQuery.toLowerCase()),
        )
        .slice(0, 40),
    [catalog, catalogQuery, overrides],
  );
  function updateExercise(
    dayIndex: number,
    exerciseIndex: number,
    changes: Partial<WorkoutExercisePlan>,
  ) {
    setDays(
      days.map((day, i) =>
        i === dayIndex
          ? {
              ...day,
              exercises: day.exercises.map((entry, j) =>
                j === exerciseIndex
                  ? { ...normalizeExercise(entry), ...changes }
                  : entry,
              ),
            }
          : day,
      ),
    );
  }
  function addFromCatalog(name: string) {
    if (pickerDay === null) return;
    setDays(
      days.map((day, index) =>
        index === pickerDay
          ? {
              ...day,
              exercises: [
                ...day.exercises,
                { name, sets: 3, reps: "12", restSeconds: 60 },
              ],
            }
          : day,
      ),
    );
    setPickerDay(null);
    setCatalogQuery("");
  }
  return (
    <div className="editor-overlay">
      <section
        className="workout-builder"
        role="dialog"
        aria-modal="true"
        aria-label="Montar treino"
      >
        <header>
          <div>
            <p className="eyebrow">Treino individual</p>
            <h2>{student.name}</h2>
            <p>
              {student.objective} • {student.conditions}
            </p>
          </div>
          <button aria-label="Fechar" onClick={onClose}>
            <X />
          </button>
        </header>
        <div className="builder-settings">
          <label>
            Modelo pré-configurado
            <select value={template} onChange={(e) => choose(e.target.value)}>
              {Object.keys(templates).map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Revisar este treino em
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </label>
        </div>
        <div className="template-actions">
          <button
            className="secondary"
            onClick={() => setShowTemplateSave(!showTemplateSave)}
          >
            <Plus /> Salvar semana como novo modelo
          </button>
          {customNames.length > 0 && (
            <select
              aria-label="Excluir modelo personalizado"
              defaultValue=""
              onChange={(e) => e.target.value && deleteTemplate(e.target.value)}
            >
              <option value="">Excluir modelo personalizado...</option>
              {customNames.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
        {showTemplateSave && (
          <div className="save-template">
            <input
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Nome do novo modelo"
            />
            <button className="primary" onClick={saveTemplate}>
              <Check /> Salvar modelo
            </button>
          </div>
        )}
        <div className="training-week">
          {days.map((day, dayIndex) => (
            <article className={`training-day day-${day.color}`} key={day.day}>
              <header>
                <div>
                  <strong>{day.day}</strong>
                  <select
                    aria-label={`Cor de ${day.day}`}
                    value={day.color}
                    onChange={(e) =>
                      setDays(
                        days.map((d, i) =>
                          i === dayIndex ? { ...d, color: e.target.value } : d,
                        ),
                      )
                    }
                  >
                    <option value="pink">Rosa</option>
                    <option value="green">Verde</option>
                    <option value="yellow">Amarelo</option>
                    <option value="blue">Azul</option>
                    <option value="purple">Roxo</option>
                    <option value="orange">Laranja</option>
                  </select>
                </div>
                <span>{day.exercises.length} exercícios</span>
              </header>
              {day.exercises.map((entry, index) => {
                const exercise = normalizeExercise(entry);
                return (
                  <div className="prescription-row" key={index}>
                    <label className="exercise-name">
                      Exercício
                      <input
                        value={exercise.name}
                        onChange={(e) =>
                          updateExercise(dayIndex, index, {
                            name: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Séries
                      <input
                        type="number"
                        min="1"
                        value={exercise.sets}
                        onChange={(e) =>
                          updateExercise(dayIndex, index, {
                            sets: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      Repetições
                      <input
                        value={exercise.reps}
                        onChange={(e) =>
                          updateExercise(dayIndex, index, {
                            reps: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      Descanso (s)
                      <input
                        type="number"
                        min="0"
                        step="5"
                        value={exercise.restSeconds}
                        onChange={(e) =>
                          updateExercise(dayIndex, index, {
                            restSeconds: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <button
                      aria-label="Remover exercício"
                      onClick={() =>
                        setDays(
                          days.map((d, i) =>
                            i === dayIndex
                              ? {
                                  ...d,
                                  exercises: d.exercises.filter(
                                    (_, j) => j !== index,
                                  ),
                                }
                              : d,
                          ),
                        )
                      }
                    >
                      <Trash2 />
                    </button>
                  </div>
                );
              })}
              <button
                className="add-line"
                onClick={() => setPickerDay(dayIndex)}
              >
                <Plus /> Adicionar da biblioteca
              </button>
            </article>
          ))}
        </div>
        <footer>
          <button className="secondary" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="primary"
            onClick={() => onSave(due, template, days)}
          >
            <Check /> Salvar e liberar treino
          </button>
        </footer>
        {pickerDay !== null && (
          <div className="exercise-picker">
            <div className="picker-head">
              <div>
                <p className="eyebrow">Biblioteca de exercícios</p>
                <h3>Adicionar em {days[pickerDay].day}</h3>
              </div>
              <button
                aria-label="Fechar biblioteca"
                onClick={() => setPickerDay(null)}
              >
                <X />
              </button>
            </div>
            <label className="admin-search">
              <Search />
              <input
                autoFocus
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Buscar exercício"
              />
            </label>
            <div className="picker-grid">
              {visibleCatalog.map((item) => {
                const original = item.images[0];
                const custom = overrides[item.id] || {};
                const name = custom.name || exerciseName(item);
                const image = custom.imageRemoved
                  ? ""
                  : custom.image ||
                    original?.thumbnails?.small ||
                    original?.image;
                return (
                  <button key={item.id} onClick={() => addFromCatalog(name)}>
                    {image ? <img src={image} alt="" /> : <Dumbbell />}
                    <span>
                      <strong>{name}</strong>
                      <small>{item.category.name}</small>
                    </span>
                    <Plus />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
