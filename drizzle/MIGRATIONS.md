# Migration history

The journal preserves entries 0000–0016 and registers the later SQL in dependency order.
0024a restores the missing industries prerequisite; phase 5 and conversation pinning
are applied before 0025. 0052 restores tables and local authentication columns that
previously existed only in the TypeScript schema. Statement breakpoints allow the
normal MySQL driver to execute scripts without enabling multipleStatements.

For a new database, apply the committed history with `pnpm exec drizzle-kit migrate`.
Do not generate a migration as part of applying this history: the historical snapshots
stop at 0016 and have not been regenerated. The existing db:push script generates first.

## Existing installations

Do not apply the expanded journal blindly to a database that received manual SQL or
_full_schema.sql: those changes may already exist without migration tracking. First
back up and reconcile the actual schema and migration ledger on an isolated copy.
This change validates a fresh installation and a tracked repeat, not an upgrade of
an arbitrary manually modified database. No existing deployment was contacted.

## Isolated validation

PowerShell: `$env:RUN_MIGRATIONS_MYSQL='1'; npm test -- server/quotations.mysql.test.ts`
POSIX: `RUN_MIGRATIONS_MYSQL=1 npm test -- server/quotations.mysql.test.ts`

Requires Docker and mysql:8.4. The test creates its own temporary container and
loopback connection, applies the real journal twice, checks the migration count and
preservation of a sentinel user, checks application table/column presence, and runs
quotation persistence, ownership, aggregation and linked deletion tests. Container
data lives in tmpfs and is removed afterward. The presence check does not certify
that every historical column type, index or constraint matches the current schema.
