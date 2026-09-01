import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { WebSocketServer } from 'ws';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const ASSETS_DIR = path.join(FIXTURES_DIR, 'assets');
// Overridable so two integration test files can each spawn their own
// server instance without racing for the same port when Vitest runs test
// files concurrently (the default 8787 is still what `npm run mock` uses).
const PORT = Number(process.env.MOCK_SERVER_PORT) || 8787;

// M5: all fifteen cases from §6's table.
const CASES = [
  { id: 'case-00-bad-capture', title: 'Bad capture' },
  { id: 'case-01-genuine', title: 'Genuine, genuine' },
  { id: 'case-02-expired-document', title: 'Expired document' },
  { id: 'case-03-modified-dob', title: 'Modified date of birth' },
  { id: 'case-04-photo-replacement', title: 'Photo replacement' },
  { id: 'case-05-stamp-forgery', title: 'Stamp forgery' },
  { id: 'case-06-impersonation', title: 'Impersonation' },
  { id: 'case-07-multiple-identities', title: 'Multiple identities' },
  { id: 'case-08-presentation-attack', title: 'Presentation attack' },
  { id: 'case-09-watchlist-hit', title: 'Watchlist hit' },
  { id: 'case-10-low-confidence', title: 'Low confidence' },
  { id: 'case-11-novel-forgery', title: 'Novel forgery' },
  { id: 'case-12-visa-rule-violation', title: 'Visa rule violation' },
  { id: 'case-13-visa-transplant', title: 'Visa transplant' },
  { id: 'case-14-module-failure', title: 'Module failure' },
];

/** sessionId -> caseId, populated by POST /api/v1/screening,
 *  consumed once when the WS tape replay starts. */
const sessions = new Map();
/** sessionId -> sealed ScreeningSession, populated by the decision endpoint
 *  (or by the M6 seed below) and served back by GET /api/v1/history. */
const history = new Map();

