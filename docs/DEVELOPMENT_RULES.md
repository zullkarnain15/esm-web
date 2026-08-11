# ESM Web Development Rules

ESM Web, Employee Services Management, is currently a technical foundation and proof of concept. It is not approved for production use. Treat all work as exploratory and security-sensitive.

## Prohibited Files And Data

Never add, commit, or expose these files or data in the repository:

- `.env` or any local environment file
- Database passwords or connection strings with real credentials
- Real employee data
- Employee attachments
- PostgreSQL backups, dumps, snapshots, or restored database files
- GitHub tokens
- Email credentials
- HR Excel, CSV, TSV, or spreadsheet files with real employee data
- Payroll, salary, identity, tax, medical, or private contact information

No real employee data, attachment, backup, or credential can be added to the repository.

## Environment Files

- `.env` must never be committed.
- `.env` is for local machine values only.
- `.env.example` is allowed in Git.
- `.env.example` must contain only placeholder or dummy values.
- `.env.example` must not contain real secrets, real passwords, real tokens, real email credentials, or real employee data.

## Dummy Data Only

- Use placeholder, fictional, mock, or clearly dummy values only.
- Test data and seed data must not resemble real employees.
- Do not import real HR Excel or CSV files into the repository.
- Do not use production data dumps for development.
- Store local generated files, exports, uploads, and attachments only in ignored local folders such as `storage/`, `attachments/`, `exports/`, or `generated_letters/`.

## PostgreSQL Development Database

Use a local PostgreSQL 17 development database:

- Database name: `esm_dev`
- Application user: `esm_app`
- `postgres` superuser: local database maintenance only

The application should connect as `esm_app`, not as `postgres`. Use the `postgres` user only for local tasks such as creating the database, creating the application user, changing ownership, or other database maintenance.

## Git Safety Check Before Every Commit

Before every commit, run:

```bash
git status
git check-ignore -v .env
git check-ignore -v storage/
```

Also review staged changes before committing:

```bash
git diff --staged
```

Do not commit if any real employee data, employee attachment, PostgreSQL backup, credential, token, database password, email credential, or HR Excel/CSV file appears in the output.

## Next.js And Prisma Notes

- This project uses Next.js with TypeScript.
- Keep secrets and database access server-side.
- Do not expose private values through `NEXT_PUBLIC_` variables.
- Prisma configuration lives in `prisma.config.ts`.
- The Prisma schema lives in `prisma/schema.prisma`.
- Generate the Prisma client after schema changes with `npx prisma generate`.
- Run migrations only against the local `esm_dev` development database unless the project is explicitly approved for another environment.
