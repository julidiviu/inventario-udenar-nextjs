import { PerfilView } from "@/components/perfil/PerfilView";
import { mockPerfilIncompleto } from "@/mocks/perfil";

export default function PerfilPage() {
  return <PerfilView initial={mockPerfilIncompleto} />;
}
