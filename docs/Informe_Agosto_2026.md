# INFORME MENSUAL DE ACTIVIDADES — PROYECTO PINE
## AGOSTO 2026

**Institución:** Universidad Laica Eloy Alfaro de Manabí (ULEAM)

**Proyecto:** Innovaciones Pedagógicas para el Desarrollo Sostenible: Inclusión, Interculturalidad e Interdisciplinaridad

**Período:** 1 — 31 de agosto de 2026

**Responsable:** Dr. Arturo Rodríguez Zambrano, Líder del Proyecto

**Fecha de Elaboración:** 4 de septiembre de 2026

---

## 1. OBJETIVO

Informar de manera sistemática sobre el desarrollo de actividades, producción audiovisual, publicaciones científicas, colaboración internacional y consolidación de infraestructura digital operativa del Proyecto de Innovaciones Pedagógicas e Internacionalización (PINE) durante el mes de agosto de 2026.

---

## 2. ACTIVIDADES ACADÉMICAS Y DE TRANSFERENCIA

### 2.1 Capacitación Internacional — Dr. Asier Romero Andonegi (UPV/EHU)
**Fechas:** 4 — 13 de agosto de 2026 (40 horas académicas)
**Lugar:** Manta
**Docente capacitador:** Dr. Asier Romero Andonegi, Universidad del País Vasco (UPV/EHU), España
**Organizan:** Facultad de Educación y Turismo (ULEAM) + Red de Investigación Científica sobre Comprensión Lectora y Escritura Académica y Creativa (RED-LEA)

**Contenidos:**
- Pensamiento crítico y uso pedagógico de la Inteligencia Artificial en la Educación Superior
- Análisis del discurso en español
- Mentoría para el desarrollo profesional docente
- Didácticas y uso ético de la IA en el contexto universitario (módulo específico para doctorandos)

**Resultado/Evidencia:**
- 14 docentes de la Facultad de Educación y Turismo certificados (`2026-08-13_CertificadosCapacitacionAsierRomero-FET-signed.pdf`)
- 4 doctorandos del programa de doctorado UPV/EHU certificados adicionalmente por RED-LEA (`2026-08-13_CertificadosDoctorandosEHU-AsierRomero-signed.pdf`), entre ellos **Dr. Arturo Rodríguez Zambrano**, líder de este proyecto y doctorando en Psicodidáctica (UPV/EHU)
- Registrado en la plataforma como noticia (actividad id 27)

**Impacto:** Colaboración internacional directa con la Universidad del País Vasco — fortalece la línea de internacionalización del proyecto y capitaliza en formación docente el propio proceso doctoral del líder del proyecto.

---

## 3. PRODUCCIÓN AUDIOVISUAL — PODCASTS

**Total de episodios producidos en agosto: 2**

### 3.1 Serie "Educa PINE"

#### "Unpopular Opinions and uncomfortable truths"
- **Fecha de publicación:** 3 de agosto de 2026
- **YouTube ID:** 8i10ze45VuQ
- **Categoría:** cat_1 (Educa PINE)
- **Tags:** docencia, debate, pensamiento-crítico
- **Descripción Académica:** Episodio resultado de prácticas de aula donde se discuten opiniones impopulares e incómodas verdades. Producto del proyecto de vinculación con la sociedad de la carrera de Pedagogía de Idiomas.

### 3.2 Serie "Más Allá del Lienzo" — Episodio 3

#### "Apropiación Cultural en la Industria de la Moda"
- **Fecha de publicación:** 3 de agosto de 2026
- **YouTube ID:** 0VffZ_RwlRU
- **Categoría:** cat_4
- **Tags:** investigación, arte, ética, cultura, moda, interdisciplinario
- **Descripción Académica:** Tercer episodio de la serie de debate interdisciplinario entre Pedagogía de Idiomas y Artes. Reflexión crítica sobre la apropiación cultural en la industria de la moda y sus implicaciones éticas y culturales.

**Subtotal:** 2 episodios | Continuidad de ambas series activas del proyecto.

---

## 4. PUBLICACIONES CIENTÍFICAS

**Total de publicaciones registradas en agosto: 2**

