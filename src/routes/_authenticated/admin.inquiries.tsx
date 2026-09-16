import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { Archive, ArchiveRestore, Loader2, Mail, MailOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { listInquiries, updateInquiry, type InquiryRow } from "@/lib/inquiries.functions";
import { PLATFORM_NAME } from "@/lib/brand";

export const Route = createFileRoute("/_authenticated/admin/inquiries")({
  head: () => ({ meta: [{ title: `Užklausos | ${PLATFORM_NAME}` }] }),
  component: InquiriesPage,
});

type Filter = "all" | "unread" | "archived";

function formatDate(value: string, withTime = false) {
  const date = new Date(value);
  return date.toLocaleString("lt-LT", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  });
}

function InquiriesPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fetchInquiries = useServerFn(listInquiries);
  const patchInquiry = useServerFn(updateInquiry);

  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: t("inquiries.filterAll") },
    { key: "unread", label: t("inquiries.filterUnread") },
    { key: "archived", label: t("inquiries.filterArchived") },
  ];

  const inquiries = useQuery({
    queryKey: ["inquiries", filter, search],
    queryFn: () => fetchInquiries({ data: { filter, search } }),
  });

  const mutate = useMutation({
    mutationFn: (input: { id: string; read?: boolean; archived?: boolean }) =>
      patchInquiry({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["inquiries"] });
      void queryClient.invalidateQueries({ queryKey: ["inquiries-unread"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("common.error")),
  });

  const rows = inquiries.data?.inquiries ?? [];
  const selected = useMemo(
    () => rows.find((row) => row.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const open = (row: InquiryRow) => {
    setSelectedId(row.id);
    if (!row.read_at) mutate.mutate({ id: row.id, read: true });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("inquiries.title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("inquiries.subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-md border bg-card p-1">
          {filters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`rounded px-3 py-1.5 text-sm transition-colors ${
                filter === item.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="relative min-w-[220px] flex-1">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("inquiries.searchPlaceholder")}
            aria-label={t("inquiries.searchPlaceholder")}
            className="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="overflow-hidden rounded-md border bg-card">
          {inquiries.isLoading ? (
            <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {t("common.loading")}
            </div>
          ) : rows.length === 0 ? (
            <p className="p-6 text-sm text-muted-foreground">{t("inquiries.empty")}</p>
          ) : (
            <ul className="divide-y">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => open(row)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent ${
                      selectedId === row.id ? "bg-accent" : ""
                    }`}
                  >
                    <span className="mt-1 shrink-0">
                      {row.read_at ? (
                        <MailOpen aria-hidden="true" className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Mail aria-hidden="true" className="h-4 w-4 text-primary" />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className={row.read_at ? "truncate" : "truncate font-semibold"}>
                          {row.name}
                        </span>
                        <span className="text-xs text-muted-foreground">{row.email}</span>
                      </span>
                      <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                        {row.message}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(row.created_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <aside className="rounded-md border bg-card p-5">
          {selected ? (
            <div>
              <p className="text-xs text-muted-foreground">
                {formatDate(selected.created_at, true)}
              </p>
              <h2 className="mt-1 text-xl font-semibold">{selected.name}</h2>
              <a
                href={`mailto:${selected.email}`}
                className="text-sm text-primary underline underline-offset-2"
              >
                {selected.email}
              </a>
              {selected.phone ? (
                <p className="mt-1 text-sm text-muted-foreground">{selected.phone}</p>
              ) : null}

              <p className="mt-4 rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                {selected.message}
              </p>

              {selected.source ? (
                <p className="mt-3 text-xs text-muted-foreground">{selected.source}</p>
              ) : null}

              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => mutate.mutate({ id: selected.id, read: selected.read_at === null })}
                  className="rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                >
                  {selected.read_at ? t("inquiries.markUnread") : t("inquiries.markRead")}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    mutate.mutate({ id: selected.id, archived: selected.archived_at === null })
                  }
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                >
                  {selected.archived_at ? (
                    <>
                      <ArchiveRestore aria-hidden="true" className="h-4 w-4" />
                      {t("inquiries.unarchive")}
                    </>
                  ) : (
                    <>
                      <Archive aria-hidden="true" className="h-4 w-4" />
                      {t("inquiries.archive")}
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t("inquiries.selectHint")}</p>
          )}
        </aside>
      </div>
    </div>
  );
}
