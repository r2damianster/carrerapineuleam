'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ProyectoVinculacionPage() {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ficha' | 'objetivos' | 'metas' | 'presupuesto' | 'textos'>('ficha');
  const [mensaje, setMensaje] = useState('');

  // Data states
  const [docentes, setDocentes] = useState<any[]>([]);
  const [ciclos, setCiclos] = useState<any[]>([]);
  const [espacios, setEspacios] = useState<any[]>([]);
  const [cicloIdSeleccionado, setCicloIdSeleccionado] = useState<string>('');

  // 1. Ficha State
  const [fichaForm, setFichaForm] = useState({
    codigo: '', unidad_academica: 'Facultad de Educación, Turismo, Artes y Humanidades',
    carrera: 'Pedagogía de los Idiomas Nacionales y Extranjeros', entidad_beneficiaria: '',
    vigencia_inicio: '', vigencia_fin: '', ods: '', linea_investigacion: '',
    zona: 'Distrito 13D02 Manta',
    codigo_documento_lider: 'PINE-INF-LID-2026', revision_documento_lider: '01',
    codigo_documento_supervisor: 'PINE-INF-SUP-2026', revision_documento_supervisor: '01',
    firmante_responsable_id: '', lider_id: ''
  });

  // 2. Objetivos & Actividades State
  const [objetivos, setObjetivos] = useState<any[]>([]);
  const [modalObjetivo, setModalObjetivo] = useState(false);
  const [objForm, setObjForm] = useState({ id: null as number | null, tipo: 'especifico', texto: '', orden: 0 });
  const [modalActividad, setModalActividad] = useState(false);
  const [actForm, setActForm] = useState<any>({ id: null, objetivo_id: '', actividad: '', metodologia: '', ciclo_id: '', mes_inicio: '', mes_fin: '', espacio_id: '', responsable_id: '' });

  // Copiar actividades
  const [modalCopiar, setModalCopiar] = useState(false);
  const [copiarForm, setCopiarForm] = useState({ desde_ciclo_id: '', hacia_ciclo_id: '' });

  // 3. Metas State
  const [metasForm, setMetasForm] = useState({
    meta_estudiantes: 0, meta_docentes: 0, meta_beneficiarios_directos: 0, meta_beneficiarios_indirectos: 0
  });

  // 4. Presupuesto State
  const [presupuestoItems, setPresupuestoItems] = useState<any[]>([]);
  const [presupuestoResumen, setPresupuestoResumen] = useState({ totalSolicitado: 0, totalEjecutado: 0, porcentaje: 0 });
  const [modalPresupuesto, setModalPresupuesto] = useState(false);
  const [presuForm, setPresuForm] = useState({ id: null as number | null, cedula_presupuestaria: '', concepto: '', solicitado: '', ejecutado: '', responsable_id: '' });

  // 5. Textos State
  const CLAVES_TEXTOS = [
    { clave: 'problema_inicial', titulo: '1. Problema Inicial / Diagnóstico' },
    { clave: 'aporte_academico', titulo: '2. Aporte Académico del Proyecto' },
    { clave: 'aporte_ods', titulo: '3. Aporte a los Objetivos de Desarrollo Sostenible (ODS)' },
    { clave: 'nuevos_problemas', titulo: '4. Nuevos Problemas Identificados' },
    { clave: 'nuevos_proyectos', titulo: '5. Nuevos Proyectos o Líneas Derivadas' },
    { clave: 'mejora_oferta', titulo: '6. Mejora a la Oferta Académica' },
    { clave: 'aporte_titulacion', titulo: '7. Aporte a la Titulación de Estudiantes' },
  ];
  const [textosForm, setTextosForm] = useState<Record<string, string>>({});
  const [generandoIA, setGenerandoIA] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => {
        const u = data.usuario;
        const esLider = u?.rol === 'admin' || (u?.rol === 'profesor' && (u?.modulos_acceso?.includes('vinculacion_gestion') || u?.modulos_acceso?.includes('superadmin')));
        if (!esLider) {
          router.push('/portal/dashboard');
          return;
        }
        setCheckingSession(false);
        cargarFicha();
      })
      .catch(() => router.push('/portal/login?redirect=/vinculacion/proyecto'));
  }, [router]);

  const cargarFicha = async () => {
    setLoading(true);
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=ficha');
      const data = await res.json();
      if (data.success) {
        if (data.ficha) setFichaForm({ ...data.ficha });
        if (data.docentes) setDocentes(data.docentes);
        if (data.ciclos && data.ciclos.length > 0) {
          setCiclos(data.ciclos);
          if (!cicloIdSeleccionado) setCicloIdSeleccionado(String(data.ciclos[0].id));
        }
      }
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cargarObjetivos = async () => {
    setLoading(true);
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=objetivos');
      const data = await res.json();
      if (data.success) {
        setObjetivos(data.objetivos);
        if (data.espacios) setEspacios(data.espacios);
        if (data.docentes) setDocentes(data.docentes);
        if (data.ciclos) setCiclos(data.ciclos);
      }
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cargarMetas = async (cId: string) => {
    if (!cId) return;
    setLoading(true);
    try {
      const res = await fetch(`/vinculacion/proyecto/api?seccion=metas&ciclo_id=${cId}`);
      const data = await res.json();
      if (data.success) {
        setMetasForm(data.metas || { meta_estudiantes: 0, meta_docentes: 0, meta_beneficiarios_directos: 0, meta_beneficiarios_indirectos: 0 });
      }
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cargarPresupuesto = async (cId: string) => {
    if (!cId) return;
    setLoading(true);
    try {
      const res = await fetch(`/vinculacion/proyecto/api?seccion=presupuesto&ciclo_id=${cId}`);
      const data = await res.json();
      if (data.success) {
        setPresupuestoItems(data.items);
        setPresupuestoResumen(data.resumen);
      }
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cargarTextos = async (cId: string) => {
    if (!cId) return;
    setLoading(true);
    try {
      const res = await fetch(`/vinculacion/proyecto/api?seccion=textos&ciclo_id=${cId}`);
      const data = await res.json();
      if (data.success) {
        setTextosForm(data.textos || {});
      }
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'ficha') cargarFicha();
    if (activeTab === 'objetivos') cargarObjetivos();
    if (activeTab === 'metas' && cicloIdSeleccionado) cargarMetas(cicloIdSeleccionado);
    if (activeTab === 'presupuesto' && cicloIdSeleccionado) cargarPresupuesto(cicloIdSeleccionado);
    if (activeTab === 'textos' && cicloIdSeleccionado) cargarTextos(cicloIdSeleccionado);
  }, [activeTab, cicloIdSeleccionado]);

  // Submit Handlers
  const handleGuardarFicha = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=ficha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fichaForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje('Ficha del proyecto guardada exitosamente');
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarObjetivo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const accion = objForm.id ? 'editar_objetivo' : 'crear_objetivo';
      const res = await fetch(`/vinculacion/proyecto/api?seccion=objetivos&accion=${accion}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalObjetivo(false);
      cargarObjetivos();
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarObjetivo = async (id: number) => {
    if (!confirm('¿Eliminar objetivo y todas sus actividades planificadas?')) return;
    setLoading(true);
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=objetivos&accion=eliminar_objetivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cargarObjetivos();
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarActividad = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const accion = actForm.id ? 'editar_actividad' : 'crear_actividad';
      const res = await fetch(`/vinculacion/proyecto/api?seccion=objetivos&accion=${accion}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(actForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalActividad(false);
      cargarObjetivos();
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarActividad = async (id: number) => {
    if (!confirm('¿Eliminar esta actividad planificada?')) return;
    setLoading(true);
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=objetivos&accion=eliminar_actividad', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cargarObjetivos();
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopiarCiclo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=objetivos&accion=copiar_ciclo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(copiarForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje(data.message);
      setModalCopiar(false);
      cargarObjetivos();
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarMetas = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=metas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: parseInt(cicloIdSeleccionado), ...metasForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje('Metas del ciclo guardadas');
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardarPresupuestoItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const accion = presuForm.id ? 'editar_item' : 'crear_item';
      const res = await fetch(`/vinculacion/proyecto/api?seccion=presupuesto&accion=${accion}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: parseInt(cicloIdSeleccionado), ...presuForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setModalPresupuesto(false);
      cargarPresupuesto(cicloIdSeleccionado);
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEliminarPresupuestoItem = async (id: number) => {
    if (!confirm('¿Eliminar esta partida presupuestaria?')) return;
    setLoading(true);
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=presupuesto&accion=eliminar_item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      cargarPresupuesto(cicloIdSeleccionado);
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerarIABorrador = async (clave: string) => {
    setGenerandoIA(clave);
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=textos&accion=borrador_ia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clave, borrador_previo: textosForm[clave] || '' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTextosForm(prev => ({ ...prev, [clave]: data.borrador }));
    } catch (err: any) {
      setMensaje(`Error IA: ${err.message}`);
    } finally {
      setGenerandoIA(null);
    }
  };

  const handleGuardarTextos = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');
    try {
      const res = await fetch('/vinculacion/proyecto/api?seccion=textos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ciclo_id: parseInt(cicloIdSeleccionado), textos: textosForm }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMensaje('Textos cualitativos guardados correctamente');
    } catch (err: any) {
      setMensaje(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500">Verificando sesión...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto bg-white p-8 rounded-xl shadow-md">
        <div className="mb-4">
          <Link href="/portal/dashboard" className="inline-flex items-center text-blue-600 hover:underline font-medium">
            &larr; Volver al Portal PINE
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-uleam-blue mb-2">Proyecto de Vinculación: Datos e Informes</h1>
        <p className="text-gray-600 text-sm mb-6">Configuración de Ficha, Objetivos, Plan de Trabajo, Metas por Ciclo, Presupuesto y Textos Cualitativos.</p>

        {mensaje && (
          <div className={`p-4 mb-6 rounded-md ${mensaje.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
            {mensaje}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
          {[
            { id: 'ficha', label: 'Ficha del Proyecto' },
            { id: 'objetivos', label: 'Objetivos y Actividades' },
            { id: 'metas', label: 'Metas por Ciclo' },
            { id: 'presupuesto', label: 'Presupuesto' },
            { id: 'textos', label: 'Textos Cualitativos del Ciclo' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-3 px-6 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-uleam-blue text-uleam-blue font-bold'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: FICHA */}
        {activeTab === 'ficha' && (
          <form onSubmit={handleGuardarFicha} className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 border-b pb-2">Información de la Ficha del Proyecto</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código del Proyecto</label>
                <input value={fichaForm.codigo} onChange={e => setFichaForm({ ...fichaForm, codigo: e.target.value })} placeholder="Ej. PINE-VINC-2026" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zona (Fija)</label>
                <input value={fichaForm.zona} disabled className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-100 text-gray-600" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidad Académica</label>
                <input value={fichaForm.unidad_academica} onChange={e => setFichaForm({ ...fichaForm, unidad_academica: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
                <input value={fichaForm.carrera} onChange={e => setFichaForm({ ...fichaForm, carrera: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entidad Beneficiaria</label>
              <input value={fichaForm.entidad_beneficiaria} onChange={e => setFichaForm({ ...fichaForm, entidad_beneficiaria: e.target.value })} placeholder="Ej. Junta Cantonal de Manta / GAD Manta" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vigencia Inicio</label>
                <input type="date" value={fichaForm.vigencia_inicio ? fichaForm.vigencia_inicio.split('T')[0] : ''} onChange={e => setFichaForm({ ...fichaForm, vigencia_inicio: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vigencia Fin</label>
                <input type="date" value={fichaForm.vigencia_fin ? fichaForm.vigencia_fin.split('T')[0] : ''} onChange={e => setFichaForm({ ...fichaForm, vigencia_fin: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ODS (Separados por coma)</label>
                <input value={fichaForm.ods} onChange={e => setFichaForm({ ...fichaForm, ods: e.target.value })} placeholder="Ej. ODS 4, ODS 10" className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Línea de Investigación / Acción</label>
                <input value={fichaForm.linea_investigacion} onChange={e => setFichaForm({ ...fichaForm, linea_investigacion: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue" />
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 pt-4">Firmantes y Responsables del Informe</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Líder del Proyecto de Vinculación</label>
                <select value={fichaForm.lider_id || ''} onChange={e => setFichaForm({ ...fichaForm, lider_id: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue">
                  <option value="">Selecciona docente líder...</option>
                  {docentes.map(d => <option key={d.id} value={d.id}>{d.nombres} {d.apellidos}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Responsable de Vinculación y Emprendimiento (Firmante)</label>
                <select value={fichaForm.firmante_responsable_id || ''} onChange={e => setFichaForm({ ...fichaForm, firmante_responsable_id: e.target.value })} className="w-full px-4 py-2 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue">
                  <option value="">Selecciona autoridad/docente firmante...</option>
                  {docentes.map(d => <option key={d.id} value={d.id}>{d.nombres} {d.apellidos}</option>)}
                </select>
              </div>
            </div>

            <h3 className="text-lg font-bold text-gray-800 border-b pb-2 pt-4">Encabezados y Códigos del Formato .docx</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Código Doc. Líder</label>
                <input value={fichaForm.codigo_documento_lider} onChange={e => setFichaForm({ ...fichaForm, codigo_documento_lider: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Revisión Doc. Líder</label>
                <input value={fichaForm.revision_documento_lider} onChange={e => setFichaForm({ ...fichaForm, revision_documento_lider: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Código Doc. Supervisor</label>
                <input value={fichaForm.codigo_documento_supervisor} onChange={e => setFichaForm({ ...fichaForm, codigo_documento_supervisor: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Revisión Doc. Supervisor</label>
                <input value={fichaForm.revision_documento_supervisor} onChange={e => setFichaForm({ ...fichaForm, revision_documento_supervisor: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <button disabled={loading} className="px-8 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 shadow">
                {loading ? 'Guardando...' : 'Guardar Ficha del Proyecto'}
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: OBJETIVOS Y ACTIVIDADES */}
        {activeTab === 'objetivos' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Catálogo de Objetivos y Actividades Planificadas</h2>
              <div className="flex gap-2">
                <button onClick={() => setModalCopiar(true)} className="px-4 py-2 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 text-sm">
                  📋 Copiar actividades a nuevo ciclo
                </button>
                <button onClick={() => { setObjForm({ id: null, tipo: 'especifico', texto: '', orden: 0 }); setModalObjetivo(true); }} className="px-4 py-2 bg-uleam-blue text-white font-medium rounded-lg hover:bg-uleam-blue/90 text-sm">
                  + Agregar Objetivo
                </button>
              </div>
            </div>

            {objetivos.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No hay objetivos registrados.</p>}

            {objetivos.map(obj => (
              <div key={obj.id} className="border rounded-xl p-6 bg-white shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full uppercase ${obj.tipo === 'general' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      Objetivo {obj.tipo}
                    </span>
                    <h3 className="text-lg font-bold text-gray-900 mt-1">{obj.texto}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setObjForm({ ...obj }); setModalObjetivo(true); }} className="text-sm text-blue-600 hover:underline">Editar</button>
                    <button onClick={() => handleEliminarObjetivo(obj.id)} className="text-sm text-red-600 hover:underline">Eliminar</button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-semibold text-sm text-gray-700">Actividades Planificadas ({obj.actividades.length})</h4>
                    <button
                      onClick={() => {
                        setActForm({ id: null, objetivo_id: obj.id, actividad: '', metodologia: '', ciclo_id: cicloIdSeleccionado || (ciclos[0]?.id ? String(ciclos[0].id) : ''), mes_inicio: '', mes_fin: '', espacio_id: '', responsable_id: '' });
                        setModalActividad(true);
                      }}
                      className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1 rounded-md font-medium"
                    >
                      + Nueva Actividad
                    </button>
                  </div>

                  {obj.actividades.length === 0 ? (
                    <p className="text-xs text-gray-400 italic">Sin actividades bajo este objetivo.</p>
                  ) : (
                    <div className="space-y-2">
                      {obj.actividades.map((act: any) => (
                        <div key={act.id} className="p-3 border rounded-lg bg-gray-50 flex items-center justify-between text-sm">
                          <div>
                            <p className="font-semibold text-gray-800">{act.actividad}</p>
                            {act.metodologia && <p className="text-xs text-gray-500">Metodología: {act.metodologia}</p>}
                            <div className="flex gap-4 text-xs text-gray-500 mt-1">
                              {act.espacio_nombre && <span>Espacio: <strong>{act.espacio_nombre}</strong></span>}
                              {act.resp_nombres && <span>Responsable: <strong>{act.resp_nombres} {act.resp_apellidos}</strong></span>}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setActForm({ ...act }); setModalActividad(true); }} className="text-xs text-blue-600 hover:underline">Editar</button>
                            <button onClick={() => handleEliminarActividad(act.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB 3: METAS POR CICLO */}
        {activeTab === 'metas' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-xl font-bold text-gray-800">Metas Proyectadas del Ciclo</h2>
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">Ciclo Académico:</label>
                <select value={cicloIdSeleccionado} onChange={e => setCicloIdSeleccionado(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 font-bold">
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>

            <form onSubmit={handleGuardarMetas} className="space-y-6 max-w-2xl bg-gray-50 p-6 rounded-xl border">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Docentes Participantes</label>
                  <input type="number" min="0" value={metasForm.meta_docentes} onChange={e => setMetasForm({ ...metasForm, meta_docentes: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 rounded-lg border border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Estudiantes Pasantes</label>
                  <input type="number" min="0" value={metasForm.meta_estudiantes} onChange={e => setMetasForm({ ...metasForm, meta_estudiantes: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 rounded-lg border border-gray-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Beneficiarios Directos</label>
                  <input type="number" min="0" value={metasForm.meta_beneficiarios_directos} onChange={e => setMetasForm({ ...metasForm, meta_beneficiarios_directos: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 rounded-lg border border-gray-300" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meta Beneficiarios Indirectos</label>
                  <input type="number" min="0" value={metasForm.meta_beneficiarios_indirectos} onChange={e => setMetasForm({ ...metasForm, meta_beneficiarios_indirectos: parseInt(e.target.value) || 0 })} className="w-full px-4 py-2 rounded-lg border border-gray-300" />
                  <p className="text-xs text-gray-400 mt-1">Los indirectos son una proyección fija en la ficha y en el informe.</p>
                </div>
              </div>

              <button disabled={loading} className="w-full py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90">
                {loading ? 'Guardando...' : 'Guardar Metas del Ciclo'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 4: PRESUPUESTO */}
        {activeTab === 'presupuesto' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Presupuesto del Proyecto</h2>
                <p className="text-xs text-gray-500">Gestión de partidas presupuestarias por ciclo académico.</p>
              </div>
              <div className="flex items-center gap-3">
                <select value={cicloIdSeleccionado} onChange={e => setCicloIdSeleccionado(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 font-bold text-sm">
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
                <button onClick={() => { setPresuForm({ id: null, cedula_presupuestaria: '', concepto: '', solicitado: '', ejecutado: '', responsable_id: '' }); setModalPresupuesto(true); }} className="px-4 py-2 bg-uleam-blue text-white font-medium rounded-lg text-sm shadow">
                  + Nueva Partida
                </button>
              </div>
            </div>

            {/* Tarjetas Resumen */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                <span className="text-xs font-semibold text-blue-700 uppercase">Total Solicitado</span>
                <p className="text-2xl font-bold text-blue-900">${presupuestoResumen.totalSolicitado.toFixed(2)}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                <span className="text-xs font-semibold text-green-700 uppercase">Total Ejecutado</span>
                <p className="text-2xl font-bold text-green-900">${presupuestoResumen.totalEjecutado.toFixed(2)}</p>
              </div>
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                <span className="text-xs font-semibold text-purple-700 uppercase">% Ejecución</span>
                <p className="text-2xl font-bold text-purple-900">{presupuestoResumen.porcentaje}%</p>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-xs uppercase border-b">
                  <tr>
                    <th className="px-4 py-3">Cédula</th>
                    <th className="px-4 py-3">Concepto</th>
                    <th className="px-4 py-3 text-right">Solicitado ($)</th>
                    <th className="px-4 py-3 text-right">Ejecutado ($)</th>
                    <th className="px-4 py-3 text-right">% Ejecución</th>
                    <th className="px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {presupuestoItems.length === 0 && (
                    <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">No hay partidas registradas en este ciclo.</td></tr>
                  )}
                  {presupuestoItems.map(item => {
                    const sol = Number(item.solicitado || 0);
                    const ejec = Number(item.ejecutado || 0);
                    const pct = sol > 0 ? (ejec / sol) * 100 : 0;
                    return (
                      <tr key={item.id} className="border-b hover:bg-gray-50">
                        <td className="px-4 py-3 font-mono text-xs">{item.cedula_presupuestaria || '-'}</td>
                        <td className="px-4 py-3 font-semibold text-gray-900">{item.concepto}</td>
                        <td className="px-4 py-3 text-right">${sol.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right text-green-700 font-medium">${ejec.toFixed(2)}</td>
                        <td className="px-4 py-3 text-right font-bold text-purple-900">{Math.round(pct)}%</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button onClick={() => { setPresuForm({ ...item }); setModalPresupuesto(true); }} className="text-xs text-blue-600 hover:underline">Editar</button>
                            <button onClick={() => handleEliminarPresupuestoItem(item.id)} className="text-xs text-red-600 hover:underline">Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: TEXTOS CUALITATIVOS DEL CICLO */}
        {activeTab === 'textos' && (
          <form onSubmit={handleGuardarTextos} className="space-y-8">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Textos Cualitativos del Ciclo</h2>
                <p className="text-xs text-gray-500">Se incluyen en el Informe del Líder. Puedes redactarlos o generar un borrador asistido por IA.</p>
              </div>
              <select value={cicloIdSeleccionado} onChange={e => setCicloIdSeleccionado(e.target.value)} className="px-3 py-2 rounded-lg border border-gray-300 font-bold text-sm">
                {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>

            <div className="space-y-6">
              {CLAVES_TEXTOS.map(item => (
                <div key={item.clave} className="p-5 border rounded-xl bg-gray-50 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-gray-800 text-sm">{item.titulo}</label>
                    <button
                      type="button"
                      disabled={generandoIA === item.clave}
                      onClick={() => handleGenerarIABorrador(item.clave)}
                      className="text-xs bg-purple-100 text-purple-800 font-bold px-3 py-1.5 rounded-lg hover:bg-purple-200 transition disabled:opacity-50 flex items-center gap-1"
                    >
                      {generandoIA === item.clave ? '🤖 Redactando borrador con IA...' : '✨ Redactar borrador con IA'}
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={textosForm[item.clave] || ''}
                    onChange={e => setTextosForm({ ...textosForm, [item.clave]: e.target.value })}
                    placeholder="Escribe o afina la redacción cualitativa..."
                    className="w-full p-3 rounded-lg border border-gray-300 outline-none focus:border-uleam-blue bg-white text-sm"
                  ></textarea>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button disabled={loading} className="px-8 py-3 bg-uleam-blue text-white font-bold rounded-lg hover:bg-uleam-blue/90 shadow">
                {loading ? 'Guardando...' : 'Guardar Todos los Textos Cualitativos'}
              </button>
            </div>
          </form>
        )}

        {/* MODAL OBJETIVO */}
        {modalObjetivo && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleGuardarObjetivo} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900">{objForm.id ? 'Editar Objetivo' : 'Nuevo Objetivo'}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Objetivo</label>
                <select value={objForm.tipo} onChange={e => setObjForm({ ...objForm, tipo: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300">
                  <option value="especifico">Específico</option>
                  <option value="general">General</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Texto del Objetivo</label>
                <textarea required rows={3} value={objForm.texto} onChange={e => setObjForm({ ...objForm, texto: e.target.value })} className="w-full p-3 rounded border border-gray-300 text-sm"></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalObjetivo(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-uleam-blue text-white rounded font-medium text-sm">Guardar</button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL ACTIVIDAD */}
        {modalActividad && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleGuardarActividad} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900">{actForm.id ? 'Editar Actividad' : 'Nueva Actividad Planificada'}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Actividad</label>
                <input required value={actForm.actividad} onChange={e => setActForm({ ...actForm, actividad: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodología / Descripción</label>
                <textarea rows={2} value={actForm.metodologia || ''} onChange={e => setActForm({ ...actForm, metodologia: e.target.value })} className="w-full p-2 rounded border border-gray-300 text-sm"></textarea>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Espacio de Enseñanza (opcional)</label>
                  <select value={actForm.espacio_id || ''} onChange={e => setActForm({ ...actForm, espacio_id: e.target.value })} className="w-full px-2 py-1.5 rounded border border-gray-300 text-xs">
                    <option value="">Cualquier espacio / General</option>
                    {espacios.map(esp => <option key={esp.id} value={esp.id}>{esp.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Responsable</label>
                  <select value={actForm.responsable_id || ''} onChange={e => setActForm({ ...actForm, responsable_id: e.target.value })} className="w-full px-2 py-1.5 rounded border border-gray-300 text-xs">
                    <option value="">Selecciona...</option>
                    {docentes.map(d => <option key={d.id} value={d.id}>{d.nombres} {d.apellidos}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalActividad(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-uleam-blue text-white rounded font-medium text-sm">Guardar Actividad</button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL PRESUPUESTO */}
        {modalPresupuesto && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleGuardarPresupuestoItem} className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900">{presuForm.id ? 'Editar Partida' : 'Nueva Partida Presupuestaria'}</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cédula Presupuestaria (Opcional)</label>
                <input value={presuForm.cedula_presupuestaria} onChange={e => setPresuForm({ ...presuForm, cedula_presupuestaria: e.target.value })} placeholder="Ej. 53.02.04" className="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto / Detalle</label>
                <input required value={presuForm.concepto} onChange={e => setPresuForm({ ...presuForm, concepto: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Solicitado ($)</label>
                  <input type="number" step="0.01" value={presuForm.solicitado} onChange={e => setPresuForm({ ...presuForm, solicitado: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto Ejecutado ($)</label>
                  <input type="number" step="0.01" value={presuForm.ejecutado} onChange={e => setPresuForm({ ...presuForm, ejecutado: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-sm" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalPresupuesto(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-uleam-blue text-white rounded font-medium text-sm">Guardar Partida</button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL COPIAR ACTIVIDADES A NUEVO CICLO */}
        {modalCopiar && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
            <form onSubmit={handleCopiarCiclo} className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
              <h3 className="text-lg font-bold text-gray-900">Copiar Actividades al Ciclo Siguiente</h3>
              <p className="text-xs text-gray-500">Duplica las actividades planificadas de un ciclo a otro sin duplicar los objetivos generales/específicos.</p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo Origen</label>
                <select required value={copiarForm.desde_ciclo_id} onChange={e => setCopiarForm({ ...copiarForm, desde_ciclo_id: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-sm">
                  <option value="">Selecciona ciclo origen...</option>
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ciclo Destino</label>
                <select required value={copiarForm.hacia_ciclo_id} onChange={e => setCopiarForm({ ...copiarForm, hacia_ciclo_id: e.target.value })} className="w-full px-3 py-2 rounded border border-gray-300 text-sm">
                  <option value="">Selecciona ciclo destino...</option>
                  {ciclos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalCopiar(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium text-sm">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded font-medium text-sm">Copiar Actividades</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
