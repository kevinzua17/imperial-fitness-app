import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Dumbbell, Filter, ImageOff, Pencil, Save, Search, UploadCloud, X } from 'lucide-react';
import { ClientProfile } from '../data/mockData';
import { EXERCISE_CATALOG, ExerciseCatalogItem, ExerciseMovement, ExerciseSegment, mergeExerciseCatalog } from '../data/exerciseCatalog';
import { IMPERIAL_GYM_EQUIPMENT } from '../data/gymEquipment';
import { createExerciseInApi, listExercisesFromApi, updateExerciseInApi, uploadExerciseImageToApi } from '../services/exerciseService';
import { loadOpenExerciseDbItems, openExerciseDbSourceLabel } from '../services/openExerciseDbService';
import { ExerciseImage } from './ExerciseImage';
import { getExerciseMedia, hasTrueMotion, mediaKindLabel } from '../data/exerciseMedia';

interface ExerciseLibraryViewProps {
  currentUser: ClientProfile;
}

const segmentLabels: Record<ExerciseSegment, string> = {
  superior: 'Tren superior',
  inferior: 'Tren inferior',
  core: 'Core / abdomen',
  cardio: 'Cardio',
  full_body: 'Full body',
};

const movementOptions: { value: ExerciseMovement; label: string }[] = [
  { value: 'push', label: 'Empuje / Push' },
  { value: 'pull', label: 'Tracción / Pull' },
  { value: 'legs', label: 'Pierna dominante' },
  { value: 'hinge', label: 'Bisagra / posterior' },
  { value: 'isolation', label: 'Aislamiento' },
  { value: 'core', label: 'Core' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'full_body', label: 'Full body' },
];

const muscleQuickFilters = [
  { key: 'pecho', label: 'Pecho', icon: '◓', side: 'front' },
  { key: 'hombros', label: 'Hombros', icon: '⬡', side: 'front' },
  { key: 'biceps', label: 'Bíceps', icon: '◖', side: 'front' },
  { key: 'triceps', label: 'Tríceps', icon: '◗', side: 'back' },
  { key: 'antebrazos', label: 'Antebrazos', icon: '╱', side: 'front' },
  { key: 'abdomen', label: 'Abdomen', icon: '▦', side: 'front' },
  { key: 'oblicuos', label: 'Oblicuos', icon: '◩', side: 'front' },
  { key: 'espalda', label: 'Espalda', icon: '▽', side: 'back' },
  { key: 'gluteos', label: 'Glúteos', icon: '◒', side: 'back' },
  { key: 'cuadriceps', label: 'Cuádriceps', icon: '▮', side: 'front' },
  { key: 'isquiotibiales', label: 'Isquiotibiales', icon: '▯', side: 'back' },
  { key: 'aductores', label: 'Aductores', icon: '⋀', side: 'front' },
  { key: 'pantorrillas', label: 'Pantorrillas', icon: '⌇', side: 'back' },
] as const;

const normalizeMuscle = (value: string) => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');


type BodyMapSide = 'front' | 'back';

interface MuscleBodyMapProps {
  side: BodyMapSide;
  selectedMuscle: string;
  onSelect: (muscle: string) => void;
}

