# Archivia — Gestionale stoccaggio

Gestionale interno di **Archivia Solution** per la fatturazione ricorrente dei servizi di stoccaggio (scatole). L’obiettivo operativo è aprire la dashboard e capire subito **cosa fatturare**, a chi, per quale periodo e quanto resta degli impegni dei Comuni.

Documentazione di progetto: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Stack

- Next.js 16 (App Router) + TypeScript strict
- PostgreSQL 16 + Prisma ORM
- Tailwind CSS + shadcn/ui
- Auth.js (credenziali, ruolo `ADMIN`)
- `decimal.js` per i calcoli monetari (niente floating point incontrollati)

## Installazione

Requisiti: Node.js 22+, Docker (per PostgreSQL locale).

```bash
git clone https://github.com/bmarone2002/gestionalefatture.git
cd gestionalefatture
npm install
cp .env.example .env
```

Generare un `AUTH_SECRET` lungo e casuale:

```bash
openssl rand -base64 32
```

Inserirlo in `.env`. Le altre variabili di default vanno bene per lo sviluppo locale.

## Database

Avvio PostgreSQL:

```bash
npm run db:up
```

Migrazioni e dati demo:

```bash
npx prisma migrate dev --name init
npm run db:seed
```

Utente di default:

- Email: `admin@archiviasolution.it`
- Password: `Archivia2026!`

Cambiare la password dopo il primo accesso in produzione. Lo seed locale crea anche clienti di esempio: **non usarlo su Railway**.

## Avvio locale

```bash
npm run dev
```

Aprire [http://localhost:3000](http://localhost:3000).

Test della business logic:

```bash
npm test
```

Prisma Studio:

```bash
npm run db:studio
```

## Build

```bash
npm run build
npm start
```

## Deployment su Railway

Il repository è pronto per Railway (`railway.toml`, Node 22, `prisma migrate deploy` all’avvio).

1. Spingere il codice su GitHub (remote: `https://github.com/bmarone2002/gestionalefatture.git`).
2. Su [Railway](https://railway.app) accedere con GitHub → **New Project** → **Deploy from GitHub repo** → `gestionalefatture`.
3. Nel progetto: **Add Service** → **Database** → **PostgreSQL**.
4. Sul servizio Next.js, in **Variables**, impostare:

| Variabile | Valore |
| --- | --- |
| `DATABASE_URL` | riferimento a PostgreSQL: `${{Postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | output di `openssl rand -base64 32` |
| `AUTH_URL` | `https://<dominio-pubblico-railway>` (con `https://`, senza `/` finale) |
| `AUTH_TRUST_HOST` | `true` |
| `SEED_ADMIN_EMAIL` | email dell’amministratore |
| `SEED_ADMIN_PASSWORD` | password iniziale forte |

5. In **Settings** del servizio web: **Generate Domain**.
6. Aggiornare `AUTH_URL` con quel dominio e **Redeploy**.
7. Non eseguire `prisma db seed` in produzione: crea i clienti demo. L’admin viene creato all’avvio da `scripts/ensure-admin.mjs`.

## Deployment generico

1. Provisionare un PostgreSQL.
2. Impostare `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`.
3. `npx prisma migrate deploy`
4. `npm run build` e `npm start`

Esempio Docker applicativo (oltre a `docker-compose.yml` già presente per il DB):

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate && npm run build
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]
```

## Backup

Dump PostgreSQL:

```bash
chmod +x scripts/backup.sh
npm run export:backup
```

Il file viene salvato in `backups/`. In produzione schedulare il comando (cron giornaliero) e copiare i dump su storage esterno.

È disponibile anche **Esporta fatture CSV** dalla pagina Fatture (UTF-8 con BOM, separatore `;`, apribile con Excel).

## Operatività

- **Dashboard**: scadute, oggi, 7 giorni, 30 giorni.
- **Clienti**: anagrafica; per i Comuni determina, CIG e impegno.
- **Registrazione cliente**: la prima fattura del periodo corrente nasce già **Emessa**.
- **Fatture**: “Segna come emessa” con conferma. Per i Comuni l’emissione è bloccata se l’impegno residuo non copre l’importo.

## Scadenze

Le fatture future sono materializzate per i **24 mesi** successivi e completate all’apertura della dashboard. Non si generano decenni di record. Dettagli in `docs/ARCHITECTURE.md`.
