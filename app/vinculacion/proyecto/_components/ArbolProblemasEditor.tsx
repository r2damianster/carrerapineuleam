'use client';

import { useEffect, useState } from 'react';

interface NodoArbol {
  id: number;
  nivel: 'central' | 'causa_directa' | 'causa_indirecta' | 'efecto_directo' | 'efecto_final';
  padre_id: number | null;
  texto: string;
  orden: number;
}

const URL_API = '/vinculacion/proyecto/api?seccion=arbol';

export default function ArbolProblemasEditor() {
  const [nodos, setNodos] = useState<NodoArbol[]>([]);
  const [mensaje, setMensaje] = useState('');
  const [borradores, setBorradores] = useState<Record<string, string>>({});

  const cargar = async () => {
    const respuesta = await fetch(URL_API);
    const datos = await respuesta.json();
    if (datos.success) setNodos(datos.nodos);
  };

  useEffect(() => {
    cargar();
  }, []);

  const enviar = async (accion: 'crear' | 'editar' | 'eliminar', cuerpo: Record<string, unknown>) => {
    setMensaje('');
    const respuesta = await fetch(`${URL_API}&accion=${accion}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const resultado = await respuesta.json();
    if (!respuesta.ok) {
      setMensaje(`Error: ${resultado.error}`);
      return;
    }
    await cargar();
  };

  const nodosDe = (nivel: NodoArbol['nivel'], padreId: number | null = null) =>
    nodos.filter(nodo => nodo.nivel === nivel && nodo.padre_id === padreId);

  const textoActual = (nodo: NodoArbol) => borradores[`nodo-${nodo.id}`] ?? nodo.texto;

  const filaEditable = (nodo: NodoArbol) => (
    <div key={nodo.id} className="flex gap-2 items-start">
      <textarea
        rows={2}
        value={textoActual(nodo)}
        onChange={evento => setBorradores({ ...borradores, [`nodo-${nodo.id}`]: evento.target.value })}
        className="flex-1 p-2 border rounded text-sm"
      />
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => enviar('editar', { id: nodo.id, texto: textoActual(nodo) })}
          className="px-2 py-1 bg-uleam-blue text-white text-xs font-bold rounded"
        >
          Guardar
        </button>
        <button
          type="button"
          onClick={() => window.confirm('¿Eliminar este elemento del árbol?') && enviar('eliminar', { id: nodo.id })}
          className="px-2 py-1 text-red-600 text-xs hover:underline"
        >
          Eliminar
        </button>
      </div>
    </div>
  );

  const agregar = (clave: string, nivel: NodoArbol['nivel'], padreId: number | null, etiqueta: string) => (
    <div className="flex gap-2 mt-2">
      <input
        value={borradores[clave] || ''}
        onChange={evento => setBorradores({ ...borradores, [clave]: evento.target.value })}
        placeholder={etiqueta}
        className="flex-1 px-2 py-1.5 border rounded text-xs"
      />
      <button
        type="button"
        disabled={!(borradores[clave] || '').trim()}
        onClick={async () => {
          await enviar('crear', { nivel, padre_id: padreId, texto: borradores[clave] });
          setBorradores(previos => ({ ...previos, [clave]: '' }));
        }}
        className="px-3 py-1.5 bg-gray-100 border text-xs font-bold rounded hover:bg-gray-200 disabled:opacity-50"
      >
        + Agregar
      </button>
    </div>
  );

  const central = nodosDe('central')[0];

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-600">
        El árbol de problemas alimenta el informe del líder: el problema central y sus causas directas son las filas de «Problema inicial vs. resultados».
      </p>
      {mensaje && <div className="p-3 bg-red-50 text-red-700 text-sm rounded">{mensaje}</div>}

      <section className="bg-white border rounded-xl p-5 space-y-2">
        <h3 className="font-bold text-uleam-blue">Problema central</h3>
        {central ? filaEditable(central) : agregar('nuevo-central', 'central', null, 'Escribe el problema central')}
      </section>

      <section className="bg-white border rounded-xl p-5 space-y-4">
        <h3 className="font-bold text-uleam-blue">Causas (directas e indirectas)</h3>
        {nodosDe('causa_directa').map(causa => (
          <div key={causa.id} className="border-l-4 border-uleam-blue pl-3 space-y-2">
            <p className="text-xs font-bold text-gray-500 uppercase">Causa directa</p>
            {filaEditable(causa)}
            <div className="pl-4 space-y-2">
              <p className="text-xs font-bold text-gray-500 uppercase">Causas indirectas</p>
              {nodosDe('causa_indirecta', causa.id).map(filaEditable)}
              {agregar(`nueva-indirecta-${causa.id}`, 'causa_indirecta', causa.id, 'Nueva causa indirecta')}
            </div>
          </div>
        ))}
        {agregar('nueva-directa', 'causa_directa', null, 'Nueva causa directa')}
      </section>

      <section className="bg-white border rounded-xl p-5 space-y-2">
        <h3 className="font-bold text-uleam-blue">Efectos directos</h3>
        {nodosDe('efecto_directo').map(filaEditable)}
        {agregar('nuevo-efecto', 'efecto_directo', null, 'Nuevo efecto directo')}
      </section>

      <section className="bg-white border rounded-xl p-5 space-y-2">
        <h3 className="font-bold text-uleam-blue">Efecto final</h3>
        {nodosDe('efecto_final')[0] ? filaEditable(nodosDe('efecto_final')[0]) : agregar('nuevo-efecto-final', 'efecto_final', null, 'Escribe el efecto final')}
      </section>
    </div>
  );
}
