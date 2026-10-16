import { browser, $, expect } from '@wdio/globals';

export async function findThread(title: string) {
  await browser.keys(['Meta', 'k']);
  const search = $('[aria-label="Search command palette"]');
  await expect(search).toBeDisplayed();
  await search.setValue(title);
  const entry = $(`//button[@data-kind="thread"][.//strong[text()=${JSON.stringify(title)}]]`);
  await expect(entry).toBeDisplayed();
  return entry;
}

export async function openThread(title: string) {
  await (await findThread(title)).click();
  await expect($('.command-palette[open]')).not.toExist();
  await expect($('.agent-header')).toHaveText(expect.stringContaining(title));
}
