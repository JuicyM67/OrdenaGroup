"use client";

// WP-82 (D-067): reseñas-widgeten har inget att visa (0 reseñas, D-045). Säger till loadern
// att kollapsa platshållaren; själva sidan renderar ingenting.
import { useEffect } from "react";

import {
  postWidgetMessage,
  WIDGET_MESSAGE_SOURCE,
} from "@/lib/widgets/protocol";

export function WidgetEmpty() {
  useEffect(() => {
    postWidgetMessage({ source: WIDGET_MESSAGE_SOURCE, type: "empty" });
  }, []);
  return null;
}
