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
 * mid-quiz and come back, session rather than local, since no individual responses are stored.
 */
const STORAGE_KEY = 'coherence-responses-v3';

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
 * "see results" drops you into the middle of the results page, which reads as a broken link
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
      <div className="flex-1 lg:pr-40">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/quiz" element={<QuizRoute responses={responses} onChange={persist} />} />
          <Route path="/results" element={<ResultsRoute responses={responses} setResponses={setResponses} />} />
          {/* Path-form permalink. A query string inside a URL fragment survives most tools but
              not all of them, chat clients and terminals sometimes truncate at the "?". A path
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
          question set changes, the link is refused rather than decoded into the wrong answers.
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

/**
 * Wordmark left, navigation as a vertical rail on the right.
 *
 * A horizontal strip of five tabs is the default everything has, and it wastes the one piece of
 * chrome that is on every screen. The rail is fixed on desktop so the current section stays
 * visible while reading a long page, and collapses to a horizontal strip on small screens where
 * a fixed rail would eat the width the tables need.
 */
function Header() {
  return (
    <>
      <header className="sticky top-0 z-20 bg-ground/95 backdrop-blur border-b border-ground-line lg:border-0 lg:bg-transparent lg:backdrop-blur-0 lg:static">
        <div className="px-5 h-14 flex items-center lg:h-auto lg:pt-7">
          <NavLink to="/" className="group inline-flex items-baseline gap-2">
            <span className="text-lg font-semibold tracking-tight">Coherence</span>
            <span className="hidden lg:inline text-2xs text-ink-faint group-hover:text-ink-muted">
              AI safety careers
            </span>
          </NavLink>
        </div>
      </header>

      {/* desktop rail */}
      <nav className="hidden lg:flex fixed right-0 top-0 h-screen w-40 flex-col justify-center gap-1 pr-6 z-10">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              `group flex items-center justify-end gap-2.5 py-1.5 text-sm ${
                isActive ? 'text-ink font-medium' : 'text-ink-faint hover:text-ink'
              }`
            }
          >
            {({ isActive }: { isActive: boolean }) => (
              <>
                <span>{n.label}</span>
                <span
                  className={`h-px transition-all ${
                    isActive ? 'w-6 bg-ink' : 'w-2.5 bg-ground-line group-hover:w-4 group-hover:bg-ink-faint'
                  }`}
                  aria-hidden
                />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* small screens: the rail would eat the width the tables need */}
      <nav className="lg:hidden flex items-center gap-0.5 overflow-x-auto px-4 pb-2 border-b border-ground-line sticky top-14 bg-ground/95 backdrop-blur z-10">
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
    </>
  );
}
