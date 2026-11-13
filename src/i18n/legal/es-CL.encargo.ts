/**
 * Acuerdo de Encargo de Tratamiento de Datos — mercado CL (WP-26 paso 5),
 * anexo de `./es-CL.terminos.ts` (slug `terminos`). Borrador de
 * `copywriter-es-cl`; revisión legal pendiente, WP-27 (ver también
 * `docs/legal/JURIST_FRAGOR.md`, pregunta 2).
 */
import { LEGAL_VERSION, list, p, type LegalDoc } from "./types";
import type { LegalEntity } from "./entity";

export function getEncargoCL(entity: LegalEntity): LegalDoc {
  const { legalName } = entity;
  return {
    slug: "encargo",
    title: "Acuerdo de Encargo de Tratamiento de Datos",
    status: "final",
    version: LEGAL_VERSION,
    versionLabel: `Versión ${LEGAL_VERSION}`,
    intro: [
      p(
        `Este documento es un anexo de los Términos y Condiciones para Empresas y regula, entre el negocio (responsable del tratamiento) y ${legalName} (encargado del tratamiento), cómo tratamos los datos personales de los clientes del negocio, según la Ley 21.719.`,
      ),
    ],
    sections: [
      {
        id: "objeto",
        heading: "Objeto y duración",
        blocks: [
          p(
            `${legalName} trata los datos personales de los clientes del negocio únicamente para prestar el servicio de la plataforma: gestionar reservas, enviar confirmaciones y recordatorios, y las demás funciones que el negocio contrate. Este encargo dura mientras el negocio tenga una cuenta activa en la plataforma.`,
          ),
        ],
      },
      {
        id: "instrucciones",
        heading: "Instrucciones del negocio",
        blocks: [
          p(
            "Tratamos los datos siguiendo las instrucciones del negocio, que quedan reflejadas en la configuración de su cuenta y en el uso normal de la plataforma, por ejemplo qué preguntas agrega al formulario de reserva o qué mensajes de marketing activa. Si una instrucción del negocio infringiera la ley, se lo haremos saber.",
          ),
        ],
      },
      {
        id: "confidencialidad",
        heading: "Confidencialidad",
        blocks: [
          p(
            "Las personas de nuestro equipo que acceden a datos de los clientes del negocio están sujetas a un deber de confidencialidad y solo acceden a lo necesario para operar o dar soporte a la plataforma.",
          ),
        ],
      },
      {
        // WP-90 (D-076): modo soporte.
        id: "acceso-soporte",
        heading: "Acceso de soporte",
        blocks: [
          p(
            "Cuando el negocio pide ayuda, o cuando hay que corregir un error en su cuenta, una persona de nuestro equipo con una autorización especial puede abrir la cuenta como soporte. Esa persona accede a los mismos datos que una persona del equipo del negocio con todos los permisos, incluidos datos de los clientes del negocio, y los usa solo para dar la ayuda o corregir el error.",
          ),
          list([
            "El acceso exige verificación en dos pasos, dura como máximo una hora cada vez y después termina solo.",
            "El soporte no puede administrar el plan y la facturación, los miembros del equipo, los consentimientos, ni exportar o eliminar la cuenta, y no accede a las fichas de los clientes.",
            "Cada vez que la cuenta se abre como soporte queda registrado quién fue, cuándo ocurrió y hasta cuándo duró el acceso. El negocio puede pedir esa información.",
          ]),
        ],
      },
      {
        id: "seguridad",
        heading: "Medidas de seguridad",
        blocks: [
          list([
            "Aislamiento de datos por negocio a nivel de base de datos: ningún negocio puede ver los datos de otro.",
            "Cifrado de las credenciales de terceros que el negocio conecta, por ejemplo su cuenta de Mercado Pago.",
            "Sin datos personales en los registros técnicos de errores.",
          ]),
        ],
      },
      {
        id: "subencargados",
        heading: "Subencargados",
        blocks: [
          p(
            `Para prestar el servicio, ${legalName} recurre a los siguientes subencargados, detallados con su ubicación en la Política de Privacidad: Supabase, Vercel, Meta (WhatsApp Cloud API) y Resend, además de Mercado Pago cuando el negocio activa el cobro de abono. El negocio autoriza de forma general el uso de estos subencargados y de los que los reemplacen en condiciones equivalentes de protección de datos; si sumamos un subencargado nuevo con otro tipo de acceso, se lo informaremos con anticipación.`,
          ),
        ],
      },
      {
        id: "asistencia",
        heading: "Asistencia al negocio",
        blocks: [
          p(
            "Ayudamos al negocio a responder las solicitudes de acceso, rectificación o eliminación de sus clientes, dentro de las herramientas que la plataforma ofrece. Si detectamos un incidente de seguridad que afecte los datos de los clientes del negocio, se lo informamos sin dilación indebida, con 72 horas como referencia interna para dar el primer aviso.",
          ),
        ],
      },
      {
        id: "eliminacion",
        heading: "Eliminación de los datos al terminar",
        blocks: [
          p(
            "Cuando el negocio cierra su cuenta, sus datos y los de sus clientes se tratan según los plazos de la Política de Privacidad: el cierre deja la página de reservas fuera de línea de inmediato, y los datos se eliminan 30 días después si el negocio no reactiva su cuenta.",
          ),
        ],
      },
      {
        id: "auditoria",
        heading: "Información y auditoría",
        blocks: [
          p(
            "El negocio puede pedirnos información razonable sobre cómo cumplimos este acuerdo. No compartimos con un negocio información de otro negocio.",
          ),
        ],
      },
    ],
  };
}
