// /app/ajustes/formulario (WP-55, D-031): fila bloqueada, banner de sugerencias, todo el
// catálogo de preguntas y una vista previa (`BookingFormSection`, sin cambios). Antes vivía
// junto a "Servicios" en la misma pantalla — ahora su propia ruta, con su propio
// `BookingFormBundle`/reload (ver `formulario-tab.tsx`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { FormularioTab } from "@/components/settings/formulario-tab";
import { nav } from "@/i18n";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  declineCancelRequestAction,
  declineRequestAction,
} from "../actions";
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
  type BookingFormBundle,
} from "../booking-form-actions";

export const metadata: Metadata = {
  title: nav.ajustes,
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

async function loadBookingFormBundle(): Promise<BookingFormBundle | null> {
  "use server";
  const result = await loadBookingFormBundleAction();
  return result.ok ? result.data : null;
}

export default async function AjustesFormularioPage() {
  const ctx = await requireAjustesTab("formulario");
  const bundleResult = await loadBookingFormBundleAction();
  const bookingForm: BookingFormBundle = bundleResult.ok
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
    <AjustesShell
      active="formulario"
      tabs={ctx.tabs}
      business={ctx.current.business}
      owner={ctx.owner}
      onLogout={logout}
      canViewReports={ctx.current.view.perms.can_view_reports}
      pendingRequests={ctx.pendingRequests}
      notices={ctx.notices}
      onConfirmRequest={confirmRequestAction}
      onDeclineRequest={declineRequestAction}
      onApproveCancelRequest={approveCancelRequestAction}
      onDeclineCancelRequest={declineCancelRequestAction}
      myProfile={ctx.myProfile ?? undefined}
      myProfileActions={ctx.myProfileActions}
    >
      <FormularioTab
        bookingForm={bookingForm}
        actions={{
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
      />
    </AjustesShell>
  );
}
