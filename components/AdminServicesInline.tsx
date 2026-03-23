"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { getPlaceAccentUi } from "@/lib/place-accent-ui";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Pencil, Trash2, Plus } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  createService,
  updateService,
  deleteService,
  type ServiceData,
  type ServiceInput,
} from "@/lib/services";
import type { Place } from "@/lib/places";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";

export const COLOR_PRESETS = [
  { value: "bg-amber-500/30 border-amber-500/60", label: "Amber" },
  { value: "bg-rose-500/30 border-rose-500/60", label: "Rose" },
  { value: "bg-orange-500/30 border-orange-500/60", label: "Orange" },
  { value: "bg-violet-500/30 border-violet-500/60", label: "Violet" },
  { value: "bg-emerald-500/30 border-emerald-500/60", label: "Emerald" },
  { value: "bg-pink-500/30 border-pink-500/60", label: "Pink" },
  { value: "bg-aurora-magenta/30 border-aurora-magenta/50", label: "Magenta" },
  { value: "bg-cyan-500/30 border-cyan-500/60", label: "Cyan" },
  { value: "bg-teal-500/30 border-teal-500/60", label: "Teal" },
];

function resolveTitle(s: ServiceData, locale: "sk" | "en" | "ru" | "uk"): string {
  const key = `title${locale.charAt(0).toUpperCase()}${locale.slice(1)}` as "titleSk" | "titleEn" | "titleRu" | "titleUk";
  return (s[key] as string | undefined) ?? s.title ?? "";
}