### 4.1 pub_75: "Confidence and Formal Speech in High School Students in English Language: Mentoring in EFL instruction"
- **Fecha de registro:** 3 de agosto de 2026
- **Autores:** Lascano Parrales, M. J., & Villafuerte-Holguín, J.
- **Tipo:** Artículo científico
- **Revista:** Journal of English Language Teaching and Applied Linguistics, Vol. 8, No. 8, pp. 142-156
- **DOI:** https://doi.org/10.32996/jeltal.2026.8.8.13
- **Categoría:** regional
- **Fecha de publicación:** 1 de agosto de 2026
- **Descripción:** Estudio sobre confianza y expresión oral formal en inglés en estudiantes de bachillerato, en el marco de la mentoría en la enseñanza de EFL.

### 4.2 pub_76: "Practice of Speaking English Language Fluency through Innovating Communicative Tasks"
- **Fecha de registro:** 3 de agosto de 2026
- **Autores:** Vélez Borja, N., & Rodríguez Zambrano, A.
- **Tipo:** Artículo científico
- **Revista:** Education Quarterly Reviews, Vol. 9, No. 3
- **DOI:** https://doi.org/10.31014/aior.1993.09.03.722
- **Categoría:** regional
- **Fecha de publicación:** 1 de agosto de 2026
- **Descripción:** Práctica de fluidez oral en inglés mediante tareas comunicativas innovadoras.

---

## 5. CONSOLIDACIÓN DE INFRAESTRUCTURA DIGITAL — PORTAL PINE

Hito principal del mes: construcción y despliegue completo del **Portal PINE**, sistema operativo propio del proyecto sobre base de datos real (Neon Postgres), que reemplaza el panel administrativo estático anterior para las funciones de docencia/vinculación/investigación.

### 5.1 Autenticación unificada
Sesión única firmada (HMAC) para todo el sistema — Portal y panel de contenido del sitio. Reemplaza el esquema anterior sin firma criptográfica (vulnerable a suplantación).

### 5.2 Módulo de Vinculación operativo end-to-end
- Gestión de espacios (clubes/aulas) por el profesor
- Asignación de estudiantes-instructores
- Registro de beneficiarios (sin necesidad de cuenta propia)
- Test MCER digital
- Encuesta de satisfacción
- Bitácora de asistencia

### 5.3 Alta de pasantes (estudiantes-instructores)
Flujo de activación en primer login (sin registro público abierto) + carga masiva por Excel para altas en lote.

### 5.4 Separación Investigación / Vinculación / Gestión de Carrera
Áreas antes fusionadas en un solo panel ("Docencia") ahora operan de forma independiente, cada una con su propio control de acceso por espacio.

### 5.5 Restricción del panel de contenido del sitio
`/admin` (gestión de contenido público) ahora exige el módulo `contenido_sitio`, restringido a Arturo Rodríguez y Jhonny Villafuerte (líder/colíder del proyecto) — separado del módulo `admin` genérico (indicadores) que sí tienen German Carrera y Verónica Chávez.

### 5.6 Corrección de identidad fabricada
Se detectó y eliminó una identidad de persona inexistente ("Mg. Veronika Vera") junto con su proyecto y página pública asociada, introducida por error en desarrollo previo — sin impacto en producción real ya que nunca fue confirmada por el equipo.

### 5.7 Nueva sección pública RED LEA
Página `/redlea` — memoria institucional de la Red de Investigación Científica sobre Comprensión Lectora y Escritura Académica y Creativa, vinculada a la colaboración internacional con UPV/EHU (ver punto 2.1).

### 5.8 Primeros registros reales en el Portal
- Arturo Rodríguez (líder) — cuenta activada 30 de agosto
- Cintya Zambrano (líder de Vinculación) — cuenta activada 31 de agosto, con corrección de correo institucional

**Impacto:** El proyecto pasa de un sitio de difusión estático a un sistema operativo real para la gestión diaria de vinculación, investigación y docencia — condición habilitante para que todo el equipo (no solo el líder) opere el proyecto de forma autónoma en los próximos meses.

---

## 6. INDICADORES DE DESEMPEÑO — AGOSTO 2026

