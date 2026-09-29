// /app/ajustes (WP-15b slim, F1/F2/F3): la ägaren ändra sitt företag efter onboarding.
// Inloggning krävs redan av src/app/(app)/layout.tsx. Ägare utan företag → /app/onboarding
// (samma mönster som /app/inicio). WP-40 lägger till kategorier och bokningsformuläret
// (D-031): `loadBookingFormBundleAction` läser vid sidladdning, resten är server actions.
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AjustesScreen } from "@/components/settings/ajustes-screen";
import { nav } from "@/i18n";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";
import { loadAjustesData } from "@/server/owner/ajustes";
import { loadProfileSettings } from "@/server/owner/profile";

import {
  createServiceAction,
  createStaffAction,
  setServiceActiveAction,
  setStaffActiveAction,
  updateBusinessSettingsAction,
  updateHoursAction,
  updateServiceAction,
  updateStaffAction,
} from "./actions";
import {
  activatePresetAction,
  createCategoryAction,
  createQuestionAction,
  deleteCategoryAction,
  deleteQuestionAction,
  getQuestionsForServiceAction,
  loadBookingFormBundleAction,
  renameCategoryAction,
  reorderCategoriesAction,
  reorderQuestionsAction,
  setQuestionActiveAction,
  setQuestionTargetsAction,
  setServiceCategoryAction,
  updateQuestionAction,
} from "./booking-form-actions";
import {
  confirmImageUploadAction,
  createImageUploadAction,
  deleteImageAction,
  reorderImagesAction,
  updateBusinessProfileAction,
  updateStaffTitleAction,
} from "./profile-actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadBookingFormBundle() {
  "use server";
  const result = await loadBookingFormBundleAction();
  return result.ok ? result.data : null;
}

export default async function AjustesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const business = await getOwnerBusiness(user.id);
  if (!business) redirect("/app/onboarding");

  const data = await loadAjustesData(user.id, business.id);
  const profile = await loadProfileSettings(user.id, business.id);
  const bundleResult = await loadBookingFormBundleAction();
  const bookingForm = bundleResult.ok
    ? bundleResult.data
    : {
        settings: {
          categories: [],
          services: [],
          questions: [],
          maxPerService: 5,
        },
        businessCategory: null,
      };

  return (
    <AjustesScreen
      data={data}
      actions={{
        updateBusinessSettings: updateBusinessSettingsAction,
        createService: createServiceAction,
        updateService: updateServiceAction,
        setServiceActive: setServiceActiveAction,
        createStaff: createStaffAction,
        updateStaff: updateStaffAction,
        setStaffActive: setStaffActiveAction,
        updateHours: updateHoursAction,
      }}
      bookingForm={bookingForm}
      bookingFormActions={{
        createCategory: createCategoryAction,
        renameCategory: renameCategoryAction,
        deleteCategory: deleteCategoryAction,
        reorderCategories: reorderCategoriesAction,
        setServiceCategory: setServiceCategoryAction,
        createQuestion: createQuestionAction,
        activatePreset: activatePresetAction,
        updateQuestion: updateQuestionAction,
        setQuestionActive: setQuestionActiveAction,
        setQuestionTargets: setQuestionTargetsAction,
        reorderQuestions: reorderQuestionsAction,
        deleteQuestion: deleteQuestionAction,
        getQuestionsForService: getQuestionsForServiceAction,
      }}
      loadBookingFormBundle={loadBookingFormBundle}
      profile={profile}
      profileActions={{
        updateBusinessProfile: updateBusinessProfileAction,
        updateStaffTitle: updateStaffTitleAction,
        createImageUpload: createImageUploadAction,
        confirmImageUpload: confirmImageUploadAction,
        deleteImage: deleteImageAction,
        reorderImages: reorderImagesAction,
      }}
    />
  );
}
