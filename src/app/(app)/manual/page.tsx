import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const sections = [
  {
    id: "scopo",
    title: "A cosa serve Archivia",
    body: [
      "Archivia è il gestionale operativo di Archivia Solution: ti dice cosa fatturare, a chi, per quale periodo e con quale CIG/impegno.",
      "Non genera il PDF fiscale. Quello nasce nel tuo gestionale contabile esterno. Qui registri numero, data, righe, stato e pagamenti.",
      "Tutti i prezzi e gli impegni sono IVA inclusa.",
    ],
  },
  {
    id: "clienti",
    title: "Clienti e contratti",
    body: [
      "Ogni anagrafica (Comune o privato/fallimento) può avere al massimo due contratti attivi: uno di stoccaggio e uno di movimentazioni.",
      "CIG, determina e impegno appartengono al contratto, non al cliente. Se cambiano, crei una nuova annualità/versione: lo storico resta intatto.",
      "In Nuovo cliente, dopo anagrafica e stoccaggio, scegli i servizi a listino (scansioni, ritiro, invio, macero, Monitora Doc, start up o voce libera) con il relativo prezzo.",
      "Sulla scheda cliente puoi ancora aggiungere servizi, cambiare prezzi, registrare movimentazioni e gestire i contratti.",
    ],
  },
  {
    id: "stoccaggio",
    title: "Stoccaggio",
    body: [
      "Lo stoccaggio si fattura in trimestri solari anticipati (gen–mar, apr–giu, lug–set, ott–dic). La scadenza è il primo giorno del periodo.",
      "Importo = scatole × prezzo mensile/scatola × mesi del periodo.",
      "Se il contratto parte a metà trimestre, la prima fattura conta i mesi residui includendo il mese di inizio (es. ingresso a febbraio → febbraio e marzo).",
    ],
  },
  {
    id: "variazioni",
    title: "Ingressi e uscite scatole",
    body: [
      "Ingresso: aggiorna subito la consistenza e propone una fattura integrativa per i mesi residui del trimestre (mese di ingresso incluso).",
      "Uscita (macero o consegna definitiva): propone una nota di credito dal mese successivo all’uscita fino a fine trimestre già fatturato.",
      "L’invio originale riduce lo stoccaggio solo se lo segni come definitivo. Se è temporaneo, resta solo un servizio fatturabile.",
    ],
  },
  {
    id: "movimentazioni",
    title: "Movimentazioni e catalogo",
    body: [
      "Servizi standard: START UP (una tantum), RITIRO PRATICHE (per intervento), CANONE ANNUO MONITORA DOC, SCANSIONI ON DEMAND / CON URGENZA (per pagina), INVIO ORIGINALE / CON URGENZA (per spedizione), MACERO (per scatola).",
      "Ogni cliente ha prezzi propri con data di decorrenza. Le urgenze hanno listino autonomo, non un supplemento calcolato.",
      "Per registrare una movimentazione serve almeno un servizio a listino oltre allo stoccaggio. Se non indichi il prezzo, viene usato quello del listino.",
      "Le movimentazioni sono posticipate: a inizio trimestre successivo (o semestre, se configurato) vengono aggregate in una riga per servizio. Se nel periodo non c’è nulla, non nasce alcuna voce.",
    ],
  },
  {
    id: "documenti",
    title: "Documenti di fatturazione",
    body: [
      "Tipi: ordinaria, integrativa, nota di credito.",
      "Su ogni fattura da emettere puoi aggiungere servizi dal catalogo (con quantità e prezzo) oppure una voce libera se il servizio non è definito.",
      "Se stoccaggio e movimentazioni condividono lo stesso contratto/CIG, a inizio aprile (esempio) un unico documento può contenere lo stoccaggio aprile–giugno anticipato e le movimentazioni gennaio–marzo posticipate.",
      "Se esistono due CIG/impegni distinti, i documenti restano separati.",
      "In emissione inserisci numero e data del documento contabile esterno. Il sistema blocca l’emissione se l’impegno residuo del contratto non copre l’importo.",
    ],
  },
  {
    id: "impegno",
    title: "Impegno dei Comuni",
    body: [
      "Residuo = impegno della versione contrattuale − somma dei documenti emessi o pagati (integrative positive, note di credito negative).",
      "Soglie: Critico se il residuo non copre la prossima fattura; Attenzione se ne restano 1–2 finanziabili; OK oltre.",
      "Il controllo è per contratto/CIG, non sul totale cliente.",
    ],
  },
  {
    id: "pagamenti",
    title: "Pagamenti",
    body: [
      "Su un documento emesso registri data e importo incassato.",
      "Quando il totale pagato raggiunge l’importo del documento, lo stato passa a Pagata.",
    ],
  },
  {
    id: "istat",
    title: "Adeguamento ISTAT",
    body: [
      "Dalla voce Adeguamento ISTAT inserisci percentuale e data di decorrenza: nasce un’anteprima su tutti i prezzi attivi (stoccaggio e servizi).",
      "Finché non confermi, i listini non cambiano. Alla conferma si creano nuove versioni di prezzo arrotondate ai centesimi.",
      "Le fatture già emesse restano congelate; quelle da emettere successive alla decorrenza vengono ricalcolate.",
    ],
  },
  {
    id: "operativita",
    title: "Flusso operativo quotidiano",
    body: [
      "1. Dashboard: priorità scadute / oggi / 7 giorni / 30 giorni.",
      "2. Scheda cliente: contratti, listino, variazioni scatole, servizi erogati.",
      "3. Fatture: emetti con numero/data esterni, poi registra i pagamenti.",
      "4. Una volta l’anno: anteprima ISTAT → verifica → conferma.",
      "L’orizzonte delle scadenze future viene mantenuto automaticamente a circa 24 mesi.",
    ],
  },
] as const;

export default function ManualPage() {
  return (
    <div className="space-y-6">
      <div className="border-b border-border/80 pb-5">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand">Guida</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Manuale operativo</h1>
        <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
          Sintesi delle logiche di Archivia: contratti, stoccaggio, movimentazioni,
          documenti, impegno, pagamenti e ISTAT.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
          >
            {section.title}
          </a>
        ))}
      </nav>

      <div className="grid gap-4">
        {sections.map((section) => (
          <Card key={section.id} id={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {section.body.map((paragraph) => (
                <p key={paragraph} className="text-foreground/85">
                  {paragraph}
                </p>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
