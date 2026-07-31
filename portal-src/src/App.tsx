import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, BarChart3, CalendarDays, Check, ChevronRight, CirclePause, CirclePlay, Clock3, Dumbbell, HeartPulse, LogOut, Plus, ShieldCheck, UserRound, Users, WalletCards, X } from 'lucide-react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { demoAdmin, demoStudent, workouts as initialWorkouts } from './demo'
import type { Exercise, HealthFormData, UserProfile, WorkoutDay } from './types'
import ExerciseLibrary from './ExerciseLibrary'
import AdminWorkspace from './AdminWorkspace'
import OwnerWorkspace from './OwnerWorkspace'
import { getStudent, saveHealthForm } from './database'
import { auth, db, firebaseEnabled } from './firebase'

type Screen = 'login' | 'owner' | 'admin' | 'student' | 'health' | 'workout'

const healthOptions = ['Nenhuma condição conhecida', 'Hipertensão', 'Diabetes', 'Fibromialgia', 'Problemas cardíacos', 'Problemas respiratórios', 'Lesão articular ou muscular', 'Dor persistente', 'Limitação de mobilidade', 'Gestação', 'Outra condição']
const objectives = ['Emagrecimento', 'Ganho de massa', 'Condicionamento', 'Fortalecimento', 'Mobilidade', 'Reabilitação', 'Controle de dores', 'Qualidade de vida', 'Saúde na terceira idade']

function App() {
  const [screen, setScreen] = useState<Screen>('login')
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [workouts, setWorkouts] = useState<WorkoutDay[]>(() => JSON.parse(localStorage.getItem('brothers-workouts') || 'null') || initialWorkouts)
  const [selectedDay, setSelectedDay] = useState<WorkoutDay | null>(null)
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)

  useEffect(() => localStorage.setItem('brothers-workouts', JSON.stringify(workouts)), [workouts])

  async function login(role: 'admin' | 'student', email: string, password: string) {
    if (firebaseEnabled && auth && db) {
      try {
        const credential = await signInWithEmailAndPassword(auth, email, password)
        const userSnapshot = await getDoc(doc(db, 'users', credential.user.uid))
        if (!userSnapshot.exists()) { await auth.signOut(); return 'Seu perfil ainda não foi liberado no sistema.' }
        const data = userSnapshot.data() as Partial<UserProfile>
        if (data.role !== role && data.role !== 'owner') { await auth.signOut(); return role === 'admin' ? 'Esta conta não possui acesso administrativo.' : 'Esta conta não está cadastrada como aluno.' }
        let extra: Partial<UserProfile> = {}
        if (data.role === 'student' && data.academyId) {
          const studentDoc = await getStudent(data.academyId, credential.user.uid).catch(() => null)
          if (studentDoc) extra = studentDoc
        }
        const user = { id: credential.user.uid, name: data.name || credential.user.displayName || 'Usuário', email: credential.user.email || email, healthCompleted: Boolean(data.healthCompleted), ...extra, ...data, role: data.role } as UserProfile
        setProfile(user)
        setScreen(data.role === 'owner' ? 'owner' : data.role === 'admin' ? 'admin' : user.healthCompleted ? 'student' : 'health')
        return
      } catch { return 'E-mail ou senha incorretos. Confira os dados e tente novamente.' }
    }
    // healthCompleted vem pronto em demoStudent (true) pra já cair direto no painel
    // com a ficha carregada; localStorage só entra se alguém "resetar" a demonstração
    // preenchendo a ficha de saúde de novo (fica marcado como concluído depois).
    const healthDone = localStorage.getItem('brothers-health-done')
    const user = role === 'admin' ? demoAdmin : { ...demoStudent, healthCompleted: healthDone === null ? demoStudent.healthCompleted : healthDone === 'true' }
    setProfile(user)
    setScreen(role === 'admin' ? 'admin' : user.healthCompleted ? 'student' : 'health')
  }

  function logout() { auth?.signOut(); setProfile(null); setScreen('login'); setSelectedDay(null); setSelectedExercise(null) }

  function openDay(day: WorkoutDay) { if (day.status !== 'rest') { setSelectedDay(day); setScreen('workout') } }

  function updateExercise(updated: Exercise) {
    setSelectedExercise(updated)
    setWorkouts(current => current.map(day => day.id !== selectedDay?.id ? day : { ...day, exercises: day.exercises.map(ex => ex.id === updated.id ? updated : ex) }))
    setSelectedDay(current => current ? { ...current, exercises: current.exercises.map(ex => ex.id === updated.id ? updated : ex) } : current)
  }

  if (screen === 'login') return <Login onLogin={login} />
  return <Shell profile={profile!} onLogout={logout}>
    {screen === 'owner' && <OwnerWorkspace />}
    {screen === 'admin' && <AdminDashboard academyId={profile!.academyId!} />}
    {screen === 'health' && <HealthForm profile={profile!} onComplete={async (form) => {
      if (firebaseEnabled && profile?.academyId) {
        try { await saveHealthForm(profile.academyId, profile.id, form) } catch { /* o aluno segue para o treino; o admin poderá pedir para reenviar se a ficha não aparecer */ }
      } else {
        localStorage.setItem('brothers-health-done', 'true')
      }
      setProfile(p => p ? { ...p, healthCompleted: true } : p)
      setScreen('student')
    }} />}
    {screen === 'student' && <StudentDashboard profile={profile!} workouts={workouts} onOpenDay={openDay} />}
    {screen === 'workout' && selectedDay && <WorkoutView day={selectedDay} onBack={() => { setSelectedExercise(null); setScreen('student') }} selected={selectedExercise} onSelect={setSelectedExercise} onUpdate={updateExercise} />}
  </Shell>
}

