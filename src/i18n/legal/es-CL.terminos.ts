/**
 * Términos y Condiciones para Empresas — mercado CL (WP-26 paso 5,
 * borrador de `copywriter-es-cl`; revisión legal pendiente, WP-27). Este
 * documento regula la relación entre el negocio que contrata la
 * plataforma y la plataforma, no la relación entre el negocio y sus
 * propios clientes finales (esa se cubre con `reserva.consentimientos`
 * en `../es-CL.ts` y con la política de cancelación que cada negocio
 * define).
 *
 * El Acuerdo de Encargo de Tratamiento de Datos (`./es-CL.encargo.ts`,
 * slug `encargo`) es un anexo de este documento: misma fuerza, distinta
 * página por simplicidad de navegación (ver §11, "Anexo").
 */
import { LEGAL_VERSION, list, p, type LegalDoc } from "./types";
import type { LegalEntity } from "./entity";

export function getTerminosCL(entity: LegalEntity): LegalDoc {
  const { legalName, taxId, address, contactEmail } = entity;
  return {
    slug: "terminos",
    title: "Términos y Condiciones para Empresas",
    status: "draft",
    version: LEGAL_VERSION,
    versionLabel: `Versión ${LEGAL_VERSION}`,
    intro: [
      p(
        'Estos términos regulan el uso de la plataforma por parte de negocios y profesionales que la contratan para administrar sus reservas (en este documento, "tú" o "el negocio"). Al crear una cuenta, aceptas estos términos.',
      ),
      p(
        `La plataforma es ofrecida por ${legalName}, ${taxId}, con domicilio en ${address}.`,
      ),
      p(
        "Este documento no regula la relación entre el negocio y sus propios clientes finales: esa relación la define el negocio, y debe cumplir la ley del consumidor que le corresponda.",
      ),
    ],
    sections: [
      {
        id: "que-ofrecemos",
        heading: "Qué ofrece la plataforma",
        blocks: [
          list([
            "Una página de reservas para que tus clientes agenden hora solos.",
            "Un calendario y un panel para administrar tu agenda, tu equipo y tus servicios.",
            "Confirmaciones y recordatorios automáticos para tus clientes.",
            "Funciones adicionales según el plan que elijas, por ejemplo lista de espera, WhatsApp o abono.",
          ]),
          p(
            "El detalle de cada plan y sus límites de uso están en la página de precios vigente al momento de contratar.",
          ),
        ],
      },
      {
        id: "tu-cuenta",
        heading: "Tu cuenta",
        blocks: [
          list([
            "La información que nos das al crear tu cuenta debe ser real y estar actualizada.",
            "Eres responsable de mantener en secreto tu acceso y de todo lo que ocurra en tu cuenta.",
            "Puedes agregar personas a tu equipo con distintos niveles de acceso; eres responsable de a quién le das ese acceso.",
          ]),
        ],
      },
      {
        id: "uso-permitido",
        heading: "Uso permitido",
        blocks: [
          list([
            "Usas la plataforma solo para administrar tu propio negocio de servicios con hora, no para revenderla ni ofrecerla a otros negocios.",
            "No subes datos de salud ni otra información sensible de tus clientes en los campos de notas o preguntas del formulario: la plataforma no está diseñada para guardar ese tipo de datos.",
            "No intentas acceder a los datos de otro negocio ni a partes de la plataforma que no te correspondan.",
            "Los nombres de tus servicios y tus mensajes deben ser lícitos y no pueden violar los derechos de tus propios clientes.",
          ]),
        ],
      },
      {
        id: "tus-clientes-y-datos",
        heading: "Tus clientes y protección de datos",
        blocks: [
          p(
            `Respecto de los datos de tus clientes, tú eres el responsable del tratamiento y ${legalName} actúa como tu encargado: tratamos esos datos siguiendo tus instrucciones, para prestarte el servicio. Los términos exactos de ese encargo están en el Acuerdo de Encargo de Tratamiento de Datos, que es un anexo de este documento y tiene la misma fuerza que estos términos.`,
          ),
          p(
            "Eres responsable de informar a tus clientes sobre cómo tratas sus datos, de pedirles los consentimientos que correspondan y de responder tú mismo sus solicitudes de acceso, rectificación o eliminación, con nuestra ayuda técnica cuando la necesites.",
          ),
        ],
      },
      {
        id: "pago",
        heading: "Precio y forma de pago",
        blocks: [
          p(
            "Pagas el plan que elegiste según el valor y la periodicidad informados al contratar, más los impuestos que correspondan. Podemos cambiar los precios de los planes hacia adelante, avisando con anticipación razonable.",
          ),
          p(
            "Si tu plan incluye abono de tus clientes, ese dinero se paga directamente a tu propia cuenta de Mercado Pago: la plataforma no recibe ni administra ese dinero en ningún momento.",
          ),
        ],
      },
      {
        id: "duracion-y-baja",
        heading: "Duración y cierre de tu cuenta",
        blocks: [
          list([
            "Puedes cerrar tu cuenta cuando quieras desde Ajustes.",
            "Al cerrarla, tu página de reservas deja de estar disponible de inmediato.",
            "Tienes 30 días desde el cierre para arrepentirte y recuperar tu cuenta tal como estaba.",
            "Pasados esos 30 días sin que la reactives, tus datos y los de tus clientes se eliminan según nuestra política de privacidad y ya no se pueden recuperar.",
          ]),
          p(
            "También podemos suspender o cerrar tu cuenta si incumples gravemente estos términos, avisándote primero salvo que la ley o la seguridad de otros usuarios exija actuar antes.",
          ),
        ],
      },
      {
        id: "disponibilidad",
        heading: "Disponibilidad y cambios al servicio",
        blocks: [
          p(
            "Hacemos lo posible para que la plataforma esté disponible de forma continua, pero puede haber mantenciones o fallas. Te avisamos con anticipación las mantenciones programadas cuando es posible. Podemos mejorar o cambiar funciones de la plataforma; si un cambio elimina algo importante de tu plan, te avisamos antes.",
          ),
        ],
      },
      {
        id: "responsabilidad",
        heading: "Responsabilidad",
        blocks: [
          p(
            "Prestamos la plataforma con el cuidado razonable de un proveedor de tecnología, pero no respondemos por decisiones comerciales del negocio, por el contenido que el negocio publica ni por conflictos entre el negocio y sus propios clientes. Cada parte responde por los daños que cause por incumplir estos términos, dentro de lo que permite la ley aplicable.",
          ),
        ],
      },
      {
        id: "ley-aplicable",
        heading: "Ley aplicable y contacto",
        blocks: [
          p(
            `Estos términos se rigen por la ley chilena. Cualquier duda, escríbenos a ${contactEmail}.`,
          ),
        ],
      },
      {
        id: "cambios-terminos",
        heading: "Cambios a estos términos",
        blocks: [
          p(
            "Si cambiamos estos términos de forma relevante, te avisamos antes de que el cambio entre en vigencia. Seguir usando la plataforma después de esa fecha implica que aceptas la nueva versión.",
          ),
        ],
      },
      {
        id: "anexo",
        heading: "Anexo",
        blocks: [
          p(
            "El Acuerdo de Encargo de Tratamiento de Datos es un anexo de estos términos y se aplica en conjunto con ellos.",
          ),
        ],
      },
    ],
  };
}
