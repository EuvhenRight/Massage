"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { getTitleForLocale } from "@/types/price-catalog";
import type { Place } from "@/lib/places";
import type {
  PriceCatalogStructure,
  PriceService,
  PriceSection,
  PriceZone,
  ZonePriceItem,
  SexKey,
} from "@/types/price-catalog";
import { generatePriceItemId } from "@/types/price-catalog";
import { getDepilationPriceCatalogExample } from "@/lib/price-catalog-seed";

const EMPTY_CATALOG: PriceCatalogStructure = {
  man: { services: [] },
  woman: { services: [] },
};

function ensureId<T extends { id: string }>(item: T): T {
  return { ...item, id: item.id || generatePriceItemId() };
}

function ensureIds(catalog: PriceCatalogStructure): PriceCatalogStructure {
  const mapService = (s: PriceService): PriceService => {
    const svc = ensureId(s);
    svc.sections = svc.sections?.map((sec) => {
      const section = ensureId(sec);
      section.zones = section.zones?.map((z) => {
        const zone = ensureId(z);
        zone.items = zone.items?.map((i) => ensureId(i)) ?? [];
        return zone;
      });
      return section;
    });
    svc.zones = svc.zones?.map((z) => {
      const zone = ensureId(z);
      zone.items = zone.items?.map((i) => ensureId(i)) ?? [];
      return zone;
    });
    svc.items = svc.items?.map((i) => ensureId(i)) ?? [];
    return svc;
  };
  return {
    man: { services: catalog.man.services.map(mapService) },
    woman: { services: catalog.woman.services.map(mapService) },
  };
}

interface AdminPriceCatalogProps {
  place: Place;
}

type SelectedNode =
  | { type: "sex"; sex: SexKey }
  | { type: "service"; sex: SexKey; serviceIndex: number }
  | { type: "section"; sex: SexKey; serviceIndex: number; sectionIndex: number }
  | { type: "zone"; sex: SexKey; serviceIndex: number; sectionIndex: number | null; zoneIndex: number }
  | { type: "item"; sex: SexKey; serviceIndex: number; sectionIndex: number | null; zoneIndex: number; itemIndex: number }
  | { type: "serviceItem"; sex: SexKey; serviceIndex: number; itemIndex: number }
  | null;

