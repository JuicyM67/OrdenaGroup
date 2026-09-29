"use server";

// Server actions för kategorier och bokningsfrågor (WP-40 steg 5–8, D-031).
// Samma mönster som ./actions.ts: `userId`/`businessId` kommer alltid från
// den verifierade sessionen här inne, aldrig från klienten. Tunna omslag runt
// `src/server/owner/booking-questions.ts` (redan byggd, WP-40 steg 3) — ingen
// ny affärslogik här.
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { BookingQuestionDef } from "@/lib/validation/booking-questions";
import {
  activatePreset,
  createCategory,
  createQuestion,
  deleteCategory,
  deleteQuestion,
  loadBookingFormSettings,
  renameCategory,
  reorderCategories,
  reorderQuestions,
  setQuestionActive,
  setQuestionTargets,
  setServiceCategory,
  updateQuestion,
  type BookingFormCreateResult,
  type BookingFormResult,
  type BookingFormSettings,
} from "@/server/owner/booking-questions";
import { getQuestionsForServiceAsOwner } from "@/server/booking-questions/catalog";
import { getOwnerBusinessCategory } from "@/server/owner/booking-form-business";
import { getOwnerBusiness } from "@/server/onboarding/owner-business";

async function currentOwner(): Promise<
  { userId: string; businessId: string } | { ok: false; code: "unauthorized" }
> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, code: "unauthorized" };
  const business = await getOwnerBusiness(user.id);
  if (!business) return { ok: false, code: "unauthorized" };
  return { userId: user.id, businessId: business.id };
}

export type BookingFormBundle = {
  settings: BookingFormSettings;
  /** `businesses.category` (rubro), t.ex. "peluqueria"; `null` = "Otro"/sin elegir. */
  businessCategory: string | null;
};

export async function loadBookingFormBundleAction(): Promise<
  { ok: true; data: BookingFormBundle } | { ok: false; code: string }
> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  const [settings, businessCategory] = await Promise.all([
    loadBookingFormSettings(owner.userId, owner.businessId),
    getOwnerBusinessCategory(owner.userId, owner.businessId),
  ]);
  return { ok: true, data: { settings, businessCategory } };
}

export async function createCategoryAction(
  input: unknown,
): Promise<BookingFormCreateResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return createCategory(owner.userId, owner.businessId, input);
}

export async function renameCategoryAction(
  categoryId: string,
  input: unknown,
): Promise<BookingFormResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return renameCategory(owner.userId, owner.businessId, categoryId, input);
}

export async function deleteCategoryAction(
  categoryId: string,
): Promise<BookingFormResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return deleteCategory(owner.userId, owner.businessId, categoryId);
}

export async function reorderCategoriesAction(
  orderedIds: unknown,
): Promise<BookingFormResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return reorderCategories(owner.userId, owner.businessId, orderedIds);
}

export async function setServiceCategoryAction(
  serviceId: string,
  categoryId: string | null,
): Promise<BookingFormResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return setServiceCategory(
    owner.userId,
    owner.businessId,
    serviceId,
    categoryId,
  );
}

export async function createQuestionAction(
  input: unknown,
): Promise<BookingFormCreateResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return createQuestion(owner.userId, owner.businessId, input);
}

export async function activatePresetAction(
  input: unknown,
): Promise<BookingFormCreateResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return activatePreset(owner.userId, owner.businessId, input);
}

export async function updateQuestionAction(
  questionId: string,
  input: unknown,
): Promise<BookingFormResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return updateQuestion(owner.userId, owner.businessId, questionId, input);
}

export async function setQuestionActiveAction(
  questionId: string,
  active: boolean,
): Promise<BookingFormResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return setQuestionActive(owner.userId, owner.businessId, questionId, active);
}

export async function setQuestionTargetsAction(
  questionId: string,
  targets: unknown,
): Promise<BookingFormResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return setQuestionTargets(
    owner.userId,
    owner.businessId,
    questionId,
    targets,
  );
}

export async function reorderQuestionsAction(
  orderedIds: unknown,
): Promise<BookingFormResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return reorderQuestions(owner.userId, owner.businessId, orderedIds);
}

export async function deleteQuestionAction(
  questionId: string,
): Promise<BookingFormResult> {
  const owner = await currentOwner();
  if ("ok" in owner) return owner;
  return deleteQuestion(owner.userId, owner.businessId, questionId);
}

export async function getQuestionsForServiceAction(
  serviceId: string,
): Promise<BookingQuestionDef[]> {
  const owner = await currentOwner();
  if ("ok" in owner) return [];
  return getQuestionsForServiceAsOwner(
    owner.userId,
    owner.businessId,
    serviceId,
  );
}