| Indicador | Meta | Alcanzado | % Cumplimiento | Notas |
|-----------|:----:|:---------:|:--------------:|-------|
| **Episodios Podcast Producidos** | 2 | 2 | 100% | Cumplido, ritmo sostenido |
| **Publicaciones Científicas Registradas** | 2 | 2 | 100% | Cumplido |
| **Capacitaciones Internacionales** | 0 | 1 | 100% | No programada — colaboración UPV/EHU |
| **Docentes/Doctorandos Certificados** | — | 18 | — | 14 docentes FET + 4 doctorandos RED-LEA |
| **Módulos del Portal PINE Lanzados** | — | 5 | — | Vinculación, Investigación, Gestión de Carrera, Pasantes, Contenido del sitio |
| **Cuentas Reales Activadas en Portal** | — | 2 | — | Arturo Rodríguez, Cintya Zambrano |

*Nota:* el Test MCER y la Encuesta de Satisfacción del Portal no registran evaluaciones en agosto — el módulo se activó recién a fin de mes (30-31 de agosto), sin beneficiarios cargados todavía por el resto del equipo.

---

## 7. ANÁLISIS DE IMPACTO POR ÁREA

### 7.1 Investigación
- **2 artículos científicos** registrados en índices regionales (JELTAL, Education Quarterly Reviews)
- **Colaboración internacional certificada:** 4 doctorandos UPV/EHU, incluido el líder del proyecto

### 7.2 Docencia
- **2 episodios de podcast** derivados de prácticas de aula y debate interdisciplinario
- **40 horas de capacitación docente** en pensamiento crítico, IA educativa y análisis del discurso

### 7.3 Vinculación
- **Portal PINE operativo:** infraestructura real para que estudiantes-instructores registren asistencia, evalúen MCER y encuesten beneficiarios sin depender de hojas de cálculo o WhatsApp

### 7.4 Internacionalización
- **Alianza directa con UPV/EHU** (España) vía capacitación certificada y RED-LEA
- **Página pública RED LEA** documenta la colaboración institucional

---

## 8. ARTICULACIÓN CON FUNCIONES SUSTANTIVAS UNIVERSITARIAS

### Investigación ✓
- 2 artículos en revistas indexadas regionales
- Certificación doctoral internacional del líder del proyecto (UPV/EHU)

### Docencia ✓
- 2 episodios podcast derivados de prácticas de aula
- Capacitación docente de 40 horas en IA y pensamiento crítico

### Vinculación ✓
- Lanzamiento del sistema operativo de Vinculación (Portal PINE) — condición habilitante para el trabajo de campo del resto del año

---

## 9. PRODUCCIÓN Y ENTREGABLES CONCRETOS

| Tipo de Producto | Cantidad | Detalle |
|------------------|:--------:|---------|
| Episodios Podcast | 2 | Educa PINE (1), Más Allá del Lienzo Ep. 3 (1) |
| Artículos Científicos Publicados | 2 | JELTAL, Education Quarterly Reviews |
| Capacitación Internacional | 1 | Dr. Asier Romero Andonegi (UPV/EHU), 40h |
| Docentes/Doctorandos Certificados | 18 | 14 FET + 4 RED-LEA |
| Módulos de Sistema Lanzados | 5 | Portal PINE completo (Vinculación/Investigación/Gestión de Carrera/Pasantes/Contenido) |
| Página Pública Nueva | 1 | RED LEA (`/redlea`) |
| Cuentas Reales Activadas | 2 | Arturo Rodríguez, Cintya Zambrano |

---

## 10. NOVEDADES Y LOGROS RELEVANTES

### Logro 1: Portal PINE — De Sitio Estático a Sistema Operativo
Agosto marca la transición del proyecto de una página de difusión a una plataforma con base de datos real (Neon Postgres), autenticación segura y control de acceso por rol y por espacio. Es el cambio estructural más grande del proyecto desde su creación.

### Logro 2: Colaboración Internacional Certificada con UPV/EHU
18 personas certificadas (14 docentes + 4 doctorandos) en una capacitación de 40 horas dictada directamente por un académico de la Universidad del País Vasco — fortalece de forma concreta, no solo declarativa, la línea de internacionalización del proyecto.

### Logro 3: Continuidad de Producción Científica y Audiovisual
Pese a la carga de desarrollo del Portal, el proyecto sostuvo su ritmo habitual de publicaciones (2) y podcasts (2), sin sacrificar ninguna de sus dos líneas de producción por priorizar la otra.

---

## 11. DESAFÍOS IDENTIFICADOS

1. **Adopción del Portal por el resto del equipo:** solo 2 de las personas con rol de gestión (Arturo, Cintya) tienen cuenta activada a cierre de mes — falta que German Carrera, Verónica Chávez y los estudiantes-instructores se registren para que el sistema tenga uso real.

