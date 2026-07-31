import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, ArrowLeft, Image as ImageIcon, Pencil, Plus, RefreshCw, Save, Search, Trash2, Upload, Video, X } from 'lucide-react'
import { listExerciseOverrides, saveExerciseOverride, uploadExerciseMedia } from './database'

type Translation={name:string;description_source:string;language:number}
type Media={image?:string;thumbnails?:{small?:string;medium?:string};video?:string}
export type WgerExercise={id:number;category:{name:string};equipment:{name:string}[];muscles:{name_en:string;name:string}[];translations:Translation[];images:Media[];videos:Media[];license:{short_name:string;url:string};license_author:string}
type ExerciseOverride={name?:string;image?:string;video?:string;imageRemoved?:boolean}

/* ── Dataset PT (protótipo interno) ────────────────────────────────────────
   1.324 exercícios traduzidos do repositório hasaneyldrm/exercises-dataset.
   O texto (nomes, instruções) é MIT — livre. As mídias (imagem/gif) são
   © Gym visual e foram incluídas naquele repositório com permissão pessoal
   do autor original; essa permissão NÃO se estende a este projeto. Por isso
   essa fonte fica atrás de uma flag desligada por padrão — nunca habilitar
   num deploy que atenda cliente real sem antes obter licença própria da
   Gym visual (https://gymvisual.com/content/3-terms-and-conditions-of-use).
   ───────────────────────────────────────────────────────────────────────── */
const ptProtoEnabled=import.meta.env.VITE_ENABLE_EXERCISES_PT_PROTO==='true'
export type PtExercise={id:string;name_pt:string;name_en:string;category_pt:string;equipment_pt:string;target_pt:string;muscle_group_pt:string;secondary_muscles_pt:string[];instructions_pt:string;image:string;gif_url:string;attribution:string}

const categoryNames:Record<string,string>={Abs:'Abdômen',Arms:'Braços',Back:'Costas',Calves:'Panturrilhas',Cardio:'Cardio',Chest:'Peitoral',Legs:'Pernas',Shoulders:'Ombros'}
const essentialTerms=['agachamento','squat','supino','bench press','leg press','deadlift','levantamento terra','puxada','pulldown','remada','row','shoulder press','desenvolvimento','rosca','curl','tricep','prancha','plank','abdominal','crunch','afundo','lunge','panturrilha','calf','hip thrust','glute bridge','flexão','push-up']

function translated(exercise:WgerExercise){return exercise.translations.find(item=>item.language===7)||exercise.translations.find(item=>item.language===2)||exercise.translations[0]}
const exactTranslations:Record<string,string>={
  'hyper extensions':'Hiperextensão lombar','hyperextensions':'Hiperextensão lombar','box squat':'Agachamento no banco','slow squat':'Agachamento lento','dumbbell front squat':'Agachamento frontal com halteres','dumbbell side squat':'Agachamento lateral com halteres','dumbbell romanian deadlift':'Levantamento terra romeno com halteres','dumbbell sumo deadlift':'Levantamento terra sumô com halteres','incline bench press - mp':'Supino inclinado','bulgarian split squats esquerda':'Agachamento búlgaro — perna esquerda','remo maquina agarre estrecho supino':'Remada na máquina com pegada fechada supinada','marching high knees':'Marcha com joelhos elevados','single-arm dumbbell shoulder press':'Desenvolvimento unilateral com halter','single arm plank to row':'Prancha com remada unilateral','curl de muñeca con barra':'Rosca de punho com barra','tricep pushdown on cable':'Tríceps na polia','incline bench reverse fly':'Crucifixo inverso no banco inclinado','biceps with trx':'Rosca de bíceps no TRX','kettlebell swing':'Balanço com kettlebell','hip thrust':'Elevação pélvica','back extensión':'Extensão lombar','barbell ab rollout':'Abdominal com barra','barbell clean and press':'Levantamento e desenvolvimento com barra','push-ups | decline':'Flexão de braços declinada'
}
const wordTranslations:[RegExp,string][]=[[/\bdumbbell\b/gi,'halter'],[/\bbarbell\b/gi,'barra'],[/\bbench press\b/gi,'supino'],[/\bshoulder press\b/gi,'desenvolvimento de ombros'],[/\bdeadlift\b/gi,'levantamento terra'],[/\bsquat\b/gi,'agachamento'],[/\brow\b/gi,'remada'],[/\bpulldown\b/gi,'puxada'],[/\bpush[- ]?ups?\b/gi,'flexão de braços'],[/\bcalf\b/gi,'panturrilha'],[/\btriceps?\b/gi,'tríceps'],[/\bbiceps?\b/gi,'bíceps'],[/\bleft\b/gi,'esquerdo'],[/\bright\b/gi,'direito'],[/\bincline\b/gi,'inclinado'],[/\bseated\b/gi,'sentado'],[/\bstanding\b/gi,'em pé'],[/\bmachine\b/gi,'máquina']]
export function exerciseName(exercise:WgerExercise){const pt=exercise.translations.find(item=>item.language===7);if(pt)return pt.name;const original=translated(exercise)?.name||'Exercício';const exact=exactTranslations[original.toLowerCase().trim()];if(exact)return exact;return wordTranslations.reduce((name,[pattern,value])=>name.replace(pattern,value),original)}

