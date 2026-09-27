import type { AbilityId, HeroId, ItemId, RoleId } from '@/content/ids'
import type { Locale } from '../i18n'

/**
 * Patch notes, newest first. They are history, so numbers are written out by hand
 * instead of read from content: a later balance change must not rewrite an old patch.
 * `**text**` marks a value to highlight.
 */
export type NoteText = Readonly<Record<Locale, string>>

export type NoteBadge = 'new' | 'reworked' | 'buffed' | 'nerfed'

interface Changes {
  readonly badge?: NoteBadge
  readonly changes: readonly NoteText[]
}

export type AbilityNote = Changes &
  (
    | { readonly kind: 'ability'; readonly id: AbilityId }
    | { readonly kind: 'innate'; readonly name: NoteText }
  )

export interface ItemNote extends Changes {
  readonly id: ItemId
}

export interface RoleNote extends Changes {
  readonly id: RoleId
}

export interface HeroNote extends Changes {
  readonly id: HeroId
  readonly abilities?: readonly AbilityNote[]
}

export interface PatchNote {
  /** `major.minor` for a release, `major.minor.patch` for a fix on top of one. */
  readonly version: string
  /** ISO date, `YYYY-MM-DD`. */
  readonly date: string
  readonly title: NoteText
  readonly general?: readonly NoteText[]
  readonly items?: readonly ItemNote[]
  readonly roles?: readonly RoleNote[]
  readonly heroes?: readonly HeroNote[]
  readonly interface?: readonly NoteText[]
  readonly fixes?: readonly NoteText[]
}