function Login({ onLogin }: { onLogin: (role: 'admin' | 'student', email: string, password: string) => Promise<string | void> }) {
  const requestedRole = new URLSearchParams(window.location.search).get('role')
  const lockedRole: 'admin' | 'student' | null = requestedRole === 'admin' ? 'admin' : requestedRole === 'student' ? 'student' : null
  const [loadingRole, setLoadingRole] = useState<'admin' | 'student' | null>(null)
  const [error, setError] = useState('')
  async function enter(role: 'admin' | 'student') { setLoadingRole(role); setError(''); const message = await onLogin(role, '', ''); if (message) { setError(message); setLoadingRole(null) } }
  useEffect(() => { if (lockedRole) enter(lockedRole) }, [lockedRole])
  return <div className="login-page">
    <div className="login-backdrop"><img className="brand-logo" src={`${import.meta.env.BASE_URL}logo-vertice.svg`} alt="Vértice"/><p>Vértice</p><h1>Seu treino.<br/><em>Sua evolução.</em></h1><span>Acompanhamento próximo em cada etapa.</span></div>
    <main className="login-card">
      <a className="login-close" href=".." aria-label="Fechar e voltar ao site"><X size={18}/></a>
      <div className="mobile-brand"><img className="brand-logo small" src={`${import.meta.env.BASE_URL}logo-vertice.svg`} alt=""/> Vértice</div><p className="eyebrow">Demonstração</p><h2>Explore o Vértice</h2><p className="muted">Escolha um lado para ver o sistema por dentro — é um protótipo, não precisa de senha.</p>
      {lockedRole
        ? <button className="primary wide big" disabled><Clock3 size={18}/> Carregando demonstração...</button>
        : <>
            <button className="primary wide big" disabled={loadingRole!==null} onClick={()=>enter('student')}>{loadingRole==='student'?'Entrando...':<><UserRound size={18}/> Entrar como aluno <ChevronRight size={18}/></>}</button>
            <button className="secondary wide big" disabled={loadingRole!==null} onClick={()=>enter('admin')}>{loadingRole==='admin'?'Entrando...':<><ShieldCheck size={18}/> Entrar como administrador <ChevronRight size={18}/></>}</button>
          </>}
      {error&&<p className="login-feedback">{error}</p>}
      <p className="demo-note">Protótipo de demonstração com dados fictícios — nada aqui é salvo de verdade.</p>
    </main>
  </div>
}

