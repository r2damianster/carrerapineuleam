import { OPCIONES_GENERO } from '@/lib/generos';

interface PerfilBeneficiarios {
  total: number;
  genero: Record<string, number>;
  conDiscapacidad: number;
  tiposDiscapacidad: Record<string, number>;
  rangoEdad: Record<string, number>;
  situacionOcupacional: Record<string, number>;
  nivelEducativo: Record<string, number>;
}

interface FilaDistribucion {
  etiqueta: string;
  cantidad: number;
}

const ETIQUETAS_OCUPACION: Record<string, string> = {
  solo_estudia: 'Solo estudia',
  estudia_trabaja: 'Estudia y trabaja',
  solo_trabaja: 'Solo trabaja',
  desempleado_no_estudia: 'Desempleado/a, no estudia',
  sin_dato: 'Sin dato',
};
const ETIQUETAS_NIVEL: Record<string, string> = {
  universidad: 'Universidad',
  colegio: 'Colegio',
  escuela: 'Escuela',
  sin_dato: 'Sin dato',
};
const ORDEN_RANGO_EDAD = ['0-11', '12-17', '18-29', '30+', 'sin_dato'];

function TarjetaDistribucion({ titulo, filas, total, colorBarra }: {
  titulo: string;
  filas: FilaDistribucion[];
  total: number;
  colorBarra: string;
}) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{titulo}</h3>
      <ul className="space-y-3">
        {filas.map(fila => {
          const porcentaje = total > 0 ? Math.round((fila.cantidad / total) * 100) : 0;
          return (
            <li key={fila.etiqueta}>
              <div className="flex justify-between text-sm text-gray-700 mb-1">
                <span>{fila.etiqueta}</span>
                <span className="font-semibold">{fila.cantidad} <span className="font-normal text-gray-500">({porcentaje}%)</span></span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`${colorBarra} h-2.5 rounded-full`} style={{ width: `${porcentaje}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function PerfilBeneficiariosDashboard({ perfil }: { perfil: PerfilBeneficiarios }) {
  const filasGenero: FilaDistribucion[] = [
    ...OPCIONES_GENERO.map(opcion => ({ etiqueta: opcion.etiqueta, cantidad: perfil.genero[opcion.valor] || 0 })),
    { etiqueta: 'Sin dato', cantidad: perfil.genero.sin_dato || 0 },
  ].filter(fila => fila.cantidad > 0);

  const cantidadLgbti = (perfil.genero.mujer_lgbti || 0) + (perfil.genero.hombre_lgbti || 0);

  const filasDiscapacidad: FilaDistribucion[] = [
    { etiqueta: 'Con discapacidad', cantidad: perfil.conDiscapacidad },
    { etiqueta: 'Sin discapacidad', cantidad: perfil.total - perfil.conDiscapacidad },
  ];
  const filasTiposDiscapacidad: FilaDistribucion[] = Object.entries(perfil.tiposDiscapacidad)
    .map(([tipo, cantidad]) => ({ etiqueta: tipo.charAt(0).toUpperCase() + tipo.slice(1), cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  const filasEdad: FilaDistribucion[] = ORDEN_RANGO_EDAD
    .filter(rango => perfil.rangoEdad[rango])
    .map(rango => ({ etiqueta: rango === 'sin_dato' ? 'Sin dato' : `${rango} años`, cantidad: perfil.rangoEdad[rango] }));

  const filasOcupacion: FilaDistribucion[] = Object.entries(perfil.situacionOcupacional)
    .map(([clave, cantidad]) => ({ etiqueta: ETIQUETAS_OCUPACION[clave] || clave, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
  const filasNivel: FilaDistribucion[] = Object.entries(perfil.nivelEducativo)
    .map(([clave, cantidad]) => ({ etiqueta: ETIQUETAS_NIVEL[clave] || clave, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);

  if (perfil.total === 0) {
    return <p className="text-sm text-gray-500">No hay beneficiarios en este período.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <TarjetaDistribucion titulo={`Género (${cantidadLgbti} LGBTI+)`} filas={filasGenero} total={perfil.total} colorBarra="bg-pink-500" />
      <TarjetaDistribucion titulo="Discapacidad" filas={filasDiscapacidad} total={perfil.total} colorBarra="bg-indigo-500" />
      {filasTiposDiscapacidad.length > 0 && (
        <TarjetaDistribucion titulo="Tipos de discapacidad" filas={filasTiposDiscapacidad} total={perfil.conDiscapacidad} colorBarra="bg-violet-500" />
      )}
      <TarjetaDistribucion titulo="Edad" filas={filasEdad} total={perfil.total} colorBarra="bg-teal-500" />
      <TarjetaDistribucion titulo="Situación ocupacional" filas={filasOcupacion} total={perfil.total} colorBarra="bg-amber-500" />
      <TarjetaDistribucion titulo="Nivel educativo" filas={filasNivel} total={perfil.total} colorBarra="bg-sky-500" />
    </div>
  );
}
