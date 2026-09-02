import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL as string);

/**
 * Capa de acceso a datos del panel /superadmin. Nombres de tabla/columna
 * SIEMPRE se validan contra information_schema antes de interpolarse en un
 * string de SQL — es la única parte del repo que arma SQL dinámico con
 * identificadores, así que el whitelist contra el catálogo real de Postgres
 * es lo que evita inyección vía nombre de tabla/columna. Los valores de
 * datos van siempre parametrizados ($1, $2...) vía sql.query().
 */

function quoteIdent(identifier: string): string {
  return '"' + identifier.replace(/"/g, '""') + '"';
}

export interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: 'YES' | 'NO';
  column_default: string | null;
}

export async function listTables(): Promise<string[]> {
  const rows = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `;
  return rows.map((r: any) => r.table_name);
}

export async function assertValidTable(table: string): Promise<void> {
  const rows = await sql`
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = ${table}
  `;
  if (rows.length === 0) throw new Error(`Tabla "${table}" no existe`);
}

export async function getTableColumns(table: string): Promise<ColumnInfo[]> {
  const rows = await sql`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table}
    ORDER BY ordinal_position
  `;
  return rows as unknown as ColumnInfo[];
}

export async function getPrimaryKeyColumn(table: string): Promise<string | null> {
  const rows = await sql`
    SELECT a.attname AS column_name
    FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
    WHERE i.indrelid = ${table}::regclass AND i.indisprimary
    LIMIT 1
  `;
  return (rows[0] as any)?.column_name ?? null;
}

export interface RowsPage {
  rows: Record<string, any>[];
  total: number;
  columns: ColumnInfo[];
  primaryKey: string | null;
}

export async function getRows(
  table: string,
  opts: { page: number; limit: number; sortColumn?: string; sortDir?: 'asc' | 'desc' }
): Promise<RowsPage> {
  await assertValidTable(table);
  const columns = await getTableColumns(table);
  const validColumns = new Set(columns.map((c) => c.column_name));
  const primaryKey = await getPrimaryKeyColumn(table);

  let orderClause = '';
  if (opts.sortColumn && validColumns.has(opts.sortColumn)) {
    orderClause = `ORDER BY ${quoteIdent(opts.sortColumn)} ${opts.sortDir === 'desc' ? 'DESC' : 'ASC'}`;
  } else if (primaryKey) {
    orderClause = `ORDER BY ${quoteIdent(primaryKey)} ASC`;
  }

  const limit = Math.min(Math.max(opts.limit, 1), 500);
  const page = Math.max(opts.page, 1);
  const offset = (page - 1) * limit;

  const rows = await sql.query(
    `SELECT * FROM ${quoteIdent(table)} ${orderClause} LIMIT $1 OFFSET $2`,
    [limit, offset]
  );
  const countResult = await sql.query(`SELECT COUNT(*)::int AS count FROM ${quoteIdent(table)}`, []);

  return {
    rows: rows as Record<string, any>[],
    total: (countResult[0] as any).count,
    columns,
    primaryKey,
  };
}

export async function insertRow(table: string, data: Record<string, any>): Promise<Record<string, any>> {
  await assertValidTable(table);
  const columns = await getTableColumns(table);
  const validColumns = new Set(columns.map((c) => c.column_name));
  const keys = Object.keys(data).filter((k) => validColumns.has(k));
  if (keys.length === 0) throw new Error('No hay columnas válidas para insertar');

  const colSql = keys.map(quoteIdent).join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map((k) => data[k]);

  const rows = await sql.query(
    `INSERT INTO ${quoteIdent(table)} (${colSql}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0] as Record<string, any>;
}

export async function updateRow(
  table: string,
  pkValue: any,
  data: Record<string, any>
): Promise<Record<string, any>> {
  await assertValidTable(table);
  const columns = await getTableColumns(table);
  const validColumns = new Set(columns.map((c) => c.column_name));
  const primaryKey = await getPrimaryKeyColumn(table);
  if (!primaryKey) throw new Error(`Tabla "${table}" no tiene primary key — edición por fila no soportada`);

  const keys = Object.keys(data).filter((k) => validColumns.has(k) && k !== primaryKey);
  if (keys.length === 0) throw new Error('No hay columnas válidas para actualizar');

  const setSql = keys.map((k, i) => `${quoteIdent(k)} = $${i + 1}`).join(', ');
  const values = keys.map((k) => data[k]);
  values.push(pkValue);

  const rows = await sql.query(
    `UPDATE ${quoteIdent(table)} SET ${setSql} WHERE ${quoteIdent(primaryKey)} = $${keys.length + 1} RETURNING *`,
    values
  );
  if (rows.length === 0) throw new Error('No se encontró la fila (¿PK incorrecta?)');
  return rows[0] as Record<string, any>;
}

export async function deleteRow(table: string, pkValue: any): Promise<Record<string, any>> {
  await assertValidTable(table);
  const primaryKey = await getPrimaryKeyColumn(table);
  if (!primaryKey) throw new Error(`Tabla "${table}" no tiene primary key — borrado por fila no soportada`);

  const rows = await sql.query(
    `DELETE FROM ${quoteIdent(table)} WHERE ${quoteIdent(primaryKey)} = $1 RETURNING *`,
    [pkValue]
  );
  if (rows.length === 0) throw new Error('No se encontró la fila (¿PK incorrecta?)');
  return rows[0] as Record<string, any>;
}

const DESTRUCTIVE_NO_WHERE = /^\s*(DELETE|UPDATE)\b(?![\s\S]*\bWHERE\b)/i;
const ALWAYS_DESTRUCTIVE = /^\s*(DROP|TRUNCATE|ALTER)\b/i;

export function isDestructiveSql(query: string): boolean {
  const trimmed = query.trim();
  return ALWAYS_DESTRUCTIVE.test(trimmed) || DESTRUCTIVE_NO_WHERE.test(trimmed);
}

export async function runRawSql(query: string): Promise<any[]> {
  const rows = await sql.query(query);
  return rows as any[];
}