function Shell({ profile, onLogout, children }: { profile: UserProfile; onLogout: () => void; children: React.ReactNode }) {
  return <div className="app-shell"><header><div className="brand"><img className="brand-logo small" src={`${import.meta.env.BASE_URL}logo-vertice.svg`} alt="Vértice"/><div><strong>Vértice</strong><span>Gestão de alunos</span></div></div><div className="user-menu"><div><strong>{profile.name}</strong><span>{profile.role === 'owner' ? 'Dono da plataforma' : profile.role === 'admin' ? 'Administrador' : 'Aluno'}</span></div><button aria-label="Sair" onClick={onLogout}><LogOut size={19}/></button></div></header>{children}</div>
}

function AdminDashboard({ academyId }: { academyId: string }) {
  const [view,setView]=useState<'dashboard'|'library'>('dashboard')
  if(view==='library')return <ExerciseLibrary academyId={academyId} onBack={()=>setView('dashboard')}/>
  return <AdminWorkspace academyId={academyId} onOpenLibrary={()=>setView('library')}/>
}

function Stat({ icon,label,value,info }: {icon:React.ReactNode;label:string;value:string;info:string}) { return <article className="stat"><div className="stat-icon">{icon}</div><span>{label}</span><strong>{value}</strong><small>{info}</small></article> }
function Quick({icon,title,text,onClick}:{icon:React.ReactNode;title:string;text:string;onClick?:()=>void}) { return <button className="quick-row" onClick={onClick}><span>{icon}</span><div><strong>{title}</strong><small>{text}</small></div><ChevronRight size={18}/></button> }

function HealthForm({ profile, onComplete }: { profile: UserProfile; onComplete: (form: HealthFormData) => void | Promise<void> }) {
  const [step, setStep] = useState(1); const [form, setForm] = useState<HealthFormData>({ conditions: [], medications: '', surgeries: '', pain: '', mobility: '', restrictions: '', emergencyName: '', emergencyPhone: '', consent: false })
  const [saving, setSaving] = useState(false)
  const toggle = (item:string) => setForm(f => ({ ...f, conditions: f.conditions.includes(item) ? f.conditions.filter(x => x !== item) : [...f.conditions, item] }))
  async function submit() { setSaving(true); try { await onComplete(form) } finally { setSaving(false) } }
  return <main className="onboarding"><div className="onboarding-head"><p className="eyebrow">Antes do primeiro treino</p><h1>Conte-nos sobre sua saúde</h1><p>Estas informações ajudam a preparar um acompanhamento mais seguro e individualizado.</p><div className="steps"><span className={step>=1?'active':''}>1</span><i/><span className={step>=2?'active':''}>2</span><i/><span className={step>=3?'active':''}>3</span></div></div>
    <section className="form-card">{step===1&&<><h2>Condições de saúde</h2><p className="muted">Selecione todas as opções que se aplicam.</p><div className="choice-grid">{healthOptions.map(item=><button className={form.conditions.includes(item)?'selected':''} onClick={()=>toggle(item)} key={item}>{form.conditions.includes(item)&&<Check size={16}/>} {item}</button>)}</div></>}
      {step===2&&<><h2>Histórico e limitações</h2><div className="form-grid"><label>Medicamentos em uso<textarea value={form.medications} onChange={e=>setForm({...form,medications:e.target.value})}/></label><label>Cirurgias ou tratamentos anteriores<textarea value={form.surgeries} onChange={e=>setForm({...form,surgeries:e.target.value})}/></label><label>Dores atuais ou persistentes<textarea value={form.pain} onChange={e=>setForm({...form,pain:e.target.value})}/></label><label>Limitações de mobilidade<textarea value={form.mobility} onChange={e=>setForm({...form,mobility:e.target.value})}/></label><label className="full">Restrições ou recomendações médicas<textarea value={form.restrictions} onChange={e=>setForm({...form,restrictions:e.target.value})}/></label></div></>}
      {step===3&&<><h2>Contato e consentimento</h2><div className="form-grid"><label>Contato de emergência<input value={form.emergencyName} onChange={e=>setForm({...form,emergencyName:e.target.value})}/></label><label>Telefone do contato<input value={form.emergencyPhone} onChange={e=>setForm({...form,emergencyPhone:e.target.value})}/></label></div><label className="consent"><input type="checkbox" checked={form.consent} onChange={e=>setForm({...form,consent:e.target.checked})}/><span>Confirmo que as informações são verdadeiras e autorizo seu uso para planejamento e acompanhamento das atividades físicas. Entendo que o exercício não substitui diagnóstico ou tratamento médico.</span></label><div className="privacy"><ShieldCheck/><p><strong>Seus dados são protegidos.</strong><br/>Somente o administrador autorizado poderá consultar estas informações.</p></div></>}
      <div className="form-actions">{step>1?<button className="secondary" onClick={()=>setStep(step-1)}><ArrowLeft size={17}/> Voltar</button>:<span/>}{step<3?<button className="primary" onClick={()=>setStep(step+1)}>Continuar <ChevronRight size={17}/></button>:<button className="primary" disabled={!form.consent||saving} onClick={submit}>{saving?'Enviando...':<>Concluir e acessar meus treinos <Check size={17}/></>}</button>}</div>
    </section><p className="fine-print">Aluno: {profile.name} • Você poderá atualizar estes dados posteriormente.</p>
  </main>
}

