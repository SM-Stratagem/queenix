import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import {
  CompiledQuery,
  DummyDriver,
  Kysely,
  PostgresAdapter,
  PostgresIntrospector,
  PostgresQueryCompiler,
  PostgresDialect,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type DatabaseConnection,
  type DatabaseIntrospector,
  type Dialect,
  type DialectAdapter,
  type Driver,
  type QueryCompiler,
  type QueryResult,
} from "kysely";
import { Pool } from "pg";

export type DbDialect = "pg" | "sqlite";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyDb = Kysely<any>;

const globalForDb = globalThis as unknown as {
  __queenixDb?: AnyDb;
  __queenixDialect?: DbDialect;
};

class NodeSqliteDriver implements Driver {
  private db: DatabaseSync;
  constructor(filename: string) {
    this.db = new DatabaseSync(filename);
  }
  async init(): Promise<void> {}
  async acquireConnection(): Promise<DatabaseConnection> {
    const db = this.db;
    return {
      executeQuery<R>(compiled: CompiledQuery<unknown>): Promise<QueryResult<R>> {
        const stmt = db.prepare(compiled.sql);
        const params = [...compiled.parameters] as SQLInputValue[];
        if (stmt.columns().length > 0) {
          const rows = stmt.all(...params) as R[];
          return Promise.resolve({ rows });
        }
        const info = stmt.run(...params);
        return Promise.resolve({
          rows: [],
          numAffectedRows: BigInt(info.changes ?? 0),
        } as unknown as QueryResult<R>);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      streamQuery<R>(): AsyncIterableIterator<QueryResult<R>> {
        throw new Error("streamQuery not supported by node:sqlite driver");
      },
    };
  }
  async beginTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("begin"));
  }
  async commitTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("commit"));
  }
  async rollbackTransaction(conn: DatabaseConnection): Promise<void> {
    await conn.executeQuery(CompiledQuery.raw("rollback"));
  }
  async releaseConnection(): Promise<void> {}
  async destroy(): Promise<void> {
    this.db.close();
  }
}

class NodeSqliteDialect implements Dialect {
  constructor(private filename: string) {}
  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }
  createDriver(): Driver {
    return new NodeSqliteDriver(this.filename);
  }
  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }
  createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}

function createPgDb(url: string): AnyDb {
  const pool = new Pool({ connectionString: url, max: 10 });
  return new Kysely({
    dialect: new PostgresDialect({ pool }),
  });
}

function createSqliteDb(path: string): AnyDb {
  if (path === ":memory:") {
    return new Kysely({
      dialect: {
        createAdapter: () => new SqliteAdapter(),
        createDriver: () => new DummyDriver(),
        createIntrospector: (db: Kysely<unknown>) => new SqliteIntrospector(db),
        createQueryCompiler: () => new SqliteQueryCompiler(),
      },
    });
  }
  return new Kysely({ dialect: new NodeSqliteDialect(path) });
}

export function getDbDialect(): DbDialect {
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== "") return "pg";
  return "sqlite";
}

export function getDb(): AnyDb {
  if (globalForDb.__queenixDb) return globalForDb.__queenixDb;
  const url = process.env.DATABASE_URL?.trim();
  const db: AnyDb =
    url && url !== ""
      ? createPgDb(url)
      : createSqliteDb(process.env.AUTH_DB_PATH ?? "./.data/queenix-auth.db");
  globalForDb.__queenixDb = db;
  globalForDb.__queenixDialect = url ? "pg" : "sqlite";
  return db;
}

export function getPostgresHelpers(): {
  adapter: PostgresAdapter;
  introspectorDialect: "pg";
  compiler: PostgresQueryCompiler;
  introspector: PostgresIntrospector;
} {
  const db = getDb() as Kysely<unknown>;
  return {
    adapter: new PostgresAdapter(),
    introspectorDialect: "pg",
    compiler: new PostgresQueryCompiler(),
    introspector: new PostgresIntrospector(db),
  };
}

export const db: AnyDb = getDb();
export const dbDialect: DbDialect = getDbDialect();
