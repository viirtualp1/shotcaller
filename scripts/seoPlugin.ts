import type { Plugin } from 'vite'
import { LEGAL_DOCUMENTS, LEGAL_IDS, LEGAL_UPDATED, legalPath } from '../src/ui/legal/documents.ts'
import type { LegalDocument } from '../src/ui/legal/documents.ts'
import { PATCH_NOTES } from '../src/ui/patchNotes/notes.ts'
import type { NoteText, PatchNote } from '../src/ui/patchNotes/notes.ts'
import {
  APP_PAGE_PATHS,
  HOME_DESCRIPTION,
  pageFiles,
  patchPath,
  patchSnippet,
  patchTitle,
  SITE_NAME,
  SITE_ORIGIN,
} from '../src/ui/seo.ts'

export const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')

const textLine = (text: NoteText) => `<p>${escapeHtml(text.en.replaceAll('**', ''))}</p>`

/** Real article content is delivered before JavaScript runs, including on link previews. */
export function patchArticle(patch: PatchNote) {
  const sections: string[] = []
  const section = (name: string, content: string) => {
    if (content) {
      sections.push(`<section><h2>${escapeHtml(name)}</h2>${content}</section>`)
    }
  }

  section(
    'Highlights',
    (patch.features ?? [])
      .map((feature) => `<h3>${escapeHtml(feature.title.en)}</h3>${textLine(feature.text)}`)
      .join(''),
  )

  section('General', (patch.general ?? []).map(textLine).join(''))

  for (const [name, entries] of [
    ['Items', patch.items],
    ['Roles', patch.roles],
    ['Heroes', patch.heroes],
  ] as const) {
    section(
      name,
      (entries ?? [])
        .map((entry) => {
          const abilities =
            'abilities' in entry ? (entry.abilities ?? []).flatMap((ability) => ability.changes) : []

          return `<h3>${escapeHtml(entry.id.replace(/([a-z])([A-Z])/g, '$1 $2'))}</h3>${[...entry.changes, ...abilities].map(textLine).join('')}`
        })
        .join(''),
    )
  }

  section('Interface', (patch.interface ?? []).map(textLine).join(''))
  section('Fixes', (patch.fixes ?? []).map(textLine).join(''))
  const index = PATCH_NOTES.indexOf(patch)
  const neighbours = [PATCH_NOTES[index - 1], PATCH_NOTES[index + 1]].filter((entry) => entry !== undefined)

  const navigation = neighbours
    .map((entry) => `<a href="${patchPath(entry.version)}">Patch ${escapeHtml(entry.version)}</a>`)
    .join(' · ')

  return `<main><article><h1>Patch ${escapeHtml(patch.version)} — ${escapeHtml(patch.title.en)}</h1><time datetime="${patch.date}">${patch.date}</time>${sections.join('')}</article><nav>${navigation}</nav><p><a href="/">Play ${SITE_NAME}</a></p></main>`
}

/** The full English text, so the documents read without JavaScript and in link previews. */
export function legalArticle(document: LegalDocument) {
  const paragraphs = (texts: LegalDocument['sections'][number]['paragraphs']) =>
    (texts ?? []).map((text) => `<p>${escapeHtml(text.en)}</p>`).join('')

  const sections = document.sections
    .map((section) => {
      const items = section.items
        ? `<ul>${section.items.map((item) => `<li>${escapeHtml(item.en)}</li>`).join('')}</ul>`
        : ''

      return `<section><h2>${escapeHtml(section.title.en)}</h2>${paragraphs(section.paragraphs)}${items}${paragraphs(section.after)}</section>`
    })
    .join('')

  const others = LEGAL_IDS.filter((id) => id !== document.id)
    .map((id) => `<a href="${legalPath(id)}">${escapeHtml(LEGAL_DOCUMENTS[id].title.en)}</a>`)
    .join(' · ')

  return `<main><article><h1>${escapeHtml(document.title.en)}</h1><p>${escapeHtml(document.summary.en)}</p><p>Last updated <time datetime="${LEGAL_UPDATED}">${LEGAL_UPDATED}</time></p>${sections}</article><nav>${others}</nav><p><a href="/">Play ${SITE_NAME}</a></p></main>`
}

function pageHtml(home: string, path: string, title: string, description: string, article: string) {
  const url = `${SITE_ORIGIN}${path}`
  return home
    .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
    .replace(/(<meta name="description" content=")[^"]*/, `$1${description}`)
    .replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`)
    .replace(/(<meta property="og:description" content=")[^"]*/, `$1${description}`)
    .replace(/(<meta property="og:url" content=")[^"]*/, `$1${url}`)
    .replace(/(<link rel="canonical" href=")[^"]*/, `$1${url}`)
    .replace(/<div id="app">[\s\S]*?<\/div>/, `<div id="app">${article}</div>`)
}

const patchHtml = (home: string, patch: PatchNote) =>
  pageHtml(
    home,
    patchPath(patch.version),
    escapeHtml(patchTitle(patch, 'en')),
    escapeHtml(patchSnippet(patch, 'en')),
    patchArticle(patch),
  )

const legalHtml = (home: string, document: LegalDocument) =>
  pageHtml(
    home,
    legalPath(document.id),
    escapeHtml(`${document.title.en} · ${SITE_NAME}`),
    escapeHtml(document.summary.en),
    legalArticle(document),
  )

/** Works on static hosting, with no server rewrites or crawler-specific responses. */
export function seoPlugin(): Plugin {
  return {
    name: 'shotcaller-public-pages',
    transformIndexHtml(html) {
      const latest = PATCH_NOTES[0]!
      const content = `<main><h1>${SITE_NAME}</h1><p>${HOME_DESCRIPTION.en}</p><p><a href="${patchPath(latest.version)}">Read the latest patch notes</a></p></main>`
      return html.replace('<div id="app"></div>', `<div id="app">${content}</div>`)
    },
    generateBundle: {
      order: 'post',
      handler(_options, bundle) {
        const home = bundle['index.html']
        if (!home || home.type !== 'asset' || typeof home.source !== 'string') {
          throw new Error('Missing home HTML for SEO pages')
        }

        for (const patch of PATCH_NOTES) {
          for (const fileName of pageFiles(patchPath(patch.version))) {
            this.emitFile({
              type: 'asset',
              fileName,
              source: patchHtml(home.source, patch),
            })
          }
        }

        for (const id of LEGAL_IDS) {
          for (const fileName of pageFiles(legalPath(id))) {
            this.emitFile({
              type: 'asset',
              fileName,
              source: legalHtml(home.source, LEGAL_DOCUMENTS[id]),
            })
          }
        }

        for (const fileName of APP_PAGE_PATHS.flatMap(pageFiles)) {
          this.emitFile({
            type: 'asset',
            fileName,
            source: home.source,
          })
        }

        const entries = [
          {
            path: '/',
            date: PATCH_NOTES[0]!.date,
          },
          ...PATCH_NOTES.map((patch) => ({
            path: patchPath(patch.version),
            date: patch.date,
          })),
          ...LEGAL_IDS.map((id) => ({
            path: legalPath(id),
            date: LEGAL_UPDATED,
          })),
        ]

        const urls = entries
          .map(({ path, date }) => `<url><loc>${SITE_ORIGIN}${path}</loc><lastmod>${date}</lastmod></url>`)
          .join('')

        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,
        })
      },
    },
  }
}