2. **Sin datos operativos todavía:** cero evaluaciones MCER y cero encuestas de satisfacción registradas — el Portal existe pero aún no se ha usado en campo con beneficiarios reales.

3. **Deuda de identidad de datos:** se detectó y corrigió una identidad de persona fabricada en desarrollo previo — recordatorio de verificar siempre nombres/emails/proyectos antes de publicarlos.

---

## 12. RECOMENDACIONES

### Corto Plazo (Septiembre-Octubre 2026)

1. **Onboarding del equipo al Portal:** que German Carrera, Verónica Chávez y los estudiantes-instructores de Vinculación activen su cuenta y registren su primer espacio/beneficiario real.

2. **Primer ciclo de datos reales:** registrar al menos un Test MCER y una Encuesta de Satisfacción con beneficiarios reales del Club de Inglés, para validar el flujo completo de principio a fin.

3. **Formalizar la colaboración UPV/EHU:** explorar si la capacitación de agosto puede convertirse en un convenio o memorando de entendimiento formal entre ULEAM y UPV/EHU.

### Mediano Plazo (Noviembre-Diciembre 2026)

1. **Dashboard de indicadores del Portal:** ampliar `/pine-dashboard` con métricas reales de uso (espacios activos, beneficiarios atendidos, evaluaciones completadas).

2. **Capacitación interna sobre el Portal:** sesión práctica para el equipo sobre el nuevo flujo de Registros vs. Gestión de Vinculación.

### Largo Plazo (2027)

1. **Expandir el módulo de Investigación:** hoy solo permite creación de espacios — definir y construir su flujo operativo completo (equivalente al de Vinculación).

---

## 13. CIERRE

Agosto de 2026 fue el mes de mayor transformación estructural del Proyecto PINE: el lanzamiento del Portal PINE convierte al proyecto en un sistema con datos operativos reales, no solo un sitio de difusión. A esto se suma una colaboración internacional certificada con la Universidad del País Vasco (18 personas certificadas) y la continuidad sin interrupciones de la producción científica (2 artículos) y audiovisual (2 podcasts) del proyecto.

✓ **Infraestructura:** Portal PINE operativo con auth segura y control de acceso real
✓ **Internacionalización:** colaboración certificada con UPV/EHU, incluido el propio líder del proyecto como doctorando certificado
✓ **Continuidad Científica:** publicaciones y podcasts sin interrupción pese a la carga de desarrollo
✓ **Transparencia:** identidad de datos fabricada detectada y corregida

**El proyecto cierra agosto con la base técnica lista para que la operación de Vinculación, Investigación y Docencia deje de depender de un solo responsable.**

---

## ANEXOS

### A. Resumen de Publicaciones Agosto 2026
```
pub_75 (3 ago) — Confidence and Formal Speech... — JELTAL
pub_76 (3 ago) — Practice of Speaking English Fluency... — Education Quarterly Reviews
```

### B. Episodios Podcast Agosto 2026
```
video_19 (3 ago) — Educa PINE | Unpopular Opinions and uncomfortable truths
video_20 (3 ago) — Más Allá del Lienzo Ep.3 | Apropiación cultural en la moda
```

### C. Capacitación Internacional Agosto 2026
```
4-13 agosto — Dr. Asier Romero Andonegi (UPV/EHU) — 40h
  14 docentes certificados (FET)
  4 doctorandos certificados (RED-LEA), incl. Arturo Rodríguez Zambrano
```

### D. Hitos del Portal PINE — Agosto 2026
```
30 ago — Lanzamiento Portal PINE (auth unificada, RBAC, Vinculación completa)
30 ago — Separación Investigación/Vinculación/Gestión de Carrera
31 ago — Restricción de /admin a Arturo+Jhonny (módulo contenido_sitio)
31 ago — Alta de pasantes con activación en primer login + carga masiva Excel
31 ago — Corrección: eliminación de identidad fabricada "Veronika Vera"
```

---

**Distribuir a:** Dirección de Investigación ULEAM | Coordinación de Carreras | Grupos de Interés Académico

**Fecha:** 4 de septiembre de 2026

**Elaboró:** Dr. Arturo Rodríguez Zambrano — Líder Proyecto PINE
