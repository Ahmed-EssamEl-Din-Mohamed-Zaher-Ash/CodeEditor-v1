const editor = document.getElementById('codeEditor');
const flowCanvas = document.getElementById('flowCanvas');
const dimmingOverlay = document.getElementById('dimmingOverlay');
const ghostText = document.getElementById('ghostText');
const logicPreview = document.getElementById('logicPreview');
const consoleOutput = document.getElementById('consoleOutput');
const complexityGauge = document.getElementById('complexityGauge');
const brainLoad = document.getElementById('brainLoad');
const typingSignal = document.getElementById('typingSignal');
const flowchartPanel = document.getElementById('flowchartPanel');
const stateTimeline = document.getElementById('stateTimeline');
const anchorPanel = document.getElementById('anchorPanel');
const boilerplateSummary = document.getElementById('boilerplateSummary');
const booleanHints = document.getElementById('booleanHints');
const semanticResults = document.getElementById('semanticResults');
const docPopup = document.getElementById('docPopup');

const toggles = {
  dimming: document.getElementById('toggleDimming'),
  flow: document.getElementById('toggleFlow'),
  logicOnly: document.getElementById('toggleLogicOnly'),
  debugTips: document.getElementById('toggleDebugTips'),
  commentFilter: document.getElementById('toggleCommentFilter'),
  zen: document.getElementById('toggleZen'),
  docs: document.getElementById('toggleDocs'),
  flowchart: document.getElementById('toggleFlowchart'),
  stateTracking: document.getElementById('toggleStateTracking'),
  heatmap: document.getElementById('toggleHeatmap'),
  nl: document.getElementById('toggleNL'),
  boiler: document.getElementById('toggleBoiler'),
  bool: document.getElementById('toggleBoolean')
};

const docsDictionary = {
  Where: 'Filters a sequence based on a condition.',
  Select: 'Projects each element into a new form.',
  FirstOrDefault: 'Returns first element, or default when empty.',
  Add: 'Adds an item to a collection.',
  ToList: 'Materializes IEnumerable into a List.'
};

const semanticIntentMap = {
  db: ['Use SqlConnection with using-block and connection string.', 'Repository pattern for data access isolation.'],
  connect: ['Open connection asynchronously: await conn.OpenAsync();'],
  api: ['Use HttpClientFactory and typed clients for maintainability.'],
  auth: ['Prefer JWT bearer with refresh token flow.'],
  cache: ['Wrap expensive calls with IMemoryCache/GetOrCreate.']
};

const initialCode = `using System;
using System.Linq;
using System.Collections.Generic;

namespace DemoApp
{
    public class Processor
    {
        /// <summary>
        /// Calculates filtered totals for dashboard.
        /// Long comments and XML docs are hidden unless needed.
        /// </summary>
        public int Compute(List<int> numbers, bool isAdmin, bool isOwner)
        {
            int total = 0;
            foreach (var n in numbers)
            {
                if ((isAdmin == false && isOwner == false) || (n > 10 && n < 100))
                {
                    total += n;
                }
            }

            var heavy = numbers.Where(x => x > 20).Select(x => x * 2).ToList();
            return total + heavy.FirstOrDefault();
        }
    }
}`;

editor.value = initialCode;
let typingTimer;
let activeDebugTips = [];
let sketchPoints = [];

function getLines() {
  return editor.value.split('\n');
}

function caretLine() {
  return editor.value.substring(0, editor.selectionStart).split('\n').length - 1;
}

function findFunctionBounds(lines, currentLine) {
  let start = 0;
  let end = lines.length - 1;

  for (let i = currentLine; i >= 0; i -= 1) {
    if (/\b(public|private|internal|protected)\b.*\(.*\)/.test(lines[i])) {
      start = i;
      break;
    }
  }

  let braces = 0;
  for (let i = start; i < lines.length; i += 1) {
    braces += (lines[i].match(/{/g) || []).length;
    braces -= (lines[i].match(/}/g) || []).length;
    if (i > start && braces === 0) {
      end = i;
      break;
    }
  }
  return { start, end };
}

function applyContextualDimming() {
  if (!toggles.dimming.checked) {
    dimmingOverlay.style.display = 'none';
    return;
  }
  const lines = getLines();
  const current = caretLine();
  const bounds = findFunctionBounds(lines, current);
  const lineHeight = 21.6;
  const totalHeight = lines.length * lineHeight;
  dimmingOverlay.style.display = 'block';
  dimmingOverlay.style.setProperty('--focus-start', `${((bounds.start * lineHeight) / totalHeight) * 100}%`);
  dimmingOverlay.style.setProperty('--focus-end', `${(((bounds.end + 1) * lineHeight) / totalHeight) * 100}%`);
}

