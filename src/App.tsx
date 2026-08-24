import { useEffect, useLayoutEffect, useState } from 'react';
import {
  HashRouter, Routes, Route, NavLink, useNavigate, useSearchParams, useLocation,
  useParams, Navigate,
} from 'react-router-dom';
import { Home } from './pages/Home';
import { Instrument } from './pages/Instrument';
import { Results } from './pages/Results';
import { Browse } from './pages/Browse';
import { Tables } from './pages/Tables';
import { AgendaDetail } from './pages/AgendaDetail';
import { AxisDetail } from './pages/AxisDetail';
import { questions } from './lib/data';
import { decode, encode } from './lib/permalink';
import type { Responses } from './lib/scoring';

/**
 * No accounts, no server-side state. Responses live in component state and in the URL.
 * sessionStorage keeps them across an in-tab navigation so someone can read an axis page
 * mid-quiz and come back — session rather than local, since no individual responses are stored.
 */
const STORAGE_KEY = 'worldview-responses-v2';

export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

/**
 * Every navigation lands at the top of the page.
 *
 * Without this the browser keeps the previous scroll offset, so finishing the quiz and pressing
 * "see results" drops you into the middle of the results page — which reads as a broken link
 * rather than as scroll restoration.
 *
 * useLayoutEffect, not useEffect: it runs before paint, so there is no visible jump.
 * A hash target (an axis pole link like /axis/internals#high) is honoured instead.
 */
function ScrollToTop() {
  const { pathname, search, hash } = useLocation();
  useLayoutEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1));
      if (el) { el.scrollIntoView(); return; }
    }
    window.scrollTo(0, 0);
  }, [pathname, search, hash]);
  return null;
}

function Shell() {
  const [responses, setResponses] = useState<Responses>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? decode(raw, questions) : {};
    } catch { return {}; }
  });

  const persist = (r: Responses) => {
    setResponses(r);
    try { sessionStorage.setItem(STORAGE_KEY, encode(r, questions)); } catch { /* private mode */ }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<QuizRoute responses={responses} onChange={persist} />} />
          <Route path="/results" element={<ResultsRoute responses={responses} setResponses={setResponses} />} />
          {/* Path-form permalink. A query string inside a URL fragment survives most tools but
              not all of them — chat clients and terminals sometimes truncate at the "?". A path
              segment always survives, so this is the form we hand out. */}
          <Route path="/results/:code" element={<ResultsRoute responses={responses} setResponses={setResponses} />} />
          <Route path="/roles" element={<Browse />} />
          <Route path="/agendas" element={<Tables />} />
          <Route path="/agenda/:id" element={<AgendaDetail />} />
          <Route path="/axis/:id" element={<AxisDetail />} />

          {/* Old paths, kept so links already shared keep working. */}
          <Route path="/instrument" element={<Navigate to="/quiz" replace />} />
          <Route path="/browse" element={<Navigate to="/roles" replace />} />
          <Route path="/tables" element={<Navigate to="/agendas" replace />} />
          <Route path="/fellowships" element={<Navigate to="/roles?position=Fellowship" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

function QuizRoute({ responses, onChange }: { responses: Responses; onChange: (r: Responses) => void }) {
  const navigate = useNavigate();
  return <Instrument responses={responses} onChange={onChange} onComplete={() => navigate('/results')} />;
}

function ResultsRoute({ responses, setResponses }: {
  responses: Responses; setResponses: (r: Responses) => void;
}) {
  const [params] = useSearchParams();
  const { code: pathCode } = useParams();
  // Accept both forms: /results/<code> and /results?r=<code>.
  const code = pathCode ?? params.get('r');

  useEffect(() => {
    if (code) setResponses(decode(code, questions));
  }, [code]);

  const decoded = code ? decode(code, questions) : null;
  const active = decoded && Object.keys(decoded).length > 0 ? decoded : responses;

  if (code && (!decoded || Object.keys(decoded).length === 0)) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-xl font-medium mb-2">That link didn't open</h1>
        <p className="text-ink-muted mb-4">
          The code in it isn't one this version can read. Shared results stop working when the
          question set changes — the link is refused rather than decoded into the wrong answers.
        </p>
        <NavLink to="/quiz" className="px-4 py-2 rounded bg-ink text-ground inline-block">
          Take the quiz
        </NavLink>
      </div>
    );
  }

  if (Object.keys(active).length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <h1 className="text-xl font-medium mb-2">Nothing to show yet</h1>
        <p className="text-ink-muted mb-6">Answer some questions first, or open a shared result link.</p>
        <NavLink to="/quiz" className="px-4 py-2 rounded bg-ink text-ground inline-block">
          Take the quiz
        </NavLink>
      </div>
    );
  }

  return <Results responses={active} />;
}

const NAV = [
  { to: '/', label: 'Home', end: true },
  { to: '/quiz', label: 'Quiz' },
  { to: '/results', label: 'Results' },
  { to: '/agendas', label: 'Agendas' },
  { to: '/roles', label: 'Roles' },
];

function Header() {
  return (
    <header className="border-b border-ground-line sticky top-0 bg-ground/95 backdrop-blur z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <NavLink to="/" className="font-medium tracking-tight shrink-0">Worldview Layer</NavLink>
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `px-2.5 py-1.5 text-sm rounded whitespace-nowrap ${
                  isActive ? 'text-ink font-medium bg-ground-sunk' : 'text-ink-muted hover:text-ink'
                }`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ground-line mt-16">
      <div className="max-w-6xl mx-auto px-4 py-5 text-2xs text-ink-faint flex flex-wrap gap-x-4 gap-y-1">
        <span>Agendas from the Shallow Review 2025 · roles from the 80,000 Hours job board</span>
        <span className="tabular">Snapshot, August 2026</span>
      </div>
    </footer>
  );
}
