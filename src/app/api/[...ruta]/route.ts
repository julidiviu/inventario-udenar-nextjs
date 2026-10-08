function noEncontrado() {
  return Response.json({ error: "No encontrado." }, { status: 404 });
}

export async function GET() {
  return noEncontrado();
}

export async function POST() {
  return noEncontrado();
}

export async function PUT() {
  return noEncontrado();
}

export async function PATCH() {
  return noEncontrado();
}

export async function DELETE() {
  return noEncontrado();
}
