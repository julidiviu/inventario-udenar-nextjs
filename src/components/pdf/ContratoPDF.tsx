import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { Style } from "@react-pdf/types";

export interface DatosContrato {
  dependenciaNombre: string;
  adminNombre: string;
  adminCedula: string;
  adminTelefono: string | null;
  /** dataURI/base64 completo o null */
  adminFirma: string | null;
  usuarioNombre: string;
  usuarioCedula: string;
  usuarioTelefono: string;
  usuarioCodigo: string;
  usuarioFirma: string | null;
  recursoNombre: string;
  recursoQr: string;
  recursoTipo: string;
  recursoDescripcion: string;
  /** dd/mm/aaaa */
  fechaDevolucion: string;
  fechaSuscripcion: string;
  /** Escudo en dataURI o URL absoluta. */
  escudo: string;
}

const s = StyleSheet.create({
  page: {
    paddingTop: 115,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 9.5,
    lineHeight: 1.4,
    fontFamily: "Helvetica",
  },
  header: {
    position: "absolute",
    top: 25,
    left: 40,
    right: 40,
    height: 75,
    flexDirection: "row",
    borderWidth: 1.2,
    borderColor: "#444",
  },
  hLeft: {
    width: "22%",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  hCenter: {
    width: "48%",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    borderLeftWidth: 1.2,
    borderColor: "#444",
  },
  hRight: {
    width: "30%",
    borderLeftWidth: 1.2,
    borderColor: "#444",
    flexDirection: "column",
  },
  hRightCell: {
    height: "25%",
    paddingHorizontal: 4,
    justifyContent: "center",
    borderBottomWidth: 1.2,
    borderColor: "#444",
  },
  hRightCellLast: {
    height: "25%",
    paddingHorizontal: 4,
    justifyContent: "center",
  },
  hRightText: {
    fontSize: 8,
  },
  escudo: {
    width: 65,
    height: 65,
    objectFit: "contain",
  },
  tituloHeaderMain: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 2,
  },
  subtituloHeader: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },
  p: {
    textAlign: "justify",
    marginBottom: 6,
  },
  b: {
    fontFamily: "Helvetica-Bold",
  },
  h3: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    marginBottom: 4,
  },
  h4: {
    fontSize: 9.5,
    fontFamily: "Helvetica-Bold",
    marginTop: 6,
    marginBottom: 3,
  },
  li: {
    marginLeft: 12,
    marginBottom: 2,
    textAlign: "justify",
  },
  firmaImg: {
    maxHeight: 45,
    maxWidth: 160,
    marginVertical: 4,
    objectFit: "contain",
  },
  noFirma: {
    fontStyle: "italic",
    fontSize: 8.5,
    marginVertical: 4,
    color: "#555",
  },
  firmaBloque: {
    marginTop: 12,
    marginBottom: 8,
  },
  firmasGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 15,
  },
  firmaColumna: {
    width: "48%",
  },
});

function P({ children, style }: { children: React.ReactNode; style?: Style | Style[] }) {
  return <Text style={[s.p, style]}>{children}</Text>;
}

function B({ children, style }: { children: React.ReactNode; style?: Style | Style[] }) {
  return <Text style={[s.b, style]}>{children}</Text>;
}

const OBLIGACIONES_GENERALES = [
  "No darle uso diferente al propuesto en el comodato al mueble, ni cederlo a cualquier título o entregarlo en arrendamiento sin la autorización estricta de EL COMODANTE. Cuidar y mantener el bien recibido en comodato, respondiendo por todo daño o deterioro que sufra, salvo los que se deriven de su uso legítimo.",
  "Notificar al COMODANTE de cualquier hecho que pueda atentar contra su derecho de dominio o libre disfrute de la tenencia, por parte de cualquier tercero.",
  "Cuidar, vigilar, custodiar y mantener el bien recibido en comodato, respondiendo por todo daño o deterioro que sufra, salvo los que se deriven de su uso legítimo.",
  "Responder por los daños que se causen a terceros como consecuencia de las actividades que se desarrollen con el mueble entregado en comodato, durante la vigencia del presente contrato de comodato.",
  "Restituir el mueble a EL COMODANTE cuando éste lo solicite, teniendo en cuenta lo establecido en el Parágrafo de la Cláusula Tercera del presente contrato.",
  "Utilizar el bien de acuerdo al uso autorizado en este contrato, es decir, Única y exclusivamente para ejecución de actividades académicas propuestas en el plan de estudios correspondiente.",
  "Indemnizar y/o asumir todo daño que se cause a terceros, por causa o con ocasión del desarrollo de las actividades que se desarrollen con este.",
  "Permitir que EL COMODANTE o el funcionario designado, inspeccione en cualquier momento el estado en que se encuentran los bienes objeto del presente contrato.",
  "Las demás propias de la naturaleza del presente contrato.",
];

