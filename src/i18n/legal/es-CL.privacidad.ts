/**
 * Política de Privacidad — mercado CL (WP-26 paso 5, borrador de
 * `copywriter-es-cl`, no de un abogado; ver R8 del plan de WP-03 y
 * `docs/legal/COMPLIANCE.md`). Un abogado chileno debe revisar este
 * documento antes del piloto (WP-27); mientras tanto `status` es
 * `"draft"` y la UI muestra `LEGAL_DRAFT_BANNER` (`./index.ts`).
 *
 * Roles (Ley 21.719, ver también `reserva.consentimientos.responsable`
 * en `../es-CL.ts`): el negocio donde el cliente reserva es responsable
 * del tratamiento de los datos de sus propios clientes; la plataforma
 * los trata por encargo del negocio. Para los datos de las cuentas de
 * dueños y equipo, la plataforma sí es responsable (intro, párrafo 3).
 */
import { LEGAL_VERSION, list, p, type LegalDoc } from "./types";
import type { LegalEntity } from "./entity";

export function getPrivacidadCL(entity: LegalEntity): LegalDoc {
  const { legalName, taxId, address, contactEmail } = entity;
  return {
    slug: "privacidad",
    title: "Política de Privacidad",
    status: "draft",
    version: LEGAL_VERSION,
    versionLabel: `Versión ${LEGAL_VERSION}`,
    intro: [
      p(
        "Esta política explica qué datos personales tratamos cuando usas la plataforma de reservas de un negocio, para qué los usamos, cuánto tiempo los guardamos y cómo puedes ejercer tus derechos.",
      ),
      p(
        `El negocio donde reservas tu hora (por ejemplo una barbería, una peluquería o un centro de estética) es responsable del tratamiento de tus datos personales. ${legalName} trata esos datos por encargo del negocio, como su proveedor de tecnología: seguimos sus instrucciones, no decidimos por nuestra cuenta qué hacer con tus datos.`,
      ),
      p(
        `Para los datos de las personas que administran un negocio en la plataforma (dueños y su equipo), ${legalName} sí es responsable del tratamiento, en lo que corresponde a la gestión de sus propias cuentas.`,
      ),
      p(
        "Esta política sigue los principios de la Ley 19.628, vigente hoy, y de la Ley 21.719, que rige plenamente desde el 1 de diciembre de 2026.",
      ),
    ],
    sections: [
      {
        id: "que-datos",
        heading: "¿Qué datos tratamos?",
        blocks: [
          p("Cuando reservas una hora, guardamos:"),
          list([
            "Tu nombre y tu número de celular.",
            "Tu correo, si lo escribiste (es opcional).",
            "El historial de tus reservas: servicio, fecha, hora, profesional y estado (confirmada, cancelada, no vino).",
            "Las respuestas a las preguntas del formulario de reserva, si el negocio agregó alguna.",
            "Notas que el negocio haya escrito sobre ti, por ejemplo tus preferencias de servicio.",
            "El registro de los mensajes que te enviamos (confirmaciones, recordatorios) y si llegaron o no, sin guardar el contenido del mensaje en ese registro.",
            "Tus consentimientos: qué aceptaste, cuándo y por qué canal.",
          ]),
          p(
            "No pedimos datos de salud, diagnósticos ni otra información sensible. Si un negocio los anota igual, por su cuenta, en un campo de notas libres, eso no forma parte del diseño de la plataforma.",
          ),
        ],
      },
      {
        id: "para-que",
        heading: "¿Para qué usamos tus datos?",
        blocks: [
          list([
            "Para gestionar tu reserva: mostrarte los horarios disponibles, guardar tu hora y evitar dobles reservas.",
            "Para avisarte: confirmación, recordatorios y cambios de tu hora, por WhatsApp o correo.",
            "Para que el negocio administre su agenda y su lista de clientes.",
            "Para que, si aceptaste recibir ofertas, el negocio te avise de horas con descuento o te recuerde volver.",
            "Para cumplir obligaciones legales y responder a las autoridades cuando corresponda.",
          ]),
        ],
      },
      {
        id: "responsable-y-derechos",
        heading:
          "¿Quién es responsable de tus datos y cómo ejerces tus derechos?",
        blocks: [
          p(
            "El negocio donde reservaste es responsable de tus datos. Tienes derecho a acceder a tus datos, pedir que los corrijamos, pedir que los eliminemos, oponerte a un uso en particular y pedir una copia en un formato que puedas llevarte a otro lugar (portabilidad).",
          ),
          p(
            "Para ejercer cualquiera de estos derechos, contacta directamente al negocio donde reservaste: sus datos de contacto están en tu confirmación de reserva. El negocio puede pedirnos que exportemos o eliminemos tus datos, y lo hacemos desde la plataforma.",
          ),
          p(
            `Si el negocio ya cerró o no responde, escríbenos a ${contactEmail} y te ayudamos a ejercer tus derechos igual.`,
          ),
          p(
            "Puedes darte de baja de los mensajes de ofertas y novedades cuando quieras respondiendo BAJA, sin que eso afecte la confirmación ni los recordatorios de las horas que ya reservaste.",
          ),
          p(
            "También puedes reclamar ante la Agencia de Protección de Datos Personales, una vez que esté en funcionamiento (Ley 21.719).",
          ),
        ],
      },
      {
        id: "cuanto-tiempo",
        heading: "¿Cuánto tiempo guardamos tus datos?",
        blocks: [
          list([
            "Si no vuelves a reservar, tus datos personales se anonimizan automáticamente 24 meses después de tu última reserva: tu nombre, celular, correo y notas se borran; las reservas y los montos quedan, pero ya no identifican a nadie.",
            "Los mensajes ya enviados, o que ya no se van a enviar, se eliminan de nuestra cola de envío 90 días después.",
            "El registro de qué aceptaste y cuándo se guarda 5 años, pero deja de estar asociado a tu nombre en cuanto tus datos se anonimizan: solo sirve para acreditar que en su momento existió un consentimiento válido.",
          ]),
        ],
      },
      {
        id: "con-quien",
        heading: "¿Con quién compartimos tus datos?",
        blocks: [
          p(
            "Usamos otras empresas para operar la plataforma. Cada una trata tus datos solo para la tarea que le corresponde, nunca para sus propios fines:",
          ),
          list([
            "Supabase — base de datos y autenticación. Servidores en São Paulo, Brasil (región sa-east-1).",
            "Vercel — alojamiento de la plataforma. Servidores en São Paulo, Brasil (región gru1).",
            "Meta (WhatsApp Cloud API) — envío de confirmaciones y recordatorios por WhatsApp. Meta trata estos mensajes en su propia infraestructura, con servidores fuera de Chile (Meta Platforms, Inc., Estados Unidos).",
            "Resend — envío de correos: confirmaciones y recordatorios cuando no hay WhatsApp, o como respaldo.",
            "Mercado Pago — si tu reserva pide un abono, el pago se procesa directamente a la cuenta del propio negocio; nosotros no recibimos ni guardamos tu dinero, solo la confirmación de que el pago se hizo.",
          ]),
          p(
            "Cuando corresponde, esto implica transferir datos fuera de Chile (Brasil, Estados Unidos). Lo hacemos solo con la información necesaria para prestar el servicio, y exigimos a estas empresas condiciones de protección de datos.",
          ),
          p(
            "No vendemos tus datos ni los compartimos con terceros para fines de publicidad ajenos al negocio donde reservaste.",
          ),
        ],
      },
      {
        id: "seguridad",
        heading: "¿Cómo protegemos tus datos?",
        blocks: [
          list([
            "Cada negocio solo puede ver y administrar sus propios clientes y sus propias reservas: la base de datos lo exige técnicamente, negocio por negocio.",
            "Las claves de acceso a otras plataformas que el negocio conecta, como su cuenta de Mercado Pago, se guardan cifradas.",
            "No guardamos el contenido de tus mensajes en los registros de errores ni de auditoría.",
          ]),
        ],
      },
      {
        id: "cookies",
        heading: "Cookies",
        blocks: [
          p(
            "Solo usamos cookies necesarias para que funcione la plataforma, nunca para seguimiento publicitario:",
          ),
          list([
            "La cookie de sesión, que mantiene tu sesión iniciada: la cuenta del negocio (dueños y equipo) o tu cuenta de cliente. Se borra al cerrar sesión.",
            "Una cookie de corta duración (15 minutos) que recuerda si entras como cliente o como negocio, para llevarte al lugar correcto después del link de acceso.",
          ]),
          p(
            "Los clientes que solo reservan una hora, sin iniciar sesión, no reciben cookies de seguimiento.",
          ),
          p(
            "Hoy no usamos cookies de analítica ni de publicidad. Si en el futuro las incorporamos, vas a ver un aviso pidiendo tu consentimiento antes de que se activen.",
          ),
        ],
      },
      {
        id: "cambios",
        heading: "Cambios a esta política",
        blocks: [
          p(
            "Si cambiamos esta política de forma relevante, lo vamos a avisar en la plataforma antes de que el cambio entre en vigencia. La fecha de la versión vigente siempre está al final de este documento.",
          ),
        ],
      },
      {
        id: "contacto",
        heading: "Contacto",
        blocks: [
          p(
            `${legalName}, ${taxId}, ${address}. Escríbenos a ${contactEmail} por cualquier duda sobre esta política o sobre tus datos.`,
          ),
        ],
      },
    ],
  };
}