export default function ExerciseLibrary({academyId,onBack}:{academyId:string;onBack:()=>void}){
  const [source,setSource]=useState<'wger'|'pt'>('wger')
  const [ptItems,setPtItems]=useState<PtExercise[]>([]); const [ptLoading,setPtLoading]=useState(false)
  useEffect(()=>{
    if(source!=='pt'||ptItems.length||!ptProtoEnabled)return
    setPtLoading(true)
    // import dinâmico: o JSON (2MB) só entra no bundle se essa fonte for realmente aberta
    import('./data/exercises-pt.json').then(mod=>{setPtItems(mod.default as unknown as PtExercise[]);setPtLoading(false)})
  },[source,ptItems.length])

  const [items,setItems]=useState<WgerExercise[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(''); const [query,setQuery]=useState(''); const [category,setCategory]=useState('Todos')
  const [overrides,setOverrides]=useState<Record<number,ExerciseOverride>>({}); const [editing,setEditing]=useState<WgerExercise|null>(null)
  async function load(){setLoading(true);setError('');try{
    // limit=900 cobre o catálogo inteiro do wger (828 exercícios em 31/07/2026) — com 300
    // o app só via 116 dos 281 exercícios que realmente têm foto/vídeo, porque o corte batia
    // no meio da lista (ordenada por id) antes de chegar em boa parte dos que têm mídia.
    const response=await fetch('https://wger.de/api/v2/exerciseinfo/?limit=900&language=7');if(!response.ok)throw new Error();const data=await response.json();const exercises=data.results.filter((item:WgerExercise)=>item.translations.length&&(item.images.length||item.videos.length));exercises.sort((a:WgerExercise,b:WgerExercise)=>{const aName=exerciseName(a).toLowerCase();const bName=exerciseName(b).toLowerCase();const aRank=essentialTerms.findIndex(term=>aName.includes(term));const bRank=essentialTerms.findIndex(term=>bName.includes(term));return(aRank<0?999:aRank)-(bRank<0?999:bRank)||aName.localeCompare(bName,'pt-BR')});setItems(exercises)}catch{setError('Não foi possível atualizar agora. Verifique a conexão e tente novamente.')}finally{setLoading(false)}}
  async function loadOverrides(){try{const stored=await listExerciseOverrides(academyId);const next:Record<number,ExerciseOverride>={};Object.entries(stored).forEach(([id,value])=>{next[Number(id)]=value});setOverrides(next)}catch{/* mantém personalizações anteriores em caso de falha temporária */}}
  useEffect(()=>{load();loadOverrides()},[academyId])
  const categories=useMemo(()=>['Todos',...Array.from(new Set(items.map(item=>categoryNames[item.category.name]||item.category.name))).sort()],[items])
  const visible=useMemo(()=>items.filter(item=>{const cat=categoryNames[item.category.name]||item.category.name;const name=overrides[item.id]?.name||exerciseName(item);return(category==='Todos'||cat===category)&&(`${name} ${cat} ${item.equipment.map(e=>e.name).join(' ')}`.toLowerCase().includes(query.toLowerCase()))}).slice(0,60),[items,query,category,overrides])

  const ptCategories=useMemo(()=>['Todos',...Array.from(new Set(ptItems.map(item=>item.category_pt))).sort()],[ptItems])
  const ptVisible=useMemo(()=>ptItems.filter(item=>(category==='Todos'||item.category_pt===category)&&(`${item.name_pt} ${item.category_pt} ${item.equipment_pt}`.toLowerCase().includes(query.toLowerCase()))).slice(0,60),[ptItems,query,category])
  function switchSource(next:'wger'|'pt'){setSource(next);setCategory('Todos');setQuery('')}
  async function saveOverride(id:number,data:ExerciseOverride){
    try{
      await saveExerciseOverride(academyId,id,data)
      setOverrides(current=>({...current,[id]:data}))
      setEditing(null)
    }catch{
      alert('Não foi possível salvar a personalização agora. Confira a conexão e tente novamente.')
    }
  }
  return <main className="page library-page"><button className="back" onClick={onBack}><ArrowLeft/> Painel administrativo</button><div className="library-heading"><div><p className="eyebrow">Biblioteca integrada</p><h1>Exercícios</h1><p className="muted">{source==='wger'?'Conteúdo técnico com imagens e vídeos fornecido pelo projeto aberto wger.':'Dataset traduzido para português — protótipo interno, 1.324 exercícios.'}</p></div>{source==='wger'&&<button className="primary"><Plus size={18}/> Novo exercício</button>}</div>

    {ptProtoEnabled&&<div className="category-filter" role="tablist" aria-label="Fonte dos exercícios" style={{marginBottom:'0.75rem'}}>
      <button className={source==='wger'?'active':''} onClick={()=>switchSource('wger')}>wger (ao vivo)</button>
      <button className={source==='pt'?'active':''} onClick={()=>switchSource('pt')}>Dataset PT (protótipo)</button>
    </div>}

    {source==='pt'&&<div className="library-state" style={{alignItems:'flex-start',gap:'0.6rem'}}>
      <AlertTriangle size={18}/>
      <span>Protótipo interno: texto livre (MIT), mas as imagens/GIFs são © Gym visual e <strong>não têm licença para uso com clientes reais</strong> — só para demonstração. Ver <code>portal-src/README.md</code>.</span>
    </div>}

    <div className="library-toolbar"><label className="library-search"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar exercício, músculo ou equipamento"/></label>{source==='wger'&&<button className="secondary" onClick={load}><RefreshCw size={17}/> Atualizar</button>}</div>

    {source==='wger'?<>
      <div className="category-filter">{categories.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div>
      {loading&&<div className="library-state"><RefreshCw className="spin"/> Carregando exercícios...</div>}{error&&<div className="library-state error">{error}<button className="secondary" onClick={load}>Tentar novamente</button></div>}
      {!loading&&!error&&<><p className="library-count"><strong>{visible.length}</strong> exercícios exibidos de {items.length} disponíveis com mídia</p><section className="exercise-library-grid">{visible.map(item=>{const originalImage=item.images.find(media=>media.image)||item.images[0];const custom=overrides[item.id]||{};const image=custom.imageRemoved?'':custom.image||(originalImage?.thumbnails?.medium||originalImage?.image);const video=custom.video||item.videos[0]?.video;const name=custom.name||exerciseName(item);return <article className="library-card" key={item.id}><div className="library-media">{image?<img src={image} alt={name} loading="lazy"/>:<div className="no-media"><ImageIcon/><span>Sem foto</span></div>}<span>{video?<><Video size={14}/> Vídeo</>:image?<><ImageIcon size={14}/> Foto</>:<>Sem mídia</>}</span></div><div className="library-card-body"><small>{categoryNames[item.category.name]||item.category.name}</small><h3>{name}</h3><p>{item.muscles.map(m=>m.name_en||m.name).filter(Boolean).join(' • ')||item.equipment.map(e=>e.name).join(' • ')}</p><div className="library-card-actions"><button className="secondary" onClick={()=>setEditing(item)}><Pencil size={15}/> Editar</button><button className="secondary">Adicionar <Plus size={15}/></button></div></div></article>})}</section></>}
      <footer className="library-license">Dados e mídias: <a href="https://wger.de" target="_blank" rel="noreferrer">wger Workout Manager</a> • Licenças Creative Commons informadas em cada registro.</footer>
    </>:<>
      <div className="category-filter">{ptCategories.map(item=><button key={item} className={category===item?'active':''} onClick={()=>setCategory(item)}>{item}</button>)}</div>
      {ptLoading&&<div className="library-state"><RefreshCw className="spin"/> Carregando dataset...</div>}
      {!ptLoading&&<><p className="library-count"><strong>{ptVisible.length}</strong> exercícios exibidos de {ptItems.length} no dataset</p><section className="exercise-library-grid">{ptVisible.map(item=><article className="library-card" key={item.id}><div className="library-media"><img src={`/exercises-pt/${item.gif_url}`} alt={item.name_pt} loading="lazy"/><span><Video size={14}/> GIF</span></div><div className="library-card-body"><small>{item.category_pt}</small><h3>{item.name_pt}</h3><p>{[item.target_pt,...item.secondary_muscles_pt].filter(Boolean).join(' • ')||item.equipment_pt}</p><p className="muted" style={{fontSize:'0.8rem'}}>{item.attribution}</p></div></article>)}</section></>}
      <footer className="library-license">Texto: MIT (hasaneyldrm/exercises-dataset) • Mídia: © Gym visual — protótipo interno, sem licença para produção.</footer>
    </>}
    {editing&&<ExerciseEditor academyId={academyId} exercise={editing} current={overrides[editing.id]||{}} onClose={()=>setEditing(null)} onSave={data=>saveOverride(editing.id,data)}/>}
  </main>
}

function ExerciseEditor({academyId,exercise,current,onClose,onSave}:{academyId:string;exercise:WgerExercise;current:ExerciseOverride;onClose:()=>void;onSave:(data:ExerciseOverride)=>void|Promise<void>}){
  const originalImage=exercise.images.find(media=>media.image)||exercise.images[0]; const originalVideo=exercise.videos[0]?.video; const originalName=exerciseName(exercise)
  const [form,setForm]=useState<ExerciseOverride>({name:current.name||originalName,image:current.image||(current.imageRemoved?'':originalImage?.image),video:current.video||originalVideo||'',imageRemoved:current.imageRemoved||false})
  const [uploading,setUploading]=useState<'image'|'video'|null>(null)
  const [uploadError,setUploadError]=useState('')
  const [saving,setSaving]=useState(false)
  async function upload(file:File|undefined,kind:'image'|'video'){
    if(!file)return
    setUploading(kind); setUploadError('')
    try{
      const url=await uploadExerciseMedia(academyId,file,kind)
      setForm(value=>({...value,[kind]:url,...(kind==='image'?{imageRemoved:false}:{})}))
    }catch(error){
      setUploadError(error instanceof Error ? error.message : 'Não foi possível enviar o arquivo agora.')
    }finally{
      setUploading(null)
    }
  }
  return <div className="editor-overlay" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><section className="exercise-editor" role="dialog" aria-modal="true" aria-label="Editar exercício"><header><div><p className="eyebrow">Personalização</p><h2>Editar exercício</h2></div><button aria-label="Fechar" onClick={onClose}><X/></button></header><div className="editor-preview">{form.video?<video src={form.video} controls poster={form.image}/>:form.image?<img src={form.image} alt="Prévia"/>:<div className="no-media"><ImageIcon size={38}/><span>Sem mídia</span></div>}</div><label>Nome do exercício<input value={form.name||''} onChange={e=>setForm({...form,name:e.target.value})}/></label><div className="editor-grid"><label>Endereço da foto<input value={form.image||''} onChange={e=>setForm({...form,image:e.target.value,imageRemoved:false})} placeholder="https://..."/></label><label>Endereço do vídeo<input value={form.video||''} onChange={e=>setForm({...form,video:e.target.value})} placeholder="https://..."/></label></div>{uploadError&&<p className="login-feedback">{uploadError}</p>}<div className="upload-actions"><label className="secondary upload-button">{uploading==='image'?<RefreshCw size={17} className="spin"/>:<Upload size={17}/>} {uploading==='image'?'Enviando...':'Nova foto'}<input hidden type="file" accept="image/*" disabled={Boolean(uploading)} onChange={e=>upload(e.target.files?.[0],'image')}/></label><label className="secondary upload-button">{uploading==='video'?<RefreshCw size={17} className="spin"/>:<Upload size={17}/>} {uploading==='video'?'Enviando...':'Novo vídeo'}<input hidden type="file" accept="video/*" disabled={Boolean(uploading)} onChange={e=>upload(e.target.files?.[0],'video')}/></label><button className="danger-button" onClick={()=>setForm({...form,image:'',imageRemoved:true})}><Trash2 size={17}/> Excluir foto</button>{form.video&&<button className="danger-button" onClick={()=>setForm({...form,video:''})}><Trash2 size={17}/> Excluir vídeo</button>}</div><footer><button className="secondary" onClick={onClose}>Cancelar</button><button className="primary" disabled={!form.name?.trim()||saving||Boolean(uploading)} onClick={async()=>{setSaving(true);try{await onSave(form)}finally{setSaving(false)}}}><Save size={17}/> {saving?'Salvando...':'Salvar alterações'}</button></footer></section></div>
}
