import { describe, expect, it } from 'vitest'
import { legalArticle } from '../../scripts/seoPlugin'
import { LEGAL_DOCUMENTS, LEGAL_IDS, legalFromPath, type LegalText } from '@/ui/legal/documents'

describe('legal documents', () => {
  it('open at their own paths', () => {
    expect(legalFromPath('/terms')).toBe('terms')
    expect(legalFromPath('/privacy/')).toBe('privacy')
    expect(legalFromPath('/patches/8.8')).toBeNull()
  })

  it('are written in both languages', () => {
    for (const id of LEGAL_IDS) {
      const document = LEGAL_DOCUMENTS[id]

      const texts: LegalText[] = [
        document.title,
        document.summary,
        ...document.sections.flatMap((section) => [
          section.title,
          ...(section.paragraphs ?? []),
          ...(section.items ?? []),
          ...(section.after ?? []),
        ]),
      ]

      for (const text of texts) {
        expect(text.en.trim()).not.toBe('')
        expect(text.ru.trim()).not.toBe('')
      }
    }
  })

  it('deliver the full text and a link to the other document before JavaScript', () => {
    const html = legalArticle(LEGAL_DOCUMENTS.privacy)

    expect(html).toContain('<h1>Privacy Policy</h1>')
    expect(html).toContain('Optional gameplay statistics')
    expect(html).toContain('<a href="/terms">Terms of Service</a>')
  })

  it('explain account deletion on a page of its own, readable without the game', () => {
    expect(legalFromPath('/delete-account')).toBe('delete-account')

    const html = legalArticle(LEGAL_DOCUMENTS['delete-account'])

    expect(html).toContain('<h1>Delete your account</h1>')
    expect(html).toContain('shotcaller.team@gmail.com')
    expect(html).toContain('<a href="/privacy">Privacy Policy</a>')
  })
})
