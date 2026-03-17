/**
 * CalculoNotas – Calculadora de Notas Personalizadas
 *
 * Características:
 *   - Registro / inicio de sesión con correo y contraseña (localStorage)
 *   - Gestión de materias y entregas con porcentajes personalizados
 *   - Fecha por entrega con cuenta regresiva de días
 *   - Mensajes de felicitación/ánimo por rango de nota (0-1, 1-2, 2-3, 3-4, 4-5)
 *   - Animación de emojis voladores al ingresar una nota
 *   - Entregas como acordeón colapsable (nombre, fecha, nota en cabecera)
 */

(function () {
  'use strict';

  /* ── Constantes ────────────────────────────────────────────────── */
  const STORAGE_KEY = 'calculo_notas_v2';
  const MIN_NOTA    = 0;
  const MAX_NOTA    = 5;
  const PASS_GRADE  = 3.0;

  /** Mensajes y emojis por rango de nota */
  const GRADE_RANGES = [
    {
      min: 0, max: 1,
      msg: '\u{1F61E} Es un momento difícil, pero recuerda: cada error es una oportunidad de aprender. \u00a1No te rindas!',
      emojis: ['\u{1F61E}', '\u{1F622}', '\u{1F494}', '\u{1F614}', '\u{1F641}', '\u{1F63F}'],
    },
    {
      min: 1, max: 2,
      msg: '\u{1F615} Vas por el camino, pero necesitas más esfuerzo. \u00a1Tú puedes mejorar mucho más!',
      emojis: ['\u{1F615}', '\u{1F61F}', '\u{1F4AA}', '\u{1F4DA}', '\u{1F504}', '\u270F\uFE0F'],
    },
    {
      min: 2, max: 3,
      msg: '\u{1F610} Estás muy cerca del aprobado. \u00a1Un poco más de dedicación y lo lograrás!',
      emojis: ['\u{1F610}', '\u{1F4D6}', '\u{1F4A1}', '\u{1F3AF}', '\u26A1', '\u{1F525}'],
    },
    {
      min: 3, max: 4,
      msg: '\u{1F60A} \u00a1Aprobado! Buen trabajo, sigue así y podrás mejorar aún más. \u{1F44F}',
      emojis: ['\u{1F60A}', '\u{1F44D}', '\u{1F31F}', '\u2728', '\u{1F389}', '\u{1F44F}'],
    },
    {
      min: 4, max: Infinity,
      msg: '\u{1F389} \u00a1Excelente! Eso es un trabajo sobresaliente. \u00a1Eres una estrella! \u2B50',
      emojis: ['\u{1F389}', '\u{1F31F}', '\u2B50', '\u{1F3C6}', '\u{1F38A}', '\u{1F973}', '\u{1F388}', '\u{1F680}'],
    },
  ];

  /* ── Estado ────────────────────────────────────────────────────── */
  let state = loadState();
  let currentUser      = state.currentUser || null;
  let currentSubjectId = null;
  let editingEntregaId = null;

  /* ── Persistencia ──────────────────────────────────────────────── */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (_) {}
    return { users: {}, currentUser: null };
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  /* ── Autenticación ─────────────────────────────────────────────── */
  function hashPassword(password) {
    let h = 5381;
    for (let i = 0; i < password.length; i++) {
      h = ((h << 5) + h) ^ password.charCodeAt(i);
      h = h >>> 0;
    }
    return h.toString(16);
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function register(email, password) {
    email = email.trim().toLowerCase();
    if (!email)               return { ok: false, msg: 'Ingresa tu correo electrónico' };
    if (!isValidEmail(email)) return { ok: false, msg: 'El correo electrónico no es válido' };
    if (!password)             return { ok: false, msg: 'Ingresa una contraseña' };
    if (password.length < 6)  return { ok: false, msg: 'La contraseña debe tener al menos 6 caracteres' };
    if (state.users[email])   return { ok: false, msg: 'Este correo ya está registrado' };
    state.users[email] = { passwordHash: hashPassword(password), subjects: [] };
    saveState();
    return { ok: true };
  }

  function loginUser(email, password) {
    email = email.trim().toLowerCase();
    const user = state.users[email];
    if (!user || user.passwordHash !== hashPassword(password)) {
      return { ok: false, msg: 'Correo o contraseña incorrectos' };
    }
    state.currentUser = email;
    currentUser = email;
    saveState();
    return { ok: true };
  }

  function logout() {
    state.currentUser = null;
    currentUser = null;
    currentSubjectId = null;
    saveState();
    showAuthScreen();
  }

  function getCurrentUserData() {
    return currentUser ? state.users[currentUser] : null;
  }

  /* ── Materias ──────────────────────────────────────────────────── */
  function addSubject(name) {
    const user = getCurrentUserData();
    if (!user) return null;
    const id = generateId();
    user.subjects.push({ id, name: name.trim(), entregas: [] });
    saveState();
    return id;
  }

  function deleteSubject(subjectId) {
    const user = getCurrentUserData();
    if (!user) return;
    user.subjects = user.subjects.filter(s => s.id !== subjectId);
    saveState();
  }

  function getSubject(subjectId) {
    const user = getCurrentUserData();
    if (!user) return null;
    return user.subjects.find(s => s.id === subjectId) || null;
  }

  /* ── Entregas ──────────────────────────────────────────────────── */
  function addEntrega(subjectId, data) {
    const subject = getSubject(subjectId);
    if (!subject) return null;
    const id = generateId();
    subject.entregas.push({
      id,
      name:       data.name.trim(),
      percentage: parseFloat(data.percentage),
      date:       data.date || null,
      grade:      parseGradeValue(data.grade),
      collapsed:  true,
    });
    saveState();
    return id;
  }

  function updateEntrega(subjectId, entregaId, data) {
    const subject = getSubject(subjectId);
    if (!subject) return;
    const entrega = subject.entregas.find(e => e.id === entregaId);
    if (!entrega) return;
    entrega.name       = data.name.trim();
    entrega.percentage = parseFloat(data.percentage);
    entrega.date       = data.date || null;
    entrega.grade      = parseGradeValue(data.grade);
    saveState();
  }

  function deleteEntrega(subjectId, entregaId) {
    const subject = getSubject(subjectId);
    if (!subject) return;
    subject.entregas = subject.entregas.filter(e => e.id !== entregaId);
    saveState();
  }

  function toggleEntregaCollapsed(subjectId, entregaId) {
    const subject = getSubject(subjectId);
    if (!subject) return;
    const entrega = subject.entregas.find(e => e.id === entregaId);
    if (!entrega) return;
    entrega.collapsed = !entrega.collapsed;
    saveState();
  }

  function parseGradeValue(val) {
    if (val === '' || val === null || val === undefined) return null;
    const n = parseFloat(String(val).replace(',', '.'));
    return isNaN(n) ? null : n;
  }

  /* ── Cálculo de nota final ─────────────────────────────────────── */
  function calcFinal(subject) {
    if (!subject || !subject.entregas.length) return null;
    const graded = subject.entregas.filter(e => e.grade !== null && !isNaN(e.grade));
    if (!graded.length) return null;
    let sumPct = 0, sumWeighted = 0;
    for (const e of graded) {
      sumWeighted += e.grade * e.percentage;
      sumPct      += e.percentage;
    }
    return sumPct > 0 ? sumWeighted / sumPct : null;
  }

  /* ── Mensajes por rango ────────────────────────────────────────── */
  function getGradeRange(grade) {
    if (grade === null || isNaN(grade)) return null;
    for (const r of GRADE_RANGES) {
      if (grade >= r.min && grade < r.max) return r;
    }
    return GRADE_RANGES[GRADE_RANGES.length - 1];
  }

  /* ── Emojis voladores ──────────────────────────────────────────── */
  function launchEmojis(grade) {
    const range = getGradeRange(grade);
    if (!range) return;
    const container = document.getElementById('emoji-container');
    if (!container) return;
    for (let i = 0; i < 14; i++) {
      setTimeout(() => {
        const span = document.createElement('span');
        span.className = 'emoji-fly';
        span.textContent = range.emojis[Math.floor(Math.random() * range.emojis.length)];
        span.style.left              = (5 + Math.random() * 90) + '%';
        span.style.animationDuration = (1.4 + Math.random() * 1.8) + 's';
        span.style.fontSize          = (1.4 + Math.random() * 1.6) + 'rem';
        container.appendChild(span);
        span.addEventListener('animationend', () => span.remove());
      }, i * 100);
    }
  }

  /* ── Cuenta regresiva de días ──────────────────────────────────── */
  function daysUntil(dateStr) {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    return Math.round((target - today) / 86400000);
  }

  function daysLabel(days) {
    if (days === null) return '';
    if (days < 0) {
      const absDays = Math.abs(days);
      return `Hace ${absDays} día${absDays !== 1 ? 's' : ''}`;
    }
    if (days === 0) return '\u00a1Hoy!';
    return `Faltan ${days} día${days !== 1 ? 's' : ''}`;
  }

  function daysClass(days) {
    if (days === null) return '';
    if (days < 0)  return 'overdue';
    if (days === 0) return 'today';
    if (days <= 3) return 'soon';
    return '';
  }

  /* ── Utilidades ────────────────────────────────────────────────── */
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function fmt(n) {
    if (n === null || isNaN(n)) return '\u2013';
    return n.toFixed(2);
  }

  function gradeClass(n) {
    if (n === null || isNaN(n)) return '';
    if (n >= PASS_GRADE) return 'grade-approved';
    if (n >= 2.5)        return 'grade-warning';
    return 'grade-failed';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
    return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]} ${year}`;
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  /* ── Toast ─────────────────────────────────────────────────────── */
  let toastTimer = null;
  function showToast(msg) {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  /* ── Screens ───────────────────────────────────────────────────── */
  function showAuthScreen() {
    document.getElementById('auth-screen').classList.remove('hidden');
    document.getElementById('app-screen').classList.add('hidden');
  }

  function showAppScreen() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-screen').classList.remove('hidden');
    document.getElementById('user-email-display').textContent = currentUser;
    showSubjectsView();
  }

  function showSubjectsView() {
    document.getElementById('subjects-view').classList.remove('hidden');
    document.getElementById('subject-detail-view').classList.add('hidden');
    currentSubjectId = null;
    renderSubjects();
  }

  function showSubjectDetail(subjectId) {
    currentSubjectId = subjectId;
    const subject = getSubject(subjectId);
    if (!subject) return;
    document.getElementById('subjects-view').classList.add('hidden');
    document.getElementById('subject-detail-view').classList.remove('hidden');
    document.getElementById('subject-title').textContent = subject.name;
    renderSubjectDetail();
  }

  /* ── Render: lista de materias ─────────────────────────────────── */
  function renderSubjects() {
    const user  = getCurrentUserData();
    const list  = document.getElementById('subjects-list');
    const empty = document.getElementById('no-subjects');
    list.innerHTML = '';

    if (!user || !user.subjects.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    for (const subject of user.subjects) {
      const final = calcFinal(subject);
      const card  = document.createElement('div');
      card.className = 'subject-card';
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Ver materia ${subject.name}`);
      card.innerHTML = `
        <div class="subject-card-info">
          <h3>${escapeHtml(subject.name)}</h3>
          <span class="subject-stats">${subject.entregas.length} entrega${subject.entregas.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="subject-card-right">
          <span class="subject-card-grade ${gradeClass(final)}">${fmt(final)}</span>
          <span class="subject-arrow">\u203A</span>
        </div>
      `;
      card.addEventListener('click', () => showSubjectDetail(subject.id));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showSubjectDetail(subject.id); }
      });
      list.appendChild(card);
    }
  }

  /* ── Render: detalle de materia ────────────────────────────────── */
  function renderSubjectDetail() {
    const subject = getSubject(currentSubjectId);
    if (!subject) return;
    document.getElementById('subject-title').textContent = subject.name;
    renderFinal(subject);
    renderEntregas(subject);
  }

  function renderFinal(subject) {
    const final    = calcFinal(subject);
    const display  = document.getElementById('final-grade-display');
    const status   = document.getElementById('final-status');
    const message  = document.getElementById('final-message');
    const bar      = document.getElementById('progress-bar');
    const barLabel = document.getElementById('progress-label');

    if (final === null) {
      display.textContent  = '\u2013';
      display.className    = '';
      status.textContent   = 'Ingresa las notas para calcular';
      status.className     = '';
      message.textContent  = '';
      bar.style.width      = '0%';
      barLabel.textContent = '';
      return;
    }

    display.textContent = fmt(final);
    display.className   = gradeClass(final);
    status.className    = gradeClass(final);

    if (final >= PASS_GRADE)  status.textContent = '\u00a1Aprobado! \u{1F389}';
    else if (final >= 2.5)    status.textContent = 'En riesgo \u2013 \u00a1\u00c1nimo! \u{1F4AA}';
    else                      status.textContent = 'Reprobado \u2013 No te rindas \u{1F4DA}';

    const range = getGradeRange(final);
    message.textContent = range ? range.msg : '';

    const pct = Math.min((final / MAX_NOTA) * 100, 100);
    bar.style.width      = `${pct.toFixed(1)}%`;
    barLabel.textContent = `${pct.toFixed(1)}% de ${MAX_NOTA}.00`;
  }

  /* ── Render: lista de entregas (acordeón) ──────────────────────── */
  function renderEntregas(subject) {
    const list  = document.getElementById('entregas-list');
    const empty = document.getElementById('no-entregas');
    list.innerHTML = '';

    if (!subject.entregas.length) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');

    for (const entrega of subject.entregas) {
      list.appendChild(buildEntregaItem(entrega));
    }
  }

  function buildEntregaItem(entrega) {
    const days       = daysUntil(entrega.date);
    const daysText   = daysLabel(days);
    const daysCls    = daysClass(days);
    const gradeText  = entrega.grade !== null ? fmt(entrega.grade) : '\u2013';
    const gradeCls   = gradeClass(entrega.grade);
    const range      = getGradeRange(entrega.grade);
    const isExpanded = !entrega.collapsed;

    const item = document.createElement('div');
    item.className = `entrega-item${isExpanded ? ' expanded' : ''}`;
    item.dataset.id = entrega.id;

    /* ── Header ── */
    const header = document.createElement('div');
    header.className = 'entrega-header';
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');
    header.setAttribute('aria-expanded', String(isExpanded));

    const headerInfo = document.createElement('div');
    headerInfo.className = 'entrega-header-info';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'entrega-name';
    nameSpan.textContent = entrega.name;
    headerInfo.appendChild(nameSpan);

    const metaDiv = document.createElement('div');
    metaDiv.className = 'entrega-header-meta';

    if (entrega.date) {
      const dateChip = document.createElement('span');
      dateChip.className = 'entrega-date-chip';
      dateChip.textContent = '\u{1F4C5} ' + formatDate(entrega.date);
      metaDiv.appendChild(dateChip);
    }

    const gradeChip = document.createElement('span');
    gradeChip.className = `entrega-grade-chip ${gradeCls}`;
    gradeChip.textContent = gradeText;
    metaDiv.appendChild(gradeChip);

    const pctChip = document.createElement('span');
    pctChip.className = 'entrega-pct-chip';
    pctChip.textContent = entrega.percentage + '%';
    metaDiv.appendChild(pctChip);

    headerInfo.appendChild(metaDiv);
    header.appendChild(headerInfo);

    const chevron = document.createElement('span');
    chevron.className = 'entrega-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    chevron.textContent = isExpanded ? '\u25b2' : '\u25bc';
    header.appendChild(chevron);

    /* ── Body ── */
    const body = document.createElement('div');
    body.className = 'entrega-body';

    if (entrega.date) {
      const countdown = document.createElement('div');
      countdown.className = `countdown ${daysCls}`;
      countdown.textContent = '\u{1F4C5} ' + daysText;
      body.appendChild(countdown);
    }

    const gradeSection = document.createElement('div');
    gradeSection.className = 'entrega-grade-section';

    if (entrega.grade !== null) {
      const gradeDisplay = document.createElement('div');
      gradeDisplay.className = 'entrega-grade-display';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'entrega-grade-label';
      labelSpan.textContent = 'Nota:';
      gradeDisplay.appendChild(labelSpan);

      const valSpan = document.createElement('span');
      valSpan.className = `entrega-grade-value ${gradeCls}`;
      valSpan.textContent = fmt(entrega.grade);
      gradeDisplay.appendChild(valSpan);

      gradeSection.appendChild(gradeDisplay);

      const msgP = document.createElement('p');
      msgP.className = 'entrega-grade-message';
      msgP.textContent = range ? range.msg : '';
      gradeSection.appendChild(msgP);
    } else {
      const noGrade = document.createElement('p');
      noGrade.className = 'no-grade';
      noGrade.textContent = 'Sin nota a\u00fan';
      gradeSection.appendChild(noGrade);
    }
    body.appendChild(gradeSection);

    const actions = document.createElement('div');
    actions.className = 'entrega-actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn-secondary';
    editBtn.textContent = '\u270F\uFE0F Editar';
    editBtn.setAttribute('aria-label', `Editar ${entrega.name}`);

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn-danger-sm';
    delBtn.textContent = '\u{1F5D1}\uFE0F Eliminar';
    delBtn.setAttribute('aria-label', `Eliminar ${entrega.name}`);

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    body.appendChild(actions);

    item.appendChild(header);
    item.appendChild(body);

    /* ── Events ── */
    const entregaId = entrega.id;

    const toggle = () => {
      toggleEntregaCollapsed(currentSubjectId, entregaId);
      renderSubjectDetail();
    };
    header.addEventListener('click', toggle);
    header.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });

    editBtn.addEventListener('click', e => {
      e.stopPropagation();
      openEntregaModal(entregaId);
    });

    delBtn.addEventListener('click', e => {
      e.stopPropagation();
      if (confirm(`\u00bfEliminar la entrega "${entrega.name}"?`)) {
        deleteEntrega(currentSubjectId, entregaId);
        renderSubjectDetail();
        showToast('\u{1F5D1}\uFE0F Entrega eliminada');
      }
    });

    return item;
  }

  /* ── Modales ───────────────────────────────────────────────────── */
  function openSubjectModal() {
    document.getElementById('subject-name-input').value = '';
    document.getElementById('subject-modal-title').textContent = 'Nueva Materia';
    document.getElementById('subject-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('subject-name-input').focus(), 80);
  }

  function closeSubjectModal() {
    document.getElementById('subject-modal').classList.add('hidden');
  }

  function openEntregaModal(entregaId) {
    editingEntregaId = entregaId || null;
    const title = document.getElementById('entrega-modal-title');

    if (editingEntregaId) {
      const subject = getSubject(currentSubjectId);
      const entrega = subject ? subject.entregas.find(e => e.id === editingEntregaId) : null;
      if (entrega) {
        title.textContent = 'Editar Entrega';
        document.getElementById('entrega-name-input').value  = entrega.name;
        document.getElementById('entrega-pct-input').value   = entrega.percentage;
        document.getElementById('entrega-date-input').value  = entrega.date || '';
        document.getElementById('entrega-grade-input').value = entrega.grade !== null ? entrega.grade : '';
      }
    } else {
      title.textContent = 'Nueva Entrega';
      document.getElementById('entrega-name-input').value  = '';
      document.getElementById('entrega-pct-input').value   = '';
      document.getElementById('entrega-date-input').value  = '';
      document.getElementById('entrega-grade-input').value = '';
    }

    document.getElementById('entrega-modal').classList.remove('hidden');
    setTimeout(() => document.getElementById('entrega-name-input').focus(), 80);
  }

  function closeEntregaModal() {
    document.getElementById('entrega-modal').classList.add('hidden');
    editingEntregaId = null;
  }

  /* ── Manejadores de eventos ────────────────────────────────────── */
  function handleRegister() {
    const email    = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-confirm').value;

    if (password !== confirm) { showAuthError('Las contrase\u00f1as no coinciden'); return; }

    const result = register(email, password);
    if (!result.ok) { showAuthError(result.msg); return; }

    loginUser(email, password);
    showAppScreen();
  }

  function handleLogin() {
    const email    = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const result   = loginUser(email, password);
    if (!result.ok) { showAuthError(result.msg); return; }
    showAppScreen();
  }

  function showAuthError(msg) {
    const el = document.getElementById('auth-error');
    el.textContent = msg;
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 4000);
  }

  function handleSaveSubject() {
    const name = document.getElementById('subject-name-input').value.trim();
    if (!name) { showToast('\u26a0\uFE0F Escribe el nombre de la materia'); return; }
    addSubject(name);
    closeSubjectModal();
    renderSubjects();
    showToast('\u2705 Materia creada');
  }

  function handleSaveEntrega() {
    const name     = document.getElementById('entrega-name-input').value.trim();
    const pctRaw   = document.getElementById('entrega-pct-input').value;
    const date     = document.getElementById('entrega-date-input').value;
    const gradeRaw = document.getElementById('entrega-grade-input').value.trim();

    if (!name) { showToast('\u26a0\uFE0F Escribe el nombre de la entrega'); return; }

    const pct = parseFloat(pctRaw);
    if (!pctRaw || isNaN(pct) || pct <= 0 || pct > 100) {
      showToast('\u26a0\uFE0F El porcentaje debe estar entre 1 y 100'); return;
    }

    if (gradeRaw !== '') {
      const g = parseFloat(gradeRaw.replace(',', '.'));
      if (isNaN(g) || g < MIN_NOTA || g > MAX_NOTA) {
        showToast('\u26a0\uFE0F La nota debe estar entre 0 y 5'); return;
      }
    }

    let prevGrade = null;
    if (editingEntregaId) {
      const subject = getSubject(currentSubjectId);
      const prev = subject ? subject.entregas.find(e => e.id === editingEntregaId) : null;
      if (prev) prevGrade = prev.grade;
    }

    const data = { name, percentage: pctRaw, date, grade: gradeRaw };
    if (editingEntregaId) {
      updateEntrega(currentSubjectId, editingEntregaId, data);
      showToast('\u2705 Entrega actualizada');
    } else {
      addEntrega(currentSubjectId, data);
      showToast('\u2705 Entrega a\u00f1adida');
    }

    const newGrade = parseGradeValue(gradeRaw);
    if (newGrade !== null && newGrade !== prevGrade) {
      launchEmojis(newGrade);
    }

    closeEntregaModal();
    renderSubjectDetail();
  }

  /* ── Setup inicial ─────────────────────────────────────────────── */
  function setupEventListeners() {
    document.querySelectorAll('.auth-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(b => {
          b.classList.remove('active');
          b.setAttribute('aria-selected', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-selected', 'true');
        document.querySelectorAll('.auth-form').forEach(f => f.classList.add('hidden'));
        document.getElementById(`${btn.dataset.tab}-form`).classList.remove('hidden');
        document.getElementById('auth-error').classList.add('hidden');
      });
    });

    document.getElementById('login-btn').addEventListener('click', handleLogin);
    ['login-email', 'login-password'].forEach(id =>
      document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleLogin(); })
    );

    document.getElementById('register-btn').addEventListener('click', handleRegister);
    ['reg-email', 'reg-password', 'reg-confirm'].forEach(id =>
      document.getElementById(id).addEventListener('keydown', e => { if (e.key === 'Enter') handleRegister(); })
    );

    document.getElementById('logout-btn').addEventListener('click', logout);

    document.getElementById('add-subject-btn').addEventListener('click', openSubjectModal);
    document.getElementById('subject-modal-cancel').addEventListener('click', closeSubjectModal);
    document.getElementById('subject-modal-save').addEventListener('click', handleSaveSubject);
    document.getElementById('subject-name-input').addEventListener('keydown', e => { if (e.key === 'Enter') handleSaveSubject(); });
    document.getElementById('subject-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('subject-modal')) closeSubjectModal();
    });

    document.getElementById('add-entrega-btn').addEventListener('click', () => openEntregaModal(null));
    document.getElementById('entrega-modal-cancel').addEventListener('click', closeEntregaModal);
    document.getElementById('entrega-modal-save').addEventListener('click', handleSaveEntrega);
    document.getElementById('entrega-modal').addEventListener('click', e => {
      if (e.target === document.getElementById('entrega-modal')) closeEntregaModal();
    });

    document.getElementById('back-btn').addEventListener('click', showSubjectsView);
    document.getElementById('delete-subject-btn').addEventListener('click', () => {
      const subject = getSubject(currentSubjectId);
      if (!subject) return;
      if (confirm(`\u00bfEliminar la materia "${subject.name}" y todas sus entregas?`)) {
        deleteSubject(currentSubjectId);
        showSubjectsView();
        showToast('\u{1F5D1}\uFE0F Materia eliminada');
      }
    });
  }

  function init() {
    setupEventListeners();
    if (currentUser && state.users[currentUser]) {
      showAppScreen();
    } else {
      showAuthScreen();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
