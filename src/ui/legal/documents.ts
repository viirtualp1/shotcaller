export interface LegalText {
  readonly en: string
  readonly ru: string
}

export interface LegalSection {
  readonly title: LegalText
  readonly paragraphs?: readonly LegalText[]
  readonly items?: readonly LegalText[]
  /** A closing paragraph after the list. */
  readonly after?: readonly LegalText[]
}

export interface LegalDocument {
  readonly id: LegalId
  readonly title: LegalText
  readonly summary: LegalText
  readonly sections: readonly LegalSection[]
}

export const LEGAL_IDS = ['terms', 'privacy'] as const
export type LegalId = (typeof LEGAL_IDS)[number]

/** The date both documents last changed; update it with any change to their text. */
export const LEGAL_UPDATED = '2026-10-04'

/** The address for privacy and legal requests. Until it is set, requests go through the in-game form. */
export const LEGAL_EMAIL: string | null = 'shotcaller.team@gmail.com'

export const legalPath = (id: LegalId) => `/${id}`

/** The game is run by one person, who is also the controller of players' personal data. */
const OPERATOR: LegalText = {
  en: 'Nikita Zinin',
  ru: 'Никита Зинин',
}

const contact: LegalSection = {
  title: {
    en: 'Contact',
    ru: 'Контакты',
  },
  paragraphs: [
    LEGAL_EMAIL
      ? {
          en: `For questions about these documents or your data, write to ${LEGAL_EMAIL}.`,
          ru: `По вопросам об этих документах и твоих данных пиши на ${LEGAL_EMAIL}.`,
        }
      : {
          en: 'For questions about these documents or your data, use “Feedback & support” on the main screen of the game.',
          ru: 'По вопросам об этих документах и твоих данных пиши через «Обратная связь» на главном экране игры.',
        },
  ],
}