function loadFixture(caseId) {
  const file = path.join(FIXTURES_DIR, `${caseId}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function emptySession() {
  return {
    sessionId: '',
    laneId: '',
    officerId: '',
    startedAt: new Date().toISOString(),
    band: null,
    risk: null,
    confidence: null,
    abstained: false,
    documents: [],
    signals: [],
    face: null,
    graph: null,
    crossDocumentSignals: [],
    coverageFlags: [],
    timingMs: {},
    sealed: false,
  };
}

function upsertDocument(documents, id, patch) {
  const index = documents.findIndex((d) => d.id === id);
  if (index === -1) {
    return [...documents, { id, type: 'UNKNOWN', imageUrl: '', views: {}, fields: [], risk: null, ...patch }];
  }
  const next = [...documents];
  next[index] = { ...next[index], ...patch };
  return next;
}

function mergeSignals(existing, incoming) {
  if (!incoming || incoming.length === 0) return existing;
  const seen = new Set(existing.map((s) => s.id));
  const additions = incoming.filter((s) => !seen.has(s.id));
  return additions.length === 0 ? existing : [...existing, ...additions];
}

/** Mirrors src/store/sessionStore.ts's applyScreeningEvent, in plain JS,
 *  so seeded history entries below (and only those) can be built without
 *  actually running a WS replay. Keep this in sync if the reducer changes. */
function applyEvent(session, event) {
  switch (event.stage) {
    case 'received':
      return { ...session, sessionId: event.sessionId, laneId: event.laneId, officerId: event.officerId };
    case 'quality': {
      const documents = upsertDocument(session.documents, event.documentId, {});
      if (event.ok) return { ...session, documents };
      return { ...session, documents, recaptureReason: event.reason, recaptureHint: event.hint };
    }
    case 'classified':
      return {
        ...session,
        documents: upsertDocument(session.documents, event.documentId, {
          type: event.type,
          country: event.country,
          version: event.version,
          imageUrl: event.imageUrl,
        }),
      };
    case 'ocr':
      return {
        ...session,
        documents: upsertDocument(session.documents, event.documentId, { fields: event.fields, mrz: event.mrz }),
        signals: mergeSignals(session.signals, event.signals),
      };
    case 'face':
      return { ...session, face: event.face, signals: mergeSignals(session.signals, event.signals) };
    case 'database':
      return { ...session, graph: event.graph, signals: mergeSignals(session.signals, event.signals) };
    case 'forensics':
      return {
        ...session,
        documents: upsertDocument(session.documents, event.documentId, { views: event.views }),
        signals: mergeSignals(session.signals, event.signals),
      };
    case 'crossdoc':
      return { ...session, crossDocumentSignals: mergeSignals(session.crossDocumentSignals, event.signals) };
    case 'decision':
      return {
        ...session,
        band: event.band,
        risk: event.risk,
        confidence: event.confidence,
        abstained: event.abstained,
        coverageFlags: event.coverageFlags,
        timingMs: { ...session.timingMs, ...event.timingMs },
      };
    default:
      return session;
  }
}

function foldTape(caseId) {
  const fixture = loadFixture(caseId);
  return fixture.tape.reduce((session, { event }) => applyEvent(session, event), emptySession());
}

/** M6 seed: a handful of the fifteen fixtures pre-sealed with plausible
 *  officer decisions, so HistoryScreen has real data to show the first
 *  time the mock server starts (before any officer has sealed a session
 *  live in this dev session). Distinct sessionIds (seed-*) so they never
 *  collide with a live-screened session. */
function seedHistory() {
  const seeds = [
    {
      caseId: 'case-01-genuine',
      decision: 'CLEAR',
      note: '',
      override: false,
      decidedAt: '2026-08-27T06:12:04.000Z',
    },
    {
      caseId: 'case-02-expired-document',
      decision: 'CLEAR',
      note: 'Physical document verified valid at booth; expiry rule false positive from OCR misread.',
      override: true,
      decidedAt: '2026-08-27T06:24:51.000Z',
    },
    {
      caseId: 'case-03-modified-dob',
      decision: 'HOLD',
      note: 'Confirmed date-of-birth modification on physical inspection; referred to secondary.',
      override: false,
      decidedAt: '2026-08-27T06:41:17.000Z',
    },
    {
      caseId: 'case-06-impersonation',
      decision: 'REFER',
      note: 'Face mismatch confirmed against live capture; referred to law enforcement liaison.',
      override: true,
      decidedAt: '2026-08-27T07:03:39.000Z',
    },
    {
      caseId: 'case-09-watchlist-hit',
      decision: 'REFER',
      note: 'Watchlist match confirmed manually; escalated per SOP 4.2.',
      override: true,
      decidedAt: '2026-08-27T07:15:02.000Z',
    },
  ];

  for (const seed of seeds) {
    const session = foldTape(seed.caseId);
    const sessionId = `seed-${seed.caseId}`;
    session.sessionId = sessionId;
    session.laneId = 'IGI-T3-LANE-07';
    session.officerId = 'OFF-2291';
    session.startedAt = seed.decidedAt;
    session.sealed = true;
    session.officerDecision = {
      decision: seed.decision,
      note: seed.note,
      decidedAt: seed.decidedAt,
      override: seed.override,
    };
    history.set(sessionId, session);
  }
}

seedHistory();

function withCors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function sendJson(res, status, body) {
  withCors(res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on('error', reject);
  });
}

/** Consumes a request body without parsing it — used for the real
 *  multipart capture POST below, which this mock does not read. */
function drainBody(req) {
  return new Promise((resolve) => {
    req.on('data', () => {});
    req.on('end', resolve);
    req.on('error', resolve);
  });
}

const MIME_TYPES = { '.svg': 'image/svg+xml', '.png': 'image/png' };

function serveAsset(req, res, pathname) {
  const relative = pathname.replace(/^\/assets\//, '');
  const filePath = path.join(ASSETS_DIR, relative);
  if (!filePath.startsWith(ASSETS_DIR) || !fs.existsSync(filePath)) {
    withCors(res);
    res.writeHead(404);
    res.end();
    return;
  }
  withCors(res);
  const ext = path.extname(filePath);
  res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  if (req.method === 'OPTIONS') {
    withCors(res);
    res.writeHead(204);
    res.end();
    return;
  }

  if (pathname.startsWith('/assets/')) {
    serveAsset(req, res, pathname);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/v1/cases') {
    sendJson(res, 200, CASES);
    return;
  }

  if (req.method === 'POST' && pathname === '/api/v1/screening') {
    const contentType = req.headers['content-type'] || '';

    // TEMPORARY STAND-IN: the real capture flow (CaptureScreen) posts a
    // real multipart body — document image(s), live face frame, optional
    // video sweep, checkpoint/officer ids — per BACKEND_BRIEF.md §7
    // ("POST /api/v1/screening multipart -> 201 {session_id,
    // status:'processing'}"). No backend exists yet to actually run Wave
    // 1/Wave 2 analysis on that body, so this branch drains it unread and
    // always replays case-01-genuine's fixture tape regardless of what was
    // actually captured. Replace this branch with a real streamed analysis
    // once the backend pipeline exists; nothing else in this file (WS
    // replay, history, decision) needs to change when that happens.
    if (contentType.startsWith('multipart/form-data')) {
      await drainBody(req);
      const sessionId = crypto.randomUUID();
      sessions.set(sessionId, 'case-01-genuine');
      sendJson(res, 200, { sessionId });
      return;
    }

    // Dev/demo path: DevFixturePicker posts { caseId } as JSON to jump
    // straight to a chosen fixture's tape, bypassing capture entirely.
    const body = await readBody(req).catch(() => ({}));
    const caseId = body.caseId;
    if (!CASES.some((c) => c.id === caseId)) {
      sendJson(res, 400, { error: `unknown caseId: ${caseId}` });
      return;
    }
    const sessionId = crypto.randomUUID();
    sessions.set(sessionId, caseId);
    sendJson(res, 200, { sessionId });
    return;
  }

  const decisionMatch = pathname.match(/^\/api\/v1\/screening\/([^/]+)\/decision$/);
  if (req.method === 'POST' && decisionMatch) {
    const sessionId = decisionMatch[1];
    const body = await readBody(req).catch(() => ({}));
    // The client posts its full accumulated session (built from the WS tape
    // it already received) alongside the decision, since this server only
    // replays events and never itself tracks session state — the client is
    // the only party that actually has the complete picture to seal.
    const sealed = {
      ...emptySession(),
      ...(body.session ?? {}),
      sessionId,
      sealed: true,
      officerDecision: {
        decision: body.decision,
        note: body.note ?? '',
        decidedAt: new Date().toISOString(),
        override: Boolean(body.override),
      },
    };
    history.set(sessionId, sealed);
    sendJson(res, 200, sealed);
    return;
  }

  if (req.method === 'GET' && pathname === '/api/v1/history') {
    const entries = [...history.values()].sort((a, b) =>
      (b.officerDecision?.decidedAt ?? '').localeCompare(a.officerDecision?.decidedAt ?? ''),
    );
    sendJson(res, 200, entries);
    return;
  }

  const historyItemMatch = pathname.match(/^\/api\/v1\/history\/([^/]+)$/);
  if (req.method === 'GET' && historyItemMatch) {
    const entry = history.get(historyItemMatch[1]);
    if (!entry) {
      sendJson(res, 404, { error: 'not found' });
      return;
    }
    sendJson(res, 200, entry);
    return;
  }

  sendJson(res, 404, { error: 'not found' });
});

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const match = url.pathname.match(/^\/ws\/screening\/([^/]+)$/);
  if (!match) {
    socket.destroy();
    return;
  }
  const sessionId = match[1];
  wss.handleUpgrade(req, socket, head, (ws) => {
    replayTape(ws, sessionId);
  });
});

function replayTape(ws, sessionId) {
  const caseId = sessions.get(sessionId);
  if (!caseId) {
    ws.close(1008, 'unknown session');
    return;
  }

  const fixture = loadFixture(caseId);
  const timers = [];

  for (const { delayMs, event } of fixture.tape) {
    const timer = setTimeout(() => {
      if (ws.readyState !== ws.OPEN) return;
      const outgoing =
        event.stage === 'received' ? { ...event, sessionId } : event;
      ws.send(JSON.stringify(outgoing));
    }, delayMs);
    timers.push(timer);
  }

  ws.on('close', () => {
    timers.forEach(clearTimeout);
  });
}

server.listen(PORT, () => {
  console.log(`mock server listening on http://localhost:${PORT}`);
});
