/**
 * npm run db:seed:admin [--flags]
 *
 * Crea administradores (y su dependencia si no existe). Re-ejecutable.
 *
 * Modo interactivo (por defecto, te pregunta todo por consola):
 *   npm run db:seed:admin
 *
 * Modo no interactivo (útil para automatizar o probar):
 *   npm run db:seed:admin -- --rol admin --codigo ADM001 --cedula 111 \
 *     --nombres Ana --apellidos Pérez --dep-codigo 34 \
 *     --dep-nombre "Ingeniería de Sistemas" --password "Secreta123" --yes
 *
 * Nota: la contraseña en modo interactivo se escribe visible en consola
 * (readline estándar). Nunca se guarda en archivos: solo su hash bcrypt va a la DB.
 */
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { eq } from "drizzle-orm";
import { db, closeDb } from "../src/db/index.js";
import { dependencias, users } from "../src/db/schema.js";
import { hashPassword } from "../src/lib/password.js";

type Rol = "admin" | "superadmin";

interface AdminInput {
  rol: Rol;
  codigo: string;
  cedula: string;
  firstName: string;
  lastName: string;
  programa: string | null;
  telefono: string | null;
  dependenciaCodigo: string | null;
  dependenciaNombre: string | null;
  password: string;
}

class ValidationError extends Error {}

// ---------- Núcleo compartido por ambos modos ----------

async function createAdmin(data: AdminInput): Promise<void> {
  if (data.password.length < 8) {
    throw new ValidationError("La contraseña debe tener mínimo 8 caracteres.");
  }
  const [codigoTaken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.codigo, data.codigo));
  if (codigoTaken) {
    throw new ValidationError(`El código '${data.codigo}' ya existe.`);
  }
  const [cedulaTaken] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.cedula, data.cedula));
  if (cedulaTaken) {
    throw new ValidationError(`La cédula '${data.cedula}' ya existe.`);
  }

  let depId: number | null = null;
  if (data.rol === "admin") {
    if (!data.dependenciaCodigo) {
      throw new ValidationError("El rol admin requiere dependencia.");
    }
    const [dep] = await db
      .select()
      .from(dependencias)
      .where(eq(dependencias.codigo, data.dependenciaCodigo));
    if (dep) {
      if (dep.administradorId) {
        throw new ValidationError(
          `La dependencia '${dep.nombre}' ya tiene administrador.`,
        );
      }
      depId = dep.id;
    } else if (!data.dependenciaNombre) {
      throw new ValidationError(
        `La dependencia '${data.dependenciaCodigo}' no existe: indica --dep-nombre para crearla.`,
      );
    }
  }

  const passwordHash = await hashPassword(data.password);

  await db.transaction(async (tx) => {
    let finalDepId = depId;
    if (data.rol === "admin" && finalDepId === null) {
      const [created] = await tx
        .insert(dependencias)
        .values({
          codigo: data.dependenciaCodigo!,
          nombre: data.dependenciaNombre!,
        })
        .returning({ id: dependencias.id });
      finalDepId = created.id;
    }
    const [user] = await tx
      .insert(users)
      .values({
        codigo: data.codigo,
        passwordHash,
        rol: data.rol,
        cedula: data.cedula,
        firstName: data.firstName,
        lastName: data.lastName,
        programa: data.programa,
        telefono: data.telefono,
      })
      .returning({ id: users.id });
    if (finalDepId !== null) {
      await tx
        .update(dependencias)
        .set({ administradorId: user.id })
        .where(eq(dependencias.id, finalDepId));
    }
  });
}

// ---------- Modo no interactivo (flags) ----------

