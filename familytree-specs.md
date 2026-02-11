# 🌳 FamilyTree — Specifiche Tecniche & TODO

> **App web frontend-only per la creazione, visualizzazione e condivisione di alberi genealogici.**
> Obiettivo: semplicità assoluta, design moderno, zero backend.

---

## 1. Vision & Principi di Design

### Filosofia UX
L'app deve essere utilizzabile da chiunque, dalla "casalinga di Voghera" al genealogista esperto. Ogni interazione deve essere intuitiva, con zero curva di apprendimento per le operazioni base.

**Principi cardine:**
- **Progressive disclosure**: mostra solo ciò che serve, quando serve. Le funzioni avanzate sono nascoste finché non servono.
- **Direct manipulation**: drag & drop, click-to-edit, interazione diretta sull'albero.
- **Zero-config start**: l'utente apre l'app e inizia subito ad aggiungere persone. Niente registrazioni, niente wizard.
- **Forgiving UI**: undo/redo illimitato, nessuna azione distruttiva senza conferma.

### Design Language
- **Stile**: glassmorphism leggero con sfumature pastello, angoli arrotondati generosi (16-24px), ombre morbide.
- **Tipografia**: font system-native per performance + un display font (es. Inter o Satoshi) per titoli.
- **Animazioni**: micro-interazioni fluide (spring-based con Framer Motion), transizioni morbide tra stati.
- **Palette Light**: sfondo caldo off-white (#FAFAF8), nodi in tonalità naturali (verde salvia, terracotta, azzurro polvere).
- **Palette Dark (Night Mode)**: sfondo deep (#0F0F14), nodi con bordi luminescenti sottili, testo ad alto contrasto.
- **Iconografia**: set minimalista line-style (Lucide o Phosphor Icons).

---

## 2. Stack Tecnologico

| Layer | Tecnologia | Motivazione |
|-------|-----------|-------------|
| **Framework** | React 19 + TypeScript | Ecosistema maturo, ottima DX, supporto concurrency |
| **Build tool** | Vite 6 | HMR istantaneo, build ottimizzato |
| **State management** | Zustand + Immer | Leggero, immutabilità semplice, ottimo per undo/redo |
| **Graph rendering** | React Flow (xyflow) | Engine per grafi interattivi, pan/zoom nativo, layout custom |
| **Layout algorithm** | D3-hierarchy + dagre | Calcolo posizioni nodi ad albero, supporto layout orizzontale/verticale |
| **Styling** | Tailwind CSS 4 | Utility-first, dark mode nativo, design tokens |
| **Animazioni** | Framer Motion | Spring animations, layout animations, gesture support |
| **PDF export** | html-to-image + jsPDF | Cattura canvas → PDF multi-pagina |
| **File export (GEDCOM)** | Libreria custom | Parser/serializer per formato .ged (standard genealogico) |
| **Form handling** | React Hook Form + Zod | Validazione type-safe, performance |
| **Internazionalizzazione** | i18next | Multilingua (IT/EN minimo) |
| **Testing** | Vitest + Playwright | Unit + E2E |
| **Deploy** | Vercel / Netlify / GitHub Pages | Static hosting, zero server |

---

## 3. Architettura dell'Applicazione

### 3.1 Struttura del Progetto

```
src/
├── app/                    # Entry point, providers, router
├── components/
│   ├── canvas/             # Albero: nodi, connessioni, toolbar canvas
│   ├── panels/             # Pannelli laterali: dettagli persona, ricerca
│   ├── modals/             # Dialog: import/export, conferme, onboarding
│   ├── ui/                 # Design system: Button, Input, Card, Toggle...
│   └── layout/             # Shell, Header, Sidebar
├── hooks/                  # Custom hooks (useTree, useExport, useTheme...)
├── stores/                 # Zustand stores (tree, ui, settings)
├── types/                  # TypeScript types & interfaces
├── utils/                  # Helpers: date, gedcom parser, validation
├── lib/                    # Export engines (PDF, JSON, GEDCOM, PNG)
├── i18n/                   # Traduzioni
└── assets/                 # Icone, placeholder avatar, fonts
```

### 3.2 Data Flow

```
[User Action] → [Zustand Store (Immer)] → [React Flow State] → [Canvas Render]
                        ↓
              [Undo/Redo History Stack]
                        ↓
              [Auto-save to localStorage]
```

---

## 4. Schema Dati — Formato JSON del Progetto

Il file di progetto è un singolo JSON, human-readable, versionato.

```jsonc
{
  "version": "1.0.0",
  "meta": {
    "name": "Famiglia Rossi",
    "description": "Albero genealogico della famiglia Rossi",
    "createdAt": "2026-02-11T10:00:00Z",
    "updatedAt": "2026-02-11T15:30:00Z",
    "author": "Giulio"
  },
  "persons": [
    {
      "id": "p_001",
      "firstName": "Mario",
      "lastName": "Rossi",
      "gender": "male",              // "male" | "female" | "other" | "unknown"
      "birthDate": "1950-03-15",     // ISO partial: "1950" o "1950-03" validi
      "birthPlace": "Roma, Italia",
      "deathDate": null,
      "deathPlace": null,
      "photo": null,                 // base64 data URI o null
      "notes": "Nonno paterno",
      "customFields": {}             // campi liberi utente
    }
  ],
  "relationships": [
    {
      "id": "r_001",
      "type": "partner",             // "partner" | "parent-child"
      "from": "p_001",               // ID persona
      "to": "p_002",
      "subtype": "married",          // "married" | "divorced" | "partner" | null
      "startDate": "1975-06-20",
      "endDate": null
    },
    {
      "id": "r_002",
      "type": "parent-child",
      "from": "p_001",               // genitore
      "to": "p_003",                 // figlio
      "subtype": "biological"        // "biological" | "adopted" | "foster" | "step"
    }
  ],
  "layout": {
    "orientation": "vertical",       // "vertical" | "horizontal"
    "rootPersonId": "p_001",
    "nodePositions": {}              // override manuali posizioni {id: {x, y}}
  },
  "settings": {
    "theme": "light",
    "locale": "it"
  }
}
```

---

## 5. Funzionalità — Dettaglio

### 5.1 Canvas Interattivo (Core)

- **Visualizzazione albero**: rendering dei nodi-persona connessi da linee curve (bezier) che indicano le relazioni.
- **Pan & Zoom**: navigazione fluida con mouse/touch/trackpad. Pinch-to-zoom su mobile.
- **Minimap**: miniatura navigabile dell'intero albero (angolo in basso a destra).
- **Fit-to-view**: bottone per centrare e zoomare sull'intero albero.
- **Auto-layout**: ricalcolo automatico delle posizioni con animazione fluida.
- **Drag nodi**: riposizionamento manuale dei nodi con snap-to-grid opzionale.
- **Zoom su persona**: click su un nodo per centrarlo e mostrare il pannello dettagli.

### 5.2 Gestione Persone

- **Aggiunta rapida**: click sul "+" che appare al hover su un nodo per aggiungere genitore/figlio/partner.
- **Inline editing**: click sul nome per editare direttamente sul canvas.
- **Pannello dettagli**: sidebar a scomparsa con form completo (dati anagrafici, foto, note, campi custom).
- **Foto**: upload con crop/resize integrato. Visualizzata come avatar circolare sul nodo.
- **Eliminazione**: con conferma e opzione "elimina anche i discendenti senza altre connessioni".

### 5.3 Gestione Relazioni

- **Creazione visuale**: drag da un nodo all'altro per creare una relazione, con popup per scegliere il tipo.
- **Tipi di relazione**: genitore-figlio (biologico, adottivo, affidamento, acquisito), partner (matrimonio, convivenza, divorziato).
- **Stili visivi distinti**: linea continua per biologico, tratteggiata per adottivo, doppia per matrimonio, barrata per divorzio.
- **Multi-partner**: supporto per partner multipli con disposizione corretta dei figli.

### 5.4 Ricerca & Navigazione

- **Search bar**: ricerca per nome con fuzzy matching, risultati in tempo reale con highlight sull'albero.
- **Filtri**: per generazione, ramo familiare, stato (vivente/deceduto), data.
- **Breadcrumb generazionale**: indicatore della generazione corrente durante la navigazione.

### 5.5 Import / Export

| Formato | Import | Export | Note |
|---------|--------|--------|------|
| **JSON** (progetto) | ✅ | ✅ | Formato nativo, include tutto |
| **PDF** | — | ✅ | Multi-pagina per alberi grandi, alta qualità |
| **PNG/SVG** | — | ✅ | Immagine dell'albero completo |
| **GEDCOM (.ged)** | ✅ | ✅ | Standard genealogico universale, compatibilità con altri software |

**Import JSON**: drag & drop del file sulla finestra OPPURE bottone "Importa". Validazione con feedback chiaro su eventuali errori.

**Export JSON**: download del file .json con nome progetto + timestamp.

**Export PDF**: dialog con opzioni (orientamento, formato carta, qualità, inclusione note/date). Preview prima del download.

**GEDCOM**: il formato .ged è lo standard de facto per scambio dati genealogici. Supportare import/export garantisce interoperabilità con FamilySearch, Ancestry, MyHeritage, Gramps, ecc.

### 5.6 Night Mode

- **Toggle**: switch nell'header, con transizione animata smooth.
- **Rispetto preferenza OS**: al primo accesso segue `prefers-color-scheme`.
- **Persistenza**: salva la scelta in localStorage.
- **Design dedicato**: non un semplice "inverti i colori" ma una palette studiata per il dark (vedi sezione Design Language).

### 5.7 Salvataggio & Persistenza

- **Auto-save**: ogni modifica viene salvata in localStorage automaticamente (debounced a 500ms).
- **Indicatore di stato**: micro-badge "Salvato" / "Salvataggio..." nell'header.
- **Progetti multipli**: lista progetti salvati in locale con opzione rinomina/elimina/duplica.
- **Warning chiusura**: avviso se ci sono modifiche non salvate e l'utente tenta di chiudere la tab.

### 5.8 Undo / Redo

- **Stack illimitato** (per sessione): ogni azione atomica è reversibile.
- **Shortcut**: Ctrl/Cmd+Z (undo), Ctrl/Cmd+Shift+Z (redo).
- **Bottoni**: nella toolbar del canvas.

### 5.9 Accessibilità & Responsive

- **Keyboard navigation**: Tab per navigare tra nodi, Enter per selezionare, Escape per chiudere pannelli.
- **ARIA labels**: su tutti gli elementi interattivi.
- **Screen reader**: descrizione testuale dell'albero disponibile.
- **Responsive**: layout adattivo per tablet. Su mobile: vista semplificata a lista con opzione di passare alla vista albero.
- **Touch gestures**: pinch-to-zoom, swipe per pannelli.

---

## 6. Componenti UI — Design System

### 6.1 Nodo Persona (PersonCard)

```
┌─────────────────────────┐
│  ┌─────┐                │
│  │ 📷  │  Mario Rossi   │
│  │     │  1950 – ∙      │
│  └─────┘                │
│    ───────────────────   │
│    Roma, Italia          │
└─────────────────────────┘
```

- Avatar circolare (40px), placeholder con iniziali colorate se no foto.
- Nome in grassetto, date di nascita/morte compatte.
- Colore bordo sinistro per genere (configurabile).
- Hover: espande con micro-animazione mostrando azioni rapide (+genitore, +figlio, +partner, dettagli).
- Selezionato: bordo evidenziato + ombra accentuata.

### 6.2 Toolbar Canvas

Barra flottante in basso al centro (stile Figma):
- Zoom in / Zoom out / Fit view
- Undo / Redo
- Auto-layout
- Orientamento (verticale ↔ orizzontale)
- Minimap toggle

### 6.3 Pannello Laterale Dettagli

Slide-in da destra (400px), con:
- Header con foto grande + nome editabile.
- Tabs: Anagrafica | Relazioni | Note | Campi Custom.
- Form con validazione real-time.
- Bottone "Elimina persona" in fondo (rosso, con conferma).

---

## 7. Onboarding — Prima Esperienza

1. **Empty state coinvolgente**: illustrazione stilizzata di un albero con CTA "Inizia il tuo albero genealogico".
2. **Primo nodo guidato**: al click, appare un form pre-compilabile "Inizia da te" con nome e data.
3. **Tooltip contestuali**: al primo hover su un nodo, tooltip che spiega "Clicca + per aggiungere un familiare".
4. **Progetto demo**: bottone "Carica esempio" che mostra un albero pre-compilato per esplorare le funzionalità.
5. **Onboarding opzionale**: max 3 step, skippabile, non invadente.

---

## 8. Performance & Limiti

- **Target**: alberi fino a 500 nodi fluidi (60fps pan/zoom).
- **Virtualizzazione**: rendering solo dei nodi visibili nel viewport (React Flow lo gestisce nativamente).
- **Lazy photo loading**: le foto vengono caricate solo quando il nodo è nel viewport.
- **Web Workers**: calcolo layout in un worker separato per non bloccare il main thread.
- **Dimensione progetto**: il JSON senza foto dovrebbe restare sotto i 500KB anche per alberi molto grandi. Le foto in base64 vengono compresse e ridimensionate (max 200x200px per i thumbnail).

---

## 9. TODO — Piano di Sviluppo

### FASE 0 — Setup (1-2 giorni)
- [ ] Inizializzare progetto con Vite + React 19 + TypeScript
- [ ] Configurare Tailwind CSS 4 con design tokens (colori, spacing, radius)
- [ ] Setup ESLint + Prettier + Husky
- [ ] Installare e configurare dipendenze core (React Flow, Zustand, Framer Motion)
- [ ] Struttura cartelle come da architettura
- [ ] Setup Vitest per unit testing
- [ ] Creare componenti UI base del design system (Button, Input, Card, Toggle, Dialog)

### FASE 1 — Core Canvas & Data Model (5-7 giorni)
- [ ] Definire i types TypeScript per Person, Relationship, Project
- [ ] Implementare Zustand store con Immer (tree store, ui store)
- [ ] Implementare sistema undo/redo con history stack
- [ ] Creare componente PersonNode per React Flow (design come da spec)
- [ ] Creare componente RelationshipEdge con stili per tipo di relazione
- [ ] Integrare React Flow con pan, zoom, minimap
- [ ] Implementare auto-layout con dagre/d3-hierarchy
- [ ] Aggiunta persona: click su "+" per aggiungere genitore/figlio/partner
- [ ] Eliminazione persona con conferma e gestione orfani
- [ ] Drag & drop per riposizionamento manuale nodi
- [ ] Toolbar canvas flottante (zoom, fit, undo/redo, layout, orientamento)
- [ ] Auto-save su localStorage (debounced)

### FASE 2 — Pannello Dettagli & Editing (3-4 giorni)
- [ ] Pannello laterale slide-in con form dettagli persona
- [ ] Inline editing del nome direttamente sul nodo
- [ ] Upload e crop foto (con resize a thumbnail)
- [ ] Placeholder avatar con iniziali colorate
- [ ] Form con validazione Zod (date parziali, campi obbligatori)
- [ ] Gestione campi custom (key-value dinamici)
- [ ] Tab relazioni nel pannello con lista relazioni della persona
- [ ] Creazione relazione visuale (drag tra nodi)
- [ ] Editing/eliminazione relazioni

### FASE 3 — Import / Export (3-4 giorni)
- [ ] Export JSON: serializzazione progetto + download
- [ ] Import JSON: drag & drop + validazione con schema Zod + feedback errori
- [ ] Export PDF: cattura canvas con html-to-image → jsPDF, dialog opzioni (formato, orientamento, qualità)
- [ ] Export PNG/SVG: cattura albero completo ad alta risoluzione
- [ ] Import GEDCOM: parser .ged → struttura dati interna
- [ ] Export GEDCOM: serializer struttura dati → .ged valido
- [ ] Preview PDF prima del download

### FASE 4 — UI Polish & Dark Mode (2-3 giorni)
- [ ] Implementare Night Mode con palette dedicata
- [ ] Toggle con animazione + rispetto preferenza OS
- [ ] Persistenza tema in localStorage
- [ ] Micro-animazioni sui nodi (hover, selezione, aggiunta, rimozione)
- [ ] Transizioni fluide apertura/chiusura pannelli (Framer Motion)
- [ ] Animazione auto-layout (transizione posizioni nodi)
- [ ] Loading states e skeleton per operazioni async
- [ ] Empty state illustrato e coinvolgente

### FASE 5 — Ricerca, Navigazione & Onboarding (2-3 giorni)
- [ ] Search bar con fuzzy matching (fuse.js)
- [ ] Highlight risultati ricerca sull'albero
- [ ] Filtri per generazione, stato, ramo
- [ ] Breadcrumb generazionale
- [ ] Sistema progetti multipli (lista in localStorage)
- [ ] Onboarding first-run (tooltip contestuali, max 3 step)
- [ ] Progetto demo caricabile
- [ ] Empty state con CTA "Inizia il tuo albero"

### FASE 6 — Accessibilità & Responsive (2-3 giorni)
- [ ] Keyboard navigation completa (Tab, Enter, Escape, frecce)
- [ ] ARIA labels su tutti gli elementi interattivi
- [ ] Descrizione testuale albero per screen reader
- [ ] Layout responsive per tablet
- [ ] Vista lista semplificata per mobile
- [ ] Touch gestures (pinch-to-zoom, swipe pannelli)
- [ ] Test accessibilità con axe-core

### FASE 7 — Internazionalizzazione & Finalizzazione (2-3 giorni)
- [ ] Setup i18next con namespace per sezioni
- [ ] Traduzioni complete IT e EN
- [ ] Supporto date localizzate
- [ ] Warning chiusura tab con modifiche non salvate
- [ ] Indicatore stato salvataggio nell'header
- [ ] E2E test con Playwright (flussi critici)
- [ ] Performance profiling e ottimizzazione (target: 500 nodi @ 60fps)
- [ ] Documentazione README per sviluppatori

### FASE 8 — Deploy & QA (1-2 giorni)
- [ ] Configurazione build di produzione Vite
- [ ] Deploy su Vercel/Netlify con CI/CD
- [ ] Lighthouse audit (target: 95+ su tutte le metriche)
- [ ] Cross-browser testing (Chrome, Firefox, Safari, Edge)
- [ ] Test su dispositivi reali (iPhone, iPad, Android)
- [ ] PWA manifest per installazione da browser (opzionale)

---

## 10. Stima Tempi

| Fase | Giorni stimati |
|------|---------------|
| Fase 0 — Setup | 1-2 |
| Fase 1 — Core Canvas | 5-7 |
| Fase 2 — Dettagli & Editing | 3-4 |
| Fase 3 — Import/Export | 3-4 |
| Fase 4 — UI Polish & Dark Mode | 2-3 |
| Fase 5 — Ricerca & Onboarding | 2-3 |
| Fase 6 — Accessibilità & Responsive | 2-3 |
| Fase 7 — i18n & Finalizzazione | 2-3 |
| Fase 8 — Deploy & QA | 1-2 |
| **Totale** | **~21-31 giorni lavorativi** |

> **Nota**: le stime assumono uno sviluppatore senior a tempo pieno. Con Claude Code come copilota, i tempi possono ridursi del 30-40%.

---

## 11. Rischi & Mitigazioni

| Rischio | Impatto | Mitigazione |
|---------|---------|-------------|
| Performance con alberi grandi (500+ nodi) | Alto | Virtualizzazione React Flow + layout in Web Worker |
| Complessità parser GEDCOM | Medio | Limitare al subset più comune, iterare |
| PDF export qualità su alberi enormi | Medio | Suddivisione in pagine + opzione qualità |
| localStorage pieno (foto base64) | Medio | Compressione aggressiva foto, warning spazio |
| Compatibilità browser | Basso | Baseline: ultime 2 versioni major browser |

---

## 12. Possibili Evoluzioni Future

- **Collaborazione real-time** (con backend: CRDT + WebSocket)
- **AI-assisted data entry**: OCR su documenti storici, suggerimento date/luoghi
- **Timeline view**: vista cronologica degli eventi familiari
- **Statistiche**: dashboard con metriche (età media, distribuzione geografica, ecc.)
- **Stampa poster**: export per stampa in formato A1/A0
- **Integrazione API genealogiche**: FamilySearch, WikiTree
- **PWA offline-first**: funzionamento completo offline con sync

---

*Documento generato l'11 febbraio 2026 — FamilyTree v1.0 Specs*
