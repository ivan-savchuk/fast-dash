import { createContext, useContext } from 'react'

import { COMPONENT_TYPES } from './components/registry.jsx'
import { variantLabel } from './components/placeholderArt.js'

export const LANGS = [
  { id: 'en', name: 'English' },
  { id: 'uk', name: 'Українська' },
]

export const DEFAULT_LANG = 'en'

const UK = {
  // --- Options menu ---
  'menu.options': 'Опції',
  'menu.new': 'Новий дашборд',
  'menu.export': 'Експорт',
  'menu.export.html.sub': 'Файл аби поділитися',
  'menu.export.json.sub': 'структурована специфікація',
  'menu.import': 'Імпорт…',
  'menu.import.sub': 'Відкрити збережену специфікацію JSON',
  'menu.edit': 'Редагування',
  'menu.undo': 'Скасувати',
  'menu.redo': 'Повторити',
  'menu.present': 'Презентація',
  'menu.colour': 'Кольорова схема',
  'menu.template': 'Почати з шаблону',
  'menu.tour': 'Пройти тур',
  'menu.shortcuts': 'Гарячі клавіші',
  'menu.language': 'Мова',
  'menu.light': '☀  Світла тема',
  'menu.dark': '☾  Темна тема',

  // --- toolbar bottom row ---
  'add.more': 'ще…',
  'add.page': 'Сторінка',

  // --- component (card) type names ---
  'type.kpi': 'KPI-картка',
  'type.timeseries': 'Часовий ряд',
  'type.bar': 'Стовпчаста',
  'type.table': 'Таблиця',
  'type.text': 'Текст',
  'type.pie': 'Кругова / Кільцева',
  'type.combo': 'Комбінована (стовпці + лінія)',
  'type.scatter': 'Точкова',
  'type.funnel': 'Воронка',
  'type.waterfall': 'Каскадна',
  'type.histogram': 'Гістограма',
  'type.boxplot': 'Ящик з вусами',
  'type.heatmap': 'Теплова карта',
  'type.choropleth': 'Карта (хороплет)',
  'type.pointmap': 'Карта (точкова)',
  'type.tabs': 'Вкладки',
  'type.section': 'Заголовок розділу',

  // --- chart variant names (keyed by their English label) ---
  'variant.Area': 'Область',
  'variant.Bubble': 'Бульбашки',
  'variant.Calendar': 'Календар',
  'variant.Donut': 'Коло',
  'variant.Full circle': 'Заповнене коло',
  'variant.Grid': 'Сітка',
  'variant.Grouped': 'Згруповані',
  'variant.Horizontal': 'Горизонтальна',
  'variant.Line': 'Лінія',
  'variant.Number only': 'Лише число',
  'variant.Plain': 'Звичайна',
  'variant.Stacked area': 'Складена область',
  'variant.Stacked': 'Складені',
  'variant.Vertical': 'Вертикальна',
  'variant.With delta': 'Зі змінами',
  'variant.With trend line': 'З лінією тренду',
  'variant.With trend': 'З трендом',

  // --- filters ---
  'filters.title': 'Фільтри',
  'filters.hide': 'Сховати фільтри',
  'filters.show': 'Показати фільтри',
  'filters.empty': 'Ще немає фільтрів. Додайте фільтри рівня панелі.',
  'filters.add': '+ додати фільтр',
  'filters.labelAria': 'Назва фільтра',
  'filters.upAria': 'Перемістити фільтр вгору',
  'filters.downAria': 'Перемістити фільтр вниз',
  'filters.removeAria': 'Видалити фільтр',
  'filters.typeAria': 'Тип фільтра',
  'filterType.dropdown': 'випадний список',
  'filterType.multi-select': 'множинний вибір',
  'filterType.range': 'діапазон',
  'filterType.date range': 'діапазон дат',
  'filterType.time grain': 'крок часу',
  'filterType.search': 'пошук',
  'filterType.toggle': 'перемикач',

  // --- quick picker ---
  'picker.search': 'Пошук компонентів…',
  'picker.searchAria': 'Пошук компонентів',
  'picker.noMatch': 'Немає збігів',

  // --- empty canvas ---
  'empty.page': 'Ця сторінка порожня. Клацніть будь-де, щоб додати компонент, або натисніть 1–5.',
  'empty.start': 'Почніть із шаблону — або клацніть будь-де, щоб розмістити перший компонент.',
  'empty.tour.pre': 'Вперше тут?',
  'empty.tour.link': 'Пройдіть швидкий тур',
  'empty.tour.post': 'інтерфейсом.',

  // --- guided tour ---
  'tour.btn.skip': 'Пропустити тур',
  'tour.btn.close': 'Закрити',
  'tour.btn.back': 'Назад',
  'tour.btn.next': 'Далі',
  'tour.btn.done': 'Готово',
  'tour.welcome.title': 'Ласкаво просимо до FastDash',
  'tour.welcome.body':
    'Швидкий застосунок для прототипування BI-дашбордів. Розкладіть чарти, додайте нотатку до кожного та експортуйте специфікацію. Цей короткий тур показує, де що знаходиться.',
  'tour.add.title': 'Додати компонент',
  'tour.add.body':
    'Клацніть один із цих елементів, щоб додати KPI, діаграму, таблицю чи текстовий блок на полотно. Клавіші 1–5 роблять те саме без миші.',
  'tour.more.title': 'Повний каталог',
  'tour.more.body':
    'Кругові, точкові, воронки, карти, вкладки та інше — усе тут. Клацання порожнього місця на полотні відкриває той самий список із пошуком.',
  'tour.canvas.title': 'Розміщення, переміщення, зміна розміру',
  'tour.canvas.body':
    'Змінити положення картки можна просто перемістивши її мишою. Потягніть за куток, щоб змінити розмір. Клацніть на порожнє місце на полотні, щоб додати компонент саме там, де курсор.',
  'tour.filters.title': 'Фільтри',
  'tour.filters.body':
    'Дана панель - це фільтри рівня дашборду, наприклад "діапазон дат" чи вибір регіону. Вони теж стають частиною експортованої специфікації.',
  'tour.page.title': 'Більше ніж одна сторінка',
  'tour.page.body':
    'Розділіть дашборд на сторінки. Нова панель вкладок з’явиться, щойно ви додасте нову сторінку.',
  'tour.optmenu.title': 'Меню «Опції»',
  'tour.optmenu.body':
    'Тут усе, що не стосується додавання нових компонентів — відкрийте меню, і матимете імпорт, режим презентації, кольорові схеми, стартові шаблони, гарячі клавіші та інше.',
  'tour.optexport.title': 'Головне — це експорт',
  'tour.optexport.body':
    'Діліться HTML-файлами, які колеги зможуть відкрити у браузері, або як JSON, що читається як специфікація вимог, за якою розробник зможе легко побудувати дашборд.',
  'tour.done.title': 'Ось і весь тур',
  'tour.done.body':
    'Почніть із порожнього полотна або оберіть шаблон в «Опціях». Будь-яку дію можна скасувати через ⌘Z. Гарної роботи!',

  // --- starter templates (shown in Options and on the empty canvas) ---
  'template.executive.name': 'Огляд для керівництва',
  'template.executive.summary': 'Ряд KPI, тренд, розбивка, деталі',
  'template.operational.name': 'Операційний моніторинг',
  'template.operational.summary': 'Ряд статусів, широкий тренд, робоча таблиця',
  'template.deepdive.name': 'Глибокий аналіз',
  'template.deepdive.summary': 'Питання вгорі, докази нижче',

  // --- keyboard shortcuts modal ---
  'shortcuts.title': 'Гарячі клавіші',
  'shortcuts.close': 'Закрити',
  'shortcuts.group.editing': 'Редагування',
  'shortcuts.group.add': 'Додати компонент',
  'shortcuts.group.selection': 'Виділення та полотно',
  'shortcuts.group.pages': 'Сторінки',
  'shortcuts.group.view': 'Перегляд',
  'shortcuts.undo': 'Скасувати',
  'shortcuts.redo': 'Повторити',
  'shortcuts.duplicate': 'Дублювати виділену картку',
  'shortcuts.delete': 'Видалити виділену картку',
  'shortcuts.click': 'Клацніть порожнє полотно, щоб додати',
  'shortcuts.nudge': 'Посунути виділену картку',
  'shortcuts.cycle': 'Перемкнути вигляд діаграми',
  'shortcuts.deselect': 'Зняти виділення / повернути клавіатуру',
  'shortcuts.movePage': 'Надіслати картку на попередню / наступну сторінку',
  'shortcuts.present': 'Презентація (Esc — вихід)',
}

const LangContext = createContext(DEFAULT_LANG)

export function LangProvider({ lang, children }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>
}

export function useLang() {
  return useContext(LangContext)
}

export function useT() {
  const lang = useContext(LangContext)
  return (key, en) => (lang === 'en' ? en : (UK[key] ?? en))
}

export function useTypeLabel() {
  const t = useT()
  return (type, variant) => {
    const base = t(`type.${type}`, COMPONENT_TYPES[type]?.label ?? type)
    const v = variantLabel(type, variant)
    return v ? `${base} (${t(`variant.${v}`, v).toLowerCase()})` : base
  }
}

export function useTypeName() {
  const t = useT()
  return (type) => t(`type.${type}`, COMPONENT_TYPES[type]?.label ?? type)
}

export function componentCount(lang, n) {
  if (lang !== 'uk') return `${n} ${n === 1 ? 'component' : 'components'}`
  const mod10 = n % 10
  const mod100 = n % 100
  let word = 'компонентів'
  if (mod10 === 1 && mod100 !== 11) word = 'компонент'
  else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = 'компоненти'
  return `${n} ${word}`
}