const MuscleBodyMap: React.FC<MuscleBodyMapProps> = ({ side, selectedMuscle, onSelect }) => {
  const selected = normalizeMuscle(selectedMuscle);
  const zoneClass = (muscle: string) => `cursor-pointer stroke-neutral-950 stroke-[2] transition-all outline-none ${selected === muscle ? 'fill-red-500' : 'fill-red-950/70 hover:fill-red-700 focus:fill-red-600'}`;
  const activate = (event: React.KeyboardEvent<SVGGElement>, muscle: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect(muscle);
    }
  };
  const zoneProps = (muscle: string, label: string) => ({
    role: 'button' as const,
    tabIndex: 0,
    'aria-label': `Ver ejercicios de ${label}`,
    onClick: () => onSelect(muscle),
    onKeyDown: (event: React.KeyboardEvent<SVGGElement>) => activate(event, muscle),
  });

  return (
    <div className="mx-auto w-full max-w-[260px] rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-black p-3">
      <svg viewBox="0 0 220 430" className="mx-auto h-[360px] w-full" aria-label={`Mapa muscular, vista ${side === 'front' ? 'frontal' : 'posterior'}`}>
        <title>{side === 'front' ? 'Vista frontal del cuerpo' : 'Vista posterior del cuerpo'}</title>
        <circle cx="110" cy="35" r="24" className="fill-neutral-700 stroke-neutral-950 stroke-[3]" />
        <rect x="98" y="57" width="24" height="18" rx="8" className="fill-neutral-700" />
        <path d="M72 78 Q110 62 148 78 L160 184 Q145 210 140 235 L80 235 Q75 210 60 184 Z" className="fill-neutral-800 stroke-neutral-950 stroke-[3]" />
        <path d="M80 230 L105 230 L103 405 L73 405 Q70 320 80 230Z" className="fill-neutral-800 stroke-neutral-950 stroke-[3]" />
        <path d="M115 230 L140 230 Q150 320 147 405 L117 405 Z" className="fill-neutral-800 stroke-neutral-950 stroke-[3]" />
        <path d="M62 82 L36 105 L20 225 L44 228 L72 150Z" className="fill-neutral-800 stroke-neutral-950 stroke-[3]" />
        <path d="M158 82 L184 105 L200 225 L176 228 L148 150Z" className="fill-neutral-800 stroke-neutral-950 stroke-[3]" />

        {side === 'front' ? (
          <>
            <g {...zoneProps('hombros', 'hombros')}><ellipse cx="66" cy="94" rx="21" ry="18" className={zoneClass('hombros')} /><ellipse cx="154" cy="94" rx="21" ry="18" className={zoneClass('hombros')} /><title>Hombros</title></g>
            <g {...zoneProps('pecho', 'pecho')}><path d="M78 94 Q94 82 108 94 L106 137 Q88 142 73 125Z" className={zoneClass('pecho')} /><path d="M112 94 Q126 82 142 94 L147 125 Q132 142 114 137Z" className={zoneClass('pecho')} /><title>Pecho</title></g>
            <g {...zoneProps('biceps', 'bíceps')}><ellipse cx="50" cy="145" rx="13" ry="28" className={zoneClass('biceps')} /><ellipse cx="170" cy="145" rx="13" ry="28" className={zoneClass('biceps')} /><title>Bíceps</title></g>
            <g {...zoneProps('antebrazos', 'antebrazos')}><path d="M40 172 L28 217 L46 220 L57 174Z" className={zoneClass('antebrazos')} /><path d="M180 172 L192 217 L174 220 L163 174Z" className={zoneClass('antebrazos')} /><title>Antebrazos</title></g>
            <g {...zoneProps('abdomen', 'abdomen')}><rect x="91" y="139" width="38" height="76" rx="13" className={zoneClass('abdomen')} /><path d="M110 144V210 M94 164H126 M94 188H126" className="pointer-events-none fill-none stroke-red-200/70 stroke-[2]" /><title>Abdomen</title></g>
            <g {...zoneProps('oblicuos', 'oblicuos')}><path d="M76 139 L91 145 L89 211 L76 198Z" className={zoneClass('oblicuos')} /><path d="M144 139 L129 145 L131 211 L144 198Z" className={zoneClass('oblicuos')} /><title>Oblicuos</title></g>
            <g {...zoneProps('aductores', 'aductores')}><path d="M103 236 L109 236 L104 314 L91 290Z" className={zoneClass('aductores')} /><path d="M111 236 L117 236 L129 290 L116 314Z" className={zoneClass('aductores')} /><title>Aductores</title></g>
            <g {...zoneProps('cuadriceps', 'cuádriceps')}><ellipse cx="88" cy="290" rx="17" ry="55" className={zoneClass('cuadriceps')} /><ellipse cx="132" cy="290" rx="17" ry="55" className={zoneClass('cuadriceps')} /><title>Cuádriceps</title></g>
          </>
        ) : (
          <>
            <g {...zoneProps('hombros', 'hombros')}><ellipse cx="66" cy="94" rx="21" ry="18" className={zoneClass('hombros')} /><ellipse cx="154" cy="94" rx="21" ry="18" className={zoneClass('hombros')} /><title>Hombros</title></g>
            <g {...zoneProps('triceps', 'tríceps')}><ellipse cx="50" cy="145" rx="13" ry="28" className={zoneClass('triceps')} /><ellipse cx="170" cy="145" rx="13" ry="28" className={zoneClass('triceps')} /><title>Tríceps</title></g>
            <g {...zoneProps('espalda', 'espalda')}><path d="M78 96 Q110 78 142 96 L147 171 Q133 203 110 215 Q87 203 73 171Z" className={zoneClass('espalda')} /><path d="M110 98V204" className="pointer-events-none fill-none stroke-red-200/50 stroke-[2]" /><title>Espalda</title></g>
            <g {...zoneProps('gluteos', 'glúteos')}><ellipse cx="91" cy="230" rx="25" ry="28" className={zoneClass('gluteos')} /><ellipse cx="129" cy="230" rx="25" ry="28" className={zoneClass('gluteos')} /><title>Glúteos</title></g>
            <g {...zoneProps('isquiotibiales', 'isquiotibiales')}><ellipse cx="88" cy="303" rx="17" ry="55" className={zoneClass('isquiotibiales')} /><ellipse cx="132" cy="303" rx="17" ry="55" className={zoneClass('isquiotibiales')} /><title>Isquiotibiales</title></g>
            <g {...zoneProps('pantorrillas', 'pantorrillas')}><ellipse cx="87" cy="373" rx="14" ry="35" className={zoneClass('pantorrillas')} /><ellipse cx="133" cy="373" rx="14" ry="35" className={zoneClass('pantorrillas')} /><title>Pantorrillas</title></g>
          </>
        )}
      </svg>
      <p className="text-center text-[10px] font-bold uppercase tracking-wide text-neutral-500">Pulsa una zona resaltada</p>
    </div>
  );
};

