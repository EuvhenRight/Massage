"use client";

import { useEffect, useState, useCallback } from "react";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";
import { db } from "@/lib/firebase";
import {
  createService,
  updateService,
  deleteService,
  type ServiceData,
  type ServiceInput,
} from "@/lib/services";
import { DEFAULT_SECTION_CALENDAR_COLOR } from "@/lib/section-calendar-colors";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { clsx } from "clsx";

export const COLOR_PRESETS = [
  { value: DEFAULT_SECTION_CALENDAR_COLOR, label: "Neutral" },
  { value: "bg-rose-500 border-rose-400", label: "Rose" },
  { value: "bg-amber-500 border-amber-400", label: "Amber" },
  { value: "bg-emerald-500 border-emerald-400", label: "Emerald" },
  { value: "bg-sky-500 border-sky-400", label: "Sky" },
  { value: "bg-violet-500 border-violet-400", label: "Violet" },
  { value: "bg-orange-500 border-orange-400", label: "Orange" },
  { value: "bg-teal-500 border-teal-400", label: "Teal" },
  { value: "bg-pink-400 border-pink-300", label: "Pink" },
  { value: "bg-lime-500 border-lime-400", label: "Lime" },
  { value: "bg-indigo-500 border-indigo-400", label: "Indigo" },
  { value: "bg-fuchsia-500 border-fuchsia-400", label: "Fuchsia" },
  { value: "bg-cyan-400 border-cyan-300", label: "Cyan" },
  { value: "bg-aurora-magenta border-aurora-magenta", label: "Magenta (legacy)" },
];

function ServiceForm({
  service,
  onSave,
  onCancel,
}: {
  service?: ServiceData | null;
  onSave: (input: ServiceInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(service?.title ?? "");
  const [color, setColor] = useState(service?.color ?? COLOR_PRESETS[0].value);
  const [durationMinutes, setDurationMinutes] = useState(
    String(service?.durationMinutes ?? 60)
  );
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dur = parseInt(durationMinutes, 10);
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (isNaN(dur) || dur < 15 || dur > 240) {
      toast.error("Duration must be 15–240 minutes");
      return;
    }
    setLoading(true);
    try {
      await onSave({ title: title.trim(), color, durationMinutes: dur });
      onCancel();
    } catch (err) {
      toast.error("Failed to save service");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-icyWhite/80 mb-1.5">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Swedish Massage"
        />
      </div>
      <div>
        <label className="block text-sm text-icyWhite/80 mb-1.5">Color</label>
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
                  ? "ring-2 ring-purple-soft ring-offset-2 ring-offset-nearBlack"
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
          Duration (minutes)
        </label>
        <Input
          type="number"
          min={15}
          max={240}
          step={15}
          value={durationMinutes}
          onChange={(e) => setDurationMinutes(e.target.value)}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant="outline"
          className="flex-1 border-white/10 text-icyWhite hover:bg-white/10"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          className="flex-1 bg-purple-soft/20 text-purple-soft hover:bg-purple-soft/30"
          disabled={loading}
        >
          {loading ? "Saving..." : service ? "Update" : "Add"}
        </Button>
      </div>
    </form>
  );
}

export default function AdminServicesManager() {
  const [services, setServices] = useState<ServiceData[]>([]);
  const [modalOpen, setModalOpen] = useState<
    "add" | "edit" | null
  >(null);
  const [editService, setEditService] = useState<ServiceData | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<ServiceData | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "services"),
      orderBy("title", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: (data.title as string) ?? "",
          color: (data.color as string) ?? "bg-gray-500 border-gray-500",
          durationMinutes: (data.durationMinutes as number) ?? 60,
        };
      });
      setServices(list);
    });
    return () => unsub();
  }, []);

  const handleSaveAdd = useCallback(async (input: ServiceInput) => {
    await createService(input);
    toast.success("Service added.");
    setModalOpen(null);
  }, []);

  const handleSaveEdit = useCallback(
    async (input: ServiceInput) => {
      if (!editService) return;
      await updateService(editService.id, input);
      toast.success("Service updated.");
      setModalOpen(null);
      setEditService(null);
    },
    [editService]
  );

  const handleDelete = useCallback(async (s: ServiceData) => {
    try {
      await deleteService(s.id);
      toast.success("Service deleted.");
      setDeleteConfirm(null);
    } catch {
      toast.error("Failed to delete service.");
    }
  }, []);

  return (
    <div className="rounded-xl border border-white/10 bg-nearBlack/80 overflow-hidden">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <h2 className="font-serif text-lg text-icyWhite">Services</h2>
        <button
          type="button"
          onClick={() => {
            setEditService(null);
            setModalOpen("add");
          }}
          className="rounded-lg border border-purple-soft/50 bg-purple-soft/20 px-4 py-2 text-sm font-medium text-purple-soft hover:bg-purple-soft/30 transition-colors"
        >
          + Add service
        </button>
      </div>
      <div className="p-4">
        {services.length === 0 ? (
          <p className="text-icyWhite/60 text-sm py-4">
            No services yet. Add one to get started.
          </p>
        ) : (
          <ul className="space-y-2">
            {services.map((s) => (
              <li
                key={s.id}
                className={clsx(
                  "flex items-center justify-between gap-4 p-3 rounded-lg border",
                  s.color
                )}
              >
                <div>
                  <div className="font-medium text-icyWhite">{s.title}</div>
                  <div className="text-xs text-icyWhite/70">{s.durationMinutes} min</div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditService(s);
                      setModalOpen("edit");
                    }}
                    className="p-1.5 rounded hover:bg-black/20 text-icyWhite/80 hover:text-icyWhite"
                    aria-label="Edit"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(s)}
                    className="p-1.5 rounded hover:bg-black/20 text-red-400/80 hover:text-red-400"
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
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
              {modalOpen === "add" ? "Add service" : "Edit service"}
            </h3>
            <ServiceForm
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
            className="fixed left-1/2 top-1/2 z-[51] w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-nearBlack p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-serif text-lg text-icyWhite mb-2">Delete service?</h3>
            <p className="text-sm text-icyWhite/70 mb-4">
              Remove <strong>{deleteConfirm.title}</strong>? Existing appointments will keep
              the service name but it won&apos;t appear in new bookings.
            </p>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 border-white/10 text-icyWhite hover:bg-white/10"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 bg-red-500/20 text-red-400 hover:bg-red-500/30"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