function drawFlowMappings() {
  const ctx = flowCanvas.getContext('2d');
  flowCanvas.width = flowCanvas.clientWidth;
  flowCanvas.height = flowCanvas.clientHeight;
  ctx.clearRect(0, 0, flowCanvas.width, flowCanvas.height);
  if (!toggles.flow.checked) return;

  const text = editor.value;
  const declarations = [...text.matchAll(/\b(?:int|var|bool|string|double)\s+(\w+)\s*=.*/g)];
  const lineHeight = 21.6;

  declarations.slice(0, 8).forEach((decl) => {
    const variable = decl[1];
    const before = text.substring(0, decl.index);
    const declLine = before.split('\n').length;

    const usageMatches = [...text.matchAll(new RegExp(`\\b${variable}\\b`, 'g'))].slice(1, 4);
    usageMatches.forEach((u) => {
      const usageLine = text.substring(0, u.index).split('\n').length;
      ctx.strokeStyle = '#5ea1ff66';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(24, declLine * lineHeight - 8 - editor.scrollTop);
      ctx.bezierCurveTo(120, declLine * lineHeight, 180, usageLine * lineHeight, 260, usageLine * lineHeight - editor.scrollTop);
      ctx.stroke();
    });
  });
}

function logicOnlyTransform() {
  const lines = getLines();
  let visible = lines;
  if (toggles.logicOnly.checked) {
    visible = lines.filter((line) => !/^(using|namespace|{|})/.test(line.trim()));
  }
  if (toggles.commentFilter.checked) {
    visible = visible.map((line) => {
      if (line.trim().startsWith('///') || line.trim().startsWith('//') && line.length > 28) {
        return `${line.slice(0, 12)} … (hover in full editor)`;
      }
      return line;
    });
  }
  logicPreview.textContent = visible.join('\n');
}

function computeComplexity() {
  const text = editor.value;
  const keywords = (text.match(/\b(if|for|foreach|while|case|&&|\|\|\?|catch)\b/g) || []).length;
  const complexity = 1 + keywords;
  complexityGauge.textContent = complexity;
  brainLoad.textContent = complexity > 10 ? 'High' : complexity > 6 ? 'Medium' : 'Low';
}

