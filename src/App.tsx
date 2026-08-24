import { useEffect, useState } from 'react';
import {
  HashRouter, Routes, Route, NavLink, useNavigate, useSearchParams, Navigate,
} from 'react-router-dom';
import { Entry } from './pages/Entry';
import { Instrument } from './pages/Instrument';
import { Results } from './pages/Results';
import { Browse } from './pages/Browse';
import { Tables } from './pages/Tables';
import { AgendaDetail } from './pages/AgendaDetail';
import { AxisDetail } from './pages/AxisDetail';
import { Fellowships } from './pages/Fellowships';
import { questions, DATA_AS_OF } from './lib/data';
import { decode, encode } from './lib/permalink';
import type { Responses } from './lib/scoring';

/**
 * No accounts, no server-side state (Build Spec §1). Responses live in component state and in the
 * URL. sessionStorage keeps them across an in-tab navigation so someone can read an axis page
 * mid-instrument and come back — deliberately session, not local, since the spec stores no
 * individual responses.
 */
const STORAGE_KEY = 'worldview-responses-v1';

export function App() {
  return (
    <HashRouter>
      <Shell />
    </HashRouter>
  );
}

function Shell() {
  const [responses, setResponses] = useState<Responses>(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? decode(raw, questions) : {};
    } catch { return {}; }
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Entry />} />
          <Route path="/instrument" element={<InstrumentRoute responses={responses} setResponses={setResponses} />} />
          <Route path="/results" element={<ResultsRoute responses={responses} setResponses={setResponses} />} />
          <Route path="/browse" element={<Browse />} />
          <Route path="/tables" element={<Tables />} />
          <Route path="/fellowships" element={<Fellowships />} />
          <Route path="/agenda/:id" element={<AgendaDetail />} />
          <Route path="/axis/:id" element={<AxisDetail />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

function InstrumentRoute({ responses, setResponses }: {
  responses: Responses; setResponses: (r: Responses) => void;
}) {
  const navigate = useNavigate();
  return (
    <Instrument
      responses={responses}
      onChange={(r) => {
        setResponses(r);
        try {
          // Persist via the same encoding the permalink uses, so there is exactly one
          // serialisation format to keep correct about abstain-versus-unsure.
          sessionStorage.setItem(STORAGE_KEY, encode(r, questions));
        } catch { /* private browsing, or storage disabled */ }
      }}
      onComplete={() => navigate('/results')}
    />
  );
}

function ResultsRoute({ responses, setResponses }: {
  responses: Responses; setResponses: (r: Responses) => void;
}) {
  const [params] = useSearchParams();
  const code = params.get('r');

  useEffect(() => {
    if (code) setResponses(decode(code, questions));
  }, [code]);

  const active = code ? decode(code, questions) : responses;

  if (Object.keys(active).length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-xl font-medium mb-2">Nothing to show yet</h1>
        <p className="text-ink-muted mb-6">Answer some questions first, or open a shared result link.</p>
        <NavLink to="/instrument" className="px-4 py-2 rounded bg-ink text-ground">Start the instrument</NavLink>
      </div>
    );
  }

  return <Results responses={active} />;
}

function Header() {
  const link = ({ isActive }: { isActive: boolean }) =>
    `px-2.5 py-1.5 text-sm rounded ${isActive ? 'text-ink font-medium bg-ground-sunk' : 'text-ink-muted hover:text-ink'}`;

  return (
    <header className="border-b border-ground-line sticky top-0 bg-ground/95 backdrop-blur z-10">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
        <NavLink to="/" className="font-medium tracking-tight shrink-0">
          Worldview Layer
        </NavLink>
        <nav className="flex items-center gap-0.5 overflow-x-auto">
          <NavLink to="/instrument" className={link}>Instrument</NavLink>
          <NavLink to="/results" className={link}>Results</NavLink>
          <NavLink to="/browse" className={link}>Browse</NavLink>
          <NavLink to="/tables" className={link}>Tables</NavLink>
          <NavLink to="/fellowships" className={link}>Fellowships</NavLink>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ground-line mt-16">
      <div className="max-w-6xl mx-auto px-4 py-6 text-2xs text-ink-faint space-y-1">
        <p className="tabular">Snapshot — data as of {DATA_AS_OF}. Nothing here refreshes.</p>
        <p>
          Technical agendas and their stated assumptions come from the Shallow Review of live
          agendas in alignment and safety, 2025 (ARB Research). Roles come from the 80,000 Hours job
          board public view. Policy levers are seeded from the 80,000 Hours US AI policy landscape.
        </p>
        <p>No accounts. No responses stored. Your answers live only in the link you can copy.</p>
      </div>
    </footer>
  );
}
