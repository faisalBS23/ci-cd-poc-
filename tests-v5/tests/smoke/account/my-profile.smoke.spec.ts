import { test, expect } from '../../../fixtures';
import { TAGS } from '../../../configs/playwright.v5.tags';

/**
 * Smoke — my profile personal form load only. No save.
 */
test.describe('My Profile - Smoke Tests', { tag: [TAGS.smoke, TAGS.v5, TAGS.myProfile] }, () => {
  test('TC-PROFILE-SMOKE-002: Personal form shows name, country, date, gender, and marital', async ({
    myProfilePage,
  }) => {
    await myProfilePage.gotoPersonal();

    await expect(myProfilePage.field('firstName')).toBeVisible();
    await expect(myProfilePage.field('lastName')).toBeVisible();
    await expect(myProfilePage.field('firstName')).not.toHaveValue('');
    await expect(myProfilePage.selectRoot('countryId')).toBeVisible();
    await expect(myProfilePage.selectRoot('gender')).toBeVisible();
    await expect(myProfilePage.selectRoot('marital')).toBeVisible();
    await expect(myProfilePage.field('dateOfBirth')).toBeVisible();
    await myProfilePage.expectSaveDisabled();
  });
});
