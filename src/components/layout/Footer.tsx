export function Footer() {
  return (
    <footer className="border-t border-brand-500 bg-brand-700 px-4 py-3 text-xs text-brand-100 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400">
      <div className="mx-auto flex max-w-7xl flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong className="text-white">Copyright &copy; 2025</strong> Todos los derechos reservados.
        </p>
        <p>
          <b className="text-white">Versión</b> 1.0.0
        </p>
      </div>
    </footer>
  );
}