function showGhostSuggestion() {
  const cursor = editor.selectionStart;
  const left = editor.value.substring(0, cursor);
  const currentLine = left.split('\n').pop();
  let suggestion = '';

  if (/\.Where\($/.test(currentLine.trim())) suggestion = 'x => x > 0)';
  if (/for\s*\($/.test(currentLine.trim())) suggestion = 'int i = 0; i < items.Count; i++)';
  if (/Console\.WriteLine\($/.test(currentLine.trim())) suggestion = '"Debug" + value)';

  if (!suggestion) {
    ghostText.textContent = '';
    return;
  }

  const lineCount = left.split('\n').length;
  const col = currentLine.length;
  ghostText.style.left = `${18 + col * 8}px`;
  ghostText.style.top = `${14 + (lineCount - 1) * 21.6 - editor.scrollTop}px`;
  ghostText.textContent = suggestion;
}

function clearDebugTips() {
  activeDebugTips.forEach((el) => el.remove());
  activeDebugTips = [];
}

function runDebug() {
  clearDebugTips();
  const lines = getLines();
  const tracked = [...editor.value.matchAll(/\b(int|var|bool|string|double)\s+(\w+)\s*=\s*([^;]+)/g)].slice(0, 5);
  consoleOutput.textContent = '[Build] Success\n[Run] Executing Compute() ...\n';

  tracked.forEach((m, i) => {
    const name = m[2];
    const val = m[3].trim();
    consoleOutput.textContent += `[Trace] ${name} = ${val}\n`;

    if (toggles.debugTips.checked) {
      const tip = document.createElement('div');
      tip.className = 'debug-tip';
      tip.textContent = `${name}: ${val}`;
      tip.style.left = `${280 + (i % 2) * 160}px`;
      tip.style.top = `${70 + i * 36}px`;
      document.getElementById('editorWrapper').appendChild(tip);
      activeDebugTips.push(tip);
    }
  });

  consoleOutput.textContent += '[Run] Finished.\n';
}

function buildFlowchart() {
  if (!toggles.flowchart.checked) {
    flowchartPanel.textContent = 'Flowchart paused.';
    return;
  }
  const lines = getLines();
  const blocks = lines.filter((l) => /\b(if|foreach|for|while|return)\b/.test(l)).slice(0, 8);
  flowchartPanel.textContent = blocks.map((b, i) => `${i === 0 ? 'Start' : '↓'}\n[${b.trim().slice(0, 42)}]`).join('\n');
}

function buildStateTimeline() {
  if (!toggles.stateTracking.checked) {
    stateTimeline.innerHTML = '<li>State tracking paused.</li>';
    return;
  }
  const updates = [...editor.value.matchAll(/(\w+)\s*([+\-*\/]?=)\s*([^;]+);/g)].slice(0, 12);
  stateTimeline.innerHTML = updates.map((u, i) => `<li><strong>t${i}</strong> — ${u[1]} ${u[2]} ${u[3]}</li>`).join('') || '<li>No tracked updates.</li>';
}

function buildBoilerplateSummary() {
  if (!toggles.boiler.checked) {
    boilerplateSummary.innerHTML = '<li>Summary paused.</li>';
    return;
  }
  const constructors = [...editor.value.matchAll(/public\s+(\w+)\s*\(/g)].map((m) => `🧩 Constructor/Method: ${m[1]}()`);
  const properties = [...editor.value.matchAll(/public\s+\w+\s+(\w+)\s*{\s*get;\s*set;\s*}/g)].map((m) => `🏷 Property: ${m[1]}`);
  const all = [...constructors, ...properties].slice(0, 8);
  boilerplateSummary.innerHTML = all.map((x) => `<li>${x}</li>`).join('') || '<li>No boilerplate blocks detected.</li>';
}

function booleanSimplifier() {
  if (!toggles.bool.checked) {
    booleanHints.innerHTML = '<li>Simplifier paused.</li>';
    return;
  }
  const hints = [];
  const pattern = /\((\w+)\s*==\s*false\s*&&\s*(\w+)\s*==\s*false\)/g;
  let m;
  while ((m = pattern.exec(editor.value))) {
    hints.push(`Consider: (!${m[1]} && !${m[2]}) ➜ !( ${m[1]} || ${m[2]} )`);
  }
  booleanHints.innerHTML = hints.map((h) => `<li>${h}</li>`).join('') || '<li>No simplifications suggested.</li>';
}

function applyHeatmap() {
  if (!toggles.heatmap.checked) {
    editor.classList.remove('heat-1', 'heat-2', 'heat-3');
    return;
  }
  const match = editor.value.match(/public\s+\w+\s+(\w+)\s*\(/);
  if (!match) return;
  const methodName = match[1];
  const hits = (editor.value.match(new RegExp(`\\b${methodName}\\b`, 'g')) || []).length;
  editor.classList.remove('heat-1', 'heat-2', 'heat-3');
  editor.classList.add(hits > 6 ? 'heat-3' : hits > 3 ? 'heat-2' : 'heat-1');
}

function interpretNaturalLanguage() {
  if (!toggles.nl.checked) return;
  const linq = editor.value.match(/\.Where\(.+?\)\.Select\(.+?\)/s);
  if (!linq) return;
  consoleOutput.textContent = `${consoleOutput.textContent}\n[Interpreter EN] Filter sequence then transform each element.\n[Interpreter AR] قم بتصفية العناصر ثم تحويل كل عنصر لصيغة جديدة.`;
}

function persistScratchpad() {
  localStorage.setItem('devstudio.scratchpad', document.getElementById('scratchpad').value);
}

function saveSnapshot() {
  const data = {
    code: editor.value,
    scratchpad: document.getElementById('scratchpad').value,
    cursor: editor.selectionStart,
    ts: Date.now()
  };
  localStorage.setItem('devstudio.snapshot', JSON.stringify(data));
  consoleOutput.textContent = `[Snapshot] Saved at ${new Date(data.ts).toLocaleTimeString()}`;
}

function restoreSnapshot() {
  const raw = localStorage.getItem('devstudio.snapshot');
  if (!raw) {
    consoleOutput.textContent = '[Snapshot] No saved state found.';
    return;
  }
  const data = JSON.parse(raw);
  editor.value = data.code;
  document.getElementById('scratchpad').value = data.scratchpad || '';
  editor.focus();
  editor.selectionStart = editor.selectionEnd = data.cursor || 0;
  runAll();
  consoleOutput.textContent = `[Snapshot] Restored from ${new Date(data.ts).toLocaleTimeString()}`;
}

function pinAnchor() {
  const selection = editor.value.substring(editor.selectionStart, editor.selectionEnd).trim();
  const content = selection || 'No selection. Tip: select a block then pin it as a mental anchor.';
  anchorPanel.textContent = content;
}

function semanticSearch(query) {
  const key = Object.keys(semanticIntentMap).find((k) => query.toLowerCase().includes(k));
  const results = key ? semanticIntentMap[key] : ['No semantic match found. Try: DB, API, auth, cache.'];
  semanticResults.innerHTML = results.map((r) => `<li>${r}</li>`).join('');
}

function zenTypingState(isTyping) {
  document.body.classList.toggle('zen', toggles.zen.checked && isTyping);
  typingSignal.textContent = isTyping ? 'Typing… Deep Work Active' : 'Idle';
}

function showDocsTooltip(e) {
  if (!toggles.docs.checked) {
    docPopup.style.opacity = 0;
    return;
  }
  const pos = editor.selectionStart;
  const left = editor.value.slice(0, pos).match(/[A-Za-z]+$/)?.[0] || '';
  const right = editor.value.slice(pos).match(/^[A-Za-z]+/)?.[0] || '';
  const word = `${left}${right}`;

  if (!docsDictionary[word]) {
    docPopup.style.opacity = 0;
    return;
  }

  docPopup.textContent = `${word}: ${docsDictionary[word]}`;
  docPopup.style.left = `${e.offsetX + 20}px`;
  docPopup.style.top = `${e.offsetY + 20}px`;
  docPopup.style.opacity = 1;
}

function initBrainCanvas() {
  const canvas = document.getElementById('brainCanvas');
  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#7dadff';
  ctx.lineWidth = 2;
  let drawing = false;

  canvas.addEventListener('mousedown', (e) => {
    drawing = true;
    sketchPoints.push(['M', e.offsetX, e.offsetY]);
    ctx.beginPath();
    ctx.moveTo(e.offsetX, e.offsetY);
  });

  canvas.addEventListener('mousemove', (e) => {
    if (!drawing) return;
    sketchPoints.push(['L', e.offsetX, e.offsetY]);
    ctx.lineTo(e.offsetX, e.offsetY);
    ctx.stroke();
  });

  window.addEventListener('mouseup', () => {
    drawing = false;
  });
}

function convertSketchToCode() {
  const lineCount = sketchPoints.filter((p) => p[0] === 'M').length;
  const generated = `\n// Brainstorm Imported\n// Nodes: ${lineCount}\nif (conditionA)\n{\n    ExecuteStep1();\n}\nelse\n{\n    ExecuteFallback();\n}\n`;
  editor.value += generated;
  runAll();
}

function runAll() {
  applyContextualDimming();
  drawFlowMappings();
  logicOnlyTransform();
  computeComplexity();
  showGhostSuggestion();
  buildFlowchart();
  buildStateTimeline();
  buildBoilerplateSummary();
  booleanSimplifier();
  applyHeatmap();
}

editor.addEventListener('input', () => {
  zenTypingState(true);
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => zenTypingState(false), 700);
  runAll();
});
editor.addEventListener('click', runAll);
editor.addEventListener('keyup', runAll);
editor.addEventListener('scroll', () => {
  drawFlowMappings();
  showGhostSuggestion();
});
editor.addEventListener('mousemove', showDocsTooltip);
editor.addEventListener('mouseleave', () => { docPopup.style.opacity = 0; });

Object.values(toggles).forEach((t) => t.addEventListener('change', runAll));
document.getElementById('runCode').addEventListener('click', () => {
  runDebug();
  interpretNaturalLanguage();
});
document.getElementById('saveSnapshot').addEventListener('click', saveSnapshot);
document.getElementById('restoreSnapshot').addEventListener('click', restoreSnapshot);
document.getElementById('pinSelection').addEventListener('click', pinAnchor);
document.getElementById('semanticSearch').addEventListener('input', (e) => semanticSearch(e.target.value));
document.getElementById('scratchpad').addEventListener('input', persistScratchpad);
document.getElementById('convertCanvas').addEventListener('click', convertSketchToCode);

(function bootstrap() {
  document.getElementById('scratchpad').value = localStorage.getItem('devstudio.scratchpad') || '';
  initBrainCanvas();
  semanticSearch('db');
  runAll();
})();