const OBLIGACIONES_ESPECIFICAS = [
  "El comodatario deberá velar por el uso adecuado y la conservación del recurso y sus accesorios.",
  "El comodatario responderá a la Universidad por el deterioro que no provenga de la naturaleza o del uso legítimo del recurso prestado.",
  "El recurso dado en préstamo es para uso personal e intransferible.",
  "Se prohíbe la manipulación, el desmontaje o la modificación total o parcial del recurso, cualquier anomalía que se presente deberá informarse ante los funcionarios de la Universidad de Nariño encargados del programa.",
  "El comodatario exclusivamente podrá instalar aplicativos o programas requeridos para las clases y autorizados por el correspondiente docente quien considere necesaria la instalación de aquellas.",
  "El procedimiento de entrega del equipo se realizará directamente al Director del departamento y se le entregará con su documento de identificación.",
  "El comodatario se encuentra sometido al cumplimiento de todas las obligaciones contenidas en los Artículos 2200 y siguientes del Código Civil, atinentes al préstamo de uso.",
];

function Firma({ firmaUrl }: { firmaUrl: string | null }) {
  if (!firmaUrl) return <Text style={s.noFirma}>No se adjuntó firma.</Text>;
  // Garantizar prefijo DataURI si viene en base64 puro
  const src = firmaUrl.startsWith("data:") ? firmaUrl : `data:image/png;base64,${firmaUrl}`;
  // eslint-disable-next-line jsx-a11y/alt-text
  return <Image style={s.firmaImg} src={src} />;
}

