import type { AbilityId, HeroId, ItemId, ModeId, RoleId } from '@/content/ids'
import type { Locale } from '../i18n'

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
  /** Major updates open with these; the first one is shown large. */
  readonly features?: readonly FeatureNote[]
  readonly general?: readonly NoteText[]
  readonly items?: readonly ItemNote[]
  readonly roles?: readonly RoleNote[]
  readonly heroes?: readonly HeroNote[]
  readonly interface?: readonly NoteText[]
  readonly fixes?: readonly NoteText[]
}

export const PATCH_NOTES: readonly PatchNote[] = [
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
        en: 'Giving up a duel counts as a loss: **−20** rating. The opponent gets the win and **+25**.',
        ru: 'Сдача в дуэли — это поражение: **−20** рейтинга. Соперник получает победу и **+25**.',
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

/** Releases before the latest patch, newest first; fixes on top of a release are left out. */
const EARLIER_RELEASES = PATCH_NOTES.slice(1).filter((patch) => patch.version.split('.').length === 2)

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

export const findPatch = (version: string | null | undefined) =>
  PATCH_NOTES.find((patch) => patch.version === version)
