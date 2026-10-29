import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — my profile account settings load only. No save.
 */
test.describe('My Profile Account - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.myProfile] }, () => {
  test('TC-PROFILE-SMOKE-003: Account settings email is read-only; language and timezone are present', async ({
    myProfilePage,
  }) => {
    await myProfilePage.gotoAccount();

    await expect(myProfilePage.field('email')).toBeDisabled();
    await expect(myProfilePage.page.getByText('Email cannot be changed')).toBeVisible();
    await expect(myProfilePage.field('mobileNo')).toBeVisible();
    await expect(myProfilePage.field('phoneNo')).toBeVisible();
    await expect(myProfilePage.selectRoot('languageCode')).toHaveClass(/p-select-sm/);
    await expect(myProfilePage.selectRoot('timeZone')).toHaveClass(/p-select-sm/);
    await myProfilePage.expectSaveDisabled();
  });
});
