(function (root, factory) {
  const manager = factory();
  if (typeof module === 'object' && module.exports) module.exports = manager;
  if (root) root.StudentManager = manager;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const SUBJECTS = Object.freeze([
    { key: 'programming', name: 'Программирование', legacy: true },
    { key: 'math', name: 'Математика', legacy: true },
    { key: 'higherMath', name: 'Высшая математика' },
    { key: 'webProgramming', name: 'Веб-программирование' },
    { key: 'vibeProgramming', name: 'Вайб-программирование' },
    { key: 'robotics', name: 'Робототехника' },
    { key: 'mobileApps', name: 'Мобильные приложения' },
    { key: 'databases', name: 'Базы данных' }
  ]);
  const ICB_SUBJECTS = Object.freeze(SUBJECTS.filter((subject) => !subject.legacy));
  const MIN_GRADE = 0;
  const MAX_GRADE = 100;
  const PASSING_GRADE = 50;
  const HIGH_PERFORMANCE_GRADE = 90;

  function createStudent(name, gradeInputs, id) {
    const studentName = typeof name === 'string' ? name.trim() : '';
    if (!studentName) throw new Error('Введите имя студента.');

    const grades = [];
    for (const subject of SUBJECTS) {
      const rawGrade = gradeInputs[subject.key];
      if (rawGrade === null || rawGrade === undefined
        || (typeof rawGrade === 'string' && rawGrade.trim() === '')) continue;

      const grade = Number(rawGrade);
      if (!Number.isFinite(grade) || !Number.isInteger(grade) || grade < MIN_GRADE || grade > MAX_GRADE) {
        throw new Error(`Оценка по предмету «${subject.name}» должна быть целым числом от 0 до 100.`);
      }
      grades.push({ subject: subject.name, score: grade });
    }

    if (grades.length === 0) throw new Error('Укажите оценку хотя бы по одному предмету.');
    return { id: id || createId(), name: studentName, grades };
  }

  function createId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function averageScore(student) {
    if (!student || !Array.isArray(student.grades) || student.grades.length === 0) return null;
    const total = student.grades.reduce((sum, grade) => sum + grade.score, 0);
    return total / student.grades.length;
  }

  function getPerformanceLevel(average) {
    if (!Number.isFinite(average) || average < MIN_GRADE || average > MAX_GRADE) return null;
    if (average >= HIGH_PERFORMANCE_GRADE) return 'Отлично';
    if (average >= 70) return 'Хорошо';
    if (average >= PASSING_GRADE) return 'Удовлетворительно';
    return 'Неудовлетворительно';
  }

  function hasPassed(score) {
    return Number.isFinite(score) && score >= PASSING_GRADE;
  }

  function sortByAverage(students, direction) {
    const multiplier = direction === 'asc' ? 1 : -1;
    return [...students].sort((left, right) => multiplier * (averageScore(left) - averageScore(right)));
  }

  function getHighPerformers(students) {
    return students.filter((student) => averageScore(student) >= HIGH_PERFORMANCE_GRADE);
  }

  function getStudentsNeedingSupport(students) {
    return students.filter((student) => averageScore(student) < PASSING_GRADE);
  }

  function removeStudent(students, studentId) {
    return students.filter((student) => student.id !== studentId);
  }

  return Object.freeze({
    SUBJECTS,
    ICB_SUBJECTS,
    MIN_GRADE,
    MAX_GRADE,
    PASSING_GRADE,
    HIGH_PERFORMANCE_GRADE,
    createStudent,
    averageScore,
    getPerformanceLevel,
    hasPassed,
    sortByAverage,
    getHighPerformers,
    getStudentsNeedingSupport,
    removeStudent
  });
});