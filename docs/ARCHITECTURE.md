# Architettura — Gestionale stoccaggio Archivia Solution

Documento di progetto per l’MVP. Le scelte privilegiano correttezza amministrativa, semplicità operativa e manutenibilità.

## 1. Interpretazione del problema

Archivia Solution fattura lo stoccaggio fisico (scatole) in modo ricorrente. L’amministrazione non deve dimenticare le scadenze e, per i Comuni, non deve emettere fatture oltre l’impegno di spesa.

Il sistema **non** è un calendario: è un registro di clienti + piano fatture materializzato, con calcolo automatico di importi, periodi e consumo dell’impegno.

## 2. Business rules

1. Importo fattura = `scatole × prezzo mensile/scatola × mesi` (3 o 6).
2. Il prezzo è anagrafico (`€/scatola/mese`), inserito a mano.
3. Quantità e prezzo sono fissi nel tempo per l’MVP, ma ogni fattura conserva uno **snapshot** economico.
4. Tipologie: `MUNICIPALITY` (Comune), `PRIVATE_OR_BANKRUPTCY` (Privato / Fallimento).
5. Periodicità: `QUARTERLY` (1 gen, 1 apr, 1 lug, 1 ott) o `SEMIANNUAL` (1 gen, 1 lug).
6. La registrazione del cliente **è** l’emissione della prima fattura del periodo corrente (stato `ISSUED`).
7. Le fatture successive nascono `TO_ISSUE`. Solo l’operatore le marca `EMESSA`.
8. Le fatture `ISSUED` non si ricalcolano e non si cancellano.
9. I clienti non si eliminano: si disattivano.
10. Per i Comuni: impegno utilizzato = somma fatture `ISSUED`; residuo = impegno − utilizzato.
11. Non si può marcare `EMESSA` una fattura comunale se `residuo < importo` (regola server-side, transazionale).
12. Date amministrative = date di calendario Europe/Rome, mai istanti UTC “nudi”.

## 3. Edge case gestiti

| Caso | Comportamento |
| --- | --- |
| Registrazione in un giorno qualsiasi del periodo | Il periodo è comunque quello solare (trimestre/semestre) che contiene la data. |
| Registrazione esattamente il giorno 1 | Quel giorno è sia inizio periodo sia scadenza della prima fattura. |
| Impegno < prima fattura | La creazione del Comune è **rifiutata**. |
| Impegno = prima fattura | Creazione consentita; residuo 0; stato impegno `CRITICO`. |
| Prezzo 0 | Importo 0; l’impegno non si consuma; previsione esaurimento non applicabile. |
| Cliente disattivato | Scompare dalle scadenze operative; lo storico resta. |
| Modifica scatole/prezzo | Aggiorna solo fatture `TO_ISSUE` future; le `ISSUED` restano congelate. |
| Modifica periodicità | Rigenera solo le `TO_ISSUE` a partire dal periodo successivo all’ultima `ISSUED`. |
| Doppio click “Segna come emessa” | `UPDATE … WHERE status = TO_ISSUE`; se 0 righe, l’operazione è un no-op sicuro. |
| Periodo duplicato | Vincolo UNIQUE `(clientId, periodStart, periodEnd)`. |
| Cambio timezone server | Le date amministrative sono `DATE` PostgreSQL + stringhe `YYYY-MM-DD`. |

## 4. Architettura applicativa

Stack: Next.js (App Router) · TypeScript strict · PostgreSQL · Prisma · Tailwind · shadcn/ui · Auth.js (credenziali).

```
Browser (UI italiana)
   ↓ Server Actions / Route Handlers (Zod)
   ↓ Services (transazioni, autorizzazione)
   ↓ Domain (periodi, importi, impegno)   ← unica fonte di verità, testata
   ↓ Prisma
   ↓ PostgreSQL
```

