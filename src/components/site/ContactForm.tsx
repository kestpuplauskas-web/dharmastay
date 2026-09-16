import { useState } from "react";
import { z } from "zod";

import { useContent, useLocale } from "@/content";
import { contact } from "@/data/contact";
import { submitInquiry } from "@/lib/inquiries.functions";
import { sendContactMessageFn } from "@/lib/rentivo.functions";

function buildFormSchema(kontaktaiForm: ReturnType<typeof useContent>["kontaktaiForm"]) {
  return z.object({
    name: z.string().trim().min(2, kontaktaiForm.nameError).max(120, kontaktaiForm.nameError),
    email: z.string().trim().email(kontaktaiForm.emailError).max(255, kontaktaiForm.emailError),
    phone: z.string().trim().max(50, kontaktaiForm.phoneError),
    message: z
      .string()
      .trim()
      .min(5, kontaktaiForm.messageError)
      .max(2000, kontaktaiForm.messageError),
  });
}

type FormSchema = ReturnType<typeof buildFormSchema>;

type Errors = Partial<Record<keyof z.infer<FormSchema>, string>>;

function Field({
  label,
  value,
  error,
  type = "text",
  autoComplete,
  multiline,
  onChange,
}: {
  label: string;
  value: string;
  error?: string | undefined;
  type?: string;
  autoComplete?: string;
  multiline?: boolean;
  onChange: (value: string) => void;
}) {
  const className = `w-full rounded-md border bg-linen px-4 py-3 text-sm text-ink outline-none focus:border-sage ${
    error ? "border-destructive" : "border-border"
  }`;
  return (
    <label className="block space-y-2">
      <span className="label-caps text-stone">{label}</span>
      {multiline ? (
        <textarea
          rows={5}
          value={value}
          maxLength={2000}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      ) : (
        <input
          type={type}
          value={value}
          autoComplete={autoComplete}
          maxLength={255}
          aria-invalid={error ? true : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={className}
        />
      )}
      {error ? (
        <span role="alert" className="block text-sm font-medium text-destructive">
          {error}
        </span>
      ) : null}
    </label>
  );
}

/** Contact form on /kontaktai. Sends through a server function; on backend
 *  failure it offers the plain e-mail route instead of losing the message. */
export function ContactForm() {
  const { kontaktaiForm } = useContent();
  const locale = useLocale();
  const formSchema = buildFormSchema(kontaktaiForm);
  const [values, setValues] = useState({ name: "", email: "", phone: "", message: "" });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  const mailtoHref = `mailto:${contact.email}?subject=${encodeURIComponent(
    "Užklausa iš dharmastay.lt",
  )}&body=${encodeURIComponent(`${values.message}\n\n${values.name}\n${values.phone}`)}`;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;

    const parsed = formSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof Errors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setStatus("sending");

    // Žinutė pirmiausia įrašoma į administravimo dėžutę; el. laiškas — papildomas
    // kanalas. Užtenka, kad pavyktų bent vienas kelias.
    const payload = {
      name: parsed.data.name,
      email: parsed.data.email,
      ...(parsed.data.phone ? { phone: parsed.data.phone } : {}),
      message: parsed.data.message,
    };

    let stored = false;
    try {
      await submitInquiry({ data: { ...payload, lang: locale } });
      stored = true;
    } catch (error) {
      console.error("submitInquiry failed", error);
    }

    let mailed = false;
    try {
      const result = await sendContactMessageFn({ data: payload });
      mailed = result?.delivered === true;
    } catch (error) {
      console.error("sendContactMessage failed", error);
    }

    if (stored || mailed) {
      setStatus("sent");
      setValues({ name: "", email: "", phone: "", message: "" });
    } else {
      setStatus("failed");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-md bg-linen p-6 sm:p-8">
      <div>
        <h2 className="font-display text-2xl font-medium text-ink">{kontaktaiForm.title}</h2>
        <p className="mt-2 text-sm text-stone">{kontaktaiForm.lead}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={kontaktaiForm.name}
          value={values.name}
          autoComplete="name"
          error={errors.name}
          onChange={set("name")}
        />
        <Field
          label={kontaktaiForm.phone}
          type="tel"
          value={values.phone}
          autoComplete="tel"
          error={errors.phone}
          onChange={set("phone")}
        />
      </div>
      <Field
        label={kontaktaiForm.email}
        type="email"
        value={values.email}
        autoComplete="email"
        error={errors.email}
        onChange={set("email")}
      />
      <Field
        label={kontaktaiForm.message}
        value={values.message}
        multiline
        error={errors.message}
        onChange={set("message")}
      />

      <div aria-live="polite">
        {status === "sent" ? (
          <p className="rounded-md bg-warm-white p-4 text-sm text-ink">{kontaktaiForm.success}</p>
        ) : null}
        {status === "failed" ? (
          <p className="rounded-md bg-warm-white p-4 text-sm text-ink">
            {kontaktaiForm.error}{" "}
            <a className="text-sage underline underline-offset-2" href={mailtoHref}>
              {kontaktaiForm.mailFallback}
            </a>
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-md bg-sage px-6 py-3.5 text-sm font-medium text-warm-white transition-opacity disabled:opacity-60"
      >
        {status === "sending" ? kontaktaiForm.submitting : kontaktaiForm.submit}
      </button>
    </form>
  );
}