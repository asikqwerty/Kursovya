(function () {
  'use strict';

  const { SUBJECTS, ICB_SUBJECTS, createStudent, averageScore, getPerformanceLevel, hasPassed,
    sortByAverage, getHighPerformers, getStudentsNeedingSupport, removeStudent } = window.StudentManager;
  const STORAGE_KEY = 'student-performance-roster-v1';
  const LEGACY_SUBJECTS = SUBJECTS.filter((subject) => subject.legacy);
  const DEMO_ACCOUNTS = [
    ['ICB001', '246810'], ['ICB002', '135790'], ['ICB003', '112233'],
    ['ICB004', '445566'], ['ICB005', '778899'], ['ICB006', '202626'], ['ICB007', '314159']
  ];
  const DEMO_STUDENTS = [
    ['Арман', [95, 92, 98, 90, 96, 98]],
    ['Асет', [82, 75, 88, 79, 84, 88]],
    ['Алина', [91, 86, 94, 93, 96, 94]],
    ['Азамат', [48, 52, 45, 50, 47, 45]],
    ['Едил', [67, 71, 64, 69, 73, 64]],
    ['Аулет', [78, 83, 74, 80, 77, 74]],
    ['Алуа', [100, 96, 99, 98, 97, 99]]
  ].map(([name, scores], index) => {
    const grades = Object.fromEntries(ICB_SUBJECTS.map((subject, scoreIndex) => [subject.key, scores[scoreIndex]]));
    return {
      ...createStudent(name, grades, `demo-${index + 1}`),
      account: { login: DEMO_ACCOUNTS[index][0], pin: DEMO_ACCOUNTS[index][1] },
      updatedAt: null
    };
  });

  const elements = {
    teacherPortal: document.querySelector('#teacher-portal'),
    studentPortal: document.querySelector('#student-portal'),
    portalTabs: [...document.querySelectorAll('.portal-tab')],
    form: document.querySelector('#student-form'),
    name: document.querySelector('#student-name'),
    gradeFields: document.querySelector('#grade-fields'),
    accountNotice: document.querySelector('#account-notice'),
    error: document.querySelector('#form-error'),
    list: document.querySelector('#student-list'),
    empty: document.querySelector('#empty-state'),
    emptyTitle: document.querySelector('#empty-title'),
    emptyDescription: document.querySelector('#empty-description'),
    search: document.querySelector('#student-search'),
    sort: document.querySelector('#sort-average'),
    sortIndicator: document.querySelector('#sort-indicator'),
    studentCount: document.querySelector('#student-count'),
    highCount: document.querySelector('#high-count'),
    lowCount: document.querySelector('#low-count'),
    filterButtons: [...document.querySelectorAll('.filter-button')],
    groupAverage: document.querySelector('#group-average'),
    groupAverageTrack: document.querySelector('#group-average-track'),
    assessmentSummary: document.querySelector('#assessment-summary'),
    subjectInsights: document.querySelector('#subject-insights'),
    clear: document.querySelector('#clear-all'),
    dialog: document.querySelector('#grades-dialog'),
    dialogTitle: document.querySelector('#dialog-title'),
    dialogGrades: document.querySelector('#dialog-grades'),
    dialogSummary: document.querySelector('#dialog-summary'),
    closeDialog: document.querySelector('#close-dialog'),
    editDialog: document.querySelector('#edit-student-dialog'),
    editTitle: document.querySelector('#edit-dialog-title'),
    editForm: document.querySelector('#edit-student-form'),
    editFields: document.querySelector('#edit-grade-fields'),
    editError: document.querySelector('#edit-error'),
    closeEditDialog: document.querySelector('#close-edit-dialog'),
    studentLoginForm: document.querySelector('#student-login-form'),
    studentLogin: document.querySelector('#student-login'),
    studentPin: document.querySelector('#student-pin'),
    loginError: document.querySelector('#login-error'),
    studentLoginView: document.querySelector('#student-login-view'),
    studentDashboardView: document.querySelector('#student-dashboard-view'),
    studentWelcomeName: document.querySelector('#student-welcome-name'),
    studentWelcomeLogin: document.querySelector('#student-welcome-login'),
    studentAvatar: document.querySelector('#student-avatar'),
    studentAverage: document.querySelector('#student-average'),
    studentPassedCount: document.querySelector('#student-passed-count'),
    studentGradeCount: document.querySelector('#student-grade-count'),
    studentUpdated: document.querySelector('#student-updated'),
    studentGradeList: document.querySelector('#student-grade-list'),
    studentLogout: document.querySelector('#student-logout')
  };

  let currentStudentId = null;
  let editingStudentId = null;
  buildGradeFields();
  buildSubjectInsights();
  let students = loadStudents();
  let sortDirection = 'desc';
  let activeFilter = 'all';

  function buildGradeFields() {
    elements.gradeFields.replaceChildren(...ICB_SUBJECTS.map((subject) => {
      const label = document.createElement('label');
      label.className = 'grade-field';
      label.htmlFor = `grade-${subject.key}`;
      const name = document.createElement('span');
      name.textContent = subject.name;
      const input = document.createElement('input');
      input.id = `grade-${subject.key}`;
      input.name = subject.key;
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.inputMode = 'numeric';
      input.placeholder = '—';
      label.append(name, input);
      return label;
    }));
  }

  function buildSubjectInsights() {
    elements.subjectInsights.replaceChildren(...ICB_SUBJECTS.map((subject) => {
      const insight = document.createElement('div');
      insight.className = 'subject-insight';
      const heading = document.createElement('div');
      heading.className = 'subject-insight-heading';
      const name = document.createElement('span');
      name.textContent = subject.name;
      const average = document.createElement('strong');
      average.id = `subject-${subject.key}-average`;
      average.textContent = '—';
      heading.append(name, average);
      const track = document.createElement('div');
      track.className = 'insight-track';
      track.id = `subject-${subject.key}-track`;
      track.setAttribute('role', 'progressbar');
      track.setAttribute('aria-label', `Средний балл: ${subject.name}`);
      track.setAttribute('aria-valuemin', '0');
      track.setAttribute('aria-valuemax', '100');
      track.setAttribute('aria-valuenow', '0');
      const fill = document.createElement('span');
      fill.className = 'insight-fill';
      track.append(fill);
      insight.append(heading, track);
      return insight;
    }));
  }

  function loadStudents() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === null) return DEMO_STUDENTS;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return DEMO_STUDENTS;
      const validStudents = parsed.filter(isValidStudent);
      const migratedStudents = validStudents.map((student, index) => normalizeStudent(student, validStudents.slice(0, index)));
      if (JSON.stringify(migratedStudents) !== JSON.stringify(validStudents)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migratedStudents));
      }
      return migratedStudents;
    } catch {
      return DEMO_STUDENTS;
    }
  }

  function normalizeStudent(student, existingStudents) {
    const grades = student.grades.map((grade) => ({
      ...grade,
      subject: grade.subject === 'Математика' ? 'Высшая математика'
        : grade.subject === 'Программирование' ? 'Веб-программирование'
          : grade.subject
    }));
    const demoIndex = /^demo-(\d+)$/.exec(student.id);
    const demoAccount = demoIndex ? DEMO_ACCOUNTS[Number(demoIndex[1]) - 1] : null;
    return {
      ...student,
      grades,
      account: student.account && typeof student.account.login === 'string'
        && typeof student.account.pin === 'string'
        ? (demoAccount ? { login: demoAccount[0], pin: demoAccount[1] } : student.account)
        : (demoAccount ? { login: demoAccount[0], pin: demoAccount[1] } : createStudentAccount(existingStudents)),
      updatedAt: student.updatedAt || null
    };
  }

  function createStudentAccount(existingStudents) {
    const usedLogins = new Set(existingStudents.map((student) => student.account?.login));
    let number = existingStudents.length + 1;
    let login = `ICB${String(number).padStart(3, '0')}`;
    while (usedLogins.has(login)) {
      number += 1;
      login = `ICB${String(number).padStart(3, '0')}`;
    }
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    return { login, pin };
  }

  function isValidStudent(student) {
    return student && typeof student.id === 'string' && student.id.length > 0
      && typeof student.name === 'string' && student.name.trim().length > 0
      && Array.isArray(student.grades) && student.grades.length > 0
      && student.grades.length <= SUBJECTS.length
      && student.grades.every((grade) => grade && SUBJECTS.some((subject) => subject.name === grade.subject)
        && Number.isInteger(grade.score) && grade.score >= 0 && grade.score <= 100);
  }

  function saveStudents() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
    } catch {
      elements.error.textContent = 'Не удалось сохранить данные в браузере.';
    }
  }

  function render() {
    const query = elements.search.value.trim().toLocaleLowerCase('ru');
    const visibleStudents = sortByAverage(students, sortDirection).filter((student) =>
      student.name.toLocaleLowerCase('ru').includes(query)
      && (activeFilter === 'all' || getPerformanceLevel(averageScore(student)) === activeFilter));
    elements.list.replaceChildren(...visibleStudents.map(renderStudentRow));
    elements.studentCount.textContent = String(students.length);
    elements.highCount.textContent = String(getHighPerformers(students).length);
    elements.lowCount.textContent = String(getStudentsNeedingSupport(students).length);
    renderInsights();
    updateFilterCounts();
    elements.sortIndicator.textContent = sortDirection === 'desc' ? '↓' : '↑';
    elements.empty.hidden = visibleStudents.length > 0;
    elements.emptyTitle.textContent = students.length === 0 ? 'Пока нет студентов' : 'Ничего не найдено';
    elements.emptyDescription.textContent = students.length === 0
      ? 'Добавьте первую запись в форму слева.' : 'Попробуйте изменить поисковый запрос.';
  }

  function renderInsights() {
    const allGrades = students.flatMap((student) => student.grades);
    const groupAverage = allGrades.length
      ? allGrades.reduce((total, grade) => total + grade.score, 0) / allGrades.length
      : null;

    elements.groupAverage.textContent = groupAverage === null ? '—' : groupAverage.toFixed(1);
    elements.assessmentSummary.textContent = allGrades.length
      ? `${allGrades.length} ${getRussianWord(allGrades.length, 'оценка', 'оценки', 'оценок')} в ведомости`
      : 'Оценок пока нет';
    updateProgress(elements.groupAverageTrack, groupAverage);

    for (const subject of ICB_SUBJECTS) {
      const subjectGrades = allGrades.filter((grade) => grade.subject === subject.name);
      const subjectAverage = subjectGrades.length
        ? subjectGrades.reduce((total, grade) => total + grade.score, 0) / subjectGrades.length
        : null;
      const average = elements.subjectInsights.querySelector(`#subject-${subject.key}-average`);
      const track = elements.subjectInsights.querySelector(`#subject-${subject.key}-track`);
      average.textContent = subjectAverage === null ? '—' : subjectAverage.toFixed(1);
      updateProgress(track, subjectAverage);
    }
  }

  function updateProgress(track, value) {
    track.setAttribute('aria-valuenow', value === null ? '0' : value.toFixed(1));
    track.firstElementChild.style.width = `${value ?? 0}%`;
  }

  function getRussianWord(count, one, few, many) {
    const lastTwoDigits = count % 100;
    if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return many;
    const lastDigit = count % 10;
    if (lastDigit === 1) return one;
    if (lastDigit >= 2 && lastDigit <= 4) return few;
    return many;
  }

  function updateFilterCounts() {
    for (const button of elements.filterButtons) {
      const filter = button.dataset.filter;
      const count = filter === 'all'
        ? students.length
        : students.filter((student) => getPerformanceLevel(averageScore(student)) === filter).length;
      button.querySelector('span').textContent = String(count);
    }
  }

  function renderStudentRow(student) {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    const nameButton = document.createElement('button');
    nameButton.type = 'button';
    nameButton.className = 'student-name-button';
    nameButton.textContent = student.name;
    nameButton.title = 'Показать оценки студента';
    nameButton.addEventListener('click', () => showGrades(student));
    nameCell.append(nameButton);

    const subjectsCell = document.createElement('td');
    subjectsCell.className = 'subject-count';
    const passedCount = student.grades.filter((grade) => hasPassed(grade.score)).length;
    subjectsCell.textContent = `${passedCount} из ${student.grades.length} сдали`;

    const average = averageScore(student);
    const scoreCell = document.createElement('td');
    scoreCell.className = 'score-cell';
    scoreCell.append(document.createTextNode(`${average.toFixed(1)} `));
    const scoreUnit = document.createElement('small');
    scoreUnit.textContent = 'балла';
    scoreCell.append(scoreUnit);

    const levelCell = document.createElement('td');
    const level = getPerformanceLevel(average);
    const badge = document.createElement('span');
    badge.className = `level-badge ${getLevelClass(level)}`;
    badge.textContent = level;
    levelCell.append(badge);

    const actionsCell = document.createElement('td');
    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'icon-button edit-button';
    editButton.textContent = '✎';
    editButton.setAttribute('aria-label', `Изменить оценки студента ${student.name}`);
    editButton.title = 'Изменить оценки';
    editButton.addEventListener('click', () => showEditDialog(student));

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'icon-button';
    deleteButton.textContent = '×';
    deleteButton.setAttribute('aria-label', `Удалить студента ${student.name}`);
    deleteButton.title = 'Удалить студента';
    deleteButton.addEventListener('click', () => {
      students = removeStudent(students, student.id);
      saveStudents();
      render();
    });
    actionsCell.append(editButton, deleteButton);
    row.append(nameCell, subjectsCell, scoreCell, levelCell, actionsCell);
    return row;
  }

  function showEditDialog(student) {
    editingStudentId = student.id;
    elements.editTitle.textContent = `Оценки: ${student.name}`;
    elements.editError.textContent = '';
    const existingSubjects = new Set(student.grades.map((grade) => grade.subject));
    const editableSubjects = [
      ...ICB_SUBJECTS,
      ...LEGACY_SUBJECTS.filter((subject) => existingSubjects.has(subject.name))
    ];
    const gradesBySubject = new Map(student.grades.map((grade) => [grade.subject, grade.score]));

    elements.editFields.replaceChildren(...editableSubjects.map((subject) => {
      const label = document.createElement('label');
      label.className = 'edit-grade-field';
      const name = document.createElement('span');
      name.textContent = subject.name;
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '100';
      input.step = '1';
      input.inputMode = 'numeric';
      input.placeholder = '—';
      input.dataset.subject = subject.name;
      if (gradesBySubject.has(subject.name)) input.value = String(gradesBySubject.get(subject.name));
      label.append(name, input);
      return label;
    }));
    elements.editDialog.showModal();
  }

  function getLevelClass(level) {
    return {
      Отлично: 'level-excellent',
      Хорошо: 'level-good',
      Удовлетворительно: 'level-satisfactory',
      Неудовлетворительно: 'level-unsatisfactory'
    }[level];
  }

  function showGrades(student) {
    elements.dialogTitle.textContent = student.name;
    elements.dialogGrades.replaceChildren(...student.grades.map((grade) => {
      const line = document.createElement('div');
      line.className = 'dialog-grade';
      const subject = document.createElement('span');
      subject.textContent = grade.subject;
      const result = document.createElement('strong');
      result.textContent = `${grade.score} баллов`;
      const status = document.createElement('span');
      status.className = hasPassed(grade.score) ? 'pass-mark' : 'fail-mark';
      status.textContent = hasPassed(grade.score) ? 'Сдал' : 'Не сдал';
      result.append(status);
      line.append(subject, result);
      return line;
    }));
    const average = averageScore(student);
    const account = student.account ? `Логин: ${student.account.login} · код: ${student.account.pin}` : '';
    elements.dialogSummary.textContent = `Средний балл: ${average.toFixed(1)} · ${getPerformanceLevel(average)}${account ? ` · ${account}` : ''}`;
    elements.dialog.showModal();
  }

  function renderStudentDashboard(student) {
    elements.studentWelcomeName.textContent = student.name;
    elements.studentWelcomeLogin.textContent = `Личный кабинет · ${student.account.login}`;
    elements.studentAvatar.textContent = student.name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toLocaleUpperCase('ru');

    const icbGrades = student.grades.filter((grade) => ICB_SUBJECTS.some((subject) => subject.name === grade.subject));
    const average = icbGrades.length ? averageScore({ grades: icbGrades }) : null;
    elements.studentAverage.textContent = average === null ? '—' : average.toFixed(1);
    elements.studentPassedCount.textContent = `${icbGrades.filter((grade) => hasPassed(grade.score)).length} / ${ICB_SUBJECTS.length}`;
    elements.studentGradeCount.textContent = `${icbGrades.length} / ${ICB_SUBJECTS.length}`;
    elements.studentUpdated.textContent = student.updatedAt
      ? `Обновлено ${new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(student.updatedAt))}`
      : 'Данные обновляются преподавателем';

    const gradesBySubject = new Map(student.grades.map((grade) => [grade.subject, grade.score]));
    elements.studentGradeList.replaceChildren(...ICB_SUBJECTS.map((subject) => {
      const row = document.createElement('article');
      row.className = 'student-grade-row';
      const info = document.createElement('div');
      info.className = 'student-grade-info';
      const title = document.createElement('div');
      title.className = 'student-grade-subject';
      title.textContent = subject.name;
      const note = document.createElement('div');
      note.className = 'student-grade-date';
      note.textContent = 'Оценка преподавателя';
      info.append(title, note);

      const result = document.createElement('div');
      result.className = 'student-grade-score';
      if (gradesBySubject.has(subject.name)) {
        const score = gradesBySubject.get(subject.name);
        const value = document.createElement('strong');
        value.textContent = String(score);
        const badge = document.createElement('span');
        badge.className = `level-badge ${hasPassed(score) ? 'level-excellent' : 'level-unsatisfactory'}`;
        badge.textContent = hasPassed(score) ? 'Сдано' : 'Не сдано';
        result.append(value, badge);
      } else {
        const pending = document.createElement('span');
        pending.className = 'student-grade-pending';
        pending.textContent = 'Ожидается';
        result.append(pending);
      }
      row.append(info, result);
      return row;
    }));
  }

  function selectPortal(portal) {
    const isStudentPortal = portal === 'student';
    elements.teacherPortal.hidden = isStudentPortal;
    elements.studentPortal.hidden = !isStudentPortal;
    for (const tab of elements.portalTabs) {
      const isActive = tab.dataset.portal === portal;
      tab.classList.toggle('is-active', isActive);
      tab.setAttribute('aria-pressed', String(isActive));
    }
    if (isStudentPortal) {
      currentStudentId = null;
      elements.studentLoginView.hidden = false;
      elements.studentDashboardView.hidden = true;
      elements.loginError.textContent = '';
    }
  }

  elements.form.addEventListener('submit', (event) => {
    event.preventDefault();
    elements.error.textContent = '';
    elements.accountNotice.hidden = true;
    try {
      const gradeInputs = Object.fromEntries(ICB_SUBJECTS.map((subject) => [
        subject.key, elements.gradeFields.querySelector(`#grade-${subject.key}`).value
      ]));
      const student = createStudent(elements.name.value, gradeInputs);
      student.account = createStudentAccount(students);
      student.updatedAt = new Date().toISOString();
      students = [...students, student];
      elements.accountNotice.textContent = `Аккаунт создан · логин ${student.account.login} · код ${student.account.pin}. Передайте данные студенту.`;
      elements.accountNotice.hidden = false;
      saveStudents();
      elements.form.reset();
      render();
      elements.name.focus();
    } catch (error) {
      elements.error.textContent = error.message;
    }
  });

  elements.search.addEventListener('input', render);
  for (const tab of elements.portalTabs) {
    tab.addEventListener('click', () => selectPortal(tab.dataset.portal));
  }
  elements.studentLoginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    elements.loginError.textContent = '';
    const login = elements.studentLogin.value.trim().toLocaleUpperCase('ru');
    const pin = elements.studentPin.value.trim();
    const student = students.find((item) => item.account?.login.toLocaleUpperCase('ru') === login && item.account.pin === pin);
    if (!student) {
      elements.loginError.textContent = 'Проверьте логин и код доступа.';
      return;
    }
    currentStudentId = student.id;
    renderStudentDashboard(student);
    elements.studentLoginView.hidden = true;
    elements.studentDashboardView.hidden = false;
    elements.studentLoginForm.reset();
  });
  elements.studentLogout.addEventListener('click', () => {
    currentStudentId = null;
    elements.studentDashboardView.hidden = true;
    elements.studentLoginView.hidden = false;
  });
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    students = loadStudents();
    render();
    const currentStudent = students.find((student) => student.id === currentStudentId);
    if (currentStudent) renderStudentDashboard(currentStudent);
    else if (currentStudentId) elements.studentLogout.click();
  });
  for (const button of elements.filterButtons) {
    button.addEventListener('click', () => {
      activeFilter = button.dataset.filter;
      for (const filterButton of elements.filterButtons) {
        const isActive = filterButton === button;
        filterButton.classList.toggle('is-active', isActive);
        filterButton.setAttribute('aria-pressed', String(isActive));
      }
      render();
    });
  }
  elements.sort.addEventListener('click', () => {
    sortDirection = sortDirection === 'desc' ? 'asc' : 'desc';
    render();
  });
  elements.clear.addEventListener('click', () => {
    if (students.length === 0 || !window.confirm('Удалить всех студентов и оценки из ведомости?')) return;
    students = [];
    saveStudents();
    render();
  });
  elements.closeDialog.addEventListener('click', () => elements.dialog.close());
  elements.closeEditDialog.addEventListener('click', () => elements.editDialog.close());
  elements.editForm.addEventListener('submit', (event) => {
    event.preventDefault();
    elements.editError.textContent = '';
    try {
      const grades = [];
      for (const input of elements.editFields.querySelectorAll('input')) {
        if (input.value.trim() === '') continue;
        const score = Number(input.value);
        if (!Number.isInteger(score) || score < 0 || score > 100) {
          throw new Error(`Оценка по предмету «${input.dataset.subject}» должна быть целым числом от 0 до 100.`);
        }
        grades.push({ subject: input.dataset.subject, score });
      }
      if (grades.length === 0) throw new Error('Оставьте хотя бы одну оценку.');
      const student = students.find((item) => item.id === editingStudentId);
      if (!student) throw new Error('Студент не найден. Обновите страницу и попробуйте снова.');
      student.grades = grades;
      student.updatedAt = new Date().toISOString();
      saveStudents();
      elements.editDialog.close();
      render();
      if (student.id === currentStudentId) renderStudentDashboard(student);
    } catch (error) {
      elements.editError.textContent = error.message;
    }
  });
  elements.dialog.addEventListener('click', (event) => {
    if (event.target === elements.dialog) elements.dialog.close();
  });

  render();
})();