function ServiceForm({
  service,
  onSave,
  onCancel,
  place = "massage",
}: {
  service?: ServiceData | null;
  onSave: (input: ServiceInput) => Promise<void>;
  onCancel: () => void;
  place?: Place;
}) {
  const t = useTranslations("admin");
  const ui = useMemo(() => getPlaceAccentUi(place), [place]);
  const [titleSk, setTitleSk] = useState(service?.titleSk ?? service?.title ?? "");
  const [titleEn, setTitleEn] = useState(service?.titleEn ?? "");
  const [titleRu, setTitleRu] = useState(service?.titleRu ?? "");
  const [titleUk, setTitleUk] = useState(service?.titleUk ?? "");
  const [color, setColor] = useState(service?.color ?? COLOR_PRESETS[0].value);
  const [durationMinutes, setDurationMinutes] = useState(
    String(service?.durationMinutes ?? 60)
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dur = parseInt(durationMinutes, 10);
    if (!titleSk.trim()) {
      toast.error(t("titleRequired"));
      return;
    }
    if (isNaN(dur) || dur < 15 || dur > 240) {
      toast.error(t("durationInvalid"));
      return;
    }
    setLoading(true);
    try {
      await onSave({
        titleSk: titleSk.trim(),
        titleEn: titleEn.trim() || titleSk.trim(),
        titleRu: titleRu.trim() || titleSk.trim(),
        titleUk: titleUk.trim() || titleSk.trim(),
        color,
        durationMinutes: dur,
      });
      onCancel();
    } catch (err) {
      toast.error(t("saveServiceFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-icyWhite/80 mb-1.5">{t("titleSk")}</label>
        <Input
          value={titleSk}
          onChange={(e) => setTitleSk(e.target.value)}
          placeholder={t("titlePlaceholder")}
          className="bg-white/5 border-white/10 text-icyWhite"
        />
      </div>
      <div>
        <label className="block text-sm text-icyWhite/80 mb-1.5">{t("titleEn")}</label>
        <Input
          value={titleEn}
          onChange={(e) => setTitleEn(e.target.value)}
          placeholder="e.g. Swedish Massage"
          className="bg-white/5 border-white/10 text-icyWhite"
        />
      </div>
      <div>
        <label className="block text-sm text-icyWhite/80 mb-1.5">{t("titleRu")}</label>
        <Input
          value={titleRu}
          onChange={(e) => setTitleRu(e.target.value)}
          placeholder="напр. Шведский массаж"
          className="bg-white/5 border-white/10 text-icyWhite"
        />
      </div>
      <div>
        <label className="block text-sm text-icyWhite/80 mb-1.5">{t("titleUk")}</label>
        <Input
          value={titleUk}
          onChange={(e) => setTitleUk(e.target.value)}
          placeholder="напр. Шведський масаж"
          className="bg-white/5 border-white/10 text-icyWhite"
        />
      </div>
      <div>
        <label className="block text-sm text-icyWhite/80 mb-1.5">{t("colorLabel")}</label>
        <div className="flex flex-wrap gap-2">
          {COLOR_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => setColor(preset.value)}
              className={clsx(
                "px-3 py-1.5 rounded-lg border text-sm transition-all",
                preset.value,
                color === preset.value
                  ? ui.ringSelected
                  : "opacity-70 hover:opacity-100"
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm text-icyWhite/80 mb-1.5">
          {t("durationLabel")}
        </label>
        <Input
          type="number"
          min={15}
          max={240}
          step={15}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
          className="bg-white/5 border-white/10 text-icyWhite"
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-white/10 text-icyWhite hover:bg-white/10"
          onClick={onCancel}
        >
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          className={`flex-1 ${ui.btnPrimarySm}`}
          disabled={loading}
        >
          {loading ? t("saving") : service ? t("update") : t("add")}
        </Button>
      </div>
    </form>
  );
}

interface AdminServicesInlineProps {
  services: ServiceData[];
  onServicesChange: (services: ServiceData[]) => void;
  place?: Place;
}

export default function AdminServicesInline({
  services,
  onServicesChange,
  place = "massage",
}: AdminServicesInlineProps) {
  const params = useParams();
  const rawLocale = (params?.locale as string) ?? "ru";
  const baseLocale = rawLocale.slice(0, 2) as "sk" | "en" | "ru" | "uk";
  const locale: "sk" | "en" | "ru" | "uk" =
    baseLocale === "sk" || baseLocale === "en" || baseLocale === "ru" || baseLocale === "uk"
      ? baseLocale
      : "ru";
  const t = useTranslations("admin");
  const ui = useMemo(() => getPlaceAccentUi(place), [place]);
  const [modalOpen, setModalOpen] = useState<"add" | "edit" | null>(null);
  const [editService, setEditService] = useState<ServiceData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceData | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "services"),
      where("place", "==", place),
      orderBy("title", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        const s: ServiceData = {
          id: d.id,
          title: ((data[`title${locale.charAt(0).toUpperCase()}${locale.slice(1)}`] as string) ?? data.title as string) ?? "",
          titleSk: data.titleSk as string | undefined,
          titleEn: data.titleEn as string | undefined,
          titleRu: data.titleRu as string | undefined,
          titleUk: data.titleUk as string | undefined,
          color: (data.color as string) ?? "bg-gray-500/30 border-gray-500/60",
          durationMinutes: (data.durationMinutes as number) ?? 60,
        };
        return s;
      });
      onServicesChange(list);
    });
    return () => unsub();
  }, [onServicesChange, place, locale]);

  const handleSaveAdd = useCallback(async (input: ServiceInput) => {
    await createService(input, place);
    toast.success(t("serviceAdded"));
    setModalOpen(null);
  }, [place, t]);

  const handleSaveEdit = useCallback(
    async (input: ServiceInput) => {
      if (!editService) return;
      await updateService(editService.id, input);
      toast.success(t("serviceUpdated"));
      setModalOpen(null);
      setEditService(null);
    },
    [editService, t]
  );

  const handleDelete = useCallback(async (s: ServiceData) => {
    try {
      await deleteService(s.id);
      toast.success(t("serviceDeleted"));
      setDeleteConfirm(null);
    } catch {
      toast.error(t("deleteServiceFailed"));
    }
  }, [t]);

  return (
    <div className="rounded-xl border border-white/10 bg-nearBlack/80 overflow-hidden">
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          {services.length === 0 && (
            <span className="text-sm text-icyWhite/50 mr-2">{t("noServicesYet")}</span>
          )}
          {services.length > 0 && (
            <span className="text-xs text-icyWhite/60 mr-2">{t("servicesLabel")}</span>
          )}
          {services.map((s) => (
            <div
              key={s.id}
              className={clsx(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border group",
                s.color
              )}
            >
              <span className="text-sm">{s.title}</span>
              <span className="text-xs text-icyWhite/70">({s.durationMinutes}m)</span>
              <button
                type="button"
                onClick={() => {
                  setEditService(s);
                  setModalOpen("edit");
                }}
                className="p-0.5 rounded hover:bg-black/20 transition-opacity"
                aria-label={t("edit")}
              >
                <Pencil className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setDeleteConfirm(s)}
                className="p-0.5 rounded hover:bg-black/20 text-red-400 transition-opacity"
                aria-label={t("delete")}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              setEditService(null);
              setModalOpen("add");
            }}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg border border-dashed border-white/20 text-icyWhite/60 hover:text-icyWhite transition-colors text-sm ${ui.addServiceBorder}`}
          >
            <Plus className="w-3.5 h-3.5" />
            {t("addButton")}
          </button>
        </div>
      </div>

      {/* Add/Edit modal */}
      {(modalOpen === "add" || modalOpen === "edit") && (
        <>
          <div
            className="fixed inset-0 z-50 bg-nearBlack/80 backdrop-blur-sm"
            onClick={() => {
              setModalOpen(null);
              setEditService(null);
            }}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 z-[51] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-nearBlack p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-xl text-icyWhite mb-4">
              {modalOpen === "add" ? t("addService") : t("editService")}
            </h3>
            <ServiceForm
              place={place}
              service={modalOpen === "edit" ? editService : null}
              onSave={modalOpen === "add" ? handleSaveAdd : handleSaveEdit}
              onCancel={() => {
                setModalOpen(null);
                setEditService(null);
              }}
            />
          </div>
        </>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <>
          <div
            className="fixed inset-0 z-50 bg-nearBlack/80 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
            aria-hidden
          />
          <div
            className="fixed left-1/2 top-1/2 z-[61] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-nearBlack p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg text-icyWhite mb-2">{t("deleteServiceConfirm")}</h3>
            <p className="text-sm text-icyWhite/70 mb-4">
              {t("deleteServiceNote", { name: deleteConfirm.title })}
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/10 text-icyWhite hover:bg-white/10"
                onClick={() => setDeleteConfirm(null)}
              >
                {t("cancel")}
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                onClick={() => handleDelete(deleteConfirm)}
              >
                {t("delete")}
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