function StudentDashboard({ profile, workouts, onOpenDay }: { profile: UserProfile; workouts: WorkoutDay[]; onOpenDay:(d:WorkoutDay)=>void }) {
  const [historyOpen,setHistoryOpen]=useState(false);return <main className="page student-page"><section className="welcome"><div><p className="eyebrow">Sua semana</p><h1>Olá, {profile.name.split(' ')[0]}</h1><p>Um treino de cada vez. Sua evolução acontece aqui.</p></div><div className="plan-card"><span>Plano atual</span><strong>{profile.plan}</strong><small>Vencimento em {profile.dueDate?new Date(profile.dueDate+'T12:00:00').toLocaleDateString('pt-BR'):'—'}</small></div></section>
    <section><div className="section-title"><div><h2>Treinos da semana</h2><p>Escolha o dia para visualizar sua ficha.</p></div><span className="week-progress">3 treinos programados</span></div><div className="day-grid">{workouts.map(day=><button key={day.id} onClick={()=>onOpenDay(day)} className={`day-card ${day.status}`}><div className="day-top"><span>{day.weekday.slice(0,3)}</span>{day.status==='rest'?<Clock3/>:<Dumbbell/>}</div><h3>{day.title}</h3><p>{day.status==='rest'?'Recupere-se para o próximo treino':`${day.exercises.length || 1} atividades`}</p>{day.status!=='rest'&&<div className="mini-progress"><i style={{width:`${dayProgress(day)}%`}}/></div>}<small>{day.status==='rest'?'Dia de descanso':`${dayProgress(day)}% concluído`}</small></button>)}</div></section>
    <section className="student-summary"><article><BarChart3/><div><span>Último peso</span><strong>72,4 kg</strong><small>-1,2 kg desde o início</small></div></article><article><Activity/><div><span>Gordura estimada</span><strong>27,8%</strong><small>Última avaliação: 12/07</small></div></article><article><HeartPulse/><div><span>Objetivos</span><strong>{profile.objective||profile.objectives?.join(' • ')||'Acompanhamento individual'}</strong><small>Evolução acompanhada</small></div></article></section><button className="history-access" onClick={()=>setHistoryOpen(true)}><BarChart3/> <span><strong>Acesse seu histórico</strong><small>Veja peso, medidas, composição corporal e gráficos de evolução</small></span><ChevronRight/></button>{historyOpen&&<BodyHistory onClose={()=>setHistoryOpen(false)}/>} 
  </main>
}