export default function AdminPriceCatalog({ place }: AdminPriceCatalogProps) {
  const t = useTranslations("admin");
  const locale = (useLocale() || "en") as "sk" | "en" | "ru" | "uk";
  const [catalog, setCatalog] = useState<PriceCatalogStructure>(EMPTY_CATALOG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/price-catalog?place=${place}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.man && data?.woman) {
          setCatalog(ensureIds(data));
        } else {
          setCatalog(EMPTY_CATALOG);
        }
      })
      .catch(() => setCatalog(EMPTY_CATALOG))
      .finally(() => setLoading(false));
  }, [place]);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/price-catalog?place=${place}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ensureIds(catalog)),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Save failed");
      }
      toast.success(t("priceCatalogSaved"));
      load();
    } catch (e) {
      toast.error(t("saveFailed"));
    } finally {
      setSaving(false);
    }
  }, [catalog, place, t, load]);

  const updateSex = useCallback(
    (sex: SexKey, services: PriceService[]) => {
      setCatalog((prev) => ({
        ...prev,
        [sex]: { services },
      }));
    },
    []
  );

  const addService = useCallback(
    (sex: SexKey) => {
      const newService: PriceService = {
        id: generatePriceItemId(),
        titleSk: "",
        titleEn: "",
        titleRu: "",
        titleUk: "",
      };
      updateSex(sex, [...catalog[sex].services, newService]);
    },
    [catalog, updateSex]
  );

  const updateService = useCallback(
    (sex: SexKey, index: number, upd: Partial<PriceService>) => {
      const list = [...catalog[sex].services];
      list[index] = { ...list[index], ...upd };
      updateSex(sex, list);
    },
    [catalog, updateSex]
  );

  const removeService = useCallback(
    (sex: SexKey, index: number) => {
      if (!confirm(t("deleteServiceConfirm"))) return;
      const list = catalog[sex].services.filter((_, i) => i !== index);
      updateSex(sex, list);
    },
    [catalog, updateSex, t]
  );

  const addSection = useCallback(
    (sex: SexKey, serviceIndex: number) => {
      const svc = catalog[sex].services[serviceIndex];
      const sections = [...(svc.sections ?? []), { id: generatePriceItemId(), titleSk: "", titleEn: "", titleRu: "", titleUk: "" }];
      updateService(sex, serviceIndex, { sections });
    },
    [catalog, updateService]
  );

  const updateSection = useCallback(
    (sex: SexKey, serviceIndex: number, sectionIndex: number, upd: Partial<PriceSection>) => {
      const svc = catalog[sex].services[serviceIndex];
      const sections = [...(svc.sections ?? [])];
      sections[sectionIndex] = { ...sections[sectionIndex], ...upd };
      updateService(sex, serviceIndex, { sections });
    },
    [catalog, updateService]
  );

  const removeSection = useCallback(
    (sex: SexKey, serviceIndex: number, sectionIndex: number) => {
      if (!confirm(t("deleteServiceConfirm"))) return;
      const svc = catalog[sex].services[serviceIndex];
      const sections = (svc.sections ?? []).filter((_, i) => i !== sectionIndex);
      updateService(sex, serviceIndex, { sections });
    },
    [catalog, updateService, t]
  );

  const addZone = useCallback(
    (sex: SexKey, serviceIndex: number, sectionIndex: number | null) => {
      const svc = catalog[sex].services[serviceIndex];
      const zone: PriceZone = { id: generatePriceItemId(), titleSk: "", titleEn: "", titleRu: "", titleUk: "", items: [] };
      if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
        const sections = [...(svc.sections ?? [])];
        const sec = sections[sectionIndex];
        sections[sectionIndex] = { ...sec, zones: [...(sec.zones ?? []), zone] };
        updateService(sex, serviceIndex, { sections });
      } else {
        updateService(sex, serviceIndex, { zones: [...(svc.zones ?? []), zone] });
      }
    },
    [catalog, updateService]
  );

  const updateZone = useCallback(
    (
      sex: SexKey,
      serviceIndex: number,
      sectionIndex: number | null,
      zoneIndex: number,
      upd: Partial<PriceZone>
    ) => {
      const svc = catalog[sex].services[serviceIndex];
      if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
        const sections = [...(svc.sections ?? [])];
        const zones = [...(sections[sectionIndex].zones ?? [])];
        zones[zoneIndex] = { ...zones[zoneIndex], ...upd };
        sections[sectionIndex] = { ...sections[sectionIndex], zones };
        updateService(sex, serviceIndex, { sections });
      } else {
        const zones = [...(svc.zones ?? [])];
        zones[zoneIndex] = { ...zones[zoneIndex], ...upd };
        updateService(sex, serviceIndex, { zones });
      }
    },
    [catalog, updateService]
  );

  const removeZone = useCallback(
    (sex: SexKey, serviceIndex: number, sectionIndex: number | null, zoneIndex: number) => {
      if (!confirm(t("deleteServiceConfirm"))) return;
      const svc = catalog[sex].services[serviceIndex];
      if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
        const sections = [...(svc.sections ?? [])];
        const zones = (sections[sectionIndex].zones ?? []).filter((_, i) => i !== zoneIndex);
        const sec = { ...sections[sectionIndex], zones };
        // Remove section if it has no zones left
        const newSections =
          zones.length === 0
            ? sections.filter((_, i) => i !== sectionIndex)
            : sections.map((s, i) => (i === sectionIndex ? sec : s));
        updateService(sex, serviceIndex, { sections: newSections });
      } else {
        const zones = (svc.zones ?? []).filter((_, i) => i !== zoneIndex);
        updateService(sex, serviceIndex, { zones });
      }
    },
    [catalog, updateService, t]
  );

  const addZoneItem = useCallback(
    (
      sex: SexKey,
      serviceIndex: number,
      sectionIndex: number | null,
      zoneIndex: number
    ) => {
      const item: ZonePriceItem = {
        id: generatePriceItemId(),
        titleSk: "",
        titleEn: "",
        titleRu: "",
        titleUk: "",
        durationMinutes: 15,
        price: 0,
      };
      const svc = catalog[sex].services[serviceIndex];
      const getZones = () => {
        if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
          return (svc.sections[sectionIndex].zones ?? []) as PriceZone[];
        }
        return (svc.zones ?? []) as PriceZone[];
      };
      const zones = getZones();
      const zone = zones[zoneIndex];
      const newZones = [...zones];
      newZones[zoneIndex] = { ...zone, items: [...(zone.items ?? []), item] };
      if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
        const sections = [...(svc.sections ?? [])];
        sections[sectionIndex] = { ...sections[sectionIndex], zones: newZones };
        updateService(sex, serviceIndex, { sections });
      } else {
        updateService(sex, serviceIndex, { zones: newZones });
      }
    },
    [catalog, updateService]
  );

  const updateZoneItem = useCallback(
    (
      sex: SexKey,
      serviceIndex: number,
      sectionIndex: number | null,
      zoneIndex: number,
      itemIndex: number,
      upd: Partial<ZonePriceItem>
    ) => {
      const svc = catalog[sex].services[serviceIndex];
      let zones: PriceZone[];
      if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
        zones = [...(svc.sections[sectionIndex].zones ?? [])];
      } else {
        zones = [...(svc.zones ?? [])];
      }
      const zone = zones[zoneIndex];
      const items = [...(zone.items ?? [])];
      items[itemIndex] = { ...items[itemIndex], ...upd };
      zones[zoneIndex] = { ...zone, items };
      if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
        const sections = [...(svc.sections ?? [])];
        sections[sectionIndex] = { ...sections[sectionIndex], zones };
        updateService(sex, serviceIndex, { sections });
      } else {
        updateService(sex, serviceIndex, { zones });
      }
    },
    [catalog, updateService]
  );

  const removeZoneItem = useCallback(
    (
      sex: SexKey,
      serviceIndex: number,
      sectionIndex: number | null,
      zoneIndex: number,
      itemIndex: number
    ) => {
      if (!confirm(t("deleteServiceConfirm"))) return;
      const svc = catalog[sex].services[serviceIndex];
      const zones = sectionIndex !== null && svc.sections?.[sectionIndex]
        ? [...(svc.sections[sectionIndex].zones ?? [])]
        : [...(svc.zones ?? [])];
      const zone = zones[zoneIndex];
      const items = (zone.items ?? []).filter((_, i) => i !== itemIndex);
      const newZone = { ...zone, items };
      // Remove zone if it has no items left
      const newZones =
        items.length === 0
          ? zones.filter((_, i) => i !== zoneIndex)
          : zones.map((z, i) => (i === zoneIndex ? newZone : z));
      if (sectionIndex !== null && svc.sections?.[sectionIndex]) {
        const sections = [...(svc.sections ?? [])];
        const sec = { ...sections[sectionIndex], zones: newZones };
        const newSections =
          newZones.length === 0
            ? sections.filter((_, i) => i !== sectionIndex)
            : sections.map((s, i) => (i === sectionIndex ? sec : s));
        updateService(sex, serviceIndex, { sections: newSections });
      } else {
        updateService(sex, serviceIndex, { zones: newZones });
      }
    },
    [catalog, updateService, t]
  );

  const addServiceItem = useCallback(
    (sex: SexKey, serviceIndex: number) => {
      const item: ZonePriceItem = {
        id: generatePriceItemId(),
        titleSk: "",
        titleEn: "",
        titleRu: "",
        titleUk: "",
        durationMinutes: 15,
        price: 0,
      };
      const svc = catalog[sex].services[serviceIndex];
      const items = [...(svc.items ?? []), item];
      updateService(sex, serviceIndex, { items });
    },
    [catalog, updateService]
  );

  const updateServiceItem = useCallback(
    (sex: SexKey, serviceIndex: number, itemIndex: number, upd: Partial<ZonePriceItem>) => {
      const svc = catalog[sex].services[serviceIndex];
      const items = [...(svc.items ?? [])];
      items[itemIndex] = { ...items[itemIndex], ...upd };
      updateService(sex, serviceIndex, { items });
    },
    [catalog, updateService]
  );

  const removeServiceItem = useCallback(
    (sex: SexKey, serviceIndex: number, itemIndex: number) => {
      if (!confirm(t("deleteServiceConfirm"))) return;
      const svc = catalog[sex].services[serviceIndex];
      const items = (svc.items ?? []).filter((_, i) => i !== itemIndex);
      updateService(sex, serviceIndex, { items });
    },
    [catalog, updateService, t]
  );

  const [selected, setSelected] = useState<SelectedNode>(null);

  if (loading) {
    return <p className="text-icyWhite/60">{t("loadingSchedule")}</p>;
  }

  const renderTitles = (
    item: { titleSk?: string; titleEn?: string; titleRu?: string; titleUk?: string } | undefined | null,
    onChange: (k: string, v: string) => void
  ) => {
    if (!item) return null;
    return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {(["Sk", "En", "Ru", "Uk"] as const).map((lang) => (
        <div key={lang}>
          <label className="text-icyWhite/50 text-xs">{t(`title${lang}` as "titleSk")}</label>
          <input
            type="text"
            value={(item[`title${lang}` as keyof typeof item] as string) ?? ""}
            onChange={(e) => onChange(`title${lang}`, e.target.value)}
            className="w-full mt-0.5 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm"
          />
        </div>
      ))}
    </div>
  );
  };

  const MAX_DESCRIPTION_LENGTH = 800;

  const renderDescriptions = (
    item: { descriptionSk?: string; descriptionEn?: string; descriptionRu?: string; descriptionUk?: string } | undefined | null,
    onChange: (k: string, v: string) => void
  ) => {
    if (!item) return null;
    return (
    <div className="grid grid-cols-2 gap-2 text-sm mt-3">
      {(["Sk", "En", "Ru", "Uk"] as const).map((lang) => {
        const key = `description${lang}` as "descriptionSk";
        const raw = (item[key] as string) ?? "";
        const value = raw.slice(0, MAX_DESCRIPTION_LENGTH);
        return (
        <div key={lang}>
          <label className="text-icyWhite/50 text-xs">{t(key)}</label>
          <textarea
            rows={3}
            maxLength={MAX_DESCRIPTION_LENGTH}
            value={value}
            onChange={(e) => {
              const v = e.target.value.slice(0, MAX_DESCRIPTION_LENGTH);
              onChange(key, v);
            }}
            placeholder="Important info for customers (e.g. availability, pricing notes)"
            className="w-full mt-0.5 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm resize-y"
          />
          <p className="text-[10px] text-icyWhite/40 mt-0.5">{value.length}/{MAX_DESCRIPTION_LENGTH}</p>
        </div>
        );
      })}
    </div>
  );
  };

  const renderZoneItem = (
    sex: SexKey,
    serviceIndex: number,
    sectionIndex: number | null,
    zoneIndex: number,
    item: ZonePriceItem | undefined,
    itemIndex: number
  ) => {
    if (!item) return null;
    return (
    <div
      key={item.id}
      className="pl-4 border-l border-white/10 py-2 space-y-2"
    >
      {renderTitles(item, (k, v) =>
        updateZoneItem(sex, serviceIndex, sectionIndex, zoneIndex, itemIndex, {
          [k]: v,
        } as Partial<ZonePriceItem>)
      )}
      <div className="flex gap-2 flex-wrap">
        <input
          type="number"
          min={5}
          max={240}
          value={item.durationMinutes}
          onChange={(e) =>
            updateZoneItem(sex, serviceIndex, sectionIndex, zoneIndex, itemIndex, {
              durationMinutes: parseInt(e.target.value, 10) || 15,
            })
          }
          className="w-20 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm"
        />
        <span className="text-icyWhite/50 text-sm self-center">{t("durationLabel")}</span>
        <input
          type="text"
          value={typeof item.price === "number" ? item.price : item.price}
          onChange={(e) => {
            const v = e.target.value;
            const n = parseFloat(v);
            updateZoneItem(sex, serviceIndex, sectionIndex, zoneIndex, itemIndex, {
              price: Number.isFinite(n) ? n : v,
            });
          }}
          placeholder="Price or e.g. from 20"
          className="w-28 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm"
        />
        <button
          type="button"
          onClick={() =>
            removeZoneItem(sex, serviceIndex, sectionIndex, zoneIndex, itemIndex)
          }
          className="text-red-400/80 hover:text-red-400 text-xs"
        >
          {t("delete")}
        </button>
      </div>
    </div>
  );
  };

  const renderZone = (
    sex: SexKey,
    serviceIndex: number,
    sectionIndex: number | null,
    zone: PriceZone | undefined,
    zoneIndex: number
  ) => {
    if (!zone) return null;
    return (
    <div key={zone.id} className="mb-4 rounded-lg border border-white/10 p-3 bg-white/[0.02]">
      <div className="flex justify-between items-start gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-icyWhite/50 uppercase">Zone</span>
          {renderTitles(zone, (k, v) =>
            updateZone(sex, serviceIndex, sectionIndex, zoneIndex, {
              [k]: v,
            } as Partial<PriceZone>)
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => addZoneItem(sex, serviceIndex, sectionIndex, zoneIndex)}
            className="text-gold-soft/80 hover:text-gold-soft text-xs"
          >
            + {t("add")} item
          </button>
          <button
            type="button"
            onClick={() =>
              removeZone(sex, serviceIndex, sectionIndex, zoneIndex)
            }
            className="text-red-400/80 hover:text-red-400 text-xs"
          >
            {t("delete")}
          </button>
        </div>
      </div>
      <div className="space-y-1">
        {(zone.items ?? []).map((item, itemIndex) =>
          item ? renderZoneItem(
            sex,
            serviceIndex,
            sectionIndex,
            zoneIndex,
            item,
            itemIndex
          ) : null
        )}
      </div>
    </div>
  );
  };

  const renderSection = (
    sex: SexKey,
    serviceIndex: number,
    section: PriceSection | undefined,
    sectionIndex: number
  ) => {
    if (!section) return null;
    return (
    <div key={section.id} className="mb-6 rounded-xl border border-white/10 p-4 bg-white/[0.03]">
      <div className="flex justify-between items-start gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-icyWhite/50 uppercase">Section</span>
          {renderTitles(section, (k, v) =>
            updateSection(sex, serviceIndex, sectionIndex, { [k]: v } as Partial<PriceSection>)
          )}
          {renderDescriptions(section, (k, v) =>
            updateSection(sex, serviceIndex, sectionIndex, { [k]: v } as Partial<PriceSection>)
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => addZone(sex, serviceIndex, sectionIndex)}
            className="text-gold-soft/80 hover:text-gold-soft text-xs"
          >
            + Zone
          </button>
          <button
            type="button"
            onClick={() => removeSection(sex, serviceIndex, sectionIndex)}
            className="text-red-400/80 hover:text-red-400 text-xs"
          >
            {t("delete")}
          </button>
        </div>
      </div>
      <div className="space-y-2">
        {(section.zones ?? []).map((zone, zoneIndex) =>
          zone ? renderZone(sex, serviceIndex, sectionIndex, zone, zoneIndex) : null
        )}
      </div>
    </div>
  );
  };

  const renderService = (sex: SexKey, service: PriceService | undefined, serviceIndex: number) => {
    if (!service) return null;
    return (
    <div key={service.id} className="mb-8 rounded-2xl border border-gold-soft/20 p-5 bg-white/[0.02]">
      <div className="flex justify-between items-start gap-2 mb-4">
        <div className="flex-1 min-w-0">
          <span className="text-xs text-icyWhite/50 uppercase">Service</span>
          {renderTitles(service, (k, v) =>
            updateService(sex, serviceIndex, { [k]: v })
          )}
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            type="button"
            onClick={() => addSection(sex, serviceIndex)}
            className="text-gold-soft/80 hover:text-gold-soft text-xs"
          >
            + Section
          </button>
          <button
            type="button"
            onClick={() => addZone(sex, serviceIndex, null)}
            className="text-gold-soft/80 hover:text-gold-soft text-xs"
          >
            + Zone
          </button>
          <button
            type="button"
            onClick={() => addServiceItem(sex, serviceIndex)}
            className="text-gold-soft/80 hover:text-gold-soft text-xs"
          >
            + Item
          </button>
          <button
            type="button"
            onClick={() => removeService(sex, serviceIndex)}
            className="text-red-400/80 hover:text-red-400 text-xs"
          >
            {t("delete")}
          </button>
        </div>
      </div>
      <div className="space-y-4">
        {(service.sections ?? []).map((section, sectionIndex) =>
          section ? renderSection(sex, serviceIndex, section, sectionIndex) : null
        )}
        {(service.zones ?? []).map((zone, zoneIndex) =>
          zone ? renderZone(sex, serviceIndex, null, zone, zoneIndex) : null
        )}
        {(service.items ?? []).length > 0 && (
          <div className="rounded-lg border border-white/10 p-3 bg-white/[0.02]">
            <span className="text-xs text-icyWhite/50 uppercase">Items (direct)</span>
            {(service.items ?? []).map((item, itemIndex) => (
              <div key={item.id} className="pl-4 border-l border-white/10 py-2 mt-2 space-y-2">
                {renderTitles(item, (k, v) =>
                  updateServiceItem(sex, serviceIndex, itemIndex, { [k]: v } as Partial<ZonePriceItem>)
                )}
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={item.durationMinutes}
                    onChange={(e) =>
                      updateServiceItem(sex, serviceIndex, itemIndex, {
                        durationMinutes: parseInt(e.target.value, 10) || 15,
                      })
                    }
                    className="w-20 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm"
                  />
                  <span className="text-icyWhite/50 text-sm self-center">{t("durationLabel")}</span>
                  <input
                    type="text"
                    value={typeof item.price === "number" ? item.price : item.price}
                    onChange={(e) => {
                      const v = e.target.value;
                      const n = parseFloat(v);
                      updateServiceItem(sex, serviceIndex, itemIndex, {
                        price: Number.isFinite(n) ? n : v,
                      });
                    }}
                    placeholder="Price"
                    className="w-28 px-2 py-1.5 rounded bg-white/5 border border-white/10 text-icyWhite text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeServiceItem(sex, serviceIndex, itemIndex)}
                    className="text-red-400/80 hover:text-red-400 text-xs"
                  >
                    {t("delete")}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  };

  const isSelected = (node: SelectedNode) =>
    selected && JSON.stringify(selected) === JSON.stringify(node);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="font-serif text-2xl text-icyWhite">{t("priceCatalog")}</h1>
          <p className="text-icyWhite/60 text-sm mt-0.5">{t("priceCatalogSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          {place === "depilation" && (
            <button
              type="button"
              onClick={() => setCatalog(ensureIds(getDepilationPriceCatalogExample()))}
              className="px-4 py-2.5 rounded-lg border border-gold-soft/40 text-gold-soft text-sm hover:bg-gold-soft/10"
            >
              {t("loadExample")}
            </button>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-gold-soft text-nearBlack font-medium text-sm hover:bg-gold-glow disabled:opacity-50"
          >
            {saving ? t("saving") : t("save")}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[480px]">
        {/* Left: structure tree */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="font-medium text-icyWhite text-sm">{t("structure")}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {(["woman", "man"] as const).map((sex) => (
              <div key={sex}>
                <button
                  type="button"
                  onClick={() => setSelected({ type: "sex", sex })}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                    isSelected({ type: "sex", sex })
                      ? "bg-gold-soft/20 text-gold-soft"
                      : "hover:bg-white/5 text-icyWhite"
                  }`}
                >
                  {sex}
                </button>
                <div className="ml-3 mt-1 space-y-0.5">
                  {catalog[sex].services.map((svc, si) => (
                    <div key={svc.id}>
                      <button
                        type="button"
                        onClick={() => setSelected({ type: "service", sex, serviceIndex: si })}
                        className={`w-full text-left px-3 py-1.5 rounded text-sm truncate ${
                          isSelected({ type: "service", sex, serviceIndex: si })
                            ? "bg-gold-soft/15 text-gold-soft"
                            : "hover:bg-white/5 text-icyWhite/90"
                        }`}
                      >
                        {getTitleForLocale(svc, locale) || `Service ${si + 1}`}
                      </button>
                        {(svc.sections ?? []).map((sec, sei) =>
                        !sec ? null : (
                        <div key={sec.id} className="ml-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSelected({
                                type: "section",
                                sex,
                                serviceIndex: si,
                                sectionIndex: sei,
                              })
                            }
                            className={`w-full text-left px-2 py-1 rounded text-xs truncate ${
                              isSelected({
                                type: "section",
                                sex,
                                serviceIndex: si,
                                sectionIndex: sei,
                              })
                                ? "bg-gold-soft/15 text-gold-soft"
                                : "hover:bg-white/5 text-icyWhite/70"
                            }`}
                          >
                            {getTitleForLocale(sec, locale) || `Section ${sei + 1}`}
                          </button>
                          {(sec.zones ?? []).map((z, zi) =>
                            !z ? null : (
                            <div key={z.id} className="ml-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelected({
                                    type: "zone",
                                    sex,
                                    serviceIndex: si,
                                    sectionIndex: sei,
                                    zoneIndex: zi,
                                  })
                                }
                                className={`w-full text-left px-2 py-0.5 rounded text-xs truncate ${
                                  isSelected({
                                    type: "zone",
                                    sex,
                                    serviceIndex: si,
                                    sectionIndex: sei,
                                    zoneIndex: zi,
                                  })
                                    ? "bg-gold-soft/15 text-gold-soft"
                                    : "hover:bg-white/5 text-icyWhite/60"
                                }`}
                              >
                                {getTitleForLocale(z, locale) || `Zone ${zi + 1}`}
                              </button>
                            </div>
                          ))}
                        </div>
                      ))}
                      {(svc.zones ?? []).map((z, zi) =>
                        !z ? null : (
                        <div key={z.id} className="ml-3">
                          <button
                            type="button"
                            onClick={() =>
                              setSelected({
                                type: "zone",
                                sex,
                                serviceIndex: si,
                                sectionIndex: null,
                                zoneIndex: zi,
                              })
                            }
                            className={`w-full text-left px-2 py-0.5 rounded text-xs truncate ${
                              isSelected({
                                type: "zone",
                                sex,
                                serviceIndex: si,
                                sectionIndex: null,
                                zoneIndex: zi,
                              })
                                ? "bg-gold-soft/15 text-gold-soft"
                                : "hover:bg-white/5 text-icyWhite/60"
                            }`}
                          >
                            {getTitleForLocale(z, locale) || `Zone ${zi + 1}`}
                          </button>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: edit panel */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-white/10">
            <h2 className="font-medium text-icyWhite text-sm">{t("editPanel")}</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {selected?.type === "sex" && (
              <div className="space-y-3">
                <p className="text-icyWhite/60 text-sm capitalize">{selected.sex}</p>
                <button
                  type="button"
                  onClick={() => addService(selected.sex)}
                  className="text-gold-soft/80 hover:text-gold-soft text-sm"
                >
                  + {t("addService")}
                </button>
              </div>
            )}
            {selected?.type === "service" && (
              <div>
                {renderService(selected.sex, catalog[selected.sex].services[selected.serviceIndex], selected.serviceIndex)}
              </div>
            )}
            {selected?.type === "section" && (
              <div>
                {renderSection(
                  selected.sex,
                  selected.serviceIndex,
                  catalog[selected.sex].services[selected.serviceIndex].sections![selected.sectionIndex],
                  selected.sectionIndex
                )}
              </div>
            )}
            {selected?.type === "zone" && (
              <div>
                {renderZone(
                  selected.sex,
                  selected.serviceIndex,
                  selected.sectionIndex,
                  selected.sectionIndex !== null
                    ? catalog[selected.sex].services[selected.serviceIndex].sections![selected.sectionIndex].zones![selected.zoneIndex]
                    : catalog[selected.sex].services[selected.serviceIndex].zones![selected.zoneIndex],
                  selected.zoneIndex
                )}
              </div>
            )}
            {!selected && (
              <p className="text-icyWhite/50 text-sm">{t("selectNodeToEdit")}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
