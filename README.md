# ESM Web

ESM Web is the proof-of-concept technical foundation for Employee Services Management.

Status: Technical foundation / proof of concept. This project is not approved for production use.

## Stack

- Next.js
- TypeScript
- Node.js LTS
- PostgreSQL 17
- Prisma
- npm
- Git

## Local Development

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
copy .env.example .env
```

Update `.env` manually with local-only values. Do not commit `.env`.

Start the development server:

```bash
npm run dev
```

Run linting:

```bash
npm run lint
```

Generate the Prisma client after schema changes:

```bash
npx prisma generate
```

Run local development migrations only against the local development database:

```bash
npx prisma migrate dev
```

## Security Warning

Do not commit or expose `.env`, database passwords, employee data, employee attachments, PostgreSQL backups, GitHub tokens, email credentials, or HR Excel/CSV files with real employee data.

Use placeholder or clearly dummy examples only. No real employee data belongs in this repository.

Read [docs/DEVELOPMENT_RULES.md](docs/DEVELOPMENT_RULES.md) before adding features, schema changes, seed scripts, uploads, exports, or integrations.