const demoBodyHistory=[{date:'10/04',fullDate:'2026-04-10',weight:75.1,bodyFat:30.2,muscle:48.8,waist:86,abdomen:92,hip:104,chest:94,arm:31,thigh:59,calf:37,folds:148},{date:'12/05',fullDate:'2026-05-12',weight:74.3,bodyFat:29.3,muscle:49.2,waist:84,abdomen:90,hip:103,chest:94,arm:31.5,thigh:58.5,calf:37,folds:141},{date:'14/06',fullDate:'2026-06-14',weight:73.2,bodyFat:28.5,muscle:49.7,waist:82,abdomen:88,hip:102,chest:95,arm:32,thigh:58,calf:37.5,folds:135},{date:'12/07',fullDate:'2026-07-12',weight:72.4,bodyFat:27.8,muscle:50.1,waist:80,abdomen:86,hip:101,chest:95,arm:32.5,thigh:57.5,calf:37.5,folds:129}]
function BodyHistory({onClose}:{onClose:()=>void}){const [metric,setMetric]=useState<'weight'|'bodyFat'|'muscle'>('weight');const labels={weight:'Peso (kg)',bodyFat:'Gordura (%)',muscle:'Massa muscular (kg)'};return <div className="editor-overlay"><section className="body-history" role="dialog" aria-modal="true" aria-label="Histórico de evolução corporal"><header><div><p className="eyebrow">Sua evolução</p><h2>Histórico corporal</h2><p>Acompanhe cada avaliação e compare seu progresso.</p></div><button aria-label="Fechar" onClick={onClose}><X/></button></header><div className="history-metric-switch">{(['weight','bodyFat','muscle'] as const).map(item=><button className={metric===item?'active':''} onClick={()=>setMetric(item)} key={item}>{labels[item]}</button>)}</div><div className="history-chart"><ResponsiveContainer width="100%" height={260}><LineChart data={demoBodyHistory} margin={{top:10,right:18,left:-18,bottom:0}}><CartesianGrid strokeDasharray="3 3" stroke="#e3e7df"/><XAxis dataKey="date"/><YAxis domain={['dataMin - 2','dataMax + 2']}/><Tooltip/><Legend/><Line type="monotone" dataKey={metric} name={labels[metric]} stroke="#b76337" strokeWidth={3} dot={{r:5,fill:'#FF4E1B'}}/></LineChart></ResponsiveContainer></div><div className="history-table"><div className="history-table-head"><span>Data</span><span>Peso</span><span>Gordura</span><span>Massa muscular</span><span>Cintura</span><span>Abdômen</span><span>Quadril</span><span>Dobras</span></div>{[...demoBodyHistory].reverse().map(item=><div key={item.fullDate}><strong>{new Date(item.fullDate+'T12:00:00').toLocaleDateString('pt-BR')}</strong><span>{item.weight} kg</span><span>{item.bodyFat}%</span><span>{item.muscle} kg</span><span>{item.waist} cm</span><span>{item.abdomen} cm</span><span>{item.hip} cm</span><span>{item.folds} mm</span></div>)}</div><details className="all-measures"><summary>Ver todas as medidas da última avaliação</summary><div><span>Tórax <strong>95 cm</strong></span><span>Braço <strong>32,5 cm</strong></span><span>Coxa <strong>57,5 cm</strong></span><span>Panturrilha <strong>37,5 cm</strong></span><span>Soma das 7 dobras <strong>129 mm</strong></span><span>IMC estimado <strong>26,6</strong></span></div></details></section></div>}

function dayProgress(day:WorkoutDay) { if(!day.exercises.length) return 0; return Math.round(day.exercises.filter(e=>e.completedSets>=e.sets).length/day.exercises.length*100) }

function WorkoutView({ day, onBack, selected, onSelect, onUpdate }:{day:WorkoutDay;onBack:()=>void;selected:Exercise|null;onSelect:(e:Exercise|null)=>void;onUpdate:(e:Exercise)=>void}) {
  const sorted=[...day.exercises].sort((a,b)=>Number(a.completedSets>=a.sets)-Number(b.completedSets>=b.sets))
  if(selected) return <ExercisePlayer exercise={selected} onClose={()=>onSelect(null)} onUpdate={onUpdate}/>
  const progress=dayProgress(day)
  return <main className="page workout-page"><button className="back" onClick={onBack}><ArrowLeft/> Minha semana</button><div className="workout-heading"><div><p className="eyebrow">{day.weekday}</p><h1>{day.title}</h1><p>Siga a ordem sugerida ou escolha um exercício.</p></div></div><div className="workout-progress"><div className="progress-bar"><i style={{width:`${progress}%`}}/></div><strong>{progress}%</strong></div><div className="exercise-list">{sorted.map((ex,i)=><button onClick={()=>onSelect(ex)} key={ex.id} className={ex.completedSets>=ex.sets?'completed':''}><span className="exercise-number">{ex.completedSets>=ex.sets?<Check/>:String(i+1).padStart(2,'0')}</span><div className="exercise-info"><span>{ex.group}</span><h3>{ex.name}</h3><p>{ex.sets} séries × {ex.reps} repetições • {ex.suggestedWeight}</p></div><div className="set-dots">{Array.from({length:ex.sets}).map((_,j)=><i className={j<ex.completedSets?'done':''} key={j}/>)}</div><ChevronRight/></button>)}</div></main>
}