export function ContratoPDF({ datos }: { datos: DatosContrato }) {
  const d = datos;
  const dep = d.dependenciaNombre ? d.dependenciaNombre.toUpperCase() : "[DEPENDENCIA NO ASIGNADA]";

  // Formatear la fuente del escudo
  const escudoSrc = d.escudo
    ? d.escudo.startsWith("data:") || d.escudo.startsWith("http")
      ? d.escudo
      : `data:image/png;base64,${d.escudo}`
    : "";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ENCABEZADO FIJO EN TODAS LAS PÁGINAS */}
        <View style={s.header} fixed>
          <View style={s.hLeft}>
            {escudoSrc ? (
              // eslint-disable-next-line jsx-a11y/alt-text
              <Image style={s.escudo} src={escudoSrc} />
            ) : null}
          </View>

          <View style={s.hCenter}>
            <Text style={s.tituloHeaderMain}>DEPARTAMENTO DE CONTRATACIÓN</Text>
            <Text style={s.subtituloHeader}>CONTRATO COMODATO PRECARIO</Text>
          </View>

          <View style={s.hRight}>
            <View style={s.hRightCell}>
              <Text style={s.hRightText}>
                <Text style={s.b}>Código: </Text>DSI-FOA-FR-XX
              </Text>
            </View>
            {/* Celda de paginación vacía por decisión del dueño (sin `render`). */}
            <View style={s.hRightCell} />
            <View style={s.hRightCell}>
              <Text style={s.hRightText}>
                <Text style={s.b}>Versión: </Text>1
              </Text>
            </View>
            <View style={s.hRightCellLast}>
              <Text style={s.hRightText}>
                <Text style={s.b}>Vigente a partir de: </Text>2020-03-12
              </Text>
            </View>
          </View>
        </View>

        {/* CONTENIDO DEL CONTRATO */}
        <P>
          <B>
            CONTRATO DE COMODATO PRECARIO SUSCRITO ENTRE EL DIRECTOR DEL DEPARTAMENTO DE {dep} Y EL
            ESTUDIANTE O PROFESOR, BENEFICIARIO DEL PROGRAMA DE PRÉSTAMO DE USO DE EQUIPOS ACADÉMICOS.
          </B>
        </P>

        <P>
          Entre los suscritos <B>{d.adminNombre}</B>, mayor de edad y vecino de la ciudad de Pasto (N),
          identificado con la Cédula de Ciudadanía No <B>{d.adminCedula}</B>, actuando en calidad de Director
          del Departamento de <B>{d.dependenciaNombre}</B> de la UNIVERSIDAD DE NARIÑO, ente universitario
          autónomo de carácter oficial del orden Departamental, domiciliado en Pasto y quien en adelante se
          llamará <B>EL COMODANTE</B> y por la otra, <B>{d.usuarioNombre}</B>, mayor de edad, identificado con
          cédula de ciudadanía número <B>{d.usuarioCedula}</B> quien, en lo sucesivo, y para todos los efectos
          de este contrato, se denominará <B>EL COMODATARIO</B>, hemos celebrado el contrato de comodato
          precario que se regirá por las cláusulas que a continuación se enuncian y en lo no previsto en ellas
          por las disposiciones legales aplicables a la materia de qué trata el presente acto jurídico, en
          especial por las prescripciones contenidas en los artículos 2200 y siguientes del Código Civil.
        </P>

        <Text style={s.h3}>CONSIDERANDO:</Text>
        <P>
          Que en aras de garantizar los procesos académicos y optimizar la interacción por medios, teniendo
          ello incidencia directa en la prestación del servicio educativo para el desarrollo de actividades
          prácticas, se encontró necesario facilitar en la medida de la disposición de recursos de la
          Universidad de Nariño, el préstamo de componentes académicos a los estudiantes y profesores de la
          Universidad de Nariño.
        </P>

        <P>A continuación, los requisitos para acceder al préstamo:</P>
        <Text style={s.li}>• Ser estudiante o profesor de la Universidad de Nariño.</Text>
        <Text style={s.li}>
          • Portar carnet que acredite la identificación de la persona o recibo de matrícula más un documento
          que lo identifique.
        </Text>

        <P>Se pactaron las siguientes cláusulas:</P>

        <Text style={s.h4}>PRIMERA: OBJETO DEL CONTRATO.</Text>
        <P>
          EL COMODANTE entrega al COMODATARIO, y éste recibe, a título de COMODATO PRECARIO, el siguiente
          mueble: <B>{d.recursoNombre}</B>:
        </P>
        <Text style={s.li}>1. QR: {d.recursoQr}</Text>
        <Text style={s.li}>2. TIPO: {d.recursoTipo}</Text>
        <Text style={s.li}>3. NOMBRE: {d.recursoNombre}</Text>
        <Text style={s.li}>4. DESCRIPCIÓN: {d.recursoDescripcion}</Text>

        <Text style={s.h4}>SEGUNDA: PROPIEDAD Y USO PERMITIDO.</Text>
        <P>
          EL COMODANTE es propietario del mueble anteriormente descrito, el cual fue adquirido, y EL
          COMODATARIO utilizará exclusivamente el bien mueble antes mencionado y entregado para el desarrollo
          de actividades académicas propuestas en su plan de estudios.
        </P>
        <P>
          <B>PARÁGRAFO:</B> Al momento de la firma del presente contrato las partes manifiestan que el bien
          mueble descrito se encuentra en perfecto estado para el uso que EL COMODATARIO le dará al mismo.
        </P>

        <Text style={s.h4}>TERCERA: COMODATO PRECARIO.</Text>
        <P>
          EL COMODANTE podrá solicitar la restitución del mueble entregado en comodato en cualquier momento.
          EL COMODATARIO dispondrá en este caso de un plazo de diez (10) días hábiles para proceder de
          conformidad con la solicitud de EL COMODANTE.
        </P>
        <P>
          <B>PARÁGRAFO:</B> EL COMODANTE deberá tener en cuenta y así respetar el tiempo de duración
          establecido en el contrato.
        </P>

        <Text style={s.h4}>CUARTA: OBLIGACIONES GENERALES DEL COMODATARIO.</Text>
        <P>El Comodatario se obliga a:</P>
        {OBLIGACIONES_GENERALES.map((t, i) => (
          <Text key={i} style={s.li}>
            {i + 1}. {t}
          </Text>
        ))}

        <P style={{ marginTop: 4 }}>
          <B>PARÁGRAFO: OBLIGACIONES ESPECÍFICAS DEL COMODATARIO:</B>
        </P>
        {OBLIGACIONES_ESPECIFICAS.map((t, i) => (
          <Text key={i} style={s.li}>
            {i + 1}. {t}
          </Text>
        ))}

        <Text style={s.h4}>QUINTA: OBLIGACIONES DEL COMODANTE.</Text>
        <P>El Comodante se obliga a:</P>
        <Text style={s.li}>
          1. Entregar el mueble al COMODATARIO en las condiciones necesarias para el ejercicio de actividades
          académicas atinentes al plan de estudios correspondiente.
        </Text>
        <Text style={s.li}>2. Entregar el bien mueble estrictamente determinado en sus características.</Text>
        <Text style={s.li}>3. Las demás propias de la naturaleza del presente contrato.</Text>

        <Text style={s.h4}>SEXTA: RESPONSABILIDAD DEL COMODATARIO.</Text>
        <P>
          En virtud del presente comodato, el COMODATARIO se constituye en guardián del bien objeto del mismo,
          y por ende en el responsable por la realización, la dirección, manejo y control de todas las
          actividades que se realicen con dicho bien. El COMODATARIO responderá hasta por la culpa levísima en
          el uso que dé al bien objeto de comodato, ante el COMODANTE, por los daños o perjuicios, y en general
          por cualquier reclamación que puedan derivarse del desarrollo de las citadas actividades, o del
          descuido en la custodia o el mal uso que a dicho bien se les dé.
        </P>

        <Text style={s.h4}>SÉPTIMA: PLAZO.</Text>
        <P>
          El término de duración del presente contrato de comodato precario será desde la fecha de suscripción
          del presente contrato hasta la fecha del <B>{d.fechaDevolucion}</B>.
        </P>

        <Text style={s.h4}>OCTAVA: RESTITUCIÓN DEL BIEN MUEBLE ENTREGADO EN COMODATO.</Text>
        <P>
          El COMODATARIO deberá restituir el mueble objeto del presente contrato a la finalización del plazo
          establecido o en cualquier momento que sea requerido por EL COMODANTE.
        </P>
        <P>
          <B>PARÁGRAFO:</B> En el evento de incumplimiento por parte del COMODATARIO, EL COMODANTE podrá acudir
          a la jurisdicción ordinaria, sin que sea necesario la constitución en mora o presentación de
          requerimiento alguno por parte de EL COMODANTE.
        </P>

        <Text style={s.h4}>NOVENA: INDEMNIDAD.</Text>
        <P>
          EL COMODATARIO mantendrá indemne AL COMODANTE, de todo daño y/o perjuicio que puedan llegar a causar
          el bien que se le dispone.
        </P>

        <Text style={s.h4}>DÉCIMA: VALOR.</Text>
        <P>
          El presente contrato no genera erogaciones para las partes, por lo que EL COMODATARIO no está
          obligado al pago de precio alguno.
        </P>

        <Text style={s.h4}>DÉCIMA PRIMERA: RÉGIMEN LEGAL.</Text>
        <P>
          El presente contrato se rige por las normas civiles y comerciales, según lo establecido en el artículo
          2200 y siguientes del Código Civil colombiano y por lo señalado en el presente contrato.
        </P>

        <Text style={s.h4}>DÉCIMA SEGUNDA: DOMICILIO CONTRACTUAL.</Text>
        <P>
          Para todos los efectos legales y contractuales se fija el domicilio en el Municipio de San Juan de
          Pasto – Nariño.
        </P>

        <Text style={s.h4}>DÉCIMA TERCERA: NOTIFICACIONES.</Text>
        <P>Las notificaciones, comunicaciones y correspondencia entre las partes se enviarán a las siguientes:</P>
        <Text style={s.li}>• COMODANTE: {d.adminTelefono ?? "[Teléfono no disponible]"}</Text>
        <Text style={s.li}>• COMODATARIO: {d.usuarioTelefono}</Text>

        <Text style={s.h4}>DÉCIMA CUARTA: SUPERVISIÓN.</Text>
        <P>
          La supervisión del presente contrato será ejercida por el director del departamento de{" "}
          <B>{d.dependenciaNombre}</B> de la UNIVERSIDAD DE NARIÑO, dando aplicación a las funciones propias
          de la supervisión, quien cumplirá entre otras con las siguientes funciones:
        </P>
        <Text style={s.li}>
          1. Vigilar y constatar la ejecución y cumplimiento de las obligaciones a cargo de COMODATARIO.
        </Text>
        <Text style={s.li}>
          2. Impartir instrucciones y recomendaciones al COMODATARIO sobre asuntos de responsabilidad, que sean
          necesarias para la correcta ejecución del presente contrato.
        </Text>
        <Text style={s.li}>
          3. Certificar el cumplimiento a satisfacción del objeto contractual y de las obligaciones originadas
          de este contrato.
        </Text>
        <P>
          Las partes se obligan a informar oportunamente por escrito, el cambio de su dirección o correo
          electrónico y en todo caso a mantener actualizada dicha información.
        </P>

        {/* BLOQUES DE FIRMAS PROTEGIDOS CONTRA SALTO DE PÁGINA DESIGUAL */}
        <View wrap={false}>
          <P style={{ marginTop: 10 }}>
            En constancia de la entrega del bien al comodatario, se firma en la ciudad de Pasto, a la fecha del{" "}
            <B>{d.fechaSuscripcion}</B>
          </P>

          <View style={s.firmasGrid}>
            <View style={s.firmaColumna}>
              <P>
                <B>EL COMODANTE</B>
              </P>
              <Firma firmaUrl={d.adminFirma} />
              <P>
                <B>{d.adminNombre}</B>
                {"\n"}Cédula: {d.adminCedula}
                {"\n"}Director del departamento de {d.dependenciaNombre}
                {"\n"}UNIVERSIDAD DE NARIÑO
              </P>
            </View>

            <View style={s.firmaColumna}>
              <P>
                <B>EL COMODATARIO</B>
              </P>
              <Firma firmaUrl={d.usuarioFirma} />
              <P>
                <B>{d.usuarioNombre}</B>
                {"\n"}Cédula: {d.usuarioCedula}
                {"\n"}Código Estudiantil: {d.usuarioCodigo}
                {"\n"}UNIVERSIDAD DE NARIÑO
              </P>
            </View>
          </View>
        </View>

        <View wrap={false} style={{ marginTop: 20 }}>
          <P>
            En constancia de la devolución del bien al comodante, se firma en la ciudad de Pasto, a la fecha del
            ___________________________
          </P>

          <View style={s.firmasGrid}>
            <View style={s.firmaColumna}>
              <P>
                <B>EL COMODANTE</B>
              </P>

              <P style={{ marginTop: 35 }}>
                <B>{d.adminNombre}</B>
                {"\n"}Cédula: {d.adminCedula}
                {"\n"}Director del departamento de {d.dependenciaNombre}
                {"\n"}UNIVERSIDAD DE NARIÑO
              </P>
            </View>

            <View style={s.firmaColumna}>
              <P>
                <B>EL COMODATARIO</B>
              </P>

              <P style={{ marginTop: 35 }}>
                <B>{d.usuarioNombre}</B>
                {"\n"}Cédula: {d.usuarioCedula}
                {"\n"}Código Estudiantil: {d.usuarioCodigo}
                {"\n"}UNIVERSIDAD DE NARIÑO
              </P>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}