// Form för texterna på funktions- och branschsidorna (WP-75). Båda marknadernas filer
// (`sv-SE.ts`, `es-CL.ts`) måste uppfylla den; sidorna läser via `./index.ts`.
import type { FuncionId, RubroId } from "@/config/routes";

export interface Par {
  readonly titulo: string;
  readonly texto: string;
}

export interface Pregunta {
  readonly pregunta: string;
  readonly respuesta: string;
}

/** Rad i UI-mockupen ("Stripe-konto · Aktivt"). `ok` färgar värdet grönt. */
export interface MockFila {
  readonly k: string;
  readonly v: string;
  readonly ok?: boolean;
}

export interface FuncionTexto {
  /** Namn i menyn, brödsmulan och korten. */
  readonly nombre: string;
  /** Raden under namnet i menyn och korten (≈ 40 tecken). */
  readonly resumen: string;
  /** Versal-etikett i hero ("FUNKTION · BETALNING"). */
  readonly etiqueta: string;
  readonly meta: { readonly titulo: string; readonly descripcion: string };
  readonly fotoAlt: string;
  readonly hero: {
    readonly pre: string;
    readonly marca: string;
    readonly texto: string;
  };
  /** Glaskortet över hero-fotot. */
  readonly tarjeta: {
    readonly linea: string;
    readonly valor: string;
    readonly estado: string;
  };
  readonly beneficios: readonly [Par, Par, Par];
  readonly como: {
    readonly pre: string;
    readonly marca: string;
    readonly pasos: readonly [Par, Par, Par];
    readonly mock: {
      readonly titulo: string;
      readonly filas: readonly MockFila[];
      readonly boton: string;
    };
  };
  readonly faq: readonly Pregunta[];
}

export interface ServicioTexto {
  readonly nombre: string;
  readonly minutos: number;
  /** Heltal i marknadens minsta enhet (öre / CLP). */
  readonly precio: number;
  readonly descripcion: string;
}

export interface RubroTexto {
  /** Namn i menyn, brödsmulan och korten. */
  readonly nombre: string;
  readonly fotoAlt: string;
  readonly meta: { readonly titulo: string; readonly descripcion: string };
  readonly hero: {
    readonly pre: string;
    readonly marca: string;
    readonly texto: string;
    readonly cta: string;
  };
  readonly problemas: {
    readonly pre: string;
    readonly marca: string;
    readonly items: readonly [
      { readonly problema: string; readonly solucion: string },
      { readonly problema: string; readonly solucion: string },
      { readonly problema: string; readonly solucion: string },
    ];
  };
  readonly servicios: {
    readonly pre: string;
    readonly marca: string;
    readonly texto: string;
    readonly items: readonly [ServicioTexto, ServicioTexto, ServicioTexto];
  };
  readonly cierre: { readonly texto: string; readonly boton: string };
}

export interface PaginasCopy {
  readonly nav: {
    readonly funciones: string;
    readonly rubros: string;
    readonly precios: string;
    readonly ejemplo: string;
    readonly menuDemo: {
      readonly cliente: { readonly titulo: string; readonly texto: string };
      readonly negocio: { readonly titulo: string; readonly texto: string };
    };
    readonly menuFunciones: {
      readonly titulo: string;
      readonly verTodas: string;
      readonly migracion: {
        readonly etiqueta: string;
        readonly titulo: string;
        readonly texto: string;
      };
      readonly ejemplo: { readonly titulo: string; readonly texto: string };
    };
    readonly menuRubros: {
      readonly etiqueta: string;
      readonly titulo: string;
      readonly texto: string;
      readonly todas: string;
    };
    readonly abrirMenu: string;
    readonly cerrarMenu: string;
    readonly crearGratis: string;
    readonly entrar: string;
  };
  readonly comunes: {
    readonly migas: string;
    readonly inicio: string;
    readonly crearGratis: string;
    readonly verEjemplo: string;
    readonly faqEtiqueta: string;
    readonly faqTitulo: string;
    readonly masFunciones: string;
    readonly masRubros: string;
    readonly rubroEtiqueta: string;
    readonly serviciosEtiqueta: string;
    readonly comoEtiqueta: string;
    /** Initialer för exempelpersonalen i tjänstelistan. */
    readonly equipo: readonly string[];
    readonly cta: {
      readonly pre: string;
      readonly marca: string;
      readonly texto: string;
      readonly boton: string;
    };
  };
  readonly indiceFunciones: {
    readonly meta: { readonly titulo: string; readonly descripcion: string };
    readonly etiqueta: string;
    readonly hero: {
      readonly pre: string;
      readonly marca: string;
      readonly texto: string;
    };
    readonly fotoAlt: string;
    readonly detalleTitulo: string;
  };
  readonly indiceRubros: {
    readonly meta: { readonly titulo: string; readonly descripcion: string };
    readonly etiqueta: string;
    readonly hero: {
      readonly pre: string;
      readonly marca: string;
      readonly texto: string;
    };
    readonly fotoAlt: string;
    readonly rejilla: {
      readonly pre: string;
      readonly marca: string;
    };
  };
  /** SMS-krediter (bara SE): sektion på Priser, FAQ-rad och punkt på Varför oss. */
  readonly sms?: {
    readonly etiqueta: string;
    readonly titulo: { readonly pre: string; readonly marca: string };
    readonly texto: string;
    readonly perMes: string;
    readonly paquete: (p: { n: number; precio: string }) => string;
    readonly ahorro: (p: { monto: string }) => string;
    readonly notas: readonly string[];
    readonly faq: Pregunta;
    readonly ventaja: Par;
  };
  readonly funciones: Readonly<Partial<Record<FuncionId, FuncionTexto>>> &
    Readonly<Record<Exclude<FuncionId, "pagos">, FuncionTexto>>;
  readonly rubros: Readonly<Record<RubroId, RubroTexto>>;
}