- **UI**: React Server Components + form client per wizard/filtri.
- **Business logic**: moduli puri in `src/lib/billing`, `src/lib/money`, `src/lib/dates` (nessun Prisma).
- **Accesso dati**: `src/server/services`.
- **Validazione**: Zod in `src/lib/validation` (condivisa UI/server).
- **Auth**: un ruolo `ADMIN`, enum estendibile.

Importi: `decimal.js` + `DECIMAL` PostgreSQL. Mai `number` per calcoli monetari.

## 5. Schema database (migliorie rispetto al minimo)

Oltre a User / Client / Invoice:

- `User.role` (`ADMIN`) per ruoli futuri.
- `Invoice.notes`, `issuedById`, `createdById`.
- `Client.createdById`.
- Prezzo unitario `DECIMAL(12,4)` (es. €0,35); importi `DECIMAL(12,2)`.
- Unique `(clientId, periodStart, periodEnd)`.
- Indici su `Invoice(status, scheduledDate)` e `Client(name)`.
- Date amministrative: `@db.Date`. Timestamp tecnici: `DateTime` (timestamptz).

Il residuo impegno **non** è persistito: si calcola dalle fatture emesse.

## 6. Pagine

| Percorso | Contenuto |
| --- | --- |
| `/login` | Accesso |
| `/` | Dashboard: “Cosa devo fatturare?” |
| `/clients` | Anagrafica + filtri |
| `/clients/new` | Wizard di registrazione |
| `/clients/[id]` | Dettaglio, impegno, storico |
| `/clients/[id]/edit` | Modifica anagrafica/contratto |
| `/invoices` | Scadenziario fatture |
| `/invoices/[id]` | Dettaglio + “Segna come emessa” |
| `/invoices/export` | CSV |

## 7. Cartelle

```
prisma/                schema, seed, migrations
src/app/               route UI + api auth/export
src/components/        UI di prodotto + shadcn
src/lib/billing/       periodi, orizzonte, impegno
src/lib/dates/         date di calendario Europe/Rome
src/lib/money/         Decimal, formattazione IT
src/lib/validation/    Zod
src/server/actions/    mutazioni
src/server/services/   persistenza
docs/                  architettura
```

## 8. Strategia generazione scadenze (scelta A ibrida)

**Materializzazione a orizzonte mobile di 24 mesi.**

Perché non il calcolo puramente dinamico (B): la domanda quotidiana è “quali fatture devo emettere?”. Con record persistiti la dashboard è SQL semplice, lo stato `EMESSA` è un dato, e il vincolo unique impedisce i duplicati.

Flusso:

1. Alla registrazione: crea la fattura del periodo corrente `ISSUED` + le successive `TO_ISSUE` fino a oggi + 24 mesi.
2. Ad ogni apertura dashboard / elenco fatture: `ensureHorizon` riempie i buchi futuri (`skipDuplicates`).
3. Non si generano decenni di record.

La “prossima scadenza” è sempre la prima `TO_ISSUE` con `scheduledDate` minima (clienti attivi).

## 9. Strategia impegno

- `utilizzato = SUM(amount) WHERE status = ISSUED`
- `residuo = impegno − utilizzato`
- Prima di `ISSUED`: lock sulla riga Cliente + verifica residuo ≥ importo + update condizionale dello stato.
- Previsione: quante fatture future (importo fisso) stanno ancora nel residuo; data di esaurimento = prima scadenza **non** completamente finanziabile.
- Soglie UI:
  - **CRITICO**: residuo < prossima fattura
  - **ATTENZIONE**: 1 o 2 fatture ancora finanziabili
  - **OK**: 3 o più

## 10. Criticità residue (accettate nell’MVP)

- Un solo contratto / un solo CIG per Comune (rinnovi = evoluzione futura).
- Nessuna rettifica/nota di credito: le emesse sono immutabili.
- Nessuna generazione del PDF fattura né collegamento al gestionale contabile.
- Auth a credenziali interne, un utente seedato.
- Horizon 24 mesi: sufficiente per l’operatività; la previsione di esaurimento oltre l’orizzonte viene calcolata in memoria dalla formula, non solo dai record.