export const PATCH_NOTES: readonly PatchNote[] = [
  {
    version: '6.1',
    date: '2026-09-28',
    title: {
      en: 'Phones and tablets',
      ru: 'Телефоны и планшеты',
    },
    general: [
      {
        en: 'Planning time: **35** → **60** s',
        ru: 'Время на подготовку: **35** → **60** с',
      },
    ],
    interface: [
      {
        en: 'Phones and tablets: the map stays on screen, shop, heroes and lanes are tabs in a dock under it (on the right in landscape).',
        ru: 'Телефоны и планшеты: карта всегда на экране, магазин, герои и линии — вкладки в доке под ней (справа в альбомной ориентации).',
      },
      {
        en: 'The scoreboard shows who took each round.',
        ru: 'Табло показывает, кто взял каждый раунд.',
      },
      {
        en: 'The latest update card is marked **New** for **3** days after release.',
        ru: 'Карточка последнего обновления помечена **Новое** **3** дня после выхода.',
      },
    ],
    fixes: [
      {
        en: 'The game menu button is back on phones.',
        ru: 'На телефонах вернулась кнопка меню.',
      },
      {
        en: 'The patch number lines up with the headline.',
        ru: 'Номер патча выровнен по заголовку.',
      },
    ],
  },
  {
    version: '6.0.2',
    date: '2026-09-28',
    title: {
      en: 'Balance',
      ru: 'Баланс',
    },
    heroes: [
      {
        id: 'butcher',
        changes: [],
        abilities: [
          {
            kind: 'ability',
            id: 'hook',
            badge: 'reworked',
            changes: [
              {
                en: 'Range: **380** → **260**',
                ru: 'Дальность: **380** → **260**',
              },
              {
                en: 'Damage: **170** → **210**',
                ru: 'Урон: **170** → **210**',
              },
              {
                en: 'Stun: **1.2** → **1.5** s',
                ru: 'Оглушение: **1,2** → **1,5** с',
              },
            ],
          },
        ],
      },
      {
        id: 'pyromancer',
        changes: [],
        abilities: [
          {
            kind: 'ability',
            id: 'fireball',
            badge: 'nerfed',
            changes: [
              {
                en: 'Damage: **155** → **125**',
                ru: 'Урон: **155** → **125**',
              },
              {
                en: 'Cast range bonus: **100** → **60**',
                ru: 'Бонус к дальности: **100** → **60**',
              },
              {
                en: 'Explosion radius: **80** → **70**',
                ru: 'Радиус взрыва: **80** → **70**',
              },
            ],
          },
        ],
      },
      {
        id: 'engineer',
        changes: [],
        abilities: [
          {
            kind: 'ability',
            id: 'turret',
            badge: 'nerfed',
            changes: [
              {
                en: 'Turret health: **420** → **320**',
                ru: 'Здоровье турели: **420** → **320**',
              },
              {
                en: 'Turret damage: **34** → **28**',
                ru: 'Урон турели: **34** → **28**',
              },
              {
                en: 'Duration: **12** → **10** s',
                ru: 'Длительность: **12** → **10** с',
              },
            ],
          },
        ],
      },
      {
        id: 'acolyte',
        changes: [],
        abilities: [
          {
            kind: 'ability',
            id: 'prayer',
            badge: 'nerfed',
            changes: [
              {
                en: 'Heal: **180** → **130**',
                ru: 'Лечение: **180** → **130**',
              },
            ],
          },
        ],
      },
      {
        id: 'frostWitch',
        changes: [],
        abilities: [
          {
            kind: 'ability',
            id: 'blizzard',
            badge: 'nerfed',
            changes: [
              {
                en: 'Damage per tick: **25** → **16**',
                ru: 'Урон за тик: **25** → **16**',
              },
              {
                en: 'Radius: **100** → **90**',
                ru: 'Радиус: **100** → **90**',
              },
              {
                en: 'Cast range bonus: **120** → **100**',
                ru: 'Бонус к дальности: **120** → **100**',
              },
            ],
          },
        ],
      },
      {
        id: 'oracle',
        changes: [
          {
            en: 'Damage: **30** → **40**',
            ru: 'Урон: **30** → **40**',
          },
          {
            en: 'Attack interval: **1.2** → **1.1** s',
            ru: 'Интервал атаки: **1,2** → **1,1** с',
          },
          {
            en: 'Mana to cast: **90** → **70**',
            ru: 'Мана на каст: **90** → **70**',
          },
        ],
        abilities: [
          {
            kind: 'ability',
            id: 'shield',
            badge: 'buffed',
            changes: [
              {
                en: 'Shields **2** allies (was **1**)',
                ru: 'Щит на **2** союзников (было **1**)',
              },
              {
                en: 'Absorb: **260** → **380**',
                ru: 'Поглощение: **260** → **380**',
              },
              {
                en: 'Duration: **5** → **6** s',
                ru: 'Длительность: **5** → **6** с',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    version: '6.0.1',
    date: '2026-09-28',
    title: {
      en: 'Lane fixes',
      ru: 'Исправления на линиях',
    },
    general: [
      {
        en: 'Critical strikes no longer work against buildings.',
        ru: 'Криты больше не срабатывают по строениям.',
      },
      {
        en: 'Creeps notice enemy heroes from **200** range (was **120**).',
        ru: 'Крипы замечают вражеских героев с расстояния **200** (было **120**).',
      },
      {
        en: 'Heroes no longer follow a target into range of an enemy tower that creeps are not tanking.',
        ru: 'Герои больше не идут за целью под вражескую вышку, которую не танкуют крипы.',
      },
      {
        en: 'Heroes below **40%** health stay out of enemy tower range.',
        ru: 'Герои с запасом здоровья ниже **40%** не заходят под вражеские вышки.',
      },
    ],
    interface: [
      {
        en: '**Auto place** is disabled when there is nobody to place or no room on the map.',
        ru: '**«Расставить»** неактивна, если некого ставить или на карте нет места.',
      },
      {
        en: 'Removed the globe icon from the language switch.',
        ru: 'Из переключателя языка убрана иконка глобуса.',
      },
      {
        en: 'Removed the autosave note from the game menu.',
        ru: 'Из меню игры убрана подпись об автосохранении.',
      },
    ],
    fixes: [
      {
        en: 'The tutorial checkbox tick is centred.',
        ru: 'Галочка в чекбоксе обучения стоит по центру.',
      },
      {
        en: 'The tutorial no longer closes on a click outside its window.',
        ru: 'Обучение больше не закрывается кликом мимо окна.',
      },
      {
        en: 'A scrollbar no longer flashes when switching screens.',
        ru: 'При переходе между экранами больше не мелькает полоса прокрутки.',
      },
      {
        en: 'The cloud save time no longer stays at “just now”.',
        ru: 'Время облачного сохранения больше не застывает на «только что».',
      },
    ],
  },
  {
    version: '6.0',
    date: '2026-09-27',
    title: {
      en: 'Cloud saves',
      ru: 'Облачные сохранения',
    },
    general: [
      {
        en: 'New **cloud save** for the coach profile: rank, level, statistics and match history go to your account after every finished match.',
        ru: 'Новое **облачное сохранение** профиля тренера: ранг, уровень, статистика и история матчей уходят в аккаунт после каждого доигранного матча.',
      },
      {
        en: 'No sign-up needed: a **guest account** is created the first time there is something to save.',
        ru: 'Регистрация не нужна: **гостевой аккаунт** создаётся, как только появляется что сохранить.',
      },
      {
        en: 'Sign in with your **email**: enter it, type the one-time code from the letter, done. A new address creates an account and keeps this device’s progress, a known one signs you in. Google sign-in works too where it is switched on.',
        ru: 'Вход по **почте**: вводишь адрес, вписываешь одноразовый код из письма — готово. Новая почта создаёт аккаунт и сохраняет в нём прогресс с этого устройства, знакомая просто входит. Там, где включён Google, можно войти и через него.',
      },
      {
        en: 'The game still works offline. Progress is saved on the device first and reaches the cloud once the connection is back.',
        ru: 'Игра по-прежнему работает без интернета. Прогресс сначала сохраняется на устройстве и уходит в облако, когда связь вернётся.',
      },
      {
        en: 'Matches played on two devices **add up** instead of one overwriting the other.',
        ru: 'Матчи, сыгранные на двух устройствах, **складываются**, а не затирают друг друга.',
      },
      {
        en: 'Signing in on a device that already has its own progress asks which one to keep: the account’s or this device’s.',
        ru: 'Если войти на устройстве, где уже есть свой прогресс, игра спросит, какой оставить: из аккаунта или с устройства.',
      },
      {
        en: 'Only the coach name, avatar and statistics are stored. Your email stays with the sign-in service and is never saved with the profile.',
        ru: 'Хранятся только имя тренера, аватар и статистика. Почта остаётся в сервисе входа и в профиль не попадает.',
      },
    ],
    interface: [
      {
        en: 'Until you sign in, a **Sign in** button sits next to the profile card on the start screen, so you can sign in right from there.',
        ru: 'Пока ты не вошёл, справа от карточки профиля на главном экране стоит кнопка **«Войти»**: войти можно прямо оттуда.',
      },
      {
        en: 'The profile page shows how your progress is kept: **Local save** until you sign in, **Cloud save** after, with the save status on the same line.',
        ru: 'На странице профиля видно, где хранится прогресс: **«Локальное сохранение»**, пока ты не вошёл, и **«Облачное сохранение»** после входа, со статусом в той же строке.',
      },
      {
        en: 'Sign-in problems are explained in plain words: a wrong or expired code, too many attempts, no connection.',
        ru: 'Проблемы со входом объясняются по-человечески: неверный или устаревший код, слишком много попыток, нет связи.',
      },
      {
        en: 'Signing out takes the profile off this device; it stays in your account.',
        ru: 'После выхода профиль пропадает с этого устройства, но остаётся в аккаунте.',
      },
    ],
  },
  {
    version: '5.1.1',
    date: '2026-09-27',
    title: {
      en: 'The map stays put',
      ru: 'Карта на месте',
    },
    fixes: [
      {
        en: 'Resizing the window no longer throws the map off: it always fits between the side panels, even while you drag the window edge.',
        ru: 'Ресайз окна больше не сбивает карту: она всегда вписывается между боковыми панелями, даже пока тянешь край окна.',
      },
      {
        en: 'The map also follows size changes that come without a window resize, for example a scrollbar appearing on narrow screens.',
        ru: 'Карта подстраивается и под изменения размера без ресайза окна, например когда на узком экране появляется полоса прокрутки.',
      },
    ],
  },
  {
    version: '5.1',
    date: '2026-09-27',
    title: {
      en: 'Language on the start screen',
      ru: 'Язык на главном экране',
    },
    interface: [
      {
        en: 'The start screen has a **RU / EN** switch in the bottom-left corner, at the bottom of the page on phones. The language changes at once and is remembered.',
        ru: 'На главном экране появился переключатель **RU / EN** в левом нижнем углу, на телефоне — внизу страницы. Язык меняется сразу и запоминается.',
      },
      {
        en: 'It is the same switch as in the settings, so both always show the current language.',
        ru: 'Это тот же переключатель, что и в настройках, поэтому оба всегда показывают текущий язык.',
      },
    ],
  },
  {
    version: '5.0',
    date: '2026-09-27',
    title: {
      en: 'Defend the throne',
      ru: 'Защита трона',
    },
    general: [
      {
        en: 'Heroes **defend the base**: when enemy heroes hit the throne, the whole team drops its lanes, runs home and fights at the throne until the base is clear and **4** s pass without a hit. Creeps alone are left to the throne.',
        ru: 'Герои **защищают базу**: когда вражеские герои бьют трон, вся команда бросает линии, бежит домой и дерётся у трона, пока база не очистится и **4** с по трону никто не ударит. С одними крипами трон справляется сам.',
      },
      {
        en: 'Heroes now **fight back**: a hero hit by an enemy hero turns on it for **2** s instead of farming creeps or hitting buildings. It keeps a hero fight it can already reach and never chases under an enemy tower.',
        ru: 'Герои теперь **дают сдачи**: если героя бьёт вражеский герой, он на **2** с переключается на обидчика вместо крипов и строений. Бой с героем, до которого он уже дотягивается, он не бросает и под вражескую вышку за обидчиком не лезет.',
      },
      {
        en: 'The **throne heals** allied heroes inside its attack range by **5%** of their max health every second.',
        ru: '**Трон лечит** союзных героев в радиусе своей атаки: **5%** от максимального здоровья в секунду.',
      },
      {
        en: 'The computer opponent now depends on the difficulty. On **Relaxed** it never rerolls, buys experience only from round **9** and items only from round **12**.',
        ru: 'Сила компьютерного соперника теперь зависит от сложности. На **Спокойной** он не обновляет лавку, покупает опыт только с **9** раунда, а предметы — с **12**.',
      },
      {
        en: 'The opponent no longer opens with a **★★** hero: in round 1 it only buys heroes it does not own yet.',
        ru: 'Соперник больше не начинает матч с героем **★★**: в первом раунде он покупает только тех героев, которых у него ещё нет.',
      },
    ],
    interface: [
      {
        en: 'Item cards in the shop turn **grey** and cannot be bought when you lack the gold or the stash is full.',
        ru: 'Карточки предметов в магазине становятся **серыми** и не покупаются, если не хватает золота или склад полон.',
      },
      {
        en: 'Heroes on the map and in the panels show their **role icon** instead of initials.',
        ru: 'Герои на карте и в панелях показывают **иконку роли** вместо инициалов.',
      },
      {
        en: 'The round summary explains the result: **building damage** of both sides, and the gap a win needs.',
        ru: 'Итоги раунда объясняют результат: **урон по строениям** обеих сторон и какая разница нужна для победы.',
      },
      {
        en: 'The **help** is rebuilt: numbered steps, who wins a round, how stars work with a picture, role, synergy and item cards, income and hotkeys.',
        ru: '**Справка** переделана: шаги по порядку, кто выигрывает раунд, как работают звёзды с картинкой, карточки ролей, связок и предметов, доход и горячие клавиши.',
      },
      {
        en: 'The throne keeps a single circle, its attack range. The decorative base circle is gone.',
        ru: 'У трона остался один круг — радиус его атаки. Декоративный круг базы убран.',
      },
      {
        en: 'New **hero window**: portrait with stars, name, then the hero sheet split into blocks.',
        ru: 'Новое **окно героя**: портрет со звёздами, имя и дальше карточка героя, разбитая на блоки.',
      },
      {
        en: '**Health** and **damage** get their own tiles with a heart and a sword.',
        ru: '**Здоровье** и **урон** вынесены в отдельные плашки с сердцем и мечом.',
      },
      {
        en: 'Attack type is an icon, a **bow** for ranged heroes and an **axe** for melee ones. Hover it to see the attack range. The role badge sits right next to it.',
        ru: 'Тип атаки теперь иконка: **лук** у героев дальнего боя и **топор** у героев ближнего. Дальность атаки видна при наведении. Значок роли стоит сразу справа.',
      },
      {
        en: 'Ability, innate effect and role passive each get their own block with a coloured edge.',
        ru: 'Способность, врождённое свойство и пассивка роли идут отдельными блоками с цветной полосой.',
      },
      {
        en: 'Items in the hero window are **icons** in two slots, an empty slot is dashed. Click an item to take it off.',
        ru: 'Предметы в окне героя — это **иконки** в двух слотах, пустой слот обведён пунктиром. Нажми на предмет, чтобы снять его.',
      },
      {
        en: 'The **Sell for N** button has a coin icon. The To bench button is gone: drag a hero onto the Heroes panel to take it off the map.',
        ru: 'У кнопки **Продать за N** появилась иконка монет. Кнопки «В резерв» больше нет: чтобы убрать героя с карты, перетащи его на панель «Герои».',
      },
      {
        en: 'The hero window closes when you click anywhere else. Clicks on lanes, heroes and the Heroes panel keep it open, since they act on the selected hero.',
        ru: 'Окно героя закрывается кликом в любое другое место. Клики по линиям, героям и панели «Герои» его не закрывают: они действуют на выбранного героя.',
      },
      {
        en: 'Dota-style **item tooltips**: icon, name and cost on top, then a Passive or Bonus block with what the item does. They show in the hero window and in the stash.',
        ru: '**Подсказки предметов** как в доте: сверху иконка, название и цена, ниже блок «Пассивно» или «Бонус» с тем, что делает предмет. Работают в окне героя и на складе.',
      },
      {
        en: 'Hero tooltips use the same blocks, and a hero’s items show as **large icons** in a row.',
        ru: 'Подсказки героев собраны из тех же блоков, а предметы героя показаны **крупными иконками** в ряд.',
      },
      {
        en: 'The map is **centred** under the scoreboard in every phase, including battles.',
        ru: 'Карта стоит **по центру** под табло во всех фазах, в том числе в бою.',
      },
      {
        en: 'Both side panels are **wider** and grow with the screen, from **290** to **420** pixels.',
        ru: 'Обе боковые панели стали **шире** и растут вместе с экраном: от **290** до **420** пикселей.',
      },
      {
        en: 'Lanes panel: **bigger hero portraits** with readable initials and more room between heroes and synergies.',
        ru: 'Панель линий: **крупнее портреты героев** с читаемыми инициалами и больше места между героями и связками.',
      },
      {
        en: 'Synergies sit in two columns under the heroes, yours on the left and the enemy’s on the right, **two per row** at most.',
        ru: 'Связки стоят двумя колонками под героями: твои слева, вражеские справа, **не больше двух** в ряду.',
      },
      {
        en: 'New **synergy tooltips**: status, what the synergy needs, what it gives and which role is missing, each in its own block.',
        ru: 'Новые **подсказки связок**: статус, условие, эффект и какой роли не хватает, каждое в своём блоке.',
      },
      {
        en: 'The empty-lane warning under every lane is gone. Instead, **Fight** asks for confirmation when one of your lanes has no hero.',
        ru: 'Предупреждения о пустой линии под каждой линией больше нет. Вместо него кнопка **В бой** спрашивает подтверждение, если на какой-то линии нет героя.',
      },
      {
        en: 'Profile page: the header caption, the Rating caption and the empty-profile hint are gone.',
        ru: 'Страница профиля: убраны подпись в шапке, подпись «Рейтинг» и подсказка в пустом профиле.',
      },
    ],
  },
  {
    version: '4.0',
    date: '2026-09-27',
    title: {
      en: 'Coach profile',
      ru: 'Профиль тренера',
    },
    general: [
      {
        en: 'New **coach profile**. Open it from the card in the top-left corner of the start screen: your name, avatar, rank and level.',
        ru: 'Новый **профиль тренера**. Он открывается с карточки в левом верхнем углу стартового экрана: там твоё имя, аватар, ранг и уровень.',
      },
      {
        en: 'Seven ranks, like Dota medals: **Rookie**, **Scout**, **Tactician**, **Strategist**, **Commander**, **Legend** and **Shotcaller**.',
        ru: 'Семь рангов, как медали в доте: **Новичок**, **Разведчик**, **Тактик**, **Стратег**, **Командир**, **Легенда** и **Шотколлер**.',
      },
      {
        en: 'Every rank but the last has **5** stars, and each star takes **40** rating. Shotcaller has no stars: it is the top.',
        ru: 'У каждого ранга, кроме последнего, по **5** звёзд, и каждая звезда стоит **40** рейтинга. У Шотколлера звёзд нет, это вершина.',
      },
      {
        en: 'A win gives **+25** rating, or **+30** when you break the enemy throne before the round limit. A loss takes **20**, a draw changes nothing.',
        ru: 'Победа даёт **+25** рейтинга, а если сломать трон соперника до лимита раундов — **+30**. Поражение отнимает **20**, ничья ничего не меняет.',
      },
      {
        en: 'On the **Relaxed** difficulty, without the planning timer, rating gains are **20%** smaller: **+20** and **+24**. Losses stay the same.',
        ru: 'На сложности **Спокойная**, без таймера подготовки, прирост рейтинга на **20%** меньше: **+20** и **+24**. Потери те же.',
      },
      {
        en: 'Coach level grows with experience: **60** for every match, **15** for every round won and **60** more for a win.',
        ru: 'Уровень тренера растёт от опыта: **60** за каждый матч, **15** за каждый выигранный раунд и ещё **60** за победу.',
      },
      {
        en: 'Level 2 takes **200** experience, and every next level takes **50** more than the one before.',
        ru: 'До 2 уровня нужно **200** опыта, и каждый следующий уровень требует на **50** больше предыдущего.',
      },
      {
        en: 'Only finished matches count. A match you leave for the main menu stays saved and counts once you finish it.',
        ru: 'В зачёт идут только доигранные матчи. Матч, из которого ты вышел в главное меню, сохраняется и засчитается, когда ты его закончишь.',
      },
    ],
    interface: [
      {
        en: 'The profile page shows the **rank ladder** with how much rating is left to the next star and the next rank.',
        ru: 'На странице профиля есть **лестница рангов**: видно, сколько рейтинга осталось до следующей звезды и следующего ранга.',
      },
      {
        en: 'Profile tiles: matches with wins, losses and draws, win rate with your **best rating**, current and best win streak, fastest win, thrones broken and hero kills per match.',
        ru: 'Плитки профиля: матчи с победами, поражениями и ничьими, доля побед и **лучший рейтинг**, текущая и лучшая серия побед, самая быстрая победа, разрушенные троны и убийства героев за матч.',
      },
      {
        en: '**Favourite heroes**: matches, win rate, kills and deaths and damage per match for every hero you put on the map.',
        ru: '**Любимые герои**: матчи, доля побед, убийства и смерти и урон за матч по каждому герою, которого ты выставлял.',
      },
      {
        en: '**Favourite synergies**: the synergies of your final lineups, with match count and win rate.',
        ru: '**Любимые связки**: связки из твоих финальных составов с числом матчей и долей побед.',
      },
      {
        en: '**Recent matches**: the last **20** games with the result, rating change, experience, final lineup with the best hero crowned, rounds won and lost, difficulty and when it was played.',
        ru: '**Последние матчи**: **20** последних игр с результатом, изменением рейтинга, опытом, финальным составом с короной у лучшего героя, выигранными и проигранными раундами, сложностью и временем игры.',
      },
      {
        en: 'Pick a **name** of up to **20** characters and any hero as your avatar. By default the avatar is your most played hero.',
        ru: 'Можно задать **имя** до **20** символов и выбрать аватаром любого героя. По умолчанию аватар — твой самый частый герой.',
      },
      {
        en: 'Match statistics now open with your **rating change** and experience, and show a badge when you reach a new rank or level.',
        ru: 'Статистика матча теперь начинается с **изменения рейтинга** и опыта, а при новом ранге или уровне появляется значок.',
      },
      {
        en: 'The profile and patch notes have their own links, like **#/profile**, and the browser Back button closes them.',
        ru: 'У профиля и патчноутов теперь свои ссылки, например **#/profile**, а кнопка «Назад» в браузере их закрывает.',
      },
      {
        en: 'Shop: a hero card turns **grey** and cannot be bought when you lack the gold or have no free slot for the hero. A card that completes a set of three stays available.',
        ru: 'Магазин: карточка героя становится **серой** и не покупается, если не хватает золота или герою некуда встать. Карточка, которая собирает тройку, остаётся доступной.',
      },
      {
        en: 'The coach level now explains itself: **Level 2 · up to 2 heroes on the map**.',
        ru: 'Уровень тренера теперь подписан понятнее: **Уровень 2 · до 2 героев на карте**.',
      },
      {
        en: 'The **Bench** panel is now called **Heroes**, and the Lanes panel lost its title.',
        ru: 'Панель **Резерв** теперь называется **Герои**, а у панели линий больше нет заголовка.',
      },
      {
        en: 'During a battle the **left panel slides away** and the map grows into the freed space. It comes back when the round ends.',
        ru: 'Во время боя **левая панель уезжает**, а карта увеличивается на освободившееся место. После раунда панель возвращается.',
      },
    ],
  },
  {
    version: '3.0',
    date: '2026-09-27',
    title: {
      en: 'Crits, bashes and evasion',
      ru: 'Криты, оглушения и уклонение',
    },
    general: [
      {
        en: 'Chance-based effects now use a **pseudo-random distribution**, like in Dota. The chance starts lower, grows after every roll that fails and resets after a proc. On average an effect procs exactly as often as stated.',
        ru: 'Эффекты с шансом теперь работают через **псевдослучайное распределение**, как в доте. Шанс стартует ниже заявленного, растёт после каждой неудачи и сбрасывается после срабатывания. В среднем эффект срабатывает ровно так часто, как написано.',
      },
      {
        en: 'For example, with a 20% chance the first roll succeeds only **5.6%** of the time, but an effect never goes more than **17** attacks in a row without a proc.',
        ru: 'Например, при шансе 20% первая попытка срабатывает лишь в **5,6%** случаев, зато больше **17** атак подряд без срабатывания не бывает.',
      },
      {
        en: 'Crits, bashes and evasion only work on **basic attacks**. Ability damage cannot crit or miss.',
        ru: 'Криты, оглушения и уклонение работают только на **обычных атаках**. Урон способностей не критует и не промахивается.',
      },
      {
        en: 'The board shows crits as gold numbers with “!”, dodged attacks as “miss” and bashes as “bash”.',
        ru: 'На доске криты видны золотыми числами с «!», уклонения — надписью «промах», оглушения — надписью «оглушение».',
      },
    ],
    items: [
      {
        id: 'broadsword',
        badge: 'reworked',
        changes: [
          {
            en: 'No longer gives **+20%** damage.',
            ru: 'Больше не даёт **+20%** урона.',
          },
          {
            en: 'Now gives a **20%** chance for an attack to crit for **200%** damage. Average damage stays the same.',
            ru: 'Теперь с шансом **20%** атака критует на **200%** урона. В среднем урон остался прежним.',
          },
          {
            en: 'Two Broadswords raise the crit chance to **36%**. The crit multiplier does not stack.',
            ru: 'Два Broadsword поднимают шанс крита до **36%**. Множитель крита не складывается.',
          },
          {
            en: 'Crits also work against towers and the throne.',
            ru: 'Криты действуют и по башням, и по трону.',
          },
        ],
      },
    ],
    roles: [
      {
        id: 'ganker',
        badge: 'buffed',
        changes: [
          {
            en: 'New: evades **20%** of attacks, including tower shots.',
            ru: 'Новое: уклоняется от **20%** атак, в том числе от выстрелов башен.',
          },
        ],
      },
    ],
    heroes: [
      {
        id: 'giant',
        badge: 'buffed',
        changes: [],
        abilities: [
          {
            kind: 'innate',
            name: {
              en: 'Bash',
              ru: 'Оглушение',
            },
            badge: 'new',
            changes: [
              {
                en: 'New innate: a **20%** chance for an attack to stun the target for **0.8** s.',
                ru: 'Новая врождённая способность: с шансом **20%** атака оглушает цель на **0,8** с.',
              },
              {
                en: 'Does not work against structures.',
                ru: 'Не действует на строения.',
              },
            ],
          },
        ],
      },
    ],
    interface: [
      {
        en: 'The **Fight** button moved to the bottom-right corner, under the shop.',
        ru: 'Кнопка **В бой** переехала в правый нижний угол, под магазин.',
      },
      {
        en: 'Start screen: **New match** has a new icon, and the Settings button is gone. Language and difficulty are picked in the New match dialog; the in-game menu still has Settings.',
        ru: 'Стартовый экран: у **Нового матча** новая иконка, а кнопки настроек больше нет. Язык и сложность выбираются в окне нового матча, в меню во время игры настройки остались.',
      },
      {
        en: 'New **patch notes** page. Open it from the update card on the start screen.',
        ru: 'Новая страница **патчноутов**. Открывается с карточки обновления на стартовом экране.',
      },
    ],
  },
  {
    version: '2.0',
    date: '2026-09-27',
    title: {
      en: 'Lanes, top bar and match statistics',
      ru: 'Линии, верхняя панель и статистика матча',
    },
    interface: [
      {
        en: 'The Synergies panel is now **Lanes**: every lane shows your heroes against the enemy’s and the synergies active on both sides.',
        ru: 'Панель «Связки» стала панелью **Линии**: на каждой линии видны твои герои против героев соперника и связки обеих сторон.',
      },
      {
        en: 'Dashed badges show who is missing for the next synergy. Click one to send in a hero that switches it on, from the bench or from another lane.',
        ru: 'Пунктирные значки показывают, кого не хватает для следующей связки. Нажми на значок, и подходящий герой встанет на линию со скамейки или с другой линии.',
      },
      {
        en: 'Dota-style **top bar**: fallen heroes wait out their respawn under their team’s side of the scoreboard, next to destroyed towers.',
        ru: '**Верхняя панель** как в доте: павшие герои ждут возрождения под счётом своей команды, рядом с разрушенными башнями.',
      },
      {
        en: 'The event feed is gone; the top bar covers it.',
        ru: 'Ленты событий больше нет, её заменила верхняя панель.',
      },
      {
        en: 'After the match, **Match statistics** show the best hero and tabs for heroes, combat and economy.',
        ru: 'После матча открывается **Статистика матча**: лучший герой и вкладки «Герои», «Бой» и «Экономика».',
      },
    ],
  },
]

export const LATEST_PATCH = PATCH_NOTES[0]!

/** How long after its release date a patch is advertised as new. */
const FRESH_FOR_MS = 3 * 24 * 60 * 60 * 1000

export const isFresh = (patch: PatchNote, now = Date.now()) => now - Date.parse(patch.date) < FRESH_FOR_MS

export const findPatch = (version: string | null | undefined) =>
  PATCH_NOTES.find((patch) => patch.version === version)
