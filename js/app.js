/**
 * Patología – Calculadora de Notas Finales
 *
 * Estructura de notas:
 *   4 cortes × 25% = 100%
 *   Cada corte:  Teórico 16%  +  Práctico 9%  = 25%
 *
 * Persistencia: localStorage (clave "patologia_notas")
 */

(function () {
  'use strict';

  /* ── Constantes ────────────────────────────────────────────── */
  const STORAGE_KEY = 'patologia_notas';
  const NUM_CORTES  = 4;
  const COMPONENTS  = [
    { id: 'teorico',   label: 'Teórico',   weight: 0.16 },
    { id: 'practico',  label: 'Práctico',  weight: 0.09 },
  ];
  const MIN_NOTA = 0;
  const MAX_NOTA = 5;
  const PASS_GRADE = 3.0;

  /* ── Estado ────────────────────────────────────────────────── */
  // notas[corteIndex][componentId] = string value ('' if not set)
  let notas = loadNotas();

  /* ── Persistencia ───────────────────────────────────────────── */
  function loadNotas() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === NUM_CORTES) {
          return parsed;
        }
      }
    } catch (_) { /* ignore */ }
    return defaultNotas();
  }

  function defaultNotas() {
    return Array.from({ length: NUM_CORTES }, () =>
      Object.fromEntries(COMPONENTS.map(c => [c.id, '']))
    );
  }

  function saveNotas() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
    } catch (_) { /* ignore */ }
  }

  /* ── Cálculo ────────────────────────────────────────────────── */
  function parseNota(val) {
    const n = parseFloat(String(val).replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  function calcCorteWeighted(corteIndex) {
    let sum = 0;
    let hasAny = false;
    for (const comp of COMPONENTS) {
      const val = parseNota(notas[corteIndex][comp.id]);
      if (val !== null) {
        sum += val * comp.weight;
        hasAny = true;
      }
    }
    return hasAny ? sum : null;
  }

  function calcFinal() {
    let total = 0;
    let count = 0;
    for (let i = 0; i < NUM_CORTES; i++) {
      const w = calcCorteWeighted(i);
      if (w !== null) {
        total += w;
        count++;
      }
    }
    return count > 0 ? total : null;
  }

  /* ── Validación ─────────────────────────────────────────────── */
  function isValidNota(val) {
    if (val === null) return true; // empty is acceptable
    return val >= MIN_NOTA && val <= MAX_NOTA;
  }

  /* ── Render ─────────────────────────────────────────────────── */
  function fmt(n) {
    if (n === null) return '–';
    return n.toFixed(2);
  }

  function gradeClass(n) {
    if (n === null) return '';
    if (n >= PASS_GRADE) return 'grade-approved';
    if (n >= 2.5)       return 'grade-warning';
    return 'grade-failed';
  }

  function renderCorteResult(corteIndex) {
    const resultEl = document.getElementById(`corte-result-${corteIndex}`);
    if (!resultEl) return;
    const w = calcCorteWeighted(corteIndex);
    const valueEl = resultEl.querySelector('.corte-result-value');
    valueEl.textContent = fmt(w);
    valueEl.className = `corte-result-value ${gradeClass(w)}`;
  }

  function renderFinal() {
    const final = calcFinal();
    const display = document.getElementById('final-grade-display');
    const status  = document.getElementById('final-status');
    const bar     = document.getElementById('progress-bar');
    const barLabel = document.getElementById('progress-label');

    if (final === null) {
      display.textContent = '–';
      display.className = '';
      status.textContent = 'Ingresa las notas para calcular';
      status.className = '';
      bar.style.width = '0%';
      barLabel.textContent = '';
      return;
    }

    display.textContent = fmt(final);
    display.className = gradeClass(final);
    status.className = gradeClass(final);

    if (final >= PASS_GRADE) {
      status.textContent = '¡Aprobado! 🎉';
    } else if (final >= 2.5) {
      status.textContent = 'En riesgo – ¡Ánimo! 💪';
    } else {
      status.textContent = 'Reprobado – No te rindas 📚';
    }

    const pct = Math.min((final / MAX_NOTA) * 100, 100);
    bar.style.width = `${pct.toFixed(1)}%`;
    barLabel.textContent = `${pct.toFixed(1)}% de ${MAX_NOTA}.00`;
  }

  function renderAll() {
    for (let i = 0; i < NUM_CORTES; i++) {
      for (const comp of COMPONENTS) {
        const input = document.getElementById(`input-${i}-${comp.id}`);
        if (input) {
          input.value = notas[i][comp.id];
          applyInputStyle(input);
        }
      }
      renderCorteResult(i);
    }
    renderFinal();
  }

  function applyInputStyle(input) {
    const val = parseNota(input.value);
    input.classList.remove('valid', 'invalid');
    if (input.value.trim() === '') return;
    if (val !== null && isValidNota(val)) {
      input.classList.add('valid');
    } else {
      input.classList.add('invalid');
    }
  }

  /* ── Toast ──────────────────────────────────────────────────── */
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2200);
  }

  /* ── Handlers ───────────────────────────────────────────────── */
  function handleInputChange(corteIndex, compId, inputEl) {
    const val = inputEl.value;
    notas[corteIndex][compId] = val;
    applyInputStyle(inputEl);
    renderCorteResult(corteIndex);
    renderFinal();
  }

  function handleSave(corteIndex) {
    // Validate all inputs in this corte before saving
    let allValid = true;
    for (const comp of COMPONENTS) {
      const input = document.getElementById(`input-${corteIndex}-${comp.id}`);
      const val = parseNota(input.value);
      if (input.value.trim() !== '' && (val === null || !isValidNota(val))) {
        allValid = false;
        break;
      }
    }

    if (!allValid) {
      showToast('⚠️ Revisa las notas (deben estar entre 0 y 5)');
      return;
    }

    saveNotas();

    // Show saved dot
    const dot = document.getElementById(`saved-dot-${corteIndex}`);
    if (dot) {
      dot.classList.add('visible');
      setTimeout(() => dot.classList.remove('visible'), 2500);
    }

    showToast(`✅ Corte ${corteIndex + 1} guardado`);
  }

  function handleClear() {
    if (!confirm('¿Deseas borrar todas las notas guardadas?')) return;
    notas = defaultNotas();
    saveNotas();
    renderAll();
    showToast('🗑️ Notas borradas');
  }

  /* ── Construcción del DOM ────────────────────────────────────── */
  function buildUI() {
    const container = document.getElementById('cortes-container');
    if (!container) return;

    for (let i = 0; i < NUM_CORTES; i++) {
      const card = buildCorteCard(i);
      container.appendChild(card);
    }

    document.getElementById('clear-btn').addEventListener('click', handleClear);
  }

  function buildCorteCard(i) {
    const card = document.createElement('article');
    card.className = 'corte-card';
    card.setAttribute('aria-label', `Corte ${i + 1}`);

    // Header
    const header = document.createElement('div');
    header.className = 'corte-header';
    header.innerHTML = `
      <h2>Corte ${i + 1} <span class="saved-dot" id="saved-dot-${i}"></span></h2>
      <span class="corte-badge">25%</span>
    `;
    card.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'corte-body';

    for (const comp of COMPONENTS) {
      const group = document.createElement('div');
      group.className = 'input-group';

      const labelEl = document.createElement('label');
      labelEl.setAttribute('for', `input-${i}-${comp.id}`);
      labelEl.innerHTML = `
        ${comp.label}
        <span class="weight-tag">${(comp.weight * 100).toFixed(0)}%</span>
      `;
      group.appendChild(labelEl);

      const row = document.createElement('div');
      row.className = 'input-row';

      const input = document.createElement('input');
      input.type = 'number';
      input.id = `input-${i}-${comp.id}`;
      input.className = 'nota-input';
      input.min = String(MIN_NOTA);
      input.max = String(MAX_NOTA);
      input.step = '0.1';
      input.placeholder = '0.0 – 5.0';
      input.setAttribute('aria-label', `Nota ${comp.label} Corte ${i + 1}`);

      input.addEventListener('input', () => handleInputChange(i, comp.id, input));
      input.addEventListener('blur',  () => handleInputChange(i, comp.id, input));

      row.appendChild(input);
      group.appendChild(row);
      body.appendChild(group);
    }

    // Save button
    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'save-btn';
    saveBtn.textContent = 'Guardar Corte';
    saveBtn.setAttribute('aria-label', `Guardar notas del Corte ${i + 1}`);
    saveBtn.addEventListener('click', () => handleSave(i));
    body.appendChild(saveBtn);

    // Result row
    const resultRow = document.createElement('div');
    resultRow.className = 'corte-result';
    resultRow.id = `corte-result-${i}`;
    resultRow.innerHTML = `
      <span class="corte-result-label">Aporte al total</span>
      <span class="corte-result-value">–</span>
    `;
    body.appendChild(resultRow);

    card.appendChild(body);
    return card;
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    buildUI();
    renderAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
