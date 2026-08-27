import { defineBackground } from 'wxt/utils/define-background';
import { browser } from 'wxt/browser';

export default defineBackground(() => {
  // No popup is defined, so clicking the toolbar icon opens the workbench directly.
  browser.action.onClicked.addListener(() => {
    void browser.runtime.openOptionsPage();
  });
});
