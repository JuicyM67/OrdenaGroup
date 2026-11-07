// WP-82: okänd slug i en widget. Liten, tyst text i stället för sajtens 404-sida.
import { WidgetSurface } from "@/components/widgets/widget-surface";
import { widgets } from "@/i18n";

export default function EmbedNotFound() {
  return (
    <WidgetSurface theme="light" className="p-1">
      <p className="text-13 text-muted">
        {widgets.visitante.incrustada.noDisponible}
      </p>
    </WidgetSurface>
  );
}
