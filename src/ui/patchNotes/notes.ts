import type { AbilityId, HeroId, ItemId, LaneStance, ModeId, RoleId } from '@/content/ids'
import type { Locale } from '../i18n/index.ts'

/**
 * Patch notes, newest first. They are history, so numbers are written out by hand
 * instead of read from content: a later balance change must not rewrite an old patch.
 * Every line states a change; what stayed the same is left out.
 * A line is what the player gets, not how the screen is built. Never mention which
 * device, panel or tab holds a change, or how a phone differs from a desktop.
 * "On phones and tablets it is a third tab of that panel" is the sort of line that
 * does not belong: it is a detail, and the player does not care.
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

/** The picture of a highlight card, drawn by the game itself rather than shipped as an image. */
export type FeatureArt =
  | { readonly kind: 'map'; readonly mode: ModeId }
  | { readonly kind: 'modes' }
  | { readonly kind: 'ratings' }
  | { readonly kind: 'rounds' }
  | { readonly kind: 'leaderboard' }
  | { readonly kind: 'career'; readonly focus: 'trials' | 'contracts' | 'milestones' | 'rewards' }
  | { readonly kind: 'matchmaking'; readonly focus: 'queue' | 'rating' | 'fairness' | 'efficiency' }
  | { readonly kind: 'training'; readonly focus: 'yard' | 'stats' | 'ready' | 'live' }
  /** The lanes panel with an order on each lane. */
  | { readonly kind: 'orders' }
  /** What one order makes the heroes of a lane do. */
  | { readonly kind: 'order'; readonly order: LaneStance }
  /** The 9.0 forge: merging items, picking talents, the new items and the new experiments. */
  | { readonly kind: 'forge'; readonly focus: 'upgrades' | 'talents' | 'items' | 'experiments' }
  | {
      readonly kind: 'home'
      readonly device: 'desktop' | 'phone'
      readonly scene: 'home' | 'chat' | 'career'
    }
  /** The in-match hero card: live health and mana bars beside the ability. */
  | { readonly kind: 'heroCard' }
  /** The 9.2 Steam and Google Play versions: achievements, one account everywhere, one queue and full screen. */
  | {
      readonly kind: 'crossPlatform'
      readonly focus: 'achievements' | 'account' | 'crossplay' | 'devices'
    }
  /** The 9.3 match redesign, illustrated with fixed example lineups and timers. */
  | { readonly kind: 'hud'; readonly focus: 'scoreboard' | 'lineup' | 'scale' | 'twist' }

/** One highlight of a major update: a picture and a few words. The full list of changes follows below. */
export interface FeatureNote {
  readonly art: FeatureArt
  readonly title: NoteText
  readonly text: NoteText
}

export interface PatchNote {
  /** `major.minor` for a release, `major.minor.patch` for a fix on top of one. */
  readonly version: string
  /** ISO date, `YYYY-MM-DD`. */
  readonly date: string
  readonly title: NoteText
  /** A release-specific visual introduction, kept alongside its historical notes. */
  readonly campaign?:
    'career' | 'matchmaking' | 'training' | 'pause' | 'forge' | 'home' | 'crossPlatform' | 'hud'
  /** A wider page, for a release whose introduction needs the room. */
  readonly wide?: boolean
  /** Major updates open with these; the first one is shown large. */
  readonly features?: readonly FeatureNote[]
  /** One line for the start-screen card. The full notes stay on the patch page. */
  readonly card?: NoteText
  readonly general?: readonly NoteText[]
  readonly items?: readonly ItemNote[]
  readonly roles?: readonly RoleNote[]
  readonly heroes?: readonly HeroNote[]
  readonly interface?: readonly NoteText[]
  readonly fixes?: readonly NoteText[]
}

