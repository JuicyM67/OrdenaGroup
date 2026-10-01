// /app/ajustes/servicios (WP-55): lista de servicios (`ServicesSection`) y categorías
// (`CategorySection`) — comparten el `BookingFormBundle`, ver `servicios-tab.tsx`. Antes
// vivían junto a "Formulario de reserva" en la misma pantalla (D-031); ahora cada una su
// propia ruta (`/app/ajustes/formulario`).
import type { Metadata } from "next";

import { logout } from "@/app/auth/actions";
import { AjustesShell } from "@/components/settings/ajustes-shell";
import { ServiciosTab } from "@/components/settings/servicios-tab";
import { nav } from "@/i18n";
import { loadAjustesServices } from "@/server/owner/ajustes";

import { requireAjustesTab } from "../access";
import {
  approveCancelRequestAction,
  confirmRequestAction,
  createServiceAction,
  declineCancelRequestAction,
  declineRequestAction,
  setServiceActiveAction,
  updateServiceAction,
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

export default async function AjustesServiciosPage() {
  const ctx = await requireAjustesTab("servicios");
  const [services, bundleResult] = await Promise.all([
    loadAjustesServices(ctx.userId, ctx.current.business.id),
    loadBookingFormBundleAction(),
  ]);
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
      active="servicios"
      tabs={ctx.tabs}
      business={ctx.current.business}
      owner={ctx.owner}
      onLogout={logout}
      canViewReports={ctx.current.view.perms.can_view_reports}
      pendingRequests={ctx.pendingRequests}
      onConfirmRequest={confirmRequestAction}
      onDeclineRequest={declineRequestAction}
      onApproveCancelRequest={approveCancelRequestAction}
      onDeclineCancelRequest={declineCancelRequestAction}
      myProfile={ctx.myProfile ?? undefined}
      myProfileActions={ctx.myProfileActions}
    >
      <ServiciosTab
        services={services}
        actions={{
          create: createServiceAction,
          update: updateServiceAction,
          setActive: setServiceActiveAction,
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
      />
    </AjustesShell>
  );
}
