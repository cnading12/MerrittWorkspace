"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import Link from 'next/link';
import type { Member, SeatingManualAssignment } from '@/lib/portal/types';
import {
  buildOccupancy,
  DESK_SPACES,
  OFFICE_SPACES,
  type ManualAssignment,
  type OccupancyEntry,
  type SeatingMember,
  type SpaceType,
} from '@/lib/portal/seating';

const FLOOR_PLAN_SRC = '/merritt-floor-plan.JPEG';

type FormState = {
  // null = closed, 'new' = adding, otherwise the id of the manual row edited.
  mode: 'new' | string | null;
  spaceType: SpaceType;
  spaceNumber: string;
  occupantName: string;
};

const EMPTY_FORM: FormState = {
  mode: null,
  spaceType: 'desk',
  spaceNumber: '',
  occupantName: '',
};

export default function SeatingChart({
  members,
  token,
}: {
  members: Member[];
  token: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [assignments, setAssignments] = useState<SeatingManualAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  // Building-wide dedicated-desk capacity. Read from the server rather than
  // counted off the `members` prop, because that list reflects whichever
  // roster view the admin is on (it can be filtered to archived members only).
  const [deskCapacity, setDeskCapacity] = useState<{
    capacity: number;
    taken: number | null;
    remaining: number | null;
    isFull: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/seating', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to load seating');
      setAssignments(json.assignments || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load seating');
    } finally {
      setLoading(false);
    }
    // Best-effort: the chart is still useful without the capacity headline.
    try {
      const res = await fetch('/api/desk-availability');
      const json = await res.json().catch(() => ({}));
      if (res.ok && !json.unavailable) setDeskCapacity(json);
    } catch {
      /* leave the headline off */
    }
  }, [token]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Only active (non-archived) members hold a live seat. Archived members are
  // already filtered out of the list the parent passes in, but we guard anyway.
  const seatingMembers: SeatingMember[] = useMemo(
    () =>
      members
        // Declined office-member requests never held the seat; everyone else
        // (including cancelled members still in their notice period) keeps
        // showing until archived, matching how seats free up elsewhere.
        .filter((m) => !m.archived_at && m.status !== 'declined')
        .map((m) => ({
          id: m.id,
          first_name: m.first_name,
          last_name: m.last_name,
          desk_number: m.desk_number,
          office_number: m.office_number,
          designation: m.designation,
          status: m.status,
        })),
    [members]
  );

  const manual: ManualAssignment[] = useMemo(
    () =>
      assignments.map((a) => ({
        id: a.id,
        space_type: a.space_type,
        space_number: a.space_number,
        occupant_name: a.occupant_name,
        created_at: a.created_at,
        updated_at: a.updated_at,
      })),
    [assignments]
  );

  const desks = useMemo(
    () => buildOccupancy('desk', DESK_SPACES, seatingMembers, manual),
    [seatingMembers, manual]
  );
  const offices = useMemo(
    () => buildOccupancy('office', OFFICE_SPACES, seatingMembers, manual),
    [seatingMembers, manual]
  );

  const conflictCount = useMemo(
    () => [...desks, ...offices].filter((e) => e.conflict).length,
    [desks, offices]
  );

  async function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!token || saving) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = form.mode === 'new';
      const url = isNew
        ? '/api/admin/seating'
        : `/api/admin/seating/${form.mode}`;
      const res = await fetch(url, {
        method: isNew ? 'POST' : 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          space_type: form.spaceType,
          space_number: form.spaceNumber,
          occupant_name: form.occupantName,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to save');
      setForm(EMPTY_FORM);
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function removeManual(id: string, label: string) {
    if (!token) return;
    if (!confirm(`Remove the manual entry for ${label}?`)) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/seating/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Failed to remove');
      // If the form was editing this row, reset it.
      setForm((f) => (f.mode === id ? EMPTY_FORM : f));
      await load();
    } catch (e: any) {
      setError(e.message || 'Failed to remove');
    }
  }

  function startEdit(entry: OccupancyEntry, occManualId: string) {
    setForm({
      mode: occManualId,
      spaceType: entry.spaceType,
      spaceNumber: entry.spaceNumber,
      occupantName:
        entry.conflict?.manualId === occManualId
          ? entry.conflict.name
          : entry.occupant?.name || '',
    });
    // Bring the form into view on small screens.
    requestAnimationFrame(() => {
      document
        .getElementById('seating-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  function startAdd(spaceType: SpaceType, spaceNumber: string) {
    setForm({ mode: 'new', spaceType, spaceNumber, occupantName: '' });
    requestAnimationFrame(() => {
      document
        .getElementById('seating-form')
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="border rounded px-3 py-1.5 text-sm font-medium bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
        title="See who sits at every desk and office, with the building floor plan."
      >
        Seating Chart
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} titleId="seating-title">
          <div className="flex items-center justify-between gap-3 border-b px-4 sm:px-6 py-3 sticky top-0 bg-white z-10">
            <div>
              <h2 id="seating-title" className="text-lg font-semibold">
                Seating Chart
              </h2>
              <p className="text-xs text-gray-500">
                Who sits where · {desks.filter((d) => d.occupant).length}/
                {desks.length} desks ·{' '}
                {offices.filter((o) => o.occupant).length}/{offices.length}{' '}
                offices
                {conflictCount > 0 && (
                  <span className="text-red-600 font-medium">
                    {' '}
                    · {conflictCount} conflict{conflictCount === 1 ? '' : 's'}
                  </span>
                )}
              </p>
              {deskCapacity && deskCapacity.taken !== null && (
                // "Spoken for" also counts paid dedicated-desk members who
                // haven't picked a DD number yet, so this can exceed the number
                // of desks showing an occupant above. At capacity we stop
                // selling floor desks and sell private dedicated desks instead.
                <p
                  className={`text-xs mt-0.5 ${
                    deskCapacity.isFull ? 'text-amber-700 font-medium' : 'text-gray-500'
                  }`}
                >
                  {deskCapacity.taken}/{deskCapacity.capacity} dedicated desks
                  spoken for (includes paid members who haven&apos;t picked a desk
                  yet)
                  {deskCapacity.isFull
                    ? ' · FULL — new desk applicants are offered a private dedicated desk'
                    : ` · ${deskCapacity.remaining} left to sell`}
                </p>
              )}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-500 hover:text-gray-900 rounded p-1.5 hover:bg-gray-100"
              aria-label="Close seating chart"
            >
              <CloseIcon />
            </button>
          </div>

          <div className="px-4 sm:px-6 py-4 space-y-6">
            {/* Floor plan: responsive, tap/click to open the zoomable lightbox. */}
            <figure className="space-y-1.5">
              <button
                type="button"
                onClick={() => setLightboxOpen(true)}
                className="block w-full rounded-lg border overflow-hidden bg-gray-50 hover:ring-2 hover:ring-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-zoom-in"
                aria-label="Open full-screen, zoomable floor plan"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={FLOOR_PLAN_SRC}
                  alt="Merritt Workspace floor plan"
                  className="w-full h-auto select-none"
                  draggable={false}
                />
              </button>
              <figcaption className="text-xs text-gray-500 text-center">
                Tap the plan to zoom and pan. Office 120 (wellness space) is not
                shown on the plan.
              </figcaption>
            </figure>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                {error}
              </div>
            )}

            {/* Add / edit form. */}
            <SeatingForm
              form={form}
              saving={saving}
              onChange={setForm}
              onSubmit={submitForm}
              onCancel={() => setForm(EMPTY_FORM)}
              onStartAdd={() => setForm({ ...EMPTY_FORM, mode: 'new' })}
            />

            {loading ? (
              <div className="text-sm text-gray-500">Loading occupancy…</div>
            ) : (
              <div className="space-y-6">
                <OccupancyGroup
                  title="Dedicated Desks"
                  entries={desks}
                  onEdit={startEdit}
                  onAdd={startAdd}
                  onRemove={removeManual}
                />
                <OccupancyGroup
                  title="Offices"
                  entries={offices}
                  onEdit={startEdit}
                  onAdd={startAdd}
                  onRemove={removeManual}
                />
              </div>
            )}
          </div>
        </Modal>
      )}

      {lightboxOpen && (
        <Lightbox
          src={FLOOR_PLAN_SRC}
          alt="Merritt Workspace floor plan"
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Occupancy list
// ---------------------------------------------------------------------------

function OccupancyGroup({
  title,
  entries,
  onEdit,
  onAdd,
  onRemove,
}: {
  title: string;
  entries: OccupancyEntry[];
  onEdit: (entry: OccupancyEntry, manualId: string) => void;
  onAdd: (spaceType: SpaceType, spaceNumber: string) => void;
  onRemove: (id: string, label: string) => void;
}) {
  return (
    <section>
      <h3 className="text-sm font-semibold text-gray-900 mb-2">
        {title}{' '}
        <span className="text-gray-400 font-normal">({entries.length})</span>
      </h3>
      <ul className="divide-y border rounded-lg overflow-hidden">
        {entries.map((entry) => (
          <OccupancyRow
            key={`${entry.spaceType}-${entry.spaceNumber}`}
            entry={entry}
            onEdit={onEdit}
            onAdd={onAdd}
            onRemove={onRemove}
          />
        ))}
      </ul>
    </section>
  );
}

function OccupancyRow({
  entry,
  onEdit,
  onAdd,
  onRemove,
}: {
  entry: OccupancyEntry;
  onEdit: (entry: OccupancyEntry, manualId: string) => void;
  onAdd: (spaceType: SpaceType, spaceNumber: string) => void;
  onRemove: (id: string, label: string) => void;
}) {
  const occ = entry.occupant;
  const conflict = entry.conflict;
  const label = `${entry.spaceType === 'desk' ? 'Desk' : 'Office'} ${entry.spaceNumber}`;
  // Everyone to list: all portal occupants (offices can hold several people),
  // or the manual occupant when nobody from the portal claims the space.
  const occupantList: typeof entry.occupants =
    entry.occupants.length > 0 ? entry.occupants : occ ? [occ] : [];

  return (
    <li
      className={`flex items-center gap-3 px-3 py-2.5 ${
        conflict ? 'bg-red-50' : occ ? 'bg-white' : 'bg-gray-50'
      }`}
    >
      <span className="font-mono text-sm font-semibold text-gray-700 w-16 shrink-0">
        {entry.spaceNumber}
        {occupantList.length > 1 && (
          <span
            className="ml-1 text-[10px] font-bold text-teal-700 bg-teal-50 border border-teal-200 rounded px-1 py-0.5 align-middle"
            title={`${occupantList.length} people share this ${entry.spaceType}`}
          >
            ×{occupantList.length}
          </span>
        )}
      </span>

      <div className="min-w-0 flex-1">
        {occupantList.length > 0 ? (
          <div className="space-y-0.5">
            {occupantList.map((person, i) => (
              <div
                key={person.memberId || person.manualId || i}
                className="flex items-center gap-2 flex-wrap"
              >
                <span className="text-sm font-medium text-gray-900 truncate">
                  {person.name}
                </span>
                {person.role === 'primary' && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-gray-900 text-white"
                    title="Pays for this office"
                  >
                    Primary
                  </span>
                )}
                {person.role === 'member' && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-teal-100 text-teal-800"
                    title="Additional occupant — the office's primary member pays for the space"
                  >
                    Office member
                  </span>
                )}
                {person.role === 'private_desk' && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-orange-100 text-orange-800"
                    title="Dedicated desk member seated in this office — pays for a private dedicated desk, not the room"
                  >
                    Private desk
                  </span>
                )}
                {person.pending && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800"
                    title="Awaiting admin approval"
                  >
                    Pending
                  </span>
                )}
                <SourceBadge source={person.source} />
                {person.memberId && (
                  <Link
                    href={`/admin/members/${person.memberId}`}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    profile
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <span className="text-sm text-gray-400 italic">Vacant</span>
        )}

        {conflict && (
          <div className="mt-1 text-xs text-red-700 flex items-center gap-1.5 flex-wrap">
            <ConflictIcon />
            <span>
              Conflict: manual entry <strong>{conflict.name}</strong> also
              claims this space.
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Manual occupant (or manual side of a conflict): editable/deletable. */}
        {occ?.source === 'manual' && occ.manualId && (
          <RowActions
            onEdit={() => onEdit(entry, occ.manualId!)}
            onRemove={() => onRemove(occ.manualId!, label)}
          />
        )}
        {conflict?.manualId && (
          <RowActions
            onEdit={() => onEdit(entry, conflict.manualId!)}
            onRemove={() => onRemove(conflict.manualId!, label)}
          />
        )}
        {/* Vacant: offer a quick add for this exact space. */}
        {!occ && (
          <button
            onClick={() => onAdd(entry.spaceType, entry.spaceNumber)}
            className="text-xs border rounded px-2 py-1 text-gray-600 hover:bg-white"
            title={`Add a person to ${label}`}
          >
            + Add
          </button>
        )}
      </div>
    </li>
  );
}

function RowActions({
  onEdit,
  onRemove,
}: {
  onEdit: () => void;
  onRemove: () => void;
}) {
  return (
    <>
      <button
        onClick={onEdit}
        className="text-xs border rounded px-2 py-1 text-gray-700 hover:bg-gray-100"
      >
        Edit
      </button>
      <button
        onClick={onRemove}
        className="text-xs border border-red-200 rounded px-2 py-1 text-red-700 hover:bg-red-100"
      >
        Remove
      </button>
    </>
  );
}

function SourceBadge({ source }: { source: 'portal' | 'manual' }) {
  return source === 'portal' ? (
    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
      Portal
    </span>
  ) : (
    <span className="text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
      Manual
    </span>
  );
}

// ---------------------------------------------------------------------------
// Add / edit form
// ---------------------------------------------------------------------------

function SeatingForm({
  form,
  saving,
  onChange,
  onSubmit,
  onCancel,
  onStartAdd,
}: {
  form: FormState;
  saving: boolean;
  onChange: (f: FormState) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  onStartAdd: () => void;
}) {
  if (form.mode === null) {
    return (
      <button
        onClick={onStartAdd}
        className="border rounded px-3 py-2 text-sm font-medium bg-gray-900 text-white hover:bg-gray-800"
      >
        + Add person (manual)
      </button>
    );
  }

  const isNew = form.mode === 'new';
  const spaceOptions = form.spaceType === 'desk' ? DESK_SPACES : OFFICE_SPACES;
  const listId = `seating-spaces-${form.spaceType}`;

  return (
    <form
      id="seating-form"
      onSubmit={onSubmit}
      className="border rounded-lg p-3 sm:p-4 bg-gray-50 space-y-3"
    >
      <div className="text-sm font-semibold text-gray-900">
        {isNew ? 'Add person (manual)' : 'Edit manual entry'}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="text-xs text-gray-600 space-y-1 block">
          <span>Type</span>
          <select
            value={form.spaceType}
            onChange={(e) =>
              onChange({ ...form, spaceType: e.target.value as SpaceType })
            }
            className="border rounded px-2 py-2 text-sm w-full bg-white"
          >
            <option value="desk">Dedicated Desk</option>
            <option value="office">Office</option>
          </select>
        </label>
        <label className="text-xs text-gray-600 space-y-1 block">
          <span>Number</span>
          <input
            type="text"
            list={listId}
            required
            value={form.spaceNumber}
            onChange={(e) => onChange({ ...form, spaceNumber: e.target.value })}
            placeholder={form.spaceType === 'desk' ? 'DD4' : '101'}
            className="border rounded px-2 py-2 text-sm w-full bg-white"
          />
          <datalist id={listId}>
            {spaceOptions.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </label>
        <label className="text-xs text-gray-600 space-y-1 block">
          <span>Name</span>
          <input
            type="text"
            required
            value={form.occupantName}
            onChange={(e) =>
              onChange({ ...form, occupantName: e.target.value })
            }
            placeholder="Full name"
            className="border rounded px-2 py-2 text-sm w-full bg-white"
          />
        </label>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={saving}
          className="border rounded px-3 py-2 text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? 'Saving…' : isNew ? 'Add person' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border rounded px-3 py-2 text-sm hover:bg-white"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Modal shell with focus trap + ESC to close
// ---------------------------------------------------------------------------

function Modal({
  children,
  onClose,
  titleId,
}: {
  children: React.ReactNode;
  onClose: () => void;
  titleId: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Lock body scroll while the modal is open.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Move focus into the panel.
    requestAnimationFrame(() => {
      const focusable = panelRef.current?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    });
    return () => {
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, []);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    // Trap focus within the panel.
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center"
      onKeyDown={onKeyDown}
    >
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative bg-white w-full sm:max-w-3xl sm:rounded-xl shadow-xl overflow-y-auto max-h-screen sm:max-h-[90vh]"
      >
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full-screen pinch-zoom / pan lightbox for the floor plan
// ---------------------------------------------------------------------------

function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);

  // Active pointers for pinch handling, keyed by pointerId.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStart = useRef<{ dist: number; scale: number } | null>(null);
  const panStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(
    null
  );

  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  const clampScale = (s: number) => Math.min(5, Math.max(1, s));

  const reset = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = Array.from(pointers.current.values());
      pinchStart.current = { dist: distance(a, b), scale };
      panStart.current = null;
    } else if (pointers.current.size === 1) {
      panStart.current = { x: e.clientX, y: e.clientY, tx, ty };
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2 && pinchStart.current) {
      const [a, b] = Array.from(pointers.current.values());
      const next = clampScale(
        (pinchStart.current.scale * distance(a, b)) / pinchStart.current.dist
      );
      setScale(next);
      if (next === 1) {
        setTx(0);
        setTy(0);
      }
      return;
    }

    if (pointers.current.size === 1 && panStart.current && scale > 1) {
      setTx(panStart.current.tx + (e.clientX - panStart.current.x));
      setTy(panStart.current.ty + (e.clientY - panStart.current.y));
    }
  }

  function onPointerUp(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchStart.current = null;
    if (pointers.current.size === 0) panStart.current = null;
  }

  function onWheel(e: React.WheelEvent) {
    const next = clampScale(scale - e.deltaY * 0.002);
    setScale(next);
    if (next === 1) {
      setTx(0);
      setTy(0);
    }
  }

  function onDoubleClick() {
    if (scale > 1) reset();
    else setScale(2);
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center touch-none"
      role="dialog"
      aria-modal="true"
      aria-label="Floor plan, zoomable"
      onKeyDown={(e) => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
        {scale > 1 && (
          <button
            onClick={reset}
            className="text-white/90 text-sm bg-white/10 hover:bg-white/20 rounded px-3 py-1.5"
          >
            Reset zoom
          </button>
        )}
        <button
          ref={closeRef}
          onClick={onClose}
          className="text-white bg-white/10 hover:bg-white/20 rounded p-2"
          aria-label="Close full-screen floor plan"
        >
          <CloseIcon />
        </button>
      </div>

      <div
        className="w-full h-full overflow-hidden flex items-center justify-center touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
        style={{ cursor: scale > 1 ? 'grab' : 'zoom-in' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="max-w-none select-none"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
            transformOrigin: 'center center',
            transition: pointers.current.size ? 'none' : 'transform 0.1s ease-out',
            maxHeight: '100vh',
            maxWidth: '100vw',
          }}
        />
      </div>

      <p className="absolute bottom-3 left-0 right-0 text-center text-white/70 text-xs px-4">
        Pinch or scroll to zoom · drag to pan · double-tap to toggle · Esc to
        close
      </p>
    </div>
  );
}

function distance(
  a: { x: number; y: number },
  b: { x: number; y: number }
): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ConflictIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