const terms: LegalDocument = {
  id: 'terms',
  title: {
    en: 'Terms of Service',
    ru: 'Условия использования',
  },
  summary: {
    en: 'The rules for playing The Shotcaller: accounts, fair play, content and liability.',
    ru: 'Правила игры в The Shotcaller: аккаунты, честная игра, контент и ответственность.',
  },
  sections: [
    {
      title: {
        en: 'Agreement',
        ru: 'Соглашение',
      },
      paragraphs: [
        {
          en: `These Terms apply to The Shotcaller at theshotcaller.online and as a Discord Activity, run by ${OPERATOR.en}, an individual developer. By playing, you agree to them. If you do not agree, do not use the game.`,
          ru: `Эти условия действуют для The Shotcaller на theshotcaller.online и в виде активности Discord. Игру ведёт частный разработчик ${OPERATOR.ru}. Играя, ты принимаешь эти условия. Если ты с ними не согласен, не пользуйся игрой.`,
        },
      ],
    },
    {
      title: {
        en: 'Who can play',
        ru: 'Кто может играть',
      },
      paragraphs: [
        {
          en: 'You must be at least 16 years old. If you play through Discord, sign in with Google or use another platform, its own terms apply as well.',
          ru: 'Тебе должно быть не меньше 16 лет. Если ты играешь через Discord, входишь через Google или пользуешься другой платформой, действуют и её условия.',
        },
      ],
    },
    {
      title: {
        en: 'The game',
        ru: 'Игра',
      },
      paragraphs: [
        {
          en: 'The game is free. Progress, ratings, levels and rewards have no monetary value and cannot be sold or exchanged.',
          ru: 'Игра бесплатна. Прогресс, рейтинг, уровни и награды не имеют денежной ценности, их нельзя продать или обменять.',
        },
        {
          en: 'We may change, rebalance, reset or discontinue features, modes, ratings or the game itself, for example to fix errors or keep matches fair.',
          ru: 'Мы можем менять, перебалансировать, сбрасывать или закрывать функции, режимы, рейтинги и саму игру, например чтобы исправить ошибки или сохранить честность матчей.',
        },
      ],
    },
    {
      title: {
        en: 'Accounts',
        ru: 'Аккаунты',
      },
      paragraphs: [
        {
          en: 'You can play as a guest or register with an email code or Google. Keep access to your email or Google account secure: you are responsible for activity on your account. You can delete a registered account at any time in your profile.',
          ru: 'Можно играть гостем или зарегистрироваться по коду из письма или через Google. Береги доступ к почте или аккаунту Google: ты отвечаешь за действия в своём аккаунте. Зарегистрированный аккаунт можно удалить в профиле в любой момент.',
        },
      ],
    },
    {
      title: {
        en: 'Fair play and conduct',
        ru: 'Честная игра и поведение',
      },
      paragraphs: [
        {
          en: 'You agree not to:',
          ru: 'Ты обязуешься не:',
        },
      ],
      items: [
        {
          en: 'cheat, exploit bugs, automate play, or modify the game or its network traffic to gain an advantage or report false results;',
          ru: 'жульничать, использовать ошибки, автоматизировать игру и не изменять игру или её сетевой трафик ради преимущества или ложных результатов;',
        },
        {
          en: 'manipulate ratings, for example by colluding, boosting or using several accounts;',
          ru: 'накручивать рейтинг, например через сговор, бустинг или несколько аккаунтов;',
        },
        {
          en: 'harass, threaten or abuse other players, or post hateful, sexual, illegal or misleading content in nicknames, chat or support requests;',
          ru: 'преследовать, оскорблять и запугивать других игроков, публиковать ненавистнический, сексуальный, незаконный или вводящий в заблуждение контент в никах, чате и обращениях;',
        },
        {
          en: 'impersonate others or misuse other players’ data;',
          ru: 'выдавать себя за других и злоупотреблять данными других игроков;',
        },
        {
          en: 'disrupt or overload the game, or attempt unauthorised access to it or its servers.',
          ru: 'нарушать работу игры, перегружать её и пытаться получить несанкционированный доступ к ней или её серверам.',
        },
      ],
      after: [
        {
          en: 'Report bugs and exploits through “Feedback & support” instead of using them.',
          ru: 'Об ошибках и уязвимостях сообщай через «Обратную связь», а не пользуйся ими.',
        },
      ],
    },
    {
      title: {
        en: 'Enforcement',
        ru: 'Меры при нарушениях',
      },
      paragraphs: [
        {
          en: 'If you break these Terms, we may remove content, correct ratings and results, restrict online features, or suspend or delete the account. Where reasonable, we will explain why, and you can contact us if you think a decision was wrong.',
          ru: 'При нарушении условий мы можем удалить контент, исправить рейтинг и результаты, ограничить онлайн-функции, заблокировать или удалить аккаунт. Когда это уместно, мы объясним причину. Если считаешь решение ошибочным, напиши нам.',
        },
      ],
    },
    {
      title: {
        en: 'Your content',
        ru: 'Твой контент',
      },
      paragraphs: [
        {
          en: 'You keep your rights to your nickname, messages and feedback, and you allow us to store and show them as needed to run the game. We may use ideas from feedback to improve the game without any obligation to you.',
          ru: 'Права на ник, сообщения и отзывы остаются за тобой. Ты разрешаешь нам хранить и показывать их в той мере, в какой это нужно для работы игры. Идеи из отзывов мы можем использовать для улучшения игры без каких-либо обязательств перед тобой.',
        },
      ],
    },
    {
      title: {
        en: 'Intellectual property',
        ru: 'Интеллектуальная собственность',
      },
      paragraphs: [
        {
          en: `The game, its code, artwork, names and music belong to ${OPERATOR.en} or his licensors. You may play, share links and post screenshots or videos for non-commercial purposes. Do not copy, redistribute or sell the game or its assets.`,
          ru: `Игра, её код, графика, названия и музыка принадлежат ${OPERATOR.ru} или его лицензиарам. Можно играть, делиться ссылками и публиковать скриншоты и видео в некоммерческих целях. Нельзя копировать, распространять или продавать игру и её материалы.`,
        },
        {
          en: 'The game uses open-source software, fonts and sounds under their own licenses. They are listed at theshotcaller.online/third-party-notices.txt and theshotcaller.online/audio/CREDITS.md.',
          ru: 'Игра использует открытое ПО, шрифты и звуки на условиях их собственных лицензий. Они перечислены на theshotcaller.online/third-party-notices.txt и theshotcaller.online/audio/CREDITS.md.',
        },
      ],
    },
    {
      title: {
        en: 'Availability and liability',
        ru: 'Доступность и ответственность',
      },
      paragraphs: [
        {
          en: 'The game is provided as is and as available. We do not guarantee that it will be uninterrupted or error-free, or that progress will never be lost. To the extent the law allows, we are not liable for indirect losses or lost game progress.',
          ru: 'Игра предоставляется «как есть» и «по мере доступности». Мы не гарантируем, что она будет работать без перерывов и ошибок или что прогресс никогда не потеряется. В пределах, допустимых законом, мы не отвечаем за косвенные убытки и потерю игрового прогресса.',
        },
        {
          en: 'Nothing in these Terms limits liability that cannot be limited by law, or your rights as a consumer under the law of the country where you live.',
          ru: 'Ничто в этих условиях не ограничивает ответственность, которую нельзя ограничить по закону, и твои права потребителя по закону страны, где ты живёшь.',
        },
      ],
    },
    {
      title: {
        en: 'Privacy',
        ru: 'Конфиденциальность',
      },
      paragraphs: [
        {
          en: 'The Privacy Policy explains which personal data the game processes and how you can control it.',
          ru: 'Политика конфиденциальности объясняет, какие персональные данные обрабатывает игра и как ими управлять.',
        },
      ],
    },
    {
      title: {
        en: 'Changes',
        ru: 'Изменения',
      },
      paragraphs: [
        {
          en: 'We may update these Terms. We will change the date above and announce significant changes in the game. If you keep playing after a change takes effect, the updated Terms apply.',
          ru: 'Мы можем обновлять эти условия. Мы изменим дату выше и сообщим о существенных изменениях в игре. Если ты продолжаешь играть после вступления изменений в силу, действуют обновлённые условия.',
        },
      ],
    },
    contact,
  ],
}

