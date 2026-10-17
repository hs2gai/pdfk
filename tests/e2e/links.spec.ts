import { test, expect, type Page } from '@playwright/test';
import { openPdf } from './helpers';

// sample-links.pdf (5 pages): the table of contents on page 1 has five links (top to bottom):
//   explicit /Fit → page 2, explicit /XYZ → the chapter heading in the middle of page 3, named destination → page 4,
//   https://example.com/, and javascript:alert(1) (not opened)

const currentPage = (page: Page): Promise<number> =>
  page.evaluate(() => {
    const id = window.__pdf.docs.getActiveDocument().id;
    return window.__pdf.scrollCap.forDocument(id).getCurrentPage();
  });

/** Which page is at the top of the view (0-based) and how far down it, in pt */
const viewTop = (page: Page) =>
  page.evaluate(() => {
    const top = document.querySelector('.viewport')!.getBoundingClientRect().top;
    const pages = [...document.querySelectorAll('.page')].map((el) => el.getBoundingClientRect());
    const index = pages.findIndex((r) => r.top <= top + 1 && top < r.bottom);
    const pt = window.__pdf.docs.getActiveDocument().pages[0].size.width as number;
    return { index, pt: index < 0 ? 0 : Math.round((top - pages[index].top) / (pages[index].width / pt)) + 0 };
  });

/** The thumbnail scrolls a moment after the current page changes, so wait for the view itself */
const backToToc = async (page: Page) => {
  await page.locator('.thumb').first().click();
  await expect.poll(() => viewTop(page)).toEqual({ index: 0, pt: 0 });
};

/** Link areas on page 1, top to bottom */
const tocLinks = (page: Page) => page.locator('.page').first().locator('.link-area');

test('目次のリンクで本文のページへ移動する（/Fit・/XYZ・名前付き宛先）', async ({ page }) => {
  await openPdf(page, 'sample-links.pdf');
  // The javascript: link gets no click target
  await expect(tocLinks(page)).toHaveCount(4);
  await expect(tocLinks(page).first()).toHaveAttribute('title', '2 ページへ移動');

  // /Fit and named destinations: the top of the page (the 5 small pages are all in the DOM)
  await tocLinks(page).nth(0).click();
  await expect.poll(() => viewTop(page)).toEqual({ index: 1, pt: 0 });
  await backToToc(page);
  await tocLinks(page).nth(2).click();
  await expect.poll(() => viewTop(page)).toEqual({ index: 3, pt: 0 });
  await backToToc(page);

  // /XYZ: the destination (470pt down page 3) comes to the top of the view, not the page top
  await tocLinks(page).nth(1).click();
  await expect
    .poll(async () => {
      const v = await viewTop(page);
      return v.index === 2 && Math.abs(v.pt - 470) <= 3;
    })
    .toBe(true);

  // Following a link does not select it as an annotation
  await expect(page.locator('.annot-menu')).toHaveCount(0);
});

test('外部リンクは新しいタブで開く（http(s) のみ）', async ({ page }) => {
  await page.addInitScript(() => {
    const opened: string[] = [];
    (window as unknown as { __opened: string[] }).__opened = opened;
    window.open = (url?: string | URL) => {
      opened.push(String(url));
      return null;
    };
  });
  await openPdf(page, 'sample-links.pdf');
  const link = tocLinks(page).nth(3);
  await expect(link).toHaveAttribute('title', 'https://example.com/');
  await link.click();
  expect(await page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)).toEqual([
    'https://example.com/',
  ]);
  // The view stays on the table of contents
  expect(await currentPage(page)).toBe(1);
});

test('前の画面 / 次の画面で、リンクやページ番号で移動する前の位置へ行き来する', async ({ page }) => {
  await openPdf(page, 'sample-links.pdf');
  const back = page.getByRole('button', { name: '前の画面' });
  const forward = page.getByRole('button', { name: '次の画面' });
  await expect(back).toBeDisabled();
  await expect(forward).toBeDisabled();

  // Table of contents → chapter 2 (/XYZ, 470pt down page 3) → back to the contents → forward to the same spot
  await tocLinks(page).nth(1).click();
  const chapter2 = { index: 2, pt: 470 };
  await expect.poll(() => viewTop(page)).toEqual(chapter2);
  await back.click();
  await expect.poll(() => viewTop(page)).toEqual({ index: 0, pt: 0 });
  await expect(back).toBeDisabled();
  await forward.click();
  await expect.poll(() => viewTop(page)).toEqual(chapter2);
  await expect(forward).toBeDisabled();

  // The page number box is recorded too; Alt+← goes back
  const input = page.locator('.page-nav input');
  await input.fill('5');
  await input.press('Enter');
  await expect.poll(() => currentPage(page)).toBe(5);
  await page.locator('.viewport').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('Alt+ArrowLeft');
  await expect.poll(() => viewTop(page)).toEqual(chapter2);
});
