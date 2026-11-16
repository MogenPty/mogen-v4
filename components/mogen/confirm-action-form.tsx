"use client";

export default function ConfirmActionForm({
  action,
  fields,
  message,
  label,
  className,
}: Readonly<{
  action: (data: FormData) => void | Promise<void>;
  fields: Record<string, string>;
  message: string;
  label: string;
  className: string;
}>) {
  return (
    <form action={action} onSubmit={event => {
      if (!window.confirm(message)) event.preventDefault();
    }}>
      {Object.entries(fields).map(([name, value]) => <input key={name} type="hidden" name={name} value={value} />)}
      <button className={className}>{label}</button>
    </form>
  );
}