const privacy: LegalDocument = {
  id: 'privacy',
  title: {
    en: 'Privacy Policy',
    ru: 'Политика конфиденциальности',
  },
  summary: {
    en: 'What data The Shotcaller collects, why, who processes it, how long it is kept and how to delete it.',
    ru: 'Какие данные собирает The Shotcaller, зачем, кто их обрабатывает, сколько они хранятся и как их удалить.',
  },
  sections: [
    {
      title: {
        en: 'Who we are',
        ru: 'Кто мы',
      },
      paragraphs: [
        {
          en: `The Shotcaller is a free browser game at theshotcaller.online, also available as a Discord Activity. ${OPERATOR.en}, an individual developer, runs it and is the controller of the personal data described here. Contact details are at the end of this policy.`,
          ru: `The Shotcaller — бесплатная браузерная игра на theshotcaller.online, также доступная как активность Discord. Игру ведёт частный разработчик ${OPERATOR.ru}, он же является оператором описанных здесь персональных данных. Контакты указаны в конце политики.`,
        },
      ],
    },
    {
      title: {
        en: 'Playing without an account',
        ru: 'Игра без аккаунта',
      },
      paragraphs: [
        {
          en: 'You can play without signing up. Your profile, progress, settings and saved games stay in your browser’s local storage on your device. We do not receive them unless you use cloud features. The game sets no advertising or tracking cookies.',
          ru: 'Играть можно без регистрации. Профиль, прогресс, настройки и сохранения хранятся в локальном хранилище браузера на твоём устройстве. Мы их не получаем, пока ты не пользуешься облачными функциями. Игра не ставит рекламных и отслеживающих cookie.',
        },
      ],
    },
    {
      title: {
        en: 'Accounts and cloud features',
        ru: 'Аккаунты и облачные функции',
      },
      paragraphs: [
        {
          en: 'Cloud saves, friends, chat, duels and the leaderboard need an account. A guest account is created the first time progress is saved to the cloud; you can register with an email code or Google. We then process:',
          ru: 'Облачные сохранения, друзья, чат, дуэли и таблица лидеров требуют аккаунта. Гостевой аккаунт создаётся при первом сохранении прогресса в облако; зарегистрироваться можно по коду из письма или через Google. Тогда мы обрабатываем:',
        },
      ],
      items: [
        {
          en: 'account data: email address, sign-in method and, with Google, the name and profile photo Google provides;',
          ru: 'данные аккаунта: адрес почты, способ входа, а при входе через Google — имя и фото профиля, которые передаёт Google;',
        },
        {
          en: 'game data: nickname, avatar, profile progress, ratings, match history and online duel results, including the boards exchanged during a duel;',
          ru: 'игровые данные: ник, аватар, прогресс профиля, рейтинг, историю матчей и результаты онлайн-дуэлей, включая расстановки, которыми обмениваются в дуэли;',
        },
        {
          en: 'social data: friend codes, friend requests, friendships, blocks, chat messages, online status and the match a friend can watch;',
          ru: 'социальные данные: коды друзей, заявки, список друзей, блокировки, сообщения чата, онлайн-статус и матч, который может смотреть друг;',
        },
        {
          en: 'technical data: identifiers and timestamps that keep sessions, saves and matches consistent.',
          ru: 'технические данные: идентификаторы и отметки времени для согласованности сессий, сохранений и матчей.',
        },
      ],
      after: [
        {
          en: 'Your nickname, avatar or photo and rating are shown on the public leaderboard and to players you meet or add as friends.',
          ru: 'Ник, аватар или фото и рейтинг видны в публичной таблице лидеров и игрокам, с которыми ты играешь или дружишь.',
        },
      ],
    },
    {
      title: {
        en: 'Support requests',
        ru: 'Обращения в поддержку',
      },
      paragraphs: [
        {
          en: 'When you send feedback, we receive its category, subject and message, the reply email if you give one, your account or guest identifier, language and game version. Requests are stored in our database and forwarded to our support Telegram chat so they are answered quickly.',
          ru: 'Когда ты отправляешь обращение, мы получаем категорию, тему и текст, адрес для ответа, если ты его указал, идентификатор аккаунта или гостя, язык и версию игры. Обращения хранятся в нашей базе данных и пересылаются в наш Telegram-чат поддержки, чтобы мы быстрее отвечали.',
        },
      ],
    },
    {
      title: {
        en: 'Optional gameplay statistics',
        ru: 'Необязательная игровая статистика',
      },
      paragraphs: [
        {
          en: 'Only with your consent, finished matches are sent to PostHog in the US for balance analysis, under a random analytics identifier. Your name, email, account ID and messages are not included. You can withdraw consent at any time in settings or your profile; collection stops and earlier events are queued for deletion.',
          ru: 'Только с твоего согласия завершённые матчи отправляются в PostHog (США) для анализа баланса под случайным аналитическим идентификатором. Имя, почта, ID аккаунта и сообщения не передаются. Согласие можно отозвать в любой момент в настройках или профиле: сбор прекратится, а отправленные ранее события будут поставлены в очередь на удаление.',
        },
      ],
    },
    {
      title: {
        en: 'Website analytics and hosting',
        ru: 'Аналитика сайта и хостинг',
      },
      paragraphs: [
        {
          en: 'Vercel Web Analytics counts page views and Vercel Speed Insights measures loading performance. They use no cookies and do not follow you across other sites. Vercel, our hosting provider, also processes technical request data such as IP addresses to deliver and protect the site.',
          ru: 'Vercel Web Analytics считает просмотры страниц, а Vercel Speed Insights измеряет скорость загрузки. Они не используют cookie и не отслеживают тебя на других сайтах. Vercel как хостинг-провайдер также обрабатывает технические данные запросов, например IP-адреса, чтобы доставлять сайт и защищать его.',
        },
      ],
    },
    {
      title: {
        en: 'Discord',
        ru: 'Discord',
      },
      paragraphs: [
        {
          en: 'If you play the game as a Discord Activity, Discord provides the frame and handles your Discord account under its own privacy policy. The game does not currently receive your Discord profile.',
          ru: 'Если ты играешь в активности Discord, Discord предоставляет окно игры и обрабатывает твой аккаунт по своей политике конфиденциальности. Игра сейчас не получает твой профиль Discord.',
        },
      ],
    },
    {
      title: {
        en: 'Why we process data',
        ru: 'Основания обработки',
      },
      items: [
        {
          en: 'Contract (GDPR Art. 6(1)(b)): accounts, cloud saves, friends, chat, duels, ratings and the leaderboard you choose to use.',
          ru: 'Договор (ст. 6(1)(b) GDPR): аккаунты, облачные сохранения, друзья, чат, дуэли, рейтинг и таблица лидеров, которыми ты решил пользоваться.',
        },
        {
          en: 'Consent (Art. 6(1)(a)): optional gameplay statistics.',
          ru: 'Согласие (ст. 6(1)(a)): необязательная игровая статистика.',
        },
        {
          en: 'Legitimate interests (Art. 6(1)(f)): answering support requests, keeping the game secure and fair, preventing abuse and measuring site performance in aggregate.',
          ru: 'Законные интересы (ст. 6(1)(f)): ответы на обращения, безопасность и честность игры, предотвращение злоупотреблений и обобщённая оценка работы сайта.',
        },
        {
          en: 'Legal obligations (Art. 6(1)(c)), where the law requires us to keep or disclose data.',
          ru: 'Юридические обязанности (ст. 6(1)(c)), когда закон требует хранить или раскрывать данные.',
        },
      ],
    },
    {
      title: {
        en: 'Service providers and transfers',
        ru: 'Поставщики услуг и передача данных',
      },
      items: [
        {
          en: 'Supabase: database, sign-in and realtime services.',
          ru: 'Supabase: база данных, вход и сервисы реального времени.',
        },
        {
          en: 'Vercel: website hosting and analytics.',
          ru: 'Vercel: хостинг сайта и аналитика.',
        },
        {
          en: 'Resend: delivery of sign-in emails.',
          ru: 'Resend: доставка писем с кодом для входа.',
        },
        {
          en: 'PostHog: gameplay statistics, only with consent.',
          ru: 'PostHog: игровая статистика, только с согласия.',
        },
        {
          en: 'Telegram: delivery of support requests.',
          ru: 'Telegram: доставка обращений в поддержку.',
        },
        {
          en: 'Google: sign-in, if you choose it.',
          ru: 'Google: вход, если ты его выбрал.',
        },
        {
          en: 'Discord: the Activity frame, if you play there.',
          ru: 'Discord: окно активности, если ты играешь там.',
        },
      ],
      after: [
        {
          en: 'Some providers process data outside the European Economic Area, including in the United States. Where they do, we rely on safeguards the GDPR permits, such as the EU–US Data Privacy Framework or the European Commission’s Standard Contractual Clauses.',
          ru: 'Часть поставщиков обрабатывает данные за пределами Европейской экономической зоны, в том числе в США. В этих случаях мы опираемся на допустимые GDPR механизмы, например EU–US Data Privacy Framework или стандартные договорные условия Европейской комиссии.',
        },
      ],
    },
    {
      title: {
        en: 'How long we keep data',
        ru: 'Сроки хранения',
      },
      items: [
        {
          en: 'Account, game and social data, including chat messages: until you delete your account.',
          ru: 'Данные аккаунта, игровые и социальные данные, включая сообщения чата: до удаления аккаунта.',
        },
        {
          en: 'Match archive summaries: 90 days. Finished duels: 30 days. Invitations, queue entries and live match snapshots: from minutes to days.',
          ru: 'Сводки архива матчей: 90 дней. Завершённые дуэли: 30 дней. Приглашения, записи очереди и снимки текущих матчей: от минут до нескольких дней.',
        },
        {
          en: 'Support requests: until they are handled and no longer needed, and always when the account is deleted.',
          ru: 'Обращения: пока они нужны для ответа, и в любом случае до удаления аккаунта.',
        },
        {
          en: 'Gameplay statistics: while consent is active, within PostHog’s retention period. Deletion is requested when you withdraw consent or delete your account.',
          ru: 'Игровая статистика: пока действует согласие, в пределах срока хранения PostHog. Удаление запрашивается при отзыве согласия или удалении аккаунта.',
        },
        {
          en: 'Data in local storage: on your device until you clear it.',
          ru: 'Данные в локальном хранилище: на твоём устройстве, пока ты их не удалишь.',
        },
      ],
    },
    {
      title: {
        en: 'Your rights',
        ru: 'Твои права',
      },
      paragraphs: [
        {
          en: 'You can access, correct or delete your data, restrict or object to its processing, receive it in a portable format, and withdraw consent at any time without affecting earlier processing.',
          ru: 'Ты можешь получить доступ к своим данным, исправить или удалить их, ограничить обработку или возразить против неё, получить данные в переносимом формате и в любой момент отозвать согласие; это не затрагивает обработку до отзыва.',
        },
        {
          en: 'Registered players can delete their account in the profile, which erases the account, progress, social data and support requests. For other requests, including removing a guest account, contact us. You can also complain to the data protection authority in your country.',
          ru: 'Зарегистрированные игроки могут удалить аккаунт в профиле: это удалит аккаунт, прогресс, социальные данные и обращения. С другими запросами, включая удаление гостевого аккаунта, обращайся к нам. Также можно подать жалобу в орган по защите данных своей страны.',
        },
      ],
    },
    {
      title: {
        en: 'Age',
        ru: 'Возраст',
      },
      paragraphs: [
        {
          en: 'The game is intended for players aged 16 and over. We do not knowingly collect data from younger children. If you believe a child has given us data, contact us and we will delete it.',
          ru: 'Игра предназначена для игроков от 16 лет. Мы сознательно не собираем данные детей младше. Если ты считаешь, что ребёнок передал нам данные, напиши нам, и мы их удалим.',
        },
      ],
    },
    {
      title: {
        en: 'Security',
        ru: 'Безопасность',
      },
      paragraphs: [
        {
          en: 'Database access rules let each player reach only their own data and what other players share with them. No method of transmission or storage is completely secure, but we work to protect your data.',
          ru: 'Правила доступа к базе данных позволяют каждому игроку получать только свои данные и то, чем с ним поделились другие игроки. Ни один способ передачи и хранения не защищён полностью, но мы стараемся беречь твои данные.',
        },
      ],
    },
    {
      title: {
        en: 'Changes',
        ru: 'Изменения',
      },
      paragraphs: [
        {
          en: 'We will update this policy when the game or our providers change, and change the date above. Significant changes will be announced in the game.',
          ru: 'Мы обновим политику, когда изменятся игра или наши поставщики, и изменим дату выше. О существенных изменениях мы сообщим в игре.',
        },
      ],
    },
    contact,
  ],
}

export const LEGAL_DOCUMENTS: Readonly<Record<LegalId, LegalDocument>> = {
  terms,
  privacy,
}

export const legalFromPath = (path: string) =>
  LEGAL_IDS.find((id) => path === legalPath(id) || path === `${legalPath(id)}/`) ?? null
