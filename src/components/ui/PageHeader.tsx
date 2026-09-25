export function PageHeader({ title }: { title: string }) {
  return (
    <div className="mb-8 border-b-[3px] border-brand-700 pb-4 text-center">
      <h1 className="text-2xl font-extrabold text-brand-700 sm:text-3xl">{title}</h1>
    </div>
  );
}