function ExercisePlayer({exercise,onClose,onUpdate}:{exercise:Exercise;onClose:()=>void;onUpdate:(e:Exercise)=>void}) {
  const [seconds,setSeconds]=useState(exercise.restSeconds); const [running,setRunning]=useState(false); const [active,setActive]=useState(false); const done=exercise.completedSets>=exercise.sets
  useEffect(()=>{ if(!running||seconds<=0)return; const id=setInterval(()=>setSeconds(s=>s-1),1000); return()=>clearInterval(id)},[running,seconds])
  useEffect(()=>{if(seconds===0)setRunning(false)},[seconds])
  function completeSet(){ const next=Math.min(exercise.sets,exercise.completedSets+1); onUpdate({...exercise,completedSets:next}); if(next<exercise.sets){setSeconds(exercise.restSeconds);setRunning(true)} }
  const isVideo=Boolean(exercise.media&&/\.(mp4|webm|mov)(\?|$)/i.test(exercise.media))
  return <div className={`exercise-player ${active?'session-active':''}`}><div className="player-media"><button className="close-player" onClick={active?()=>{setActive(false);setRunning(false)}:onClose}><X/></button>{exercise.media?(isVideo?<video src={exercise.media} autoPlay loop muted playsInline/>:<img src={exercise.media} alt={`Demonstração: ${exercise.name}`}/>):<div className="media-placeholder"><Dumbbell size={active?48:70}/><span>Foto ou vídeo demonstrativo</span></div>}</div><div className="player-content"><p className="eyebrow">{exercise.group}</p><h1>{exercise.name}</h1>{!active&&<p className="instructions">{exercise.instructions}</p>}<div className="exercise-prescription"><div><span>Séries</span><strong>{exercise.sets}</strong></div><div><span>Repetições</span><strong>{exercise.reps}</strong></div><div><span>Peso sugerido</span><strong>{exercise.suggestedWeight}</strong></div></div><div className="series-line"><div className="series-status"><span>Série atual</span><strong>{Math.min(exercise.completedSets+1,exercise.sets)} de {exercise.sets}</strong><div>{Array.from({length:exercise.sets}).map((_,i)=><i className={i<exercise.completedSets?'done':''} key={i}/>)}</div></div>{!active&&!done&&<button className="primary start-series" onClick={()=>{setActive(true);setSeconds(exercise.restSeconds)}}><CirclePlay size={18}/> Iniciar série</button>}</div>
      {active&&!done&&<div className="active-controls"><div className="timer compact-timer"><div className="timer-circle"><strong>{Math.floor(seconds/60)}:{String(seconds%60).padStart(2,'0')}</strong><span>descanso</span></div><div className="timer-controls"><button onClick={()=>setRunning(!running)}>{running?<CirclePause/>:<CirclePlay/>}{running?'Pausar':'Continuar'}</button><button onClick={()=>{setSeconds(0);setRunning(false)}}>Pular</button></div></div><button className="primary finish-set" disabled={running} onClick={completeSet}><Check/> Concluir série</button></div>}
      {done&&<div className="done-message"><Check/><div><strong>Exercício concluído!</strong><span>Ótimo trabalho. Siga para o próximo exercício.</span></div><button className="primary" onClick={onClose}>Voltar à lista</button></div>}
    </div></div>
}

export default App
