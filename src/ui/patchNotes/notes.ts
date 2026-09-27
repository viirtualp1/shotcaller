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
  readonly version: string
  /** ISO date, `YYYY-MM-DD`. */
  readonly date: string
  readonly title: NoteText
  readonly summary: NoteText
  readonly general?: readonly NoteText[]
  readonly items?: readonly ItemNote[]
  readonly roles?: readonly RoleNote[]
  readonly heroes?: readonly HeroNote[]
  readonly interface?: readonly NoteText[]
}

export const PATCH_NOTES: readonly PatchNote[] = [
  {
    version: '4.0',
    date: '2026-09-27',
    title: {
      en: 'Coach profile',
      ru: 'Профиль тренера',
    },
    summary: {
      en: 'Every finished match now counts: climb seven ranks, level up your coach and look back at your heroes, synergies and recent games.',
      ru: 'Теперь каждый доигранный матч идёт в зачёт: поднимайся по семи рангам, качай уровень тренера и смотри, какие герои, связки и матчи у тебя были.',
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
    summary: {
      en: 'Chance-based effects arrive, and they roll the way Dota rolls them: crits in a row and long waits for a bash are now much rarer.',
      ru: 'В игре появились эффекты с шансом, и работают они как в доте: криты подряд и долгое ожидание оглушения теперь случаются намного реже.',
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
    summary: {
      en: 'An interface overhaul: the whole match reads at a glance, and after it you can dig into the numbers.',
      ru: 'Обновление интерфейса: весь матч читается с одного взгляда, а после него можно разобрать цифры.',
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

export const findPatch = (version: string | null | undefined) =>
  PATCH_NOTES.find((patch) => patch.version === version)
