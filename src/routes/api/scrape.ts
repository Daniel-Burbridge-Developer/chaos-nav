import { json } from '@tanstack/react-start';
import { createAPIFileRoute } from '@tanstack/react-start/api';
import * as cheerio from 'cheerio'; // Keep cheerio

export const APIRoute = createAPIFileRoute('/api/scrape')({
  POST: async ({ request }) => {
    try {
      const { stopNumber } = await request.json();
      if (!stopNumber) {
        return json({ error: 'Missing stop number' }, { status: 400 });
      }

      const url = `https://136213.mobi/RealTime/RealTimeStopResults.aspx?SN=${stopNumber}`;
      console.log('Scraping:', url);

      // --- REPLACE PLAYWRIGHT CODE WITH FETCH ---
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch page: ${response.statusText}`);
      }
      const rawHtml = await response.text();
      // --- END REPLACE ---

      const $ = cheerio.load(rawHtml);
      const timetableElement = $('#pnlStopTimetable');

      if (timetableElement.length === 0) {
        throw new Error(
          '#pnlStopTimetable not found in the fetched HTML. Playwright might be needed.'
        );
      }

      const parsedData = parseTimetableHtml(timetableElement.html() || ''); // Use .html() to get the inner HTML of the element

      return json({ data: parsedData });
    } catch (err: any) {
      console.error('Scrape error:', err.message || err);
      return json(
        { error: 'Failed to scrape page or extract data: ' + err.message },
        { status: 500 }
      );
    }
  },
});

function parseTimetableHtml(html: string) {
  const $ = cheerio.load(html);
  const rows: {
    liveStatus: boolean;
    busNumber: string;
    timeUntilArrival: string;
  }[] = [];

  $('.tpm_row_timetable').each((_, el) => {
    const row = $(el);

    const liveStatus =
      row.find('.tt-livetext').text().trim().toUpperCase() === 'LIVE';

    const busNumber = row.find('span').first().text().trim();

    const timeUntilArrival = row
      .find('div')
      .filter((_, divEl) => $(divEl).text().includes('MIN'))
      .first()
      .text()
      .trim();

    rows.push({
      liveStatus,
      busNumber,
      timeUntilArrival,
    });
  });

  return rows;
}