function getFlag(name: string): string | null {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1 || idx + 1 >= process.argv.length) return null;
  return process.argv[idx + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function printHelp() {
  console.log(`Uso:
  npm run db:seed:admin
  npm run db:seed:admin -- --rol admin --codigo ADM001 --cedula 111 --nombres Ana \\
    --apellidos Pérez --dep-codigo 34 --dep-nombre "Ing. de Sistemas" --password "Xxxxx123" --yes

Flags: --rol (admin|superadmin) --codigo --cedula --nombres --apellidos
  --programa --telefono --dep-codigo --dep-nombre --password --yes (omitir confirmación)`);
}

async function runFromFlags(): Promise<boolean> {
  if (hasFlag("help") || hasFlag("h")) {
    printHelp();
    return true;
  }
  const codigo = getFlag("codigo");
  // Sin --codigo no hay modo flags: se usa el interactivo
  if (!codigo) return false;

  const rol = (getFlag("rol") ?? "admin").toLowerCase();
  if (rol !== "admin" && rol !== "superadmin") {
    throw new ValidationError("Flag --rol debe ser admin o superadmin.");
  }
  const data: AdminInput = {
    rol,
    codigo,
    cedula: getFlag("cedula") ?? "",
    firstName: getFlag("nombres") ?? "",
    lastName: getFlag("apellidos") ?? "",
    programa: getFlag("programa"),
    telefono: getFlag("telefono"),
    dependenciaCodigo: getFlag("dep-codigo"),
    dependenciaNombre: getFlag("dep-nombre"),
    password: getFlag("password") ?? "",
  };
  for (const [k, v] of [
    ["cedula", data.cedula],
    ["nombres", data.firstName],
    ["apellidos", data.lastName],
    ["password", data.password],
  ] as const) {
    if (!v) throw new ValidationError(`Falta el flag --${k}.`);
  }

  await createAdmin(data);
  console.log(
    `OK: ${data.rol} '${data.codigo}' creado` +
      (data.rol === "admin" ? ` (dep. ${data.dependenciaCodigo}).` : "."),
  );
  return true;
}

// ---------- Modo interactivo ----------

const rl = createInterface({ input, output });

async function ask(
  label: string,
  opts: { allowEmpty?: boolean } = {},
): Promise<string> {
  for (;;) {
    const answer = (await rl.question(`${label}: `)).trim();
    if (answer !== "" || opts.allowEmpty) return answer;
    console.log("  -> Este campo es obligatorio.");
  }
}

async function askRol(): Promise<Rol> {
  for (;;) {
    const answer = (
      await rl.question("Rol (admin / superadmin) [admin]: ")
    )
      .trim()
      .toLowerCase();
    if (answer === "" || answer === "admin") return "admin";
    if (answer === "superadmin") return "superadmin";
    console.log("  -> Escribe 'admin' o 'superadmin'.");
  }
}

async function askConfirm(label: string): Promise<boolean> {
  for (;;) {
    const answer = (await rl.question(`${label} (s/n): `))
      .trim()
      .toLowerCase();
    if (["s", "si", "sí", "y", "yes"].includes(answer)) return true;
    if (["n", "no"].includes(answer)) return false;
    console.log("  -> Responde s o n.");
  }
}

async function runInteractive() {
  console.log("Seed de administradores (rol admin o superadmin).");
  console.log("Tip: también puedes pasarlo todo por flags, ver --help.\n");
  for (;;) {
    console.log("--- Nuevo administrador ---");
    const rol = await askRol();
    const codigo = await ask("Código (login, único)");
    const cedula = await ask("Cédula (única)");
    const firstName = await ask("Nombres");
    const lastName = await ask("Apellidos");
    const programa =
      (await ask("Programa o facultad (opcional, Enter para omitir)", {
        allowEmpty: true,
      })) || null;
    const telefono =
      (await ask("Teléfono (opcional, Enter para omitir)", {
        allowEmpty: true,
      })) || null;

    let dependenciaCodigo: string | null = null;
    let dependenciaNombre: string | null = null;
    if (rol === "admin") {
      dependenciaCodigo = await ask("Código de dependencia (ej. 34)");
      const [dep] = await db
        .select()
        .from(dependencias)
        .where(eq(dependencias.codigo, dependenciaCodigo));
      if (!dep) {
        console.log(
          `  -> La dependencia '${dependenciaCodigo}' no existe, se creará.`,
        );
        dependenciaNombre = await ask("Nombre de la dependencia");
      }
    }

    let password = "";
    for (;;) {
      password = await ask("Contraseña (mínimo 8 caracteres)");
      if (password.length < 8) {
        console.log("  -> Muy corta, mínimo 8 caracteres.");
        continue;
      }
      if ((await ask("Confirma la contraseña")) !== password) {
        console.log("  -> No coinciden, intenta de nuevo.");
        continue;
      }
      break;
    }

    console.log("\nResumen:");
    console.log(`  Rol:          ${rol}`);
    console.log(`  Código:       ${codigo}`);
    console.log(`  Cédula:       ${cedula}`);
    console.log(`  Nombre:       ${firstName} ${lastName}`);
    if (programa) console.log(`  Programa:     ${programa}`);
    if (rol === "admin") console.log(`  Dependencia:  ${dependenciaCodigo}`);
    if (!(await askConfirm("¿Crear?"))) {
      console.log("Cancelado, no se guardó nada.");
    } else {
      try {
        await createAdmin({
          rol,
          codigo,
          cedula,
          firstName,
          lastName,
          programa,
          telefono,
          dependenciaCodigo,
          dependenciaNombre,
          password,
        });
        console.log(`\nOK: ${rol} '${codigo}' creado.`);
      } catch (err) {
        console.log(
          `  -> No se creó: ${err instanceof Error ? err.message : err}`,
        );
      }
    }
    if (!(await askConfirm("\n¿Crear otro?"))) break;
  }
  rl.close();
}

async function main() {
  let handled = false;
  try {
    handled = await runFromFlags();
  } catch (err) {
    console.error("Error:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
    handled = true;
  }
  if (!handled) {
    await runInteractive();
  } else {
    rl.close();
  }
  await closeDb();
}

main();