function makeExerciseId(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || `ejercicio-${Date.now()}`;
}

function emptyExercise(): ExerciseCatalogItem {
  return {
    id: '',
    name: '',
    segment: 'superior',
    movement: 'push',
    primaryMuscle: 'pecho',
    muscleGroups: ['pecho'],
    equipment: 'Equipo Imperial Fitness',
    imageUrl: '',
    level: 'todos',
    isActive: true,
    isVisible: true,
    isRoutineEligible: true,
    reviewStatus: 'approved',
    source: 'imperial',
    needsImageReview: true,
    coachingNotes: '',
    animationUrl: '',
    videoUrl: '',
    mediaSource: 'Imperial Fitness',
    mediaLicense: 'Biblioteca interna / pendiente de licencia específica',
    attribution: '',
    mediaNotes: '',
  };
}

export const ExerciseLibraryView: React.FC<ExerciseLibraryViewProps> = ({ currentUser }) => {
  const [items, setItems] = useState<ExerciseCatalogItem[]>(EXERCISE_CATALOG);
  const [status, setStatus] = useState('');
  const [query, setQuery] = useState('');
  const [segment, setSegment] = useState<'all' | ExerciseSegment>('all');
  const [muscle, setMuscle] = useState('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'imperial' | 'open'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ExerciseCatalogItem | null>(null);
  const [draft, setDraft] = useState<ExerciseCatalogItem>(emptyExercise());
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(60);
  const [bodySide, setBodySide] = useState<'front' | 'back'>('front');

  const canManage = currentUser.role === 'admin' || currentUser.role === 'trainer';

  useEffect(() => {
    let alive = true;
    setStatus('Cargando biblioteca Imperial Fitness y base abierta de ejercicios...');

    Promise.allSettled([
      listExercisesFromApi(canManage),
      canManage ? loadOpenExerciseDbItems() : Promise.resolve([]),
    ])
      .then(results => {
        if (!alive) return;
        const apiItems = results[0].status === 'fulfilled' ? results[0].value : [];
        const openItems = results[1].status === 'fulfilled' ? results[1].value : [];
        setItems(mergeExerciseCatalog([...apiItems, ...openItems]));
        const parts = [
          apiItems.length ? `${apiItems.length} ejercicios sincronizados desde API` : 'catálogo local activo',
          canManage
            ? (openItems.length ? `${openItems.length} ejercicios disponibles para revisión desde ${openExerciseDbSourceLabel()}` : 'base abierta no disponible; usando catálogo Imperial')
            : 'vista de cliente limitada a ejercicios aprobados',
        ];
        setStatus(`${parts.join(' · ')}. Los clientes ven únicamente contenido visible; los administradores pueden revisar y habilitar ejercicios.`);
      })
      .catch(() => {
        if (!alive) return;
        setItems(EXERCISE_CATALOG);
        setStatus('Biblioteca visual disponible en modo local. La sincronización con el servidor no respondió.');
      });

    return () => {
      alive = false;
    };
  }, [canManage]);

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();
    return items.filter(item => {
      const matchesSegment = segment === 'all' || item.segment === segment;
      const selectedMuscle = normalizeMuscle(muscle);
      const itemMuscles = [item.primaryMuscle, ...item.muscleGroups].map(normalizeMuscle);
      const matchesMuscle = muscle === 'all' || itemMuscles.some(value => value.includes(selectedMuscle) || selectedMuscle.includes(value));
      const itemSource = `${item.source || ''} ${item.mediaSource || ''}`.toLowerCase();
      const matchesSource = sourceFilter === 'all' || (sourceFilter === 'open' ? itemSource.includes('free-exercise-db') : !itemSource.includes('free-exercise-db'));
      const allowedForRole = canManage || (item.isActive !== false && item.isVisible !== false && (item.reviewStatus || 'approved') === 'approved');
      const haystack = `${item.name} ${item.equipment} ${item.primaryMuscle} ${item.muscleGroups.join(' ')} ${item.coachingNotes || ''} ${item.mediaSource || ''} ${item.mediaLicense || ''}`.toLowerCase();
      return allowedForRole && matchesSegment && matchesMuscle && matchesSource && (!term || haystack.includes(term));
    });
  }, [items, query, segment, muscle, sourceFilter, canManage]);

  const muscleOptions = useMemo(() => Array.from(new Set(items.flatMap(item => [item.primaryMuscle, ...item.muscleGroups]).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [items]);

  const stats = useMemo(() => ({
    total: items.length,
    withImage: items.filter(item => Boolean(item.imageUrl)).length,
    withMotion: items.filter(item => hasTrueMotion(getExerciseMedia(item))).length,
    openSource: items.filter(item => item.mediaSource?.toLowerCase().includes('free-exercise-db')).length,
    review: items.filter(item => item.needsImageReview || !item.imageUrl).length,
  }), [items]);

  useEffect(() => setVisibleLimit(60), [query, segment, muscle, sourceFilter]);

  const visibleItems = useMemo(() => filtered.slice(0, visibleLimit), [filtered, visibleLimit]);
  const hiddenCount = Math.max(filtered.length - visibleItems.length, 0);

  const openEdit = (item?: ExerciseCatalogItem) => {
    const target = item || emptyExercise();
    setEditing(item || null);
    setDraft(JSON.parse(JSON.stringify(target)));
    setImageFile(null);
    setPreviewUrl('');
    setModalOpen(true);
  };

  const closeEdit = () => {
    setEditing(null);
    setDraft(emptyExercise());
    setImageFile(null);
    setPreviewUrl('');
    setModalOpen(false);
  };

  const handleImageFile = (file?: File) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setStatus('La foto debe ser JPG, PNG o WEBP.');
      return;
    }
    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setDraft(prev => ({ ...prev, needsImageReview: false }));
  };

  const setMusclesFromText = (value: string) => {
    setDraft(prev => ({ ...prev, muscleGroups: value.split(',').map(v => v.trim()).filter(Boolean) }));
  };

  const saveDraft = async () => {
    if (!canManage) return;
    if (!draft.name.trim()) {
      setStatus('Escribe un nombre válido para el ejercicio.');
      return;
    }
    const safeDraft: ExerciseCatalogItem = {
      ...draft,
      id: draft.id || makeExerciseId(draft.name),
      name: draft.name.trim(),
      primaryMuscle: draft.primaryMuscle.trim() || draft.muscleGroups[0] || 'general',
      muscleGroups: draft.muscleGroups.length ? draft.muscleGroups : [draft.primaryMuscle || 'general'],
      equipment: draft.equipment.trim() || 'Equipo Imperial Fitness',
      needsImageReview: !draft.imageUrl && !imageFile,
    };

    try {
      const persistedExercise = Boolean(editing && /^\d+$/.test(editing.id));
      let payload = { ...safeDraft, imageUrl: safeDraft.imageUrl, needsImageReview: !safeDraft.imageUrl };
      let saved: ExerciseCatalogItem;

      if (persistedExercise) {
        if (imageFile) {
          const imageUrl = await uploadExerciseImageToApi(safeDraft.id, imageFile);
          payload = { ...payload, imageUrl, needsImageReview: false };
        }
        saved = await updateExerciseInApi(safeDraft.id, payload);
      } else {
        // Los ejercicios locales o de la base abierta se importan primero a Supabase.
        // Así dejan de depender de localStorage/GitHub y el administrador puede publicarlos de forma estable.
        saved = await createExerciseInApi(payload);
        if (imageFile) {
          const imageUrl = await uploadExerciseImageToApi(saved.id, imageFile);
          saved = await updateExerciseInApi(saved.id, { ...saved, imageUrl, needsImageReview: false });
        }
      }

      setItems(prev => mergeExerciseCatalog([saved, ...prev.filter(item => item.id !== saved.id && item.id !== editing?.id)]));
      setStatus(persistedExercise
        ? 'Ejercicio actualizado. Los cambios quedan disponibles según sus controles de visibilidad y aprobación.'
        : 'Ejercicio importado y guardado en Imperial Fitness. Ya no depende únicamente de la base abierta del navegador.'
      );
      closeEdit();
    } catch {
      const localPayload = { ...safeDraft, imageUrl: previewUrl || safeDraft.imageUrl, needsImageReview: false };
      setItems(prev => mergeExerciseCatalog([localPayload, ...prev.filter(item => item.id !== localPayload.id)]));
      setStatus('Cambio aplicado en esta pantalla. No se pudo guardar de forma permanente; intenta nuevamente.');
      closeEdit();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-5 animate-fade-in">
      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-extrabold text-white uppercase tracking-wider">Biblioteca de ejercicios</h2>
          </div>
          <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
            Explora por grupo muscular, técnica o equipo. Los clientes tienen vista de consulta y el equipo profesional controla qué ejercicios se publican y cuáles pueden entrar en rutinas.
          </p>
        </div>
        {canManage && (
          <button onClick={() => openEdit()} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors">
            Crear ejercicio
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"><span className="text-[10px] uppercase text-neutral-500 font-bold">Total ejercicios</span><p className="text-2xl font-black text-white">{stats.total}</p></div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"><span className="text-[10px] uppercase text-neutral-500 font-bold">Con imagen</span><p className="text-2xl font-black text-emerald-400">{stats.withImage}</p></div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"><span className="text-[10px] uppercase text-neutral-500 font-bold">Con animación/video</span><p className="text-2xl font-black text-red-400">{stats.withMotion}</p></div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"><span className="text-[10px] uppercase text-neutral-500 font-bold">Base abierta</span><p className="text-2xl font-black text-sky-400">{stats.openSource}</p></div>
        <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4"><span className="text-[10px] uppercase text-neutral-500 font-bold">Pendientes</span><p className="text-2xl font-black text-amber-400">{stats.review}</p></div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-white">Selecciona un grupo muscular</p>
            <p className="mt-1 text-[11px] text-neutral-500">Pulsa una zona para ver únicamente los ejercicios relacionados.</p>
          </div>
          <div className="inline-flex rounded-xl border border-neutral-800 bg-black p-1">
            <button onClick={() => setBodySide('front')} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ${bodySide === 'front' ? 'bg-red-600 text-white' : 'text-neutral-400'}`}>Vista frontal</button>
            <button onClick={() => setBodySide('back')} className={`rounded-lg px-3 py-1.5 text-[10px] font-black uppercase ${bodySide === 'back' ? 'bg-red-600 text-white' : 'text-neutral-400'}`}>Vista posterior</button>
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
          <MuscleBodyMap side={bodySide} selectedMuscle={muscle} onSelect={setMuscle} />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            <button onClick={() => setMuscle('all')} className={`rounded-xl border p-3 text-left transition ${muscle === 'all' ? 'border-red-500 bg-red-950/40' : 'border-neutral-800 bg-black/35 hover:border-neutral-700'}`}>
              <span className="block text-xl text-red-400">◎</span><span className="mt-1 block text-[10px] font-black uppercase text-white">Todo el cuerpo</span>
            </button>
            {muscleQuickFilters.filter(item => item.side === bodySide).map(item => (
              <button key={item.key} onClick={() => setMuscle(item.key)} className={`rounded-xl border p-3 text-left transition ${normalizeMuscle(muscle) === item.key ? 'border-red-500 bg-red-950/40' : 'border-neutral-800 bg-black/35 hover:border-neutral-700'}`}>
                <span aria-hidden="true" className="block text-xl font-black text-red-400">{item.icon}</span>
                <span className="mt-1 block text-[10px] font-black uppercase text-white">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar por nombre, máquina, músculo o descripción" className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-600" />
          </div>
          <div className="relative md:w-56">
            <Filter className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
            <select value={segment} onChange={e => setSegment(e.target.value as 'all' | ExerciseSegment)} className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-600">
              <option value="all">Superior / inferior / core</option>
              {Object.entries(segmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </div>
          <div className="relative md:w-56">
            <Filter className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
            <select value={muscle} onChange={e => setMuscle(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-600">
              <option value="all">Todos los músculos</option>
              {muscleOptions.map(value => <option key={value} value={value}>{value}</option>)}
            </select>
          </div>
          <div className="relative md:w-56">
            <Filter className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" />
            <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as 'all' | 'imperial' | 'open')} className="w-full bg-black border border-neutral-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-red-600">
              <option value="all">Todas las fuentes</option>
              <option value="imperial">Imperial Fitness</option>
              <option value="open">Base abierta</option>
            </select>
          </div>
        </div>
        {status && <p className="text-[11px] text-neutral-400">{status}</p>}
        <p className="text-[11px] text-neutral-500">{filtered.length} ejercicios encontrados · mostrando {visibleItems.length}.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {visibleItems.map(item => (
          <div key={item.id} className="rounded-2xl border border-neutral-800 bg-neutral-950 overflow-hidden">
            <ExerciseImage
              name={item.name}
              imageUrl={item.imageUrl}
              imageStartUrl={item.imageStartUrl}
              imageEndUrl={item.imageEndUrl}
              alternateImageUrls={item.alternateImageUrls}
              animationUrl={item.animationUrl}
              videoUrl={item.videoUrl}
              mediaType={item.mediaType}
              mediaSource={item.mediaSource}
              mediaLicense={item.mediaLicense}
              attribution={item.attribution}
              mediaNotes={item.mediaNotes}
              primaryMuscle={item.primaryMuscle}
              muscleGroups={item.muscleGroups}
              equipment={item.equipment}
              coachingNotes={item.coachingNotes}
              className="rounded-none h-40"
            />
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white leading-tight">{item.name}</h3>
                  <p className="text-[11px] text-neutral-500 mt-1">{item.equipment}</p>
                </div>
                {canManage && <button onClick={() => openEdit(item)} className="p-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300"><Pencil className="w-4 h-4" /></button>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="text-[9px] rounded-full bg-red-950/40 border border-red-900/50 text-red-300 px-2 py-0.5">{segmentLabels[item.segment]}</span>
                <span className="text-[9px] rounded-full bg-neutral-900 border border-neutral-800 text-neutral-400 px-2 py-0.5">{item.primaryMuscle}</span>
                {item.imageUrl ? <span className="text-[9px] rounded-full bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 px-2 py-0.5 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> imagen</span> : <span className="text-[9px] rounded-full bg-amber-950/40 border border-amber-900/50 text-amber-300 px-2 py-0.5 flex items-center gap-1"><ImageOff className="w-3 h-3" /> pendiente</span>}
                <span className="text-[9px] rounded-full bg-red-950/30 border border-red-900/50 text-red-200 px-2 py-0.5">{mediaKindLabel(getExerciseMedia(item))}</span>
                {item.mediaSource?.toLowerCase().includes('free-exercise-db') && <span className="text-[9px] rounded-full bg-sky-950/40 border border-sky-900/50 text-sky-300 px-2 py-0.5">base abierta</span>}
              </div>
              {item.coachingNotes && <p className="text-[10px] text-neutral-500 leading-snug">{item.coachingNotes}</p>}
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <div className="flex justify-center">
          <button onClick={() => setVisibleLimit(value => value + 60)} className="rounded-xl border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-xs font-black text-white hover:border-red-600 hover:bg-neutral-800">
            Cargar 60 más ({hiddenCount} pendientes)
          </button>
        </div>
      )}

      {canManage && modalOpen && (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-red-400 font-bold uppercase">{editing ? 'Editar ejercicio' : 'Crear ejercicio'}</span>
                <h3 className="text-base font-bold text-white">{draft.name || 'Nuevo ejercicio'}</h3>
              </div>
              <button onClick={closeEdit} className="p-2 rounded-lg hover:bg-neutral-900 text-neutral-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 max-h-[76vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] gap-4">
                <div className="space-y-3">
                  <ExerciseImage
                    name={draft.name || 'Ejercicio'}
                    imageUrl={previewUrl || draft.imageUrl}
                    imageStartUrl={previewUrl ? undefined : draft.imageStartUrl}
                    imageEndUrl={previewUrl ? undefined : draft.imageEndUrl}
                    alternateImageUrls={previewUrl ? undefined : draft.alternateImageUrls}
                    animationUrl={draft.animationUrl}
                    videoUrl={draft.videoUrl}
                    mediaType={draft.mediaType}
                    mediaSource={draft.mediaSource}
                    mediaLicense={draft.mediaLicense}
                    attribution={draft.attribution}
                    mediaNotes={draft.mediaNotes}
                    primaryMuscle={draft.primaryMuscle}
                    muscleGroups={draft.muscleGroups}
                    equipment={draft.equipment}
                    coachingNotes={draft.coachingNotes}
                    className="h-52"
                  />
                  <label className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-neutral-700 bg-black/40 p-4 cursor-pointer hover:border-red-600 transition-colors">
                    <UploadCloud className="w-7 h-7 text-red-500 mb-2" />
                    <span className="text-xs font-bold text-white">Subir foto del ejercicio</span>
                    <span className="text-[10px] text-neutral-500">JPG, PNG o WEBP</span>
                    <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={e => handleImageFile(e.target.files?.[0])} />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase text-neutral-500 font-bold">Enlace de imagen opcional</span>
                    <input value={draft.imageUrl || ''} onChange={e => setDraft(prev => ({ ...prev, imageUrl: e.target.value, needsImageReview: !e.target.value }))} placeholder="/exercises/archivo.jpg o https://..." className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase text-neutral-500 font-bold">GIF / WebP animado</span>
                    <input value={draft.animationUrl || ''} onChange={e => setDraft(prev => ({ ...prev, animationUrl: e.target.value, mediaType: e.target.value.endsWith('.gif') ? 'gif' : e.target.value ? 'animated-webp' : prev.mediaType }))} placeholder="https://.../ejercicio.gif o .webp" className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" />
                  </label>
                  <label className="space-y-1 block">
                    <span className="text-[10px] uppercase text-neutral-500 font-bold">Video técnico MP4/WebM</span>
                    <input value={draft.videoUrl || ''} onChange={e => setDraft(prev => ({ ...prev, videoUrl: e.target.value, mediaType: e.target.value ? 'video' : prev.mediaType }))} placeholder="https://.../ejercicio.mp4" className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1 md:col-span-2"><span className="text-[10px] uppercase text-neutral-500 font-bold">Nombre correcto</span><input value={draft.name} onChange={e => setDraft(prev => ({ ...prev, name: e.target.value, id: prev.id || makeExerciseId(e.target.value) }))} className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" /></label>
                  <label className="space-y-1"><span className="text-[10px] uppercase text-neutral-500 font-bold">Segmento</span><select value={draft.segment} onChange={e => setDraft(prev => ({ ...prev, segment: e.target.value as ExerciseSegment }))} className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600">{Object.entries(segmentLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
                  <label className="space-y-1"><span className="text-[10px] uppercase text-neutral-500 font-bold">Patrón</span><select value={draft.movement} onChange={e => setDraft(prev => ({ ...prev, movement: e.target.value as ExerciseMovement }))} className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600">{movementOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></label>
                  <label className="space-y-1"><span className="text-[10px] uppercase text-neutral-500 font-bold">Músculo principal</span><input value={draft.primaryMuscle} onChange={e => setDraft(prev => ({ ...prev, primaryMuscle: e.target.value }))} className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" /></label>
                  <label className="space-y-1"><span className="text-[10px] uppercase text-neutral-500 font-bold">Músculos trabajados</span><input value={draft.muscleGroups.join(', ')} onChange={e => setMusclesFromText(e.target.value)} className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" /></label>
                  <label className="space-y-1 md:col-span-2"><span className="text-[10px] uppercase text-neutral-500 font-bold">Equipo / máquina</span><input list="imperial-equipment" value={draft.equipment} onChange={e => setDraft(prev => ({ ...prev, equipment: e.target.value }))} className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" /><datalist id="imperial-equipment">{IMPERIAL_GYM_EQUIPMENT.map(eq => <option key={eq.id} value={eq.name} />)}</datalist></label>
                  <label className="space-y-1"><span className="text-[10px] uppercase text-neutral-500 font-bold">Fuente visual</span><input value={draft.mediaSource || ''} onChange={e => setDraft(prev => ({ ...prev, mediaSource: e.target.value }))} placeholder="Imperial Fitness / base abierta" className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" /></label>
                  <label className="space-y-1"><span className="text-[10px] uppercase text-neutral-500 font-bold">Licencia</span><input value={draft.mediaLicense || ''} onChange={e => setDraft(prev => ({ ...prev, mediaLicense: e.target.value }))} placeholder="Propia / abierta / comercial" className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" /></label>
                  <label className="space-y-1 md:col-span-2"><span className="text-[10px] uppercase text-neutral-500 font-bold">Atribución / notas de uso</span><input value={draft.attribution || ''} onChange={e => setDraft(prev => ({ ...prev, attribution: e.target.value }))} placeholder="Autor, URL o condición de uso si aplica" className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600" /></label>
                  <label className="space-y-1 md:col-span-2"><span className="text-[10px] uppercase text-neutral-500 font-bold">Descripción completa / indicaciones técnicas</span><textarea value={draft.coachingNotes || ''} onChange={e => setDraft(prev => ({ ...prev, coachingNotes: e.target.value }))} rows={5} placeholder="Ejemplo: Ajustar respaldo, controlar excéntrica, no bloquear articulaciones, rango sugerido, errores comunes..." className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white focus:outline-none focus:border-red-600 resize-none" /></label>
                  <label className="space-y-1"><span className="text-[10px] uppercase text-neutral-500 font-bold">Estado de revisión</span><select value={draft.reviewStatus || 'approved'} onChange={e => setDraft(prev => ({ ...prev, reviewStatus: e.target.value as ExerciseCatalogItem['reviewStatus'] }))} className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white"><option value="approved">Aprobado</option><option value="pending">Pendiente</option><option value="rejected">Rechazado</option></select></label>
                  <label className="space-y-1"><span className="text-[10px] uppercase text-neutral-500 font-bold">Origen</span><input value={draft.source || 'imperial'} onChange={e => setDraft(prev => ({ ...prev, source: e.target.value }))} className="w-full bg-black border border-neutral-800 rounded-xl p-2 text-xs text-white" /></label>
                  <label className="flex items-center gap-2 text-[11px] text-neutral-300"><input type="checkbox" checked={draft.isVisible !== false} onChange={e => setDraft(prev => ({ ...prev, isVisible: e.target.checked }))} /> Visible para clientes</label>
                  <label className="flex items-center gap-2 text-[11px] text-neutral-300"><input type="checkbox" checked={draft.isRoutineEligible !== false} onChange={e => setDraft(prev => ({ ...prev, isRoutineEligible: e.target.checked }))} /> Elegible para rutinas automáticas</label>
                  <label className="flex items-center gap-2 text-[11px] text-neutral-300"><input type="checkbox" checked={draft.isActive !== false} onChange={e => setDraft(prev => ({ ...prev, isActive: e.target.checked }))} /> Ejercicio activo</label>
                  <label className="flex items-center gap-2 text-[11px] text-neutral-300"><input type="checkbox" checked={draft.needsImageReview || false} onChange={e => setDraft(prev => ({ ...prev, needsImageReview: e.target.checked }))} /> Revisar imagen</label>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-neutral-800 flex items-center justify-end gap-2">
              <button onClick={closeEdit} className="bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold px-4 py-2 rounded-xl">Cancelar</button>
              <button onClick={saveDraft} className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2"><Save className="w-4 h-4" /> Guardar ejercicio</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
