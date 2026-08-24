/**
 * Renders every route through react-dom/server against the real committed data.
 *
 * A green `vite build` proves the code compiles, not that it runs. This catches the failures that
 * actually happen here: a <Caveat> id that does not exist (which throws by design), a coordinate
 * shape the plot cannot read, a null where a page expects an array.
 */
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router';
import { Routes, Route } from 'react-router-dom';
import { Entry } from '../src/pages/Entry';
import { Instrument } from '../src/pages/Instrument';
import { Results } from '../src/pages/Results';
import { Browse } from '../src/pages/Browse';
import { Tables } from '../src/pages/Tables';
import { AgendaDetail } from '../src/pages/AgendaDetail';
import { AxisDetail } from '../src/pages/AxisDetail';
import { Fellowships } from '../src/pages/Fellowships';
import { agendas, levers, axes, questions } from '../src/lib/data';
import { ABSTAIN, type Responses } from '../src/lib/scoring';

// A response set that exercises the awkward paths: abstain, unsure, allocation, willingness.
const responses: Responses = {};
for (const q of questions) {
  responses[q.id] = q.response_type === 'allocation' ? 0.2
    : q.response_type === 'willingness' ? 0.33 : 0.5;
}
responses['q18'] = ABSTAIN;
responses['q19'] = ABSTAIN;   // removes the internals axis entirely
responses['q20'] = 0;         // unsure
responses['q4'] = ABSTAIN;

let failures = 0;
function render(label: string, path: string, element: React.ReactElement) {
  try {
    const html = renderToString(
      <StaticRouter location={path}>
        <Routes><Route path="*" element={element} /></Routes>
      </StaticRouter>,
    );
    if (html.length < 400) throw new Error(`suspiciously short output (${html.length} chars)`);
    console.log(`  PASS  ${label.padEnd(46)} ${String(html.length).padStart(7)} chars`);
  } catch (e) {
    failures++;
    console.log(`  FAIL  ${label}\n        ${(e as Error).message}`);
  }
}

console.log('\nSMOKE RENDER');
render('/ (entry)', '/', <Entry />);
render('/instrument', '/instrument', <Instrument responses={responses} onChange={() => {}} onComplete={() => {}} />);
render('/results', '/results', <Results responses={responses} />);
render('/browse', '/browse', <Browse />);
render('/browse?agenda=control', '/browse?agenda=control', <Browse />);
render('/tables', '/tables', <Tables />);
render('/fellowships', '/fellowships', <Fellowships />);

console.log('\nEVERY AGENDA PAGE');
let agendaFails = 0;
for (const a of agendas) {
  try {
    const html = renderToString(
      <StaticRouter location={`/agenda/${a.id}`}>
        <Routes><Route path="/agenda/:id" element={<AgendaDetail />} /></Routes>
      </StaticRouter>);
    if (html.length < 400) throw new Error('short output');
  } catch (e) { agendaFails++; failures++; console.log(`  FAIL  ${a.id}: ${(e as Error).message}`); }
}
console.log(`  ${agendaFails ? 'FAIL' : 'PASS'}  ${agendas.length} technical agenda pages`);

let leverFails = 0;
for (const l of levers) {
  try {
    renderToString(
      <StaticRouter location={`/agenda/${l.id}`}>
        <Routes><Route path="/agenda/:id" element={<AgendaDetail />} /></Routes>
      </StaticRouter>);
  } catch (e) { leverFails++; failures++; console.log(`  FAIL  ${l.id}: ${(e as Error).message}`); }
}
console.log(`  ${leverFails ? 'FAIL' : 'PASS'}  ${levers.length} policy lever pages`);

let axisFails = 0;
for (const ax of axes) {
  try {
    renderToString(
      <StaticRouter location={`/axis/${ax.id}`}>
        <Routes><Route path="/axis/:id" element={<AxisDetail />} /></Routes>
      </StaticRouter>);
  } catch (e) { axisFails++; failures++; console.log(`  FAIL  ${ax.id}: ${(e as Error).message}`); }
}
console.log(`  ${axisFails ? 'FAIL' : 'PASS'}  ${axes.length} axis pages`);

console.log('');
if (failures) { console.log(`${failures} FAILURE(S)\n`); process.exit(1); }
console.log('every route renders\n');