export const PATCH_NOTES: readonly PatchNote[] = [
  {
    version: '9.3',
    date: '2026-10-05',
    title: {
      en: 'Eyes on the fight',
      ru: 'В центре — бой',
    },
    campaign: 'hud',
    wide: true,
    card: {
      en: '**A new match HUD**: more room for the battlefield, a scoreboard that appears when it matters, and a clearer view of your lineup.',
      ru: '**Новый HUD матча**: больше места для поля боя, табло в нужный момент и наглядная расстановка отряда.',
    },
    features: [
      {
        art: {
          kind: 'hud',
          focus: 'scoreboard',
        },
        title: {
          en: 'The right moment to look up',
          ru: 'Важное — в нужный момент',
        },
        text: {
          en: 'The scoreboard **slides out of the way** to open up the battlefield. Bring it back with a hover over the gold handle. It reveals itself when you enter or resume a match, and at the **start and end of a round**, so you can focus on your next move.',
          ru: 'Табло **убирается из поля зрения**, освобождая обзор. Наведи на золотую полоску, чтобы вернуть его. Оно раскрывается при входе или возвращении в матч, а также в **начале и конце раунда** — можно сосредоточиться на следующем ходе.',
        },
      },
      {
        art: {
          kind: 'hud',
          focus: 'lineup',
        },
        title: {
          en: 'Read the matchup. Make your move.',
          ru: 'Оцени расстановку. Сделай ход.',
        },
        text: {
          en: '**Lineups and synergies** are easier to compare before the fight. The more compact layout keeps **your reserves and items within reach** while you look through the lanes. Spot a weak flank, move a hero and finish your build.',
          ru: '**Составы и синергии** проще сравнивать перед боем. Более компактная расстановка помогает держать **запасных героев и предметы под рукой**, пока ты изучаешь линии. Найди слабый фланг, переставь героя и доведи сборку до конца.',
        },
      },
      {
        art: {
          kind: 'hud',
          focus: 'scale',
        },
        title: {
          en: 'A battlefield with breathing room',
          ru: 'Больше простора для боя',
        },
        text: {
          en: 'The match has a **new, roomier layout**. The map makes better use of the space around your tools, and the HUD **scales with the game window** so heroes, text and controls stay comfortable to read.',
          ru: 'У матча **новая, более просторная компоновка**. Карта лучше использует место вокруг инструментов тренера, а HUD **масштабируется вместе с окном игры**, чтобы героев, текст и кнопки было удобно различать.',
        },
      },
      {
        art: {
          kind: 'hud',
          focus: 'twist',
        },
        title: {
          en: 'New twist? You will see it.',
          ru: 'Новый поворот не пройдёт мимо',
        },
        text: {
          en: 'Playing with round twists? When a new one arrives, **the scoreboard stays open with its announcement**. Read the effect and rethink your lineup before committing to the fight.',
          ru: 'Играешь с поворотами раунда? Когда приходит новый, **табло остаётся открытым вместе с объявлением**. Прочитай эффект и скорректируй состав перед боем.',
        },
      },
    ],
    interface: [
      {
        en: '**Auto-arrange** now uses a compact wand button beside your reserves, leaving more space for the heroes themselves.',
        ru: '**Авторасстановка** теперь доступна по компактной кнопке с волшебной палочкой рядом с запасом — больше места остаётся самим героям.',
      },
      {
        en: '**Training controls** take up less room, making it easier to work on your practice lineup.',
        ru: '**Управление тренировкой** занимает меньше места, чтобы было удобнее работать с тренировочным составом.',
      },
      {
        en: 'Press **Esc** to open the match menu once you have finished placing or selecting a hero.',
        ru: 'Нажми **Esc**, чтобы открыть меню матча, когда закончишь перетаскивание или снимешь выбор героя.',
      },
    ],
    fixes: [
      {
        en: 'Placing heroes and changing lane orders no longer **reopen the scoreboard** or keep it on screen longer.',
        ru: 'Расстановка героев и смена приказов линиям больше **не раскрывают табло** и не задерживают его на экране.',
      },
    ],
  },
  {
    version: '9.2',
    date: '2026-10-05',
    title: {
      en: 'Next stop: Steam and Google Play',
      ru: 'Следующая остановка — Steam и Google Play',
    },
    campaign: 'crossPlatform',
    features: [
      {
        art: {
          kind: 'crossPlatform',
          focus: 'achievements',
        },
        title: {
          en: 'Sixteen achievements, and your past counts',
          ru: 'Шестнадцать достижений — и прошлое в зачёт',
        },
        text: {
          en: 'Win, clear the **four trials**, climb to **Strategist** and beyond: **16 Steam achievements** to collect. Everything you have already done on the web counts, and they unlock the **first time** you start the Steam version.',
          ru: 'Побеждай, проходи **четыре испытания**, поднимайся до **Стратега** и выше: **16 достижений Steam**. Всё, что ты уже сделал на сайте, засчитается: достижения откроются при **первом запуске** версии для Steam.',
        },
      },
      {
        art: {
          kind: 'crossPlatform',
          focus: 'account',
        },
        title: {
          en: 'One coach, everywhere',
          ru: 'Один тренер везде',
        },
        text: {
          en: '**Sign in with Steam** and your level, MMR, career and friends come with you. On your phone, sign in with the **same email** and pick up where you left off. Already playing on the web? Sign in with your **email once**, and Steam joins that account.',
          ru: '**Войди через Steam** — и уровень, MMR, карьера и друзья будут с тобой. В телефоне войди по **той же почте** и продолжай с того же места. Уже играешь на сайте? Войди **один раз по почте**, и Steam привяжется к этому аккаунту.',
        },
      },
      {
        art: {
          kind: 'crossPlatform',
          focus: 'crossplay',
        },
        title: {
          en: 'Same queue, same friends',
          ru: 'Одна очередь, одни друзья',
        },
        text: {
          en: 'Players on Steam and Android join the **same ranked queue**, duels and leaderboard as the web and Discord. Challenge a friend **wherever they play**.',
          ru: 'Игроки из Steam и с Android попадают в **ту же рейтинговую очередь**, дуэли и таблицу лидеров, что и на сайте и в Discord. Вызывай друга, **где бы он ни играл**.',
        },
      },
      {
        art: {
          kind: 'crossPlatform',
          focus: 'devices',
        },
        title: {
          en: 'Full screen, on PC and phone',
          ru: 'На весь экран — на ПК и в телефоне',
        },
        text: {
          en: 'On Steam the game opens **full screen**: **F11** or **Alt+Enter** switch to a window, **Shift+Tab** opens the overlay. From **Google Play** it sits on your home screen, runs without a browser bar and **notifies you** about messages and duel challenges.',
          ru: 'В Steam игра открывается **на весь экран**: **F11** или **Alt+Enter** переключают в окно, **Shift+Tab** открывает оверлей. Из **Google Play** она встаёт на главный экран телефона, работает без адресной строки и **присылает уведомления** о сообщениях и вызовах на дуэль.',
        },
      },
    ],
    card: {
      en: '**The Shotcaller comes to Steam before the end of the year**, with **16 achievements**, and to **Google Play** on Android. Everything you play now counts.',
      ru: '**The Shotcaller выходит в Steam до конца года** с **16 достижениями**, а на Android — в **Google Play**. Всё, что ты играешь сейчас, идёт в зачёт.',
    },
    general: [
      {
        en: 'Nothing changes on the web: keep playing in the browser or in Discord.',
        ru: 'На сайте ничего не меняется: играй в браузере или в Discord, как раньше.',
      },
      {
        en: 'Steam and Google Play keep the game up to date on their own, with nothing to install by hand.',
        ru: 'Steam и Google Play сами обновляют игру — ничего не нужно ставить вручную.',
      },
    ],
  },
  {
    version: '9.1',
    date: '2026-10-05',
    title: {
      en: 'Front and centre',
      ru: 'Всё под рукой',
    },
    campaign: 'home',
    wide: true,
    features: [
      {
        art: { kind: 'heroCard' },
        title: {
          en: 'The fight, on the card',
          ru: 'Бой на карточке',
        },
        text: {
          en: 'New desktop and mobile layouts. Open a hero and **health** and **mana** sit on thick bars. The number in the middle is what they have **right now**, the empty stretch is what is missing, and both keep up when the hero is hit or casts. Regeneration and mana per attack stay on the right edge, with the ability beside the stats.',
          ru: 'Открой героя — и **здоровье** с **маной** лежат на толстых полосах. Число по центру — сколько есть **прямо сейчас**, пустое место — чего не хватает, и оба не отстают, когда героя бьют или он кастует. Восстановление и мана за атаку остаются у правого края, а способность — рядом со статами.',
        },
      },
    ],
    card: {
      en: 'The **menu is redesigned**: a saved match, **Computer**, **Online** and **Training** come first. The **hero card** and the **board** are easier to read, and **health** and **mana** keep up.',
      ru: '**Меню перерисовано**: сначала сохранённый матч, **Компьютер**, **Онлайн** и **Тренировка**. **Карточка героя** и **карта** читаются легче, а **здоровье** и **мана** не отстают.',
    },
    general: [
      {
        en: 'A **new main menu** built around your next move. An unfinished match comes first, with its mode, round and towers: **one tap** and you are back in.',
        ru: '**Новое главное меню**, построенное вокруг следующего хода. Незаконченный матч идёт первым, с режимом, раундом и башнями: **одно касание** — и ты снова в игре.',
      },
      {
        en: '**Quick start** for **Computer**, **Online** and **Training**: each tile opens a new match already set to that mode.',
        ru: '**Быстрый старт** для режимов **Компьютер**, **Онлайн** и **Тренировка**: каждая плитка открывает новый матч уже в нужном режиме.',
      },
      {
        en: 'Weekly contracts show the **next one to finish** right in the main menu.',
        ru: 'Еженедельные контракты показывают, **какой закрыть следующим**, прямо в главном меню.',
      },
      {
        en: '**Play**, **Career**, **Friends** and **Profile** stay one tap away on **every page**, and Friends shows your **unread messages**.',
        ru: '**Игра**, **Карьера**, **Друзья** и **Профиль** остаются в одном касании на **каждой странице**, а на Друзьях видно **непрочитанные сообщения**.',
      },
      {
        en: 'Your **friends list** sits with the menu: see who is online and **watch their matches live** in one click.',
        ru: '**Список друзей** стоит рядом с меню: видно, кто в сети, а их **матчи можно смотреть вживую** в один клик.',
      },
      {
        en: 'Your rank sits with your name: the medal, your **MMR**, and how close the **next star** is.',
        ru: 'Ранг стоит рядом с именем: медаль, твой **MMR** и насколько близко **следующая звезда**.',
      },
      {
        en: 'Send a friend request with their **friend code**. Yours sits beside Friends, ready to **copy**.',
        ru: 'Отправь заявку в друзья по **коду друга**. Твой код рядом с Друзьями — его можно **скопировать**.',
      },
      {
        en: 'A wide pass over the look: the **hero card**, the **board** and the menus now make the fight easier to read.',
        ru: 'Большой проход по виду: **карточка героя**, **карта** и меню теперь делают бой проще для чтения.',
      },
      {
        en: 'Duels with friends are now just for fun: **only ranked matches change MMR**, so the leaderboard shows wins against strangers.',
        ru: 'Дуэли с друзьями теперь просто для удовольствия: **MMR меняют только рейтинговые матчи**, а таблица лидеров показывает победы над незнакомыми соперниками.',
      },
    ],
    interface: [
      {
        en: '**Add friends from the leaderboard** and find your next rival. Sign in, send a request and arrange your next match together.',
        ru: '**Добавляй друзей из таблицы лидеров** и находи следующего соперника. Войди в аккаунт, отправь заявку и договорись о новом матче.',
      },
      {
        en: 'Adjust the sound and **save** from the main menu. Choose difficulty and experiments when starting a new match.',
        ru: 'Настрой звук и нажми **«Сохранить»** в главном меню. Сложность и эксперименты выбирай при запуске нового матча.',
      },
      {
        en: 'A calmer menu: your profile, the latest patch and Discord.',
        ru: 'Меню стало спокойнее: профиль, свежий патч и Discord.',
      },
      {
        en: 'Difficulty and experiments have **info buttons** to help you choose how your next match plays.',
        ru: 'У сложности и экспериментов есть **кнопки с описанием**, чтобы выбрать правила следующего матча.',
      },
      {
        en: 'Friends starting games share **one notification**, shown at most **once a minute**. Open your friends list to choose a match to watch.',
        ru: 'Старты игр друзей объединяются в **одно уведомление**, которое появляется не чаще **раза в минуту**. Открой список друзей и выбери матч для просмотра.',
      },
      {
        en: 'Tapping a notification now takes you there: a message opens **that chat**, a duel challenge opens the game so you can **accept or decline**.',
        ru: 'Нажатие на уведомление теперь ведёт куда нужно: сообщение открывает **этот чат**, вызов на дуэль — игру, где его можно **принять или отклонить**.',
      },
    ],
    fixes: [
      {
        en: '**Stronger protection** for your account, friends and chats: guests no longer see anyone’s social data, coach pictures come only from Google accounts, and the game blocks scripts from anywhere else.',
        ru: '**Усиленная защита** аккаунта, друзей и чатов: гости не видят чужих социальных данных, фото тренеров берутся только из Google-аккаунтов, а игра блокирует сторонние скрипты.',
      },
      {
        en: 'Your own duel no longer triggers a friend-started-playing notification. Friends already in a duel cannot be challenged again.',
        ru: 'Собственная дуэль больше не вызывает уведомление о старте игры друга. Друзей, которые уже в дуэли, нельзя вызвать повторно.',
      },
      {
        en: 'Heroes beside an enemy tower no longer stand idle after a kill: they step up and hit the creeps they can reach from outside tower fire, and a wounded hero fights back against the creeps hitting it.',
        ru: 'Герои у вражеской башни больше не стоят без дела после убийства: они подходят и бьют крипов, до которых можно достать вне огня башни, а раненый герой отвечает крипам, которые его бьют.',
      },
      {
        en: 'Opening a chat leaves the keyboard closed until you tap the message field.',
        ru: 'При открытии чата клавиатура остаётся закрытой, пока ты не нажмёшь на поле сообщения.',
      },
      {
        en: 'Career hints remain within reach, and opening the form to add a friend no longer shifts your scroll position.',
        ru: 'Подсказки карьеры остаются доступными, а открытие формы добавления друга больше не сбивает прокрутку.',
      },
      {
        en: 'The keyboard stays open after you send a message or open the emoji list.',
        ru: 'Клавиатура больше не закрывается после отправки сообщения и при открытии списка смайликов.',
      },
      {
        en: 'Your newest message is no longer hidden under the message field.',
        ru: 'Новое сообщение больше не прячется под полем ввода.',
      },
      {
        en: 'A hero still waiting to pick a talent is marked in **gold** on the board, while you plan and during the fight.',
        ru: 'Герой, который ещё не выбрал талант, отмечен **золотом** на карте — и при планировании, и в бою.',
      },
      {
        en: 'A round with a twist announces it when the round opens, including when you **continue** a saved match.',
        ru: 'Раунд с модификатором объявляет его, когда раунд открывается, в том числе если ты **продолжаешь** сохранённый матч.',
      },
    ],
  },
  {
    version: '9.0',
    date: '2026-10-04',
    title: {
      en: 'New blood, new steel',
      ru: 'Новая кровь, новая сталь',
    },
    campaign: 'forge',
    wide: true,
    features: [
      {
        art: {
          kind: 'forge',
          focus: 'upgrades',
        },
        title: {
          en: 'Two copies. One legend.',
          ru: 'Две копии. Одна легенда.',
        },
        text: {
          en: 'Buy a second copy of an item and the pair **merges into its upgrade**, in the stash or right on your hero. Gloves of Fury climb from **+20%** to **+40%** attack speed, and Aegis brings a hero back with **100%** health. The upgrade still takes **one slot**.',
          ru: 'Купи вторую копию предмета, и пара **сольётся в улучшение** — на складе или прямо на герое. Gloves of Fury растут с **+20%** до **+40%** скорости атаки, а Aegis возвращает героя со **100%** здоровья. Улучшение по-прежнему занимает **один слот**.',
        },
      },
      {
        art: {
          kind: 'forge',
          focus: 'talents',
        },
        title: {
          en: 'The second star is a choice',
          ru: 'Вторая звезда — это выбор',
        },
        text: {
          en: 'At **★★** every hero picks one of **two talents**: more arrows or heavier ones, a wider fireball or a hotter one. At **★★★** it masters both. **42 talents** across all abilities.',
          ru: 'На **★★** каждый герой выбирает один из **двух талантов**: больше стрел или тяжелее, шире огненный шар или жарче. На **★★★** он владеет обоими. **42 таланта** на все способности.',
        },
      },
      {
        art: {
          kind: 'forge',
          focus: 'items',
        },
        title: {
          en: 'Five items that bend the rules',
          ru: 'Пять предметов, меняющих правила',
        },
        text: {
          en: 'Collect souls that last the whole match, share pain with a lane-mate, cast twice, rush to a falling tower or trade safety for raw power. Each one asks you to **plan around it**.',
          ru: 'Копи души на весь матч, дели урон с напарником по линии, кастуй дважды, мчись к падающей башне или меняй безопасность на чистую силу. Под каждый предмет **придётся строить план**.',
        },
      },
      {
        art: {
          kind: 'forge',
          focus: 'experiments',
        },
        title: {
          en: 'Try the game a little differently',
          ru: 'Попробуй игру немного иначе',
        },
        text: {
          en: 'Two new experiments for matches against the computer. **Hero rotation** deals **15 of 21** heroes into each match. **Round twists** give every round one of **6 rules** both sides see while planning.',
          ru: 'Два новых эксперимента для матчей против компьютера. **Ротация героев** оставляет в матче **15 из 21** героя. **Модификаторы раундов** дают каждому раунду одно из **6 правил**, которое обе стороны видят при планировании.',
        },
      },
    ],
    general: [
      {
        en: 'Three new heroes join the pool: **Herald**, **Stonewright** and the rare **Changeling**.',
        ru: 'В пул вступают три новых героя: **Herald**, **Stonewright** и редкий **Changeling**.',
      },
      {
        en: 'A hero picks its talent once, on its card, when it reaches **★★**. A gold mark shows heroes still waiting for their pick.',
        ru: 'Герой выбирает талант один раз, в своей карточке, когда получает **★★**. Золотая метка показывает героев, которые ещё ждут выбора.',
      },
      {
        en: 'A full stash still takes a copy of an item it holds: the two **merge**. Giving a hero an item it already carries upgrades it in place, even with both slots taken.',
        ru: 'Полный склад всё равно принимает копию лежащего в нём предмета: две копии **сливаются**. Предмет, который у героя уже есть, улучшается прямо в его слоте, даже если оба слота заняты.',
      },
      {
        en: 'Turn on **Hero rotation** and **Round twists** in Settings → Experiments. They never apply to duels, career trials or training.',
        ru: 'Включи **Ротацию героев** и **Модификаторы раундов** в Настройках → Эксперименты. Они не действуют в дуэлях, испытаниях карьеры и на тренировке.',
      },
    ],
    items: [
      {
        id: 'soulJar',
        badge: 'new',
        changes: [
          {
            en: 'Every hero kill adds a soul, up to **10**. Each soul gives **+4%** attack damage, and the hero keeps them from round to round.',
            ru: 'Каждое убийство героя добавляет душу, максимум **10**. Каждая душа даёт **+4%** урона атаками, и герой хранит их из раунда в раунд.',
          },
        ],
      },
      {
        id: 'soulbond',
        badge: 'new',
        changes: [
          {
            en: 'Works in pairs on one lane: **35%** of the damage either hero takes goes to the other, softened by that hero’s armor.',
            ru: 'Работает парой на одной линии: **35%** урона, который получает любой из двух героев, уходит другому и смягчается его бронёй.',
          },
        ],
      },
      {
        id: 'echoShard',
        badge: 'new',
        changes: [
          {
            en: 'The ability goes off again **1.5 s** later at **50%** power, with stuns half as long. Mana builds **20%** slower.',
            ru: 'Способность срабатывает ещё раз через **1,5 с** с силой **50%**, оглушения вдвое короче. Мана копится на **20%** медленнее.',
          },
        ],
      },
      {
        id: 'townPortal',
        badge: 'new',
        changes: [
          {
            en: 'Once a round, the wearer travels to an allied tower under **65%** health that is being hit, and fights on its lane.',
            ru: 'Раз за раунд переносит владельца к союзной башне ниже **65%** здоровья, которую бьют, и он сражается на её линии.',
          },
        ],
      },
      {
        id: 'cursedBlade',
        badge: 'new',
        changes: [
          {
            en: '**+40%** damage and **+15%** attack speed. Every death of the wearer costs your throne **80** health, counted for the enemy.',
            ru: '**+40%** урона и **+15%** скорости атаки. Каждая смерть владельца стоит вашему трону **80** здоровья, и это засчитывается врагу.',
          },
        ],
      },
    ],
    heroes: [
      {
        id: 'herald',
        badge: 'new',
        changes: [
          {
            en: 'Tier **1** initiator.',
            ru: 'Инициатор **1** тира.',
          },
        ],
        abilities: [
          {
            kind: 'ability',
            id: 'standard',
            badge: 'new',
            changes: [
              {
                en: 'Plants a banner for **9 s**. Push: creeps attack **20%** faster and hit buildings **35%** harder. Defence: buildings take **40%** less damage. Together: heroes deal **25%** more and enemies are stunned for **1.2 s**. No order: heroes take **10%** less damage.',
                ru: 'Ставит знамя на **9 с**. Вперёд: крипы атакуют на **20%** быстрее и бьют строения на **35%** сильнее. Защита: строения получают на **40%** меньше урона. Вместе: герои наносят на **25%** больше, враги оглушены на **1,2 с**. Без приказа: герои получают на **10%** меньше урона.',
              },
            ],
          },
        ],
      },
      {
        id: 'stonewright',
        badge: 'new',
        changes: [
          {
            en: 'Tier **2** support. Gains **5** mana every second, even when it does not fight.',
            ru: 'Саппорт **2** тира. Получает **5** маны в секунду, даже когда не сражается.',
          },
        ],
        abilities: [
          {
            kind: 'ability',
            id: 'mend',
            badge: 'new',
            changes: [
              {
                en: 'Repairs the most damaged allied tower or throne within **260**: **50** health per second for **3 s**. Under Defence the repair also wins back the enemy’s building damage of the round.',
                ru: 'Чинит самую повреждённую союзную башню или трон в радиусе **260**: **50** здоровья в секунду в течение **3 с**. Под «Защитой» починка ещё и отыгрывает урон врага по строениям за раунд.',
              },
            ],
          },
        ],
      },
      {
        id: 'changeling',
        badge: 'new',
        changes: [
          {
            en: 'Tier **3**, rare: only **4** copies in the pool. Takes the role that switches on the most synergies on its lane.',
            ru: '**3** тир, редкий: всего **4** копии в пуле. Берёт роль, которая включает больше всего синергий на его линии.',
          },
        ],
        abilities: [
          {
            kind: 'ability',
            id: 'mimic',
            badge: 'new',
            changes: [
              {
                en: 'Casts the signature ability of the role it took: Volley, Prayer, Chain Lightning, Charge, Powder Keg or Poison Dagger.',
                ru: 'Применяет фирменную способность взятой роли: Volley, Prayer, Chain Lightning, Charge, Powder Keg или Poison Dagger.',
              },
            ],
          },
        ],
      },
    ],
    interface: [
      {
        en: 'Upgraded items glow gold and carry a **+**. The shop shows a **Rare** tag on the Changeling.',
        ru: 'Улучшенные предметы светятся золотом и помечены **+**. В магазине у Changeling есть метка **Редкий**.',
      },
      {
        en: 'A friend’s live match plays smoothly at their speed, and its header fits on one line on any screen.',
        ru: 'Живой матч друга идёт плавно, с его скоростью, а его шапка помещается в одну строку на любом экране.',
      },
    ],
    fixes: [
      {
        en: 'Live matches no longer restart the battle every few seconds.',
        ru: 'Живой матч больше не перезапускает бой каждые несколько секунд.',
      },
      {
        en: 'Replays now keep the souls and talents heroes fought with.',
        ru: 'Повторы теперь учитывают души и таланты, с которыми сражались герои.',
      },
    ],
  },
  {
    version: '8.9',
    date: '2026-10-03',
    title: {
      en: 'Time out',
      ru: 'Тайм-аут',
    },
    campaign: 'pause',
    general: [
      {
        en: 'Either coach can **pause a duel** for both: the battle and the planning clock stop, and nobody can change their lineup. Each coach has **2 pauses** per duel, at least **90 s** apart. The coach who paused can resume at any time, the other after **10 s**, and the duel carries on by itself after **60 s**. **F9** pauses and resumes.',
        ru: 'Любой из тренеров может **поставить дуэль на паузу** для обоих: бой и таймер планирования останавливаются, а менять расстановку нельзя. У каждого **2 паузы** за дуэль, не чаще раза в **90 с**. Поставивший паузу может снять её когда угодно, соперник — через **10 с**, а через **60 с** дуэль продолжится сама. Пауза ставится и снимается клавишей **F9**.',
      },
      {
        en: 'Supports now **heal cores first** and walk behind them instead of leading the fight. They only pick targets their cores are already fighting.',
        ru: 'Саппорты теперь **сначала лечат коров** и идут за ними, а не впереди. Цели они выбирают только среди тех, с кем уже дерутся коры.',
      },
    ],
    roles: [
      {
        id: 'support',
        badge: 'buffed',
        changes: [
          {
            en: 'Healing aura: **1.2%** → **1.8%** of maximum health per second',
            ru: 'Аура лечения: **1,2%** → **1,8%** от максимального здоровья в секунду',
          },
          {
            en: 'Aura radius: **170** → **200**',
            ru: 'Радиус ауры: **170** → **200**',
          },
        ],
      },
    ],
    heroes: [
      {
        id: 'acolyte',
        abilities: [
          {
            kind: 'ability',
            id: 'prayer',
            badge: 'buffed',
            changes: [
              {
                en: 'Heal: **130** → **150**, and the most wounded core is healed before other supports',
                ru: 'Лечение: **130** → **150**; самый раненый кор лечится раньше других саппортов',
              },
            ],
          },
        ],
        changes: [],
      },
      {
        id: 'warden',
        badge: 'buffed',
        changes: [
          {
            en: 'Mana: **100** → **80**, so Entangling Roots comes round sooner',
            ru: 'Мана: **100** → **80**, поэтому Entangling Roots срабатывает чаще',
          },
        ],
        abilities: [
          {
            kind: 'ability',
            id: 'roots',
            badge: 'buffed',
            changes: [
              {
                en: 'Cast range: **160** → **240**',
                ru: 'Дальность: **160** → **240**',
              },
              {
                en: 'Damage: **80** → **100**',
                ru: 'Урон: **80** → **100**',
              },
              {
                en: 'Heal: **80** → **110**, in a radius of **170** → **200**',
                ru: 'Лечение: **80** → **110** в радиусе **170** → **200**',
              },
            ],
          },
        ],
      },
      {
        id: 'oracle',
        abilities: [
          {
            kind: 'ability',
            id: 'shield',
            changes: [
              {
                en: 'Shields wounded cores before other supports.',
                ru: 'Сначала защищает раненых коров, затем других саппортов.',
              },
            ],
          },
        ],
        changes: [],
      },
    ],
    fixes: [
      {
        en: 'A hero held in place by roots beside an enemy tower now hits back at an attacker within reach.',
        ru: 'Герой, которого корни удерживают у вражеской башни, теперь отвечает обидчику, до которого дотягивается.',
      },
    ],
  },
  {
    version: '8.8.4',
    date: '2026-10-03',
    title: {
      en: 'Fixes for duels and friends',
      ru: 'Исправления для дуэлей и друзей',
    },
    fixes: [
      {
        en: 'The battle and round summary show **damage taken** again. It stays hidden only in training, where dummies take the hits.',
        ru: 'В бою и в итогах раунда снова есть **полученный урон**. Он скрыт только в тренировке, где удары принимают манекены.',
      },
      {
        en: 'The battle timer bar now **drains** with the time left, matching the countdown beside it.',
        ru: 'Полоса таймера боя теперь **убывает** вместе с оставшимся временем, как и обратный отсчёт рядом.',
      },
      {
        en: 'With no friends yet, the friends window opens straight to **your friend code** and the field for adding a friend.',
        ru: 'Пока друзей нет, окно друзей сразу показывает **твой код друга** и поле для добавления.',
      },
      {
        en: '**Not ready yet** appears the moment you press Fight in a duel.',
        ru: '**«Отменить готовность»** появляется сразу после нажатия «В бой» в дуэли.',
      },
    ],
  },
  {
    version: '8.8.3',
    date: '2026-10-03',
    title: {
      en: 'Sign in with a code',
      ru: 'Вход по коду',
    },
    fixes: [
      {
        en: 'Email sign-in now uses only the **code** from the letter, so it works in the installed app and on any device instead of opening the website. If the letter is missing, the sign-in window reminds you to check spam.',
        ru: 'Вход по почте теперь работает только по **коду** из письма: он срабатывает в установленном приложении и на любом устройстве, а не открывает сайт. Если письма нет, окно входа напомнит проверить «Спам».',
      },
    ],
  },
  {
    version: '8.8.2',
    date: '2026-10-03',
    title: {
      en: 'Clearer fights, roomier training',
      ru: 'Чище бой, просторнее тренировка',
    },
    general: [
      {
        en: 'The game now has a **Terms of Service** and a **Privacy Policy**. Find both at the bottom of the main screen.',
        ru: 'У игры появились **Условия использования** и **Политика конфиденциальности**. Обе ссылки внизу главного экрана.',
      },
    ],
    interface: [
      {
        en: 'Damage numbers over your own units now show only **hits from enemy heroes**, so creep and tower chip damage no longer buries the moments that matter.',
        ru: 'Числа урона над твоими юнитами теперь показывают только **удары вражеских героев**: мелкий урон крипов и башен больше не заслоняет важные моменты.',
      },
      {
        en: 'In training, the hero and item list **fills the whole column** without the gold and level header, so more heroes fit on screen at once.',
        ru: 'В тренировке список героев и предметов **занимает всю колонку** без шапки с золотом и уровнем: на экране помещается больше героев сразу.',
      },
      {
        en: 'While you wait for a duel opponent, the round button offers one clear action: **Not ready yet** takes you back to your lineup.',
        ru: 'Пока ждёшь соперника в дуэли, у кнопки раунда одно понятное действие: **«Отменить готовность»** возвращает к расстановке.',
      },
      {
        en: 'Profile cards share the soft gradient of the mode ratings, and training settings are tidier.',
        ru: 'Карточки профиля получили тот же мягкий градиент, что и рейтинги режимов, а настройки тренировки стали аккуратнее.',
      },
    ],
    fixes: [
      {
        en: 'The background now continues seamlessly on long pages such as patch notes and the profile.',
        ru: 'Фон больше не обрывается на длинных страницах вроде патчноутов и профиля.',
      },
    ],
  },
  {
    version: '8.8.1',
    date: '2026-10-03',
    title: {
      en: 'Keep the practice flowing',
      ru: 'Тренировка без помех',
    },
    general: [
      {
        en: 'With **no clock**, Exit returns you to your lineup without counting a round.',
        ru: '**Без таймера** кнопка «Выйти» возвращает к расстановке без зачёта раунда.',
      },
      {
        en: '**One dummy per lane** is ready by default in a side camp, visible before battle; turn dummies off to practice pushing. Switch each lane between **Dummies** and **Push** during battle while keeping your heroes and statistics. Creep waves stay on the lanes.',
        ru: '**Один манекен на линию** готов по умолчанию в боковом лагере и виден ещё до боя; отключи манекены для тренировки пуша. Переключай каждую линию между **манекенами** и **пушем** прямо в бою, сохраняя героев и статистику. Волны крипов идут по линиям.',
      },
      {
        en: 'The throne is **invulnerable** until every tower on at least one lane has fallen. Creeps clear the defending wave and then hit the tower instead of chasing past it.',
        ru: 'Трон **неуязвим**, пока не разрушены все башни хотя бы на одной линии. Крипы разбирают защищающую волну, затем бьют башню вместо погони за ней.',
      },
      {
        en: 'You can now **delete your account permanently** after reviewing which progress and conversations will be erased.',
        ru: 'Теперь можно **навсегда удалить аккаунт**, заранее просмотрев, какой прогресс и переписки будут удалены.',
      },
    ],
    items: [
      {
        id: 'gloves',
        badge: 'nerfed',
        changes: [
          {
            en: 'Attack speed per item: **20%** for carries and gankers, **15%** for pushers, **8%** for mages, supports and initiators. Two items add their bonuses instead of multiplying them.',
            ru: 'Скорость атаки за предмет: **20%** для керри и ганкеров, **15%** для пушеров, **8%** для магов, саппортов и инициаторов. Бонусы двух предметов складываются вместо перемножения.',
          },
        ],
      },
      {
        id: 'staff',
        badge: 'buffed',
        changes: [
          {
            en: 'Ability damage and summon power: **20% → 50%** for mages and pushers, **30%** for other roles. Bonuses from two staves add together.',
            ru: 'Урон способностей и сила призывов: **20% → 50%** для магов и пушеров, **30%** для остальных ролей. Бонусы двух посохов складываются.',
          },
        ],
      },
      {
        id: 'manaStone',
        badge: 'buffed',
        changes: [
          {
            en: 'Mana gain: **35% → 50%** per stone. Two stones give **100%** more mana to help ability builds cast more often.',
            ru: 'Набор маны: **35% → 50%** за камень. Два камня дают **100%** дополнительной маны, помогая сборкам на способности чаще кастовать.',
          },
        ],
      },
      {
        id: 'chalice',
        badge: 'buffed',
        changes: [
          {
            en: 'Healing and support aura: **30% → 35%**. Shield strength now also benefits from healing gear, giving Oracle a support build of its own.',
            ru: 'Лечение и аура поддержки: **30% → 35%**. Сила щитов теперь тоже растёт от предметов на лечение: у Oracle появилась своя сборка саппорта.',
          },
        ],
      },
    ],
    heroes: [
      {
        id: 'spearman',
        badge: 'buffed',
        changes: [
          {
            en: 'Health: **650 → 780**. Attack damage: **36 → 40**. Armor: **15% → 20%**, helping him survive his opening charge.',
            ru: 'Здоровье: **650 → 780**. Урон атаки: **36 → 40**. Броня: **15% → 20%**, чтобы пережить первый рывок.',
          },
        ],
        abilities: [
          {
            kind: 'ability',
            id: 'charge',
            badge: 'buffed',
            changes: [
              {
                en: 'Damage: **90 → 120**.',
                ru: 'Урон: **90 → 120**.',
              },
            ],
          },
        ],
      },
    ],
    interface: [
      {
        en: '**Hover a hero** for a quick view of current health, mana, regeneration and equipped items. Open the full card for the same live resources alongside the detailed abilities.',
        ru: '**Наведи на героя**, чтобы быстро увидеть текущее здоровье, ману, восстановление и надетые предметы. В полной карточке эти же ресурсы доступны вместе с подробностями способностей.',
      },
      {
        en: '**Red damage numbers** appear above whoever took the hit, including training dummies. **Green healing numbers** show your allies recovering health from healing and lifesteal.',
        ru: '**Красные числа урона** появляются над тем, кто получил удар, включая тренировочных манекенов. **Зелёные числа лечения** показывают восстановление здоровья союзников от лечения и вампиризма.',
      },
      {
        en: 'Match history opens with **10 matches**; Load more reveals the next **10** at a time.',
        ru: 'История матчей открывается с **10 матчей**; «Показать ещё» раскрывает следующие **10** за раз.',
      },
      {
        en: 'Friends share one corner shortcut, with a **green** dot for online friends and **gold** when someone is playing.',
        ru: 'Друзья доступны через общую кнопку в углу: **зелёная** точка означает, что кто-то в сети, **золотая** — что кто-то играет.',
      },
      {
        en: 'Training gets a compact pause control and simpler settings. Hero and item lists have more breathing room, and mode ratings are easier to read.',
        ru: 'В тренировке стали компактнее кнопка паузы и настройки. Спискам героев и предметов добавили воздуха, а рейтинги режимов стало легче читать.',
      },
      {
        en: 'The trials now explain permanent records and first-clear rewards; weekly contracts keep their reset reminder.',
        ru: 'У испытаний появилась подсказка о постоянных рекордах и награде за первое прохождение; у контрактов сохранено напоминание об обновлении.',
      },
    ],
    fixes: [
      {
        en: 'Pausing holds the music too. Resume continues from **the same moment**.',
        ru: 'Пауза останавливает и музыку. После продолжения трек играет **с того же момента**.',
      },
      {
        en: 'Rank details open on hover or a tap, the profile edit icon is centered, MMR aligns with the rank, and the level badge stays above the avatar overlay.',
        ru: 'Подробности ранга открываются наведением или касанием. Иконка редактирования профиля выровнена, MMR стоит под рангом, а значок уровня остаётся над затемнением аватара.',
      },
    ],
  },
  {
    version: '8.8',
    date: '2026-10-03',
    title: {
      en: 'Practice makes perfect',
      ru: 'Тренируйся без счёта',
    },
    campaign: 'training',
    features: [
      {
        art: {
          kind: 'training',
          focus: 'yard',
        },
        title: {
          en: 'A training yard of your own',
          ru: 'Своя тренировочная площадка',
        },
        text: {
          en: 'Take **any hero** and **any item** for free, line the lanes with dummies and see what your build really does. Fight with **no clock** and pause whenever you like, or play it out in rounds. Training never touches your rating or your saved match.',
          ru: 'Бери **любого героя** и **любые предметы** бесплатно, расставляй манекены на линиях и смотри, на что способна твоя сборка. Сражайся **без таймера** и ставь бой на паузу когда угодно — или играй по раундам. Тренировка не трогает рейтинг и сохранённый матч.',
        },
      },
      {
        art: {
          kind: 'training',
          focus: 'stats',
        },
        title: {
          en: 'Every number in plain sight',
          ru: 'Каждая цифра на виду',
        },
        text: {
          en: 'Hero cards show stats the Dota way: **white** for the hero, **green** for what items and synergies add. You can see what the ability costs and **how many attacks** it takes, and an item shows exactly what it will change before you hand it over.',
          ru: 'Карточка героя показывает статы как в Доте: **белым** — сам герой, **зелёным** — прибавка от предметов и синергий. Видно, сколько стоит способность и **через сколько атак** она сработает, а предмет ещё до покупки показывает, что изменит у героя.',
        },
      },
      {
        art: {
          kind: 'training',
          focus: 'ready',
        },
        title: {
          en: 'Pressed Fight too soon?',
          ru: 'Рано нажал «В бой»?',
        },
        text: {
          en: 'In a duel you can now **take Fight back** and keep planning while your opponent is still placing heroes. Once both of you are ready, the battle starts.',
          ru: 'В дуэли готовность теперь можно **отменить** и продолжить расстановку, пока соперник ещё готовится. Как только готовы оба, начинается бой.',
        },
      },
      {
        art: {
          kind: 'training',
          focus: 'live',
        },
        title: {
          en: 'Friends on air',
          ru: 'Друзья в эфире',
        },
        text: {
          en: 'When a friend starts a match, a card with **Watch** pops up in the corner and their badge pulses gold. Watch from your friends list, their profile or the chat, and the broadcast now plays **smoothly**.',
          ru: 'Когда друг начинает матч, в углу появляется карточка с кнопкой **«Смотреть»**, а его значок пульсирует золотом. Смотреть можно из списка друзей, профиля или чата, а трансляция теперь идёт **плавно**.',
        },
      },
    ],
    general: [
      {
        en: 'Duels and ranked matches play at **normal speed**, so every fight is easier to follow.',
        ru: 'Дуэли и рейтинговые матчи идут на **обычной скорости**: каждый бой проще разглядеть.',
      },
      {
        en: 'Heroes hit back at an enemy hero within their reach, even one standing beside its tower, and wait for their wave where enemy towers cannot reach them.',
        ru: 'Герои отвечают вражескому герою, до которого дотягиваются, даже если тот стоит у своей башни, и ждут волну там, куда вражеская башня не достаёт.',
      },
    ],
    heroes: [
      {
        id: 'pyromancer',
        abilities: [
          {
            kind: 'ability',
            id: 'fireball',
            badge: 'nerfed',
            changes: [
              {
                en: 'Damage: **110** → **85**',
                ru: 'Урон: **110** → **85**',
              },
              {
                en: 'Mana cost: **90** → **100**',
                ru: 'Стоимость: **90** → **100** маны',
              },
            ],
          },
        ],
        changes: [],
      },
    ],
    interface: [
      {
        en: 'Round summaries show each hero’s lane and the items it fought with.',
        ru: 'В сводке раунда у каждого героя видны его линия и предметы, с которыми он дрался.',
      },
      {
        en: 'Two copies of the same hero now get a line each in match details.',
        ru: 'В деталях матча у двух копий одного героя теперь по своей строке.',
      },
    ],
    fixes: [
      {
        en: 'Round numbers in past match details are no longer cut off.',
        ru: 'Номера раундов в деталях прошлого матча больше не обрезаются.',
      },
      {
        en: 'In a friend’s match history, the mode lines up with the rounds and the date.',
        ru: 'В истории матчей друга режим стоит на одной линии с раундами и датой.',
      },
      {
        en: 'Fielding two copies of a hero no longer counts the match twice for that hero.',
        ru: 'Две копии героя в составе больше не засчитывают ему матч дважды.',
      },
    ],
  },
  {
    version: '8.7',
    date: '2026-10-02',
    title: {
      en: 'Find your match',
      ru: 'Найди своего соперника',
    },
    campaign: 'matchmaking',
    features: [
      {
        art: {
          kind: 'matchmaking',
          focus: 'queue',
        },
        title: {
          en: 'Your next opponent is out there',
          ru: 'Твой следующий соперник уже здесь',
        },
        text: {
          en: '**Rated matchmaking** is here. Choose one, two or three lanes and find another coach with a nearby MMR. Browse your profile and career while you wait; the match starts automatically when an opponent is found.',
          ru: 'Появился **рейтинговый поиск соперника**. Выбери одну, две или три линии — игра подберёт тренера с близким MMR. Пока ждёшь, изучай профиль и карьеру: матч начнётся автоматически, когда соперник найдётся.',
        },
      },
      {
        art: {
          kind: 'matchmaking',
          focus: 'rating',
        },
        title: {
          en: 'Every opponent changes the stakes',
          ru: 'Сильнее соперник — ценнее победа',
        },
        text: {
          en: 'MMR now considers **both coaches’ ratings**. Beating a stronger opponent earns more; losing to them costs less. At equal ratings, a win gives **+25 MMR** and a loss takes **−25 MMR**, above the rating floor.',
          ru: 'MMR теперь учитывает **рейтинг обоих тренеров**. Победа над сильным соперником приносит больше, а поражение от него стоит меньше. При равном рейтинге победа даёт **+25 MMR**, поражение — **−25 MMR**, пока не достигнут минимум рейтинга.',
        },
      },
      {
        art: {
          kind: 'leaderboard',
        },
        title: {
          en: 'Meet the coaches at the top',
          ru: 'Знакомься с лидерами',
        },
        text: {
          en: 'Who rules each mode? The leaderboard gathers the **top 100 coaches**. Find it in your profile and see how far you are from the top.',
          ru: 'Кто правит каждым режимом? В таблице лидеров — **топ-100 тренеров**. Открой её в профиле и посмотри, сколько осталось до вершины.',
        },
      },
      {
        art: {
          kind: 'matchmaking',
          focus: 'efficiency',
        },
        title: {
          en: 'More play. Less background traffic.',
          ru: 'Больше игры. Меньше лишних данных.',
        },
        text: {
          en: 'Cloud saves are **lighter**, and the game sends far less in the background. More of your connection goes to the match itself.',
          ru: 'Облачные сохранения стали **легче**, а фоновых данных — намного меньше. Больше связи остаётся для самого матча.',
        },
      },
    ],
    general: [
      {
        en: 'Opponent lineups are checked against their **earned gold and progression**. Heroes, items, levels and rerolls must fit the match budget. Impossible purchases stop the duel before battle.',
        ru: 'Состав соперника проверяется по **заработанному золоту и прогрессу**. Герои, предметы, уровни и обновления магазина должны укладываться в бюджет матча. Невозможные покупки останавливают дуэль до начала боя.',
      },
      {
        en: 'Matchmaking starts within **100 MMR** and gradually widens the search as you wait, up to **1,000 MMR**. Each mode uses its own rating.',
        ru: 'Поиск начинается с разницы до **100 MMR** и постепенно расширяется во время ожидания, максимум до **1 000 MMR**. Для каждого режима используется свой рейтинг.',
      },
      {
        en: 'Online search requires a registered account. Coaches with different game balance versions or blocked relationships are not paired.',
        ru: 'Для онлайн-поиска нужен зарегистрированный аккаунт. Тренеры с разными версиями баланса и заблокированные друг другом игроки не встречаются.',
      },
      {
        en: 'The throne bonus has been removed from MMR changes. Victory is what counts, whether the throne falls or the round limit is reached.',
        ru: 'Бонус к MMR за разрушение трона убран. Учитывается победа — и за снесённый трон, и по лимиту раундов.',
      },
    ],
    interface: [
      {
        en: 'Computer and Online use the same tabs as difficulty. Match setup is more compact; telemetry controls remain in settings and your profile.',
        ru: 'Компьютер и Онлайн переключаются такими же вкладками, как сложность. Настройка матча стала компактнее; управление телеметрией остаётся в настройках и профиле.',
      },
      {
        en: 'The friends shortcut shows how many friends are online beneath its icon. Language and feedback controls now have the same height.',
        ru: 'Под иконкой друзей видно, сколько друзей сейчас в сети. Переключатель языка и кнопка обратной связи теперь одной высоты.',
      },
      {
        en: 'The friends button is now on every screen except the main menu and the match itself, so nothing distracts you in battle.',
        ru: 'Кнопка друзей теперь есть на всех экранах, кроме главного и матча: в бою ничего не отвлекает.',
      },
      {
        en: 'Buttons, cards, panels and navigation links now share consistent rounded corners throughout the interface.',
        ru: 'Кнопки, карточки, панели и навигационные ссылки теперь используют единое скругление во всём интерфейсе.',
      },
      {
        en: 'Search stays visible wherever you go, with the selected mode, elapsed time and a cancel action. Starting or continuing another match is paused until the search ends.',
        ru: 'Поиск остаётся виден при переходах: выбранный режим, время ожидания и отмена всегда под рукой. Запуск и продолжение другого матча недоступны до завершения поиска.',
      },
      {
        en: 'The match report shows your opponent’s MMR and the rating change. During reconnection, Fight shows only a loading indicator; the connection message remains with the round status.',
        ru: 'В отчёте о матче видны MMR соперника и изменение рейтинга. При восстановлении связи на кнопке боя остаётся только лоадер, а сообщение о соединении — рядом со статусом раунда.',
      },
    ],
    fixes: [
      {
        en: 'Interrupted searches and cancellation requests recover without allowing a second match to start. If pairing finishes just before cancellation, the paired match still opens.',
        ru: 'Поиск и отмена восстанавливаются после обрыва связи, не позволяя запустить второй матч. Если соперник нашёлся прямо перед отменой, найденный матч всё равно откроется.',
      },
      {
        en: 'A match result retries after a connection failure and survives reloading the game. An opponent’s later timeout claim no longer overwrites an already reported result.',
        ru: 'Результат матча повторно отправляется после ошибки связи и сохраняется при перезагрузке игры. Поздняя заявка соперника на победу по тайм-ауту больше не перезаписывает уже отправленный результат.',
      },
      {
        en: 'Searches and friend invitations can no longer create overlapping active duels for the same coach.',
        ru: 'Поиск и приглашения друзей больше не создают несколько активных дуэлей у одного тренера.',
      },
    ],
  },
  {
    version: '8.6.3',
    date: '2026-10-02',
    title: {
      en: 'Stay connected',
      ru: 'На связи',
    },
    general: [
      {
        en: 'Watch your friends play **live**, with a short delay. Follow the current battle and inspect heroes on either team.',
        ru: 'Смотри матчи друзей **в прямом эфире** с небольшой задержкой. Следи за текущим боем и изучай героев обеих команд.',
      },
      {
        en: 'The **Standard bot on one lane** now buys items from **round 2** and invests in levels and rerolls earlier, making the shorter match more challenging.',
        ru: 'Бот на **стандартной сложности одной линии** теперь покупает предметы со **2-го раунда** и раньше вкладывается в уровни и обновления магазина. Короткий матч стал сложнее.',
      },
    ],
    interface: [
      {
        en: 'Replays and live matches let you switch between **both teams’ damage, healing and damage taken**.',
        ru: 'В повторах и прямых трансляциях можно переключать **урон, лечение и полученный урон обеих команд**.',
      },
      {
        en: 'Completed milestones now keep the **XP received** visible alongside their progress.',
        ru: 'У завершённых достижений теперь видна **сумма полученного XP** рядом с прогрессом.',
      },
      {
        en: 'Feedback fields now show character counts. Minimum lengths are reduced to **2 characters for the subject** and **10 for the message**.',
        ru: 'В форме обратной связи появились счётчики символов. Минимум снижен до **2 символов в теме** и **10 в сообщении**.',
      },
    ],
    fixes: [
      {
        en: 'Feedback drafts now survive closing the form and reloading the game. A failed submission keeps the draft for another attempt.',
        ru: 'Черновик обращения теперь сохраняется после закрытия формы и перезагрузки игры. При ошибке отправки текст остаётся для повторной попытки.',
      },
      {
        en: 'After sending feedback, the introductory prompt disappears and only the delivery confirmation remains.',
        ru: 'После отправки обращения вводная подсказка исчезает — остаётся подтверждение отправки.',
      },
      {
        en: 'The friends button no longer wraps onto a separate row beside the profile and career buttons.',
        ru: 'Кнопка друзей больше не переносится на отдельную строку рядом с профилем и карьерой.',
      },
      {
        en: 'The nickname edit icon now fits inside its button.',
        ru: 'Иконка редактирования ника больше не выходит за границы кнопки.',
      },
      {
        en: 'The rank summary is easier to read, with the rank name and MMR kept on one line.',
        ru: 'Ранг стал легче читать: название и MMR отображаются в одну строку.',
      },
      {
        en: 'Fixed the update prompt getting stuck on “Installing the update” after the new version was already installed. If activation fails, the game unlocks and the update can be retried.',
        ru: 'Исправлено зависание на «Устанавливаем обновление», когда новая версия уже установлена. При ошибке активации игра разблокируется, а установку можно повторить.',
      },
      {
        en: 'On mobile, the profile card leaves equal space for Career and Friends. The rank ladder stays open after a tap and fits the screen, and the friends panel closes when its backdrop is tapped.',
        ru: 'На мобильных карточка профиля оставляет равное место для карьеры и друзей. Список рангов открывается по нажатию и помещается на экране, а панель друзей закрывается по нажатию на затемнение.',
      },
    ],
  },
  {
    version: '8.6.2',
    date: '2026-10-01',
    title: {
      en: 'Your choice',
      ru: 'Твой выбор',
    },
    general: [
      {
        en: 'Added **optional gameplay analytics** to help balance heroes, items, synergies and game modes. Match statistics are shared with PostHog **only after your explicit consent**.',
        ru: 'Добавлен **добровольный сбор игровой статистики** для улучшения баланса героев, предметов, синергий и режимов. Статистика матчей передаётся в PostHog **только после твоего явного согласия**.',
      },
      {
        en: 'Sharing starts with new matches after consent. Matches use a random analytics identifier; your name, email and account ID stay private.',
        ru: 'В статистику попадают новые матчи после согласия. Матчи связываются случайным аналитическим идентификатором; ник, email и ID аккаунта остаются приватными.',
      },
      {
        en: 'Withdrawing consent stops collection and queues previously shared statistics for deletion.',
        ru: 'Отзыв согласия прекращает сбор, а ранее переданные данные ставятся в очередь на удаление.',
      },
    ],
    interface: [
      {
        en: 'New and existing accounts can agree, decline or decide later after signing in. The choice is saved to your account.',
        ru: 'После входа новые и существующие аккаунты могут согласиться, отказаться или решить позже. Выбор сохраняется в аккаунте.',
      },
      {
        en: 'Change your telemetry consent at any time in settings or your profile.',
        ru: 'Согласие на телеметрию можно изменить в любой момент в настройках или профиле.',
      },
      {
        en: 'Added a feedback form to send bug reports, balance feedback and suggestions to the game team.',
        ru: 'Добавлена форма обратной связи: сообщай об ошибках, обсуждай баланс и отправляй предложения команде игры.',
      },
    ],
    fixes: [
      {
        en: 'Fixed cloud saves failing for profiles with a large match history and round replays.',
        ru: 'Исправлена ошибка облачного сохранения профилей с большой историей матчей и повторами раундов.',
      },
      {
        en: 'Chat now stays above the on-screen keyboard while typing.',
        ru: 'При вводе сообщения чат теперь остаётся над экранной клавиатурой.',
      },
      {
        en: 'Completed trials now offer a saved match replay separately from playing the trial again.',
        ru: 'Для пройденных испытаний просмотр сохранённого повтора теперь доступен отдельно от повторного прохождения.',
      },
    ],
  },
  {
    version: '8.6.1',
    date: '2026-10-01',
    title: {
      en: 'A little smoother',
      ru: 'Чуть плавнее',
    },
    general: [
      {
        en: 'Optimization improved.',
        ru: 'Оптимизация улучшена.',
      },
    ],
    interface: [
      {
        en: 'Chat stays within reach while you play. Drafts and unread messages are easier to keep track of.',
        ru: 'Чат всегда под рукой во время игры. Черновики и непрочитанные сообщения теперь проще отслеживать.',
      },
      {
        en: 'Career and friends look tidier. Combat stats are easier to read.',
        ru: 'Карьера и друзья выглядят аккуратнее. Боевую статистику стало проще читать.',
      },
    ],
    fixes: [
      {
        en: 'Fixed unwanted scrolling and flickering when viewing match details and career progress.',
        ru: 'Исправлены лишняя прокрутка и мерцание при просмотре подробностей матча и прогресса карьеры.',
      },
      {
        en: 'Duels recover more reliably after a brief connection interruption.',
        ru: 'Дуэли надёжнее восстанавливаются после кратковременного обрыва связи.',
      },
    ],
  },
  {
    version: '8.6',
    date: '2026-09-30',
    title: {
      en: 'A level above',
      ru: 'На шаг выше',
    },
    campaign: 'career',
    features: [
      {
        art: {
          kind: 'career',
          focus: 'trials',
        },
        title: {
          en: 'Your level opens new challenges',
          ru: 'Уровень открывает новые вызовы',
        },
        text: {
          en: '**Four solo trials** unlock at levels **2, 4, 6 and 8**. Take the throne, build synergies, equip your squad and master three lanes. Earn **150–300 XP** for each first clear, then come back to beat your best round record.',
          ru: '**Четыре одиночных испытания** открываются на уровнях **2, 4, 6 и 8**. Снеси трон, собери синергии, вооружи отряд и освой три линии. Получи **150–300 XP** за первое прохождение, затем возвращайся улучшать рекорд по раундам.',
        },
      },
      {
        art: {
          kind: 'career',
          focus: 'contracts',
        },
        title: {
          en: 'A new week. Three new goals.',
          ru: 'Новая неделя. Три новые цели.',
        },
        text: {
          en: '**Three weekly contracts**, **120 XP each**. Finish matches, take towers, fight and experiment with your squad. Progress counts in regular matches, trials and duels — even after a defeat. Complete all three for **360 bonus XP**.',
          ru: '**Три контракта в неделю**, по **120 XP за каждый**. Завершай матчи, забирай вышки, сражайся и экспериментируй с отрядом. Прогресс идёт в обычных матчах, испытаниях и дуэлях — даже при поражении. Закрой все три и получи **360 бонусных XP**.',
        },
      },
      {
        art: {
          kind: 'career',
          focus: 'milestones',
        },
        title: {
          en: 'Make your career count',
          ru: 'Собери свою историю побед',
        },
        text: {
          en: '**Five lifetime milestones** reward your first steps and discoveries: five matches, three thrones, ten different heroes, four winning synergies and a three-star hero. Each grants a one-time reward of **100–200 XP**. Previous accomplishments count too.',
          ru: '**Пять целей карьеры** награждают за первые шаги и открытия: пять матчей, три трона, десять разных героев, четыре победные синергии и герой с тремя звёздами. За каждую — разовая награда **100–200 XP**. Прежние достижения тоже учитываются.',
        },
      },
      {
        art: {
          kind: 'career',
          focus: 'rewards',
        },
        title: {
          en: 'One match. More ways to progress.',
          ru: 'Один матч. Больше поводов расти.',
        },
        text: {
          en: 'Match XP, completed contracts, milestones and a first trial clear **add up automatically**. After the game, see every reward, your total XP and newly unlocked trials. Your next goal is already waiting.',
          ru: 'Опыт за матч, закрытые контракты, цели карьеры и первое прохождение испытания **складываются автоматически**. После игры видны все награды, общий XP и новые доступные испытания. Следующая цель уже ждёт.',
        },
      },
    ],
    general: [
      {
        en: 'Weekly contracts refresh on **Monday, 00:00 UTC**; the next refresh is shown in your local time. Forfeits do not advance contracts.',
        ru: 'Недельные контракты обновляются в **понедельник, 00:00 UTC**; время следующего обновления показано в твоём часовом поясе. Сдача матча не продвигает контракты.',
      },
      {
        en: 'Trials use a fixed starting seed and Standard difficulty. Repeat attempts let you refine your strategy under the same starting conditions.',
        ru: 'Испытания проходят на стандартной сложности с фиксированным стартом. Повторные попытки позволяют оттачивать стратегию в одинаковых начальных условиях.',
      },
      {
        en: 'Career progress, trial records and earned rewards are included in cloud saves.',
        ru: 'Прогресс карьеры, рекорды испытаний и полученные награды сохраняются в облаке.',
      },
    ],
    interface: [
      {
        en: 'Career has its own destination from the main menu, with weekly contract progress visible before you open it.',
        ru: 'Карьера открывается отдельно из главного меню. Прогресс недельных контрактов виден ещё до перехода.',
      },
      {
        en: 'Your profile brings together cloud saves, ranks in each mode and match stats, with a direct link to your career and weekly contract progress. Ratings, rating changes and points to the next rank are consistently labelled **MMR**.',
        ru: 'Профиль объединяет облачные сохранения, ранги по режимам и статистику матчей. Рядом — ссылка на карьеру с прогрессом недельных контрактов. Рейтинг, его изменения и очки до следующего ранга теперь везде подписаны **MMR**.',
      },
      {
        en: 'Hover over your highest rank to explore the rank ladder. Clicking or tapping the rank opens it too.',
        ru: 'Наведи на свой высший ранг, чтобы посмотреть лестницу рангов. Её также можно открыть нажатием.',
      },
      {
        en: 'Profile, Career and Friends share a more compact look in the main menu. Friends now uses a gold icon with presence and notification indicators.',
        ru: 'Профиль, Карьера и Друзья получили более лаконичный вид в главном меню. У друзей — золотая иконка с индикаторами онлайна и уведомлений.',
      },
      {
        en: 'Round results are easier to scan: see income, kills and losses at a glance, then explore buildings, hero stats and the full income breakdown. The verdict explanation and casualties expand when you need them. Reopen the previous round report during preparation.',
        ru: 'Итоги раунда стало проще читать: доход, убийства и потери видны сразу, а здоровье построек, статистику героев и полный расчёт дохода можно изучить отдельно. Объяснение результата и список погибших раскрываются по запросу. Отчёт прошлого раунда можно снова открыть во время подготовки.',
      },
      {
        en: 'Hero stat bars now share a consistent width. **100%** represents your leading hero in the selected stat for that round; the scale is shown in the report. Building bars show health remaining against full health, with damage this round listed separately.',
        ru: 'Полоски статистики героев получили одинаковую ширину. **100%** — результат твоего лучшего героя по выбранному показателю за раунд; максимум указан в отчёте. Полоски построек показывают оставшееся здоровье относительно полного, а урон за раунд указан отдельно.',
      },
      {
        en: 'The lane orders guide is available from in-game Help. During a trial, its name stays visible above the round counter, with the objective in its tooltip.',
        ru: 'Руководство по приказам линиям доступно из игровой справки. В испытании его название видно над счётчиком раундов, а условие — в подсказке.',
      },
      {
        en: 'Friend profiles also let you explore the rank ladder. Profile stats and most-played heroes have fewer repeated labels, making the numbers easier to read.',
        ru: 'В профиле друга тоже можно посмотреть лестницу рангов. В статистике профиля и списке популярных героев убраны повторяющиеся подписи, чтобы цифры было проще читать.',
      },
    ],
    fixes: [
      {
        en: 'Fixed music and effects going silent during battle or round preparation. Music resumes after returning to the game.',
        ru: 'Исправлено исчезновение музыки и эффектов во время боя и подготовки к раунду. Музыка возобновляется после возвращения в игру.',
      },
      {
        en: 'Skipping a round no longer plays its end-of-round sounds or delayed combat effects.',
        ru: 'При пропуске раунда больше не звучат его финальные звуки и отложенные эффекты боя.',
      },
      {
        en: 'Victory and defeat music stops when you return to the main menu or start a new match.',
        ru: 'Музыка победы и поражения прекращается при выходе в главное меню или начале нового матча.',
      },
      {
        en: 'Synergy suggestion tooltips no longer intercept clicks on chips or flicker when covering another suggestion.',
        ru: 'Подсказки предложенных связок больше не перехватывают нажатия на чипы и не мигают, перекрывая соседнее предложение.',
      },
      {
        en: 'The rank ladder is centred beneath the rank medal and remains visible above an open profile dialog.',
        ru: 'Лестница рангов открывается по центру под медалью ранга и больше не скрывается за открытым профилем.',
      },
      {
        en: 'Rating values and their MMR labels now line up consistently. Removed the duplicate rating from friend profiles.',
        ru: 'Значения рейтинга и подписи MMR теперь выровнены по одной линии. Из профиля друга убран дублирующий рейтинг.',
      },
    ],
  },
  {
    version: '8.5.2',
    date: '2026-09-30',
    title: {
      en: 'Sound check',
      ru: 'Проверка звука',
    },
    general: [
      {
        en: 'Music now follows the match: a peaceful loop during planning, battle music during the fight and a faster track as the throne falls low or time runs out. The main menu stays quiet.',
        ru: 'Музыка теперь следует за матчем: спокойная петля на подготовке, боевая в сражении и быстрая, когда трон почти пал или время выходит. В главном меню тихо.',
      },
      {
        en: 'Towers falling, heroes dying, healing, round results and the final victory or defeat now have their own sounds.',
        ru: 'У падения вышек, гибели героев, лечения, итога раунда, победы и поражения появились свои звуки.',
      },
      {
        en: 'Settings has separate Music and Effects volume controls, both capped at 30%.',
        ru: 'В настройках появились отдельные громкости музыки и эффектов, обе с пределом в 30%.',
      },
    ],
    fixes: [
      {
        en: 'Music no longer begins with a brief full-volume burst when a match starts.',
        ru: 'Музыка больше не начинает матч коротким всплеском на полной громкости.',
      },
    ],
  },
  {
    version: '8.5.1',
    date: '2026-09-30',
    title: {
      en: 'Twins',
      ru: 'Двойники',
    },
    interface: [
      {
        en: 'Stats show stars. Two copies of one hero are told apart by their lanes or, in one lane, by their items.',
        ru: 'Статистика показывает звёзды. Две копии одного героя различаются линией, а на одной линии — предметами.',
      },
      {
        en: 'Phone: notices pop up above the dock, not over it.',
        ru: 'Телефон: уведомления всплывают над нижней панелью, а не поверх неё.',
      },
    ],
    fixes: [
      {
        en: 'Phone: notices and the update card no longer squeeze into half the screen and wrap.',
        ru: 'Телефон: уведомления и карточка обновления больше не сжимаются в полэкрана с переносами.',
      },
      {
        en: 'Patch notes, the profile and other screens open at their top, not scrolled down.',
        ru: 'Патчноуты, профиль и другие экраны открываются с начала, а не прокрученными вниз.',
      },
      {
        en: 'iPad and iPhone app: buttons at the top of the screen no longer go under the status bar.',
        ru: 'Приложение на iPad и iPhone: кнопки сверху больше не заходят под строку состояния.',
      },
    ],
  },
  {
    version: '8.5',
    date: '2026-09-30',
    title: {
      en: 'Lane orders',
      ru: 'Приказы линиям',
    },
    features: [
      {
        art: { kind: 'orders' },
        title: {
          en: 'An order for every lane',
          ru: 'Приказ каждой линии',
        },
        text: {
          en: 'Turn them on in **Settings → Experiments**. While planning, each lane on the lanes panel gets **Push**, **Defence** and **Together** under its heroes (on a phone, in the **Lanes** tab). Click an order again to take it back. The map shows the orders on your side of each lane.',
          ru: 'Включаются в **Настройки → Эксперименты**. Во время подготовки у каждой линии на панели линий под героями появляются **Вперёд**, **Защита** и **Вместе** (на телефоне — во вкладке **Линии**). Нажми на приказ ещё раз, чтобы снять его. Карта показывает приказы на твоей стороне каждой линии.',
        },
      },
      {
        art: {
          kind: 'order',
          order: 'push',
        },
        title: {
          en: 'Push',
          ru: 'Вперёд',
        },
        text: {
          en: 'The heroes go for the towers and the throne first, as soon as the creeps let them. Caught alone, they do not back off.',
          ru: 'Герои первым делом бьют вышки и трон, как только крипы это позволяют. Оставшись одни, они не отступают.',
        },
      },
      {
        art: {
          kind: 'order',
          order: 'hold',
        },
        title: {
          en: 'Defence',
          ru: 'Защита',
        },
        text: {
          en: 'The heroes stay by their own outer tower and fight whoever comes to it. They do not chase anyone past it, and walk back to the tower after a chase.',
          ru: 'Герои стоят у своей внешней башни и бьют тех, кто к ней подойдёт. Дальше по линии ни за кем не гонятся и после погони возвращаются к башне.',
        },
      },
      {
        art: {
          kind: 'order',
          order: 'group',
        },
        title: {
          en: 'Together',
          ru: 'Вместе',
        },
        text: {
          en: 'Nobody walks ahead of the lane-mate furthest behind. A hero who has fallen counts as back at the base, and one caught alone by stronger heroes steps back until the others catch up.',
          ru: 'Никто не уходит вперёд отстающего напарника. Павший считается у своей базы, а герой, оставшийся один против более сильных, отходит, пока свои не подтянутся.',
        },
      },
    ],
    general: [
      {
        en: 'An order lasts until you change it or take it back. A lane with no order fights as before: its heroes do not give the lane up.',
        ru: 'Приказ держится, пока его не сменишь или не снимешь. Линия без приказа дерётся как раньше: герои её не отдают.',
      },
      {
        en: 'The map shows each order on your side of its lane: arrows marching at the enemy for **Push**, a line across the lane for **Defence**, arrows closing in for **Together**.',
        ru: 'Карта показывает приказ на твоей стороне линии: стрелки к врагу — **Вперёд**, черта поперёк линии — **Защита**, сходящиеся стрелки — **Вместе**.',
      },
      {
        en: 'A ganker on a lane with an order stays on that lane instead of roaming.',
        ru: 'Ганкер на линии с приказом остаётся на ней и не бродит по карте.',
      },
      {
        en: '**Push**: towers and the throne come before heroes and creeps, as soon as the creeps let the heroes hit them. These heroes never back off, even caught alone.',
        ru: '**Вперёд**: вышки и трон важнее героев и крипов, как только крипы позволяют по ним бить. Такие герои не отступают, даже оставшись одни.',
      },
      {
        en: '**Defence**: the heroes stop by their own outer tower. They fight whoever is already in reach or steps up to them, and walk back to the tower after a chase.',
        ru: '**Защита**: герои останавливаются у своей внешней башни. Бьют тех, до кого уже дотягиваются или кто сам подойдёт, и после погони возвращаются к башне.',
      },
      {
        en: '**Together**: nobody walks ahead of the lane-mate furthest behind, and a hero who has fallen counts as back at the base. Left alone against stronger heroes, a hero steps back and keeps stepping back for a moment, so the others can catch up.',
        ru: '**Вместе**: никто не уходит вперёд отстающего напарника, а павший считается у своей базы. Оставшись один против более сильных героев, герой отходит и ещё немного пятится, чтобы свои успели подойти.',
      },
      {
        en: 'Replays recorded before 8.5 no longer open: fights now take lane orders into account.',
        ru: 'Повторы, записанные до 8.5, больше не открываются: бой теперь учитывает приказы.',
      },
    ],
    interface: [
      {
        en: 'Tabs look alike everywhere: the shop, battle, round stats, the round summary, replays and match details.',
        ru: 'Вкладки везде одинаковые: магазин, бой, статистика раунда, итог раунда, повторы и детали матча.',
      },
      {
        en: 'Damage, healing and damage taken tabs have icons.',
        ru: 'У вкладок урона, лечения и полученного урона есть иконки.',
      },
      {
        en: 'Planning: the last round panel is called **Round N stats**.',
        ru: 'Подготовка: панель прошлого раунда называется **Статистика раунда N**.',
      },
      {
        en: 'Hero bars in damage, healing and damage taken are larger.',
        ru: 'Полоски героев в уроне, лечении и полученном уроне крупнее.',
      },
      {
        en: 'Round summary: the kills and deaths column is gone from the hero bars.',
        ru: 'Итог раунда: колонки убийств и смертей у полосок героев больше нет.',
      },
      {
        en: 'Desktop: hero and item cards open at the bottom of the map instead of its middle.',
        ru: 'Десктоп: карточки героя и предмета открываются внизу карты, а не посередине.',
      },
      {
        en: 'The empty lane warning before a fight shows only when you have heroes enough for every lane.',
        ru: 'Предупреждение о пустой линии перед боем появляется, только если героев хватает на все линии.',
      },
    ],
  },
  {
    version: '8.4.2',
    date: '2026-09-29',
    title: {
      en: 'Clean ring',
      ru: 'Чистое кольцо',
    },
    interface: [
      {
        en: 'Damage, healing and damage taken list only your heroes.',
        ru: 'Урон, лечение и полученный урон показывают только твоих героев.',
      },
      {
        en: 'Round summary: damage, healing and damage taken fill the width. The heading above them is gone.',
        ru: 'Итог раунда: урон, лечение и полученный урон на всю ширину. Заголовка над ними больше нет.',
      },
    ],
    fixes: [
      {
        en: 'Selecting a hero no longer draws lines from the corner of the map to the selection ring.',
        ru: 'Выбор героя больше не рисует линии из угла карты к кольцу выделения.',
      },
      {
        en: 'Hero slots line up with item slots.',
        ru: 'Слоты героев выровнены так же, как слоты предметов.',
      },
    ],
  },
  {
    version: '8.4.1',
    date: '2026-09-29',
    title: {
      en: 'Damage taken',
      ru: 'Полученный урон',
    },
    interface: [
      {
        en: 'Battle and the round summary: damage taken sits beside damage and healing.',
        ru: 'Бой и итог раунда: полученный урон стоит рядом с уроном и лечением.',
      },
      {
        en: 'Destroyed towers are no longer labeled under the top bar.',
        ru: 'Снесённые вышки больше не подписаны под верхней панелью.',
      },
    ],
    fixes: [
      {
        en: 'One lane: a shove can no longer carry a hero or a creep past the sides of the bridge.',
        ru: 'Одна линия: толчок больше не выносит героя или крипа за края моста.',
      },
      {
        en: 'The dark strip between cards is gone.',
        ru: 'Тёмная полоска между карточками пропала.',
      },
      {
        en: 'A scrollbar no longer flashes when you press **Fight**, switch the shop between heroes and items, or switch damage, healing and damage taken.',
        ru: 'Полоса прокрутки больше не вспыхивает, когда жмёшь **В бой**, переключаешь магазин между героями и предметами или переключаешь урон, лечение и полученный урон.',
      },
      {
        en: 'The round summary no longer says that nobody reached the towers.',
        ru: 'В итоге раунда больше нет строки о том, что никто не дошёл до вышек.',
      },
      {
        en: 'Damage taken no longer shows kills and deaths.',
        ru: 'У полученного урона больше нет убийств и смертей.',
      },
    ],
  },
  {
    version: '8.4',
    date: '2026-09-29',
    title: {
      en: 'Turning pages',
      ru: 'Листаем патчи',
    },
    interface: [
      {
        en: 'Patch notes: the previous and the next patch at the bottom of the page. The latest one sums up the releases before it.',
        ru: 'Патчноуты: внизу страницы предыдущий и следующий патч. У последнего — коротко о прошлых релизах.',
      },
      {
        en: 'Patch notes and profile: **Main menu** always leads to the main screen; the browser’s back button returns to the page.',
        ru: 'Патчноуты и профиль: **Главное меню** всегда ведёт на главный экран, кнопка «Назад» браузера возвращает на страницу.',
      },
      {
        en: 'Start screen: the next mode fades in over the one before it.',
        ru: 'Главный экран: следующий режим плавно проявляется поверх предыдущего.',
      },
      {
        en: 'Friends and chat: the window closes when any other window opens.',
        ru: 'Друзья и чат: окно закрывается, когда открывается любое другое окно.',
      },
    ],
  },
  {
    version: '8.3',
    date: '2026-09-29',
    title: {
      en: 'Fair rating',
      ru: 'Честный рейтинг',
    },
    general: [
      {
        en: 'The server keeps the duel rating: it counts only duels it saw end, and that is the rank friends see. Your profile takes its figures on every sync.',
        ru: 'Рейтинг дуэлей хранит сервер: считает только дуэли, которые сам видел завершёнными, и этот ранг видят друзья. Профиль берёт его цифры при каждой синхронизации.',
      },
      {
        en: 'Replays recorded before 8.3 no longer open: the balance check now covers heal relics too.',
        ru: 'Повторы, записанные до 8.3, больше не открываются: проверка баланса теперь учитывает и реликвии.',
      },
    ],
    interface: [
      {
        en: 'Start screen: two bots fight on the map, three lanes, two lanes and one lane in turn, **15** s each. The saved match and the mode cards are gone from it.',
        ru: 'Главный экран: на карте бьются два бота — три линии, две и одна по очереди, по **15** с. Сохранённого матча и карточек режимов там больше нет.',
      },
      {
        en: 'A replay opens on round **1**, paused, at **×1**.',
        ru: 'Повтор открывается с раунда **1**, на паузе, на скорости **×1**.',
      },
      {
        en: 'Replay: the round buttons sit under the scoreboard, in line with the round. Play is the first button, close is at the top right of the actions card. The map and the scoreboard are centered on the screen.',
        ru: 'Повтор: кнопки раундов под верхней панелью, ровно под номером раунда. «Играть» первая слева, закрытие — в правом верхнем углу карточки. Карта и панель по центру экрана.',
      },
      {
        en: 'Match breakdown: **Watch** sits beside Victory or Defeat.',
        ru: 'Разбор матча: **Смотреть** справа от «Победы» или «Поражения».',
      },
      {
        en: 'Replay: the won or lost line and the bar under the timer are gone.',
        ru: 'Повтор: под таймером больше нет строки о победе или поражении в раунде и полоски.',
      },
      {
        en: 'Signed in with Google: friends see your account photo while it is your avatar. A hero you pick replaces it for them too.',
        ru: 'Вход через Google: друзья видят фото аккаунта, пока оно стоит аватаром. Выбранный герой заменяет его и у них.',
      },
    ],
    fixes: [
      {
        en: 'Replay from a match breakdown or a friend’s profile: the window steps aside while it plays and comes back after, with the same match open.',
        ru: 'Повтор из разбора матча или профиля друга: окно уходит на время повтора и возвращается после, с тем же открытым матчем.',
      },
      {
        en: 'Replay of a match that was under way when 8.2 came out: it is no longer offered, instead of showing another round’s fight.',
        ru: 'Повтор матча, который шёл во время выхода 8.2: больше не предлагается, раньше показывал бой другого раунда.',
      },
    ],
  },
  {
    version: '8.2',
    date: '2026-09-29',
    title: {
      en: 'Replays',
      ru: 'Повторы',
    },
    features: [
      {
        art: { kind: 'rounds' },
        title: {
          en: 'Watch a fight again',
          ru: 'Посмотреть бой ещё раз',
        },
        text: {
          en: 'Open one of your last **5** matches, or a friend’s, and press **Watch**. The round shows the towers, the throne and the time left. Click a hero to see their items and what they did.',
          ru: 'Открой один из последних **5** матчей, своих или друга, и нажми **Смотреть**. У раунда видны башни, трон и оставшееся время. Нажми на героя, чтобы увидеть предметы и что он сделал.',
        },
      },
    ],
    general: [
      {
        en: 'The fight is played again from that round’s lineups, the random seed and the health of the towers and the throne. After a balance change the same inputs would play out differently, so those fights stay in the history but **Watch** is hidden.',
        ru: 'Бой проигрывается заново из составов раунда, случайного зерна и здоровья башен и трона. После изменения баланса те же данные разошлись бы, поэтому такие бои остаются в истории, но кнопка **Смотреть** скрыта.',
      },
    ],
  },
  {
    version: '8.1',
    date: '2026-09-29',
    title: {
      en: 'Friends’ matches',
      ru: 'Матчи друзей',
    },
    interface: [
      {
        en: 'Friend profile: a match opens right in the list, with the same breakdown as your own: heroes, lineups round by round, the fight. Who a duel was against stays hidden.',
        ru: 'Профиль друга: матч раскрывается прямо в списке, с тем же разбором, что и свой: герои, составы по раундам, бой. С кем была дуэль, не видно.',
      },
    ],
  },
  {
    version: '8.0.2',
    date: '2026-09-29',
    title: {
      en: 'Made for touch',
      ru: 'Под пальцы',
    },
    heroes: [
      {
        id: 'blademaster',
        badge: 'nerfed',
        changes: [
          {
            en: 'Health: **560** → **640**',
            ru: 'Здоровье: **560** → **640**',
          },
        ],
        abilities: [
          {
            kind: 'ability',
            id: 'whirl',
            badge: 'nerfed',
            changes: [
              {
                en: 'Damage per tick: **45** → **40**',
                ru: 'Урон за тик: **45** → **40**',
              },
              {
                en: 'Duration: **2** → **1.6** s',
                ru: 'Длительность: **2** → **1,6** с',
              },
            ],
          },
        ],
      },
    ],
    interface: [
      {
        en: 'Phones and tablets: the camera frames the lanes, not the whole board, and the empty edges go under the panels. Two lanes get up to **30%** bigger.',
        ru: 'Телефоны и планшеты: камера наводится на линии, а не на всю доску, пустые края уходят под панели. Две линии крупнее до **30%**.',
      },
      {
        en: 'Phones and tablets: small slots for heroes and items, so the Heroes tab fits without scrolling. Auto place moved into its header.',
        ru: 'Телефоны и планшеты: маленькие ячейки героев и предметов, вкладка «Герои» помещается без прокрутки. «Расставить» переехала в её заголовок.',
      },
      {
        en: 'Phones: a hero or item card opens in the bottom panel instead of over the map, with Sell and the item slots right under the name.',
        ru: 'Телефоны: карточка героя или предмета открывается в нижней панели, а не поверх карты. «Продать» и слоты предметов сразу под именем.',
      },
      {
        en: 'Tablets: the hero or item card takes the shop’s place while it is open.',
        ru: 'Планшеты: карточка героя или предмета встаёт на место лавки, пока открыта.',
      },
      {
        en: 'Match breakdown: the close button is in the top right corner, as in every other window.',
        ru: 'Разбор матча: кнопка закрытия в правом верхнем углу, как во всех окнах.',
      },
    ],
    fixes: [
      {
        en: 'Favourite heroes on phones: every column is there, scrolled sideways with the hero pinned on the left.',
        ru: 'Любимые герои на телефоне: все колонки на месте, таблица листается вбок, герой закреплён слева.',
      },
      {
        en: 'Phones and tablets: the round panel sits in the middle of the screen, the menu button in the top left corner.',
        ru: 'Телефоны и планшеты: панель раунда по центру экрана, кнопка меню в левом верхнем углу.',
      },
    ],
  },
  {
    version: '8.0.1',
    date: '2026-09-29',
    title: {
      en: 'Room on the map',
      ru: 'Место на карте',
    },
    interface: [
      {
        en: 'Update card: no close button. While the update installs, the game is covered and takes no clicks or keys.',
        ru: 'Карточка обновления: без крестика. Пока обновление ставится, игра закрыта и не принимает нажатий и клавиш.',
      },
    ],
    fixes: [
      {
        en: 'Patch notes: the round picture of the 8.0 highlights sits in the middle of its card.',
        ru: 'Патчноуты: картинка про раунды в главном из 8.0 стоит по центру карточки.',
      },
      {
        en: 'Tablets and desktops: the hero and item cards open beside the map, under the shop, so a lane is always in reach.',
        ru: 'Планшеты и компьютеры: карточки героя и предмета открываются рядом с картой, под лавкой, и линия всегда доступна.',
      },
    ],
  },
  {
    version: '8.0',
    date: '2026-09-29',
    title: {
      en: 'Game modes',
      ru: 'Режимы игры',
    },
    features: [
      {
        art: { kind: 'modes' },
        title: {
          en: 'Three ways to play',
          ru: 'Три режима',
        },
        text: {
          en: 'The classic on three lanes, two lanes to start with, and a quick fight on one. Pick the mode for a match or a duel.',
          ru: 'Классика на трёх линиях, две линии для начала и быстрый бой на одной. Режим выбирается для матча и для дуэли.',
        },
      },
      {
        art: {
          kind: 'map',
          mode: 'twoLanes',
        },
        title: {
          en: 'Two lanes',
          ru: 'Две линии',
        },
        text: {
          en: 'Bases face each other across the jungle, one lane over it and one under. The tutorial is played here.',
          ru: 'Базы смотрят друг на друга через лес, одна линия идёт сверху, другая снизу. Здесь проходит обучение.',
        },
      },
      {
        art: {
          kind: 'map',
          mode: 'oneLane',
        },
        title: {
          en: 'One lane',
          ru: 'Одна линия',
        },
        text: {
          en: 'A long bridge, **2** towers a side and heal relics in the middle. Rounds go to building damage and kills.',
          ru: 'Длинный мост, по **2** вышки у каждой стороны и лечебные руны в середине. Раунд решают урон по строениям и убийства.',
        },
      },
      {
        art: { kind: 'ratings' },
        title: {
          en: 'A rank for every mode',
          ru: 'Ранг в каждом режиме',
        },
        text: {
          en: 'Each mode keeps its own duel rating. Friends see your best one, with its mode.',
          ru: 'У каждого режима свой рейтинг дуэлей. Друзья видят лучший, вместе с режимом.',
        },
      },
      {
        art: { kind: 'rounds' },
        title: {
          en: 'Every round, looked back on',
          ru: 'Любой раунд заново',
        },
        text: {
          en: 'Open a match from your history and pick a round to see both lineups as they fought it.',
          ru: 'Открой матч из истории и выбери раунд, чтобы увидеть составы обеих команд в нём.',
        },
      },
    ],
    general: [
      {
        en: 'Three game modes: **Three lanes**, **Two lanes** and **One lane**. Pick one for a new match or a duel.',
        ru: 'Три режима: **Три линии**, **Две линии** и **Одна линия**. Режим выбирается для нового матча и для дуэли.',
      },
      {
        en: 'Two lanes: bases left and right, top and bot around the jungle, one tower per lane.',
        ru: 'Две линии: базы слева и справа, верх и низ огибают лес, по вышке на линию.',
      },
      {
        en: 'One lane: a long bridge from corner to corner with **2** towers a side, placed so the middle of the bridge is out of their reach.',
        ru: 'Одна линия: длинный мост из угла в угол, по **2** вышки с каждой стороны. Середина моста вне досягаемости вышек.',
      },
      {
        en: 'One lane: heal relics in the middle restore **20%** health to the hero who takes one and to allies nearby, and come back after **16** s.',
        ru: 'Одна линия: лечебные руны в середине моста восстанавливают **20%** здоровья взявшему и союзникам рядом, появляются снова через **16** с.',
      },
      {
        en: 'One lane: a round is judged by building damage plus **60** for every hero kill.',
        ru: 'Одна линия: раунд решает урон по строениям плюс **60** за каждое убийство героя.',
      },
      {
        en: 'One lane: up to **12** rounds, base income **6** gold.',
        ru: 'Одна линия: до **12** раундов, базовый доход **6** золота.',
      },
      {
        en: 'Every mode starts at coach level **1**. Three and two lanes: **2** heroes on the map, **5** at level 4. One lane: **3** heroes, **5** at level 3.',
        ru: 'Уровень тренера в каждом режиме начинается с **1**. Три и две линии: **2** героя на карте, **5** на 4-м уровне. Одна линия: **3** героя, **5** на 3-м уровне.',
      },
      {
        en: 'A separate duel rating for each mode; friends see your best one. The rating so far counts as Three lanes.',
        ru: 'Отдельный рейтинг дуэлей в каждом режиме, друзья видят лучший. Прежний рейтинг засчитан Трём линиям.',
      },
      {
        en: 'Solo mid works on Three lanes only.',
        ru: '«Соло мид» работает только на Трёх линиях.',
      },
    ],
    interface: [
      {
        en: 'Start screen: the map of your saved match, or the three modes with your rank in each.',
        ru: 'Главный экран: карта сохранённого матча, а без него — три режима и твой ранг в каждом.',
      },
      {
        en: 'Start screen for new coaches: Two lanes to start with, the other modes below.',
        ru: 'Главный экран для новичков: сначала Две линии, остальные режимы ниже.',
      },
      {
        en: 'New match: pick the mode. The tutorial runs on Two lanes and ends by showing all three.',
        ru: 'Новый матч: выбор режима. Обучение проходит на Двух линиях и в конце рассказывает про все три.',
      },
      {
        en: 'A duel challenge asks for the mode; the invite shows it.',
        ru: 'Вызов на дуэль спрашивает режим, приглашение его показывает.',
      },
      {
        en: 'Profile: rating by mode, shown from the first day. The best rank says which mode it is from.',
        ru: 'Профиль: рейтинг по режимам, виден с первого дня. У лучшего ранга подписан его режим.',
      },
      {
        en: 'Match breakdown: pick a round to see both lineups as they fought it. Kept for your last **5** matches.',
        ru: 'Разбор матча: выбери раунд, чтобы увидеть составы обеих команд в нём. Хранится для последних **5** матчей.',
      },
      {
        en: 'Favourite heroes: damage, building damage and healing over all matches, with the average per match below. The damage taken column is gone.',
        ru: 'Любимые герои: урон, урон по строениям и лечение за все матчи, ниже — в среднем за матч. Колонки принятого урона больше нет.',
      },
      {
        en: 'Match history, yours and your friends’: the mode of every match.',
        ru: 'История матчей, своя и друзей: режим каждого матча.',
      },
      {
        en: 'Friend profile: a coach without matches shows zeros instead of an empty card.',
        ru: 'Профиль друга: у тренера без матчей нули вместо пустой карточки.',
      },
      {
        en: 'Signed in with Google: your account photo is your profile avatar. Any hero can still be picked instead.',
        ru: 'Вход через Google: фото аккаунта становится аватаром профиля. Вместо него по-прежнему можно выбрать героя.',
      },
      {
        en: 'The Sign in button no longer says “with email”: the dialog offers email and Google alike.',
        ru: 'Кнопка входа теперь просто «Войти»: в окне есть и почта, и Google.',
      },
    ],
    fixes: [
      {
        en: 'Hand-lettered titles, such as Victory and patch numbers, no longer sit off to the right.',
        ru: 'Рукописные заголовки, например «Победа» и номер патча, больше не съезжают вправо.',
      },
    ],
  },
  {
    version: '7.7.1',
    date: '2026-09-29',
    title: {
      en: 'Update fix',
      ru: 'Исправление обновления',
    },
    interface: [
      {
        en: 'New version card: the close button is as tall as **Update**.',
        ru: 'Карточка новой версии: крестик одной высоты с кнопкой **«Обновить»**.',
      },
    ],
    fixes: [
      {
        en: 'The **Update** button on the new version card sometimes did nothing. Now it always reloads into the new version.',
        ru: 'Кнопка **«Обновить»** на карточке новой версии иногда ничего не делала. Теперь она всегда перезагружает игру на новую версию.',
      },
    ],
  },
  {
    version: '7.7',
    date: '2026-09-28',
    title: {
      en: 'A cap on the dead',
      ru: 'Мёртвых не больше четырёх',
    },
    heroes: [
      {
        id: 'necromancer',
        changes: [],
        abilities: [
          {
            kind: 'ability',
            id: 'raiseDead',
            badge: 'nerfed',
            changes: [
              {
                en: 'At most **4** skeletons at a time. Mana Stones make him raise them again faster, but the army no longer grows.',
                ru: 'Не больше **4** скелетов одновременно. С Mana Stone он быстрее поднимает новых, но армия больше не растёт.',
              },
            ],
          },
        ],
      },
    ],
    interface: [
      {
        en: 'Items: clicking an item in the stash opens its card with a **Sell** button, like the hero card. **E** sells the selected item too.',
        ru: 'Предметы: нажатие на предмет на складе открывает его карточку с кнопкой **Продать**, как у героя. **E** продаёт и выбранный предмет.',
      },
      {
        en: 'Bench and stash: hero and item icons are much bigger and fill their slots.',
        ru: 'Скамейка и склад: иконки героев и предметов заметно крупнее и заполняют слот.',
      },
      {
        en: 'Coach profile: MMR sits with matches, win rate and best streak instead of under the name.',
        ru: 'Профиль тренера: MMR стоит рядом с матчами, винрейтом и лучшей серией, а не под ником.',
      },
      {
        en: 'Match details: no more line saying whose throne fell.',
        ru: 'Детали матча: убрана строка о том, чей трон разрушен.',
      },
      {
        en: 'Tower and throne ranges show up only when enemies step inside, in the colour of the building’s side. A throne lights up **green** while it heals its wounded heroes and no enemy is near.',
        ru: 'Радиус башен и трона виден, только когда в него заходят враги, — в цвете стороны строения. Трон подсвечивается **зелёным**, пока лечит своих раненых героев и рядом нет врагов.',
      },
    ],
  },
  {
    version: '7.6',
    date: '2026-09-28',
    title: {
      en: 'Healing of its own',
      ru: 'Отдельное лечение',
    },
    general: [
      {
        en: 'Giving up a duel counts as a loss: **−20 MMR**. The opponent gets the win and **+25 MMR**.',
        ru: 'Сдача в дуэли — это поражение: **−20 MMR**. Соперник получает победу и **+25 MMR**.',
      },
      {
        en: 'The same goes for a coach who goes silent and gets timed out, even if they come back later.',
        ru: 'То же для тренера, который пропал и проиграл по таймауту, даже если он вернётся позже.',
      },
      {
        en: 'When the enemy throne drops below **10%** health, heroes next to it drop everything and finish it, even under its fire.',
        ru: 'Когда у вражеского трона остаётся меньше **10%** здоровья, герои рядом бросают всё и добивают его, даже под его огнём.',
      },
    ],
    roles: [
      {
        id: 'ganker',
        badge: 'reworked',
        changes: [
          {
            en: 'Never attacks towers or the throne; the hero card says so.',
            ru: 'Не бьёт башни и трон, это написано в карточке героя.',
          },
          {
            en: 'With nobody to fight, heads to the nearest enemy creeps, on another lane if needed, instead of waiting by a tower.',
            ru: 'Когда драться не с кем, идёт к ближайшим вражеским крипам, при необходимости на другую линию, а не ждёт у башни.',
          },
          {
            en: 'No longer hunts heroes standing under an untanked enemy tower.',
            ru: 'Больше не охотится на героев, которые стоят под вражеской башней без танка.',
          },
        ],
      },
    ],
    items: [
      {
        id: 'chalice',
        badge: 'new',
        changes: [
          {
            en: 'Sacred Chalice: **+30%** healing from abilities and the support aura. Costs **3** gold.',
            ru: 'Sacred Chalice: **+30%** лечения способностями и аурой саппорта. Стоит **3** золота.',
          },
        ],
      },
      {
        id: 'staff',
        badge: 'nerfed',
        changes: [
          {
            en: 'No longer boosts healing.',
            ru: 'Больше не усиливает лечение.',
          },
        ],
      },
    ],
    interface: [
      {
        en: 'Profile, most played heroes: damage to buildings is shown for every hero.',
        ru: 'Профиль, любимые герои: урон по строениям показан у всех героев.',
      },
      {
        en: 'Coach profile: rating reads as **MMR**, and matches, win rate and best streak moved into the header.',
        ru: 'Профиль тренера: рейтинг подписан как **MMR**, а матчи, винрейт и лучшая серия переехали в шапку.',
      },
      {
        en: 'Chat: the emoji and send buttons match the height of the message field.',
        ru: 'Чат: кнопки смайликов и отправки одной высоты с полем сообщения.',
      },
      {
        en: 'Patch notes: the section menu is gone; the back and patch buttons float over the page.',
        ru: 'Патчноуты: меню разделов убрано, кнопки «назад» и выбора патча висят поверх страницы.',
      },
    ],
    fixes: [
      {
        en: 'Opening a profile from a chat closes the chat window.',
        ru: 'Открытие профиля из чата закрывает окно чата.',
      },
      {
        en: 'An open game finds a new version within a minute, and at once when you come back to the tab.',
        ru: 'Открытая игра находит новую версию за минуту, а при возврате на вкладку — сразу.',
      },
    ],
  },
  {
    version: '7.5',
    date: '2026-09-28',
    title: {
      en: 'Rating for duels',
      ru: 'Рейтинг за дуэли',
    },
    general: [
      {
        en: 'Rating now comes only from duels: **+25** for a win, **+5** more for breaking the throne, **−20** for a loss.',
        ru: 'Рейтинг теперь только за дуэли: **+25** за победу, ещё **+5** за сломанный трон, **−20** за поражение.',
      },
      {
        en: 'Matches against the computer give XP only.',
        ru: 'Матчи против компьютера дают только опыт.',
      },
    ],
    items: [
      {
        id: 'staff',
        badge: 'nerfed',
        changes: [
          {
            en: 'Ability power: **+30%** → **+20%**',
            ru: 'Сила способностей: **+30%** → **+20%**',
          },
        ],
      },
      {
        id: 'vampireFang',
        badge: 'nerfed',
        changes: [
          {
            en: 'Lifesteal from abilities: **20%** → **10%**',
            ru: 'Вампиризм от способностей: **20%** → **10%**',
          },
        ],
      },
    ],
    heroes: [
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
                en: 'Damage: **125** → **110**',
                ru: 'Урон: **125** → **110**',
              },
            ],
          },
        ],
      },
    ],
    interface: [
      {
        en: 'Matches against the computer show only XP in the history and the breakdown.',
        ru: 'У матчей против компьютера в истории и разборе — только опыт.',
      },
      {
        en: 'End of a match against the computer: the rating says only duels change it.',
        ru: 'Итоги матча против компьютера: у рейтинга подпись «Меняется только в дуэлях».',
      },
    ],
  },
  {
    version: '7.4',
    date: '2026-09-28',
    title: {
      en: 'Match breakdown',
      ru: 'Разбор матча',
    },
    interface: [
      {
        en: 'A click on a match in your history opens its breakdown: round by round, both lineups with items and synergies, hero stats of both teams.',
        ru: 'Клик по матчу в истории открывает разбор: ход раундов, составы обеих команд с предметами и синергиями, статистика героев.',
      },
      {
        en: 'Match history: hero names on hover.',
        ru: 'История матчей: имена героев при наведении.',
      },
      {
        en: 'Duels count: rating, XP and stats as for a Standard match. They show up in the match history with the opponent’s name.',
        ru: 'Дуэли засчитываются: рейтинг, опыт и статистика как за матч на «Стандарте». В истории матчей — с именем соперника.',
      },
      {
        en: 'Favourite heroes: a column for the role — buildings for pushers, healing for supports, damage taken for initiators.',
        ru: 'Любимые герои: колонка по роли — строения у пушеров, лечение у саппортов, принятый урон у инициаторов.',
      },
      {
        en: 'Friend profile: rank name under the medal, no best rating tile, a line between the history and the actions.',
        ru: 'Профиль друга: название ранга под медалью, без плитки лучшего рейтинга, черта между историей и действиями.',
      },
      {
        en: 'A friend profile closes the open chat.',
        ru: 'Профиль друга закрывает открытый чат.',
      },
      {
        en: 'Add a friend: the form opens above its button, which then hides it; your code sits under its label with Copy next to it.',
        ru: 'Добавление друга: форма открывается над кнопкой, та же кнопка её скрывает; твой код под подписью, «Копировать» рядом.',
      },
    ],
    fixes: [
      {
        en: 'The end of a duel showed the rating change of your previous match.',
        ru: 'Конец дуэли показывал изменение рейтинга за прошлый матч.',
      },
      {
        en: 'Friend profile: heroes in a match row are no longer cut off or squeezed together.',
        ru: 'Профиль друга: герои в строке матча больше не обрезаются и не слипаются.',
      },
    ],
  },
  {
    version: '7.3',
    date: '2026-09-28',
    title: {
      en: 'Like a messenger',
      ru: 'Как в мессенджере',
    },
    interface: [
      {
        en: 'Friends open in a window in the corner: a click on a friend opens the chat, the avatar opens the profile, the duel button sits at the end of the row.',
        ru: 'Друзья открываются окном в углу: клик по другу открывает чат, по аватару — профиль, кнопка дуэли в конце строки.',
      },
      {
        en: 'Browser notifications for messages, friend requests and duel challenges while the game is in the background. Turned on with the bell in the friends window.',
        ru: 'Уведомления браузера о сообщениях, заявках и вызовах на дуэль, пока игра в фоне. Включаются колокольчиком в окне друзей.',
      },
      {
        en: 'Friend profile: wider, one line per match with the lineup in a row.',
        ru: 'Профиль друга: шире, каждый матч в одну строку, герои в ряд.',
      },
      {
        en: 'During a round the meter shows only your heroes; the opponent’s damage and healing are revealed in the round summary.',
        ru: 'Во время раунда счётчик показывает только твоих героев; урон и лечение соперника видны в итогах раунда.',
      },
      {
        en: 'Round summary: switch between damage and healing of both teams.',
        ru: 'Итоги раунда: переключение между уроном и лечением обеих команд.',
      },
      {
        en: 'The Friends button shows up once you sign in.',
        ru: 'Кнопка «Друзья» появляется после входа в аккаунт.',
      },
    ],
    fixes: [
      {
        en: 'The friend profile no longer breaks: the avatar keeps its size and the name shows.',
        ru: 'Профиль друга больше не разваливается: аватар своего размера, имя на месте.',
      },
      {
        en: 'The reaction wheel no longer hides under the side panel.',
        ru: 'Колесо реакций больше не прячется под боковой панелью.',
      },
    ],
  },
  {
    version: '7.2',
    date: '2026-09-28',
    title: {
      en: 'Friends up close',
      ru: 'Друзья поближе',
    },
    interface: [
      {
        en: 'Friends list: rank next to the avatar, and what a friend is doing: in a match or a duel, with the round.',
        ru: 'Список друзей: ранг рядом с аватаром и чем занят друг: в игре или в дуэли, с номером раунда.',
      },
      {
        en: 'A click on a friend opens their profile: rank, totals, latest matches. Remove and block live there.',
        ru: 'Клик по другу открывает его профиль: ранг, итоги, последние матчи. Удалить и заблокировать можно там же.',
      },
      {
        en: 'Adding a friend: one button, the code field opens right in the list.',
        ru: 'Добавить друга: одна кнопка, поле для кода открывается прямо в списке.',
      },
      {
        en: 'Chat opens in a window in the corner.',
        ru: 'Чат открывается окном в углу.',
      },
      {
        en: 'Social notifications in one stack at the bottom right: friend requests (accept right there), accepted requests, messages and duel news.',
        ru: 'Все социальные уведомления в одном месте справа снизу: заявки в друзья (принять можно прямо там), принятые заявки, сообщения и новости дуэлей.',
      },
      {
        en: 'Emoji in chat.',
        ru: 'Эмодзи в чате.',
      },
      {
        en: 'Duels: a reaction wheel. The opponent sees reactions as stickers and can hide them.',
        ru: 'Дуэли: колесо реакций. Соперник видит их стикерами и может скрыть.',
      },
    ],
    fixes: [
      {
        en: 'The hero card no longer jumps when you switch heroes.',
        ru: 'Карточка героя больше не прыгает при переключении.',
      },
    ],
  },
  {
    version: '7.1',
    date: '2026-09-28',
    title: {
      en: 'In step',
      ru: 'В ногу',
    },
    general: [
      {
        en: 'The game installs as an app on phones and computers and opens without a connection. Duels, friends and cloud saves need the internet.',
        ru: 'Игру можно установить как приложение на телефон и компьютер, она открывается без интернета. Дуэлям, друзьям и облачным сохранениям нужна сеть.',
      },
      {
        en: 'Duels run on one clock for both players: a battle plays at **×2** on both sides and planning ends at the same moment.',
        ru: 'Дуэли идут по одним часам у обоих игроков: бой играется на **×2** у обоих, подготовка заканчивается в один момент.',
      },
      {
        en: 'Duels: **10** s to read the round results are added to the planning time.',
        ru: 'Дуэли: к времени подготовки добавлено **10** с на итоги раунда.',
      },
    ],
    heroes: [
      {
        id: 'packLeader',
        changes: [],
        abilities: [
          {
            kind: 'ability',
            id: 'leap',
            badge: 'nerfed',
            changes: [
              {
                en: 'Jump range: **320** → **200**',
                ru: 'Дальность прыжка: **320** → **200**',
              },
            ],
          },
        ],
      },
    ],
    interface: [
      {
        en: 'Healing: the battle meter switches between damage and healing, and the round results show both.',
        ru: 'Лечение: в панели боя можно переключиться между уроном и лечением, в итогах раунда видно и то и другое.',
      },
      {
        en: 'The profile shows your friends in place of favourite synergies: who is online, requests, chat and duels in one click.',
        ru: 'В профиле вместо любимых связок — друзья: кто в сети, заявки, чат и дуэль в один клик.',
      },
      {
        en: 'When a new version is out, the game offers an Update button and never reloads on its own.',
        ru: 'Когда выходит новая версия, игра предлагает кнопку «Обновить» и сама не перезагружается.',
      },
    ],
    fixes: [
      {
        en: 'Duels no longer drift apart when one player lags, switches tabs or opens the menu.',
        ru: 'Дуэль больше не расходится, если у одного из игроков лагает, вкладка свёрнута или открыто меню.',
      },
      {
        en: 'Heroes back from a gank, a chase or defending the base return to their lane instead of freezing between towers.',
        ru: 'Герои, вернувшиеся с ганка, погони или защиты базы, идут обратно на линию, а не замирают между вышками.',
      },
    ],
  },
  {
    version: '7.0',
    date: '2026-09-28',
    title: {
      en: 'Play online',
      ru: 'Игра по сети',
    },
    general: [
      {
        en: 'Duels with friends: challenge a friend who is online, plan at the same time, fight the same battles. Each player sees the match from their own base.',
        ru: 'Дуэли с друзьями: вызови друга в сети, планируйте одновременно, бои у вас одни и те же. Каждый видит матч со своей базы.',
      },
      {
        en: 'Duels: **60** s to plan, the clock never pauses. Duels do not change the rating.',
        ru: 'Дуэли: **60** с на подготовку, таймер не ставится на паузу. Дуэли не меняют рейтинг.',
      },
      {
        en: 'A duelist silent for **3** min loses; the other can claim the win.',
        ru: 'Кто молчит **3** мин, проигрывает: соперник может забрать победу.',
      },
    ],
    interface: [
      {
        en: 'Friends: add by friend code, see who is online. Needs an email or Google account.',
        ru: 'Друзья: добавление по коду друга, кто сейчас в сети. Нужен вход по почте или через Google.',
      },
      {
        en: 'Chat with friends.',
        ru: 'Чат с друзьями.',
      },
      {
        en: 'Block: removes the friend and the conversation; they cannot write or add you again.',
        ru: 'Блокировка: убирает из друзей и стирает переписку, игрок больше не сможет писать и добавлять тебя.',
      },
      {
        en: 'A duel survives a page reload: pick it up again from the start screen.',
        ru: 'Дуэль переживает перезагрузку страницы: вернуться можно со стартового экрана.',
      },
    ],
    fixes: [
      {
        en: 'Battles play out the same in every browser.',
        ru: 'Бои проходят одинаково в любом браузере.',
      },
    ],
  },
  {
    version: '6.1.1',
    date: '2026-09-28',
    title: {
      en: 'Profile fix',
      ru: 'Исправление профиля',
    },
    fixes: [
      {
        en: 'The profile no longer breaks a minute after a cloud save.',
        ru: 'Профиль больше не ломается через минуту после облачного сохранения.',
      },
    ],
  },
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
        en: 'Progress is saved on the device first and reaches the cloud once the connection is back.',
        ru: 'Прогресс сначала сохраняется на устройстве и уходит в облако, когда связь вернётся.',
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
        en: 'Every rank but the last has **5** stars, and each star takes **40 MMR**. Shotcaller has no stars: it is the top.',
        ru: 'У каждого ранга, кроме последнего, по **5** звёзд, и каждая звезда стоит **40 MMR**. У Шотколлера звёзд нет, это вершина.',
      },
      {
        en: 'A win gives **+25 MMR**, or **+30 MMR** when you break the enemy throne before the round limit. A loss takes **20 MMR**, a draw changes nothing.',
        ru: 'Победа даёт **+25 MMR**, а если сломать трон соперника до лимита раундов — **+30 MMR**. Поражение отнимает **20 MMR**, ничья ничего не меняет.',
      },
      {
        en: 'On the **Relaxed** difficulty, without the planning timer, rating gains are **20%** smaller: **+20 MMR** and **+24 MMR**. Losses stay the same.',
        ru: 'На сложности **Спокойная**, без таймера подготовки, прирост рейтинга на **20%** меньше: **+20 MMR** и **+24 MMR**. Потери те же.',
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
        en: 'Start screen: **New match** has a new icon, and the Settings button is gone. Language and difficulty are picked in the New match dialog.',
        ru: 'Стартовый экран: у **Нового матча** новая иконка, а кнопки настроек больше нет. Язык и сложность выбираются в окне нового матча.',
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

/** How many earlier releases the latest patch sums up. */
const SUMMED_RELEASES = 3

const isRelease = (patch: PatchNote) => patch.version.split('.').length === 2

/** Releases before the latest patch, newest first; fixes on top of a release are left out. */
const EARLIER_RELEASES = PATCH_NOTES.slice(1).filter(isRelease)

const titlesIn = (locale: Locale) =>
  EARLIER_RELEASES.slice(0, SUMMED_RELEASES)
    .map((patch) => patch.title[locale])
    .join(' · ')

/** What the last few releases brought, by their titles. */
export const EARLIER_SUMMARY: NoteText = {
  ru: titlesIn('ru'),
  en: titlesIn('en'),
}

/** How long after its release date a patch is advertised as new. */
const FRESH_FOR_MS = 3 * 24 * 60 * 60 * 1000

export const isFresh = (patch: PatchNote, now = Date.now()) => now - Date.parse(patch.date) < FRESH_FOR_MS

/** The release a fix builds on, like 8.5 for 8.5.1; null for a release itself. */
export const releaseOf = (patch: PatchNote) =>
  isRelease(patch)
    ? null
    : (PATCH_NOTES.find((release) => isRelease(release) && patch.version.startsWith(`${release.version}.`)) ??
      null)

export const findPatch = (version: string | null | undefined) =>
  PATCH_NOTES.find((patch) => patch.version === version)

const versionParts = (version: string) => {
  const parts = version.split('.')
  if (parts.some((part) => !/^\d+$/.test(part))) {
    return null
  }

  return parts.map(Number)
}

/** True when `version` sorts after `baseline`, so a stale client can tell a link is newer than anything it has. */
export function isNewerVersion(version: string, baseline: string) {
  const next = versionParts(version)
  const current = versionParts(baseline)
  if (!next || !current) {
    return false
  }

  const length = Math.max(next.length, current.length)
  for (let index = 0; index < length; index += 1) {
    const delta = (next[index] ?? 0) - (current[index] ?? 0)
    if (delta !== 0) {
      return delta > 0
    }
  }

  return false
}
