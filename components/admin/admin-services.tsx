"use client";

import { useCallback, useEffect, useState } from "react";
import { CaretDown } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { LoadingPanel, Notice, Spinner } from "@/components/ui/feedback";
import { TextAreaField, TextField } from "@/components/ui/form";
import { fetchAllServices, updateService, type ServicePatch } from "@/lib/admin";
import { formatDuration, formatPrice } from "@/lib/format";
import type { Service } from "@/lib/supabase/types";

/**
 * The service menu.
 *
 * ---------------------------------------------------------------------------
 * THE PLACEHOLDER BADGE IS THE POINT OF THIS SCREEN
 * ---------------------------------------------------------------------------
 * The four services were seeded with the prices that were already on the
 * website, and those prices were invented as stand-ins by whoever built the
 * front end. Nobody has confirmed that a frontal install costs $180.
 *
 * Quietly carrying them into a real database would launder a guess into a
 * fact: a price in a Postgres table looks authoritative in a way that a
 * placeholder in a source file does not. So every service carries
 * `pricing_confirmed`, it seeds as false, and while it is false this screen
 * says so in plain language and the row is visibly marked. Nat confirms a
 * price by editing it and ticking the box, which is a deliberate act by the
 * person who actually knows.
 *
 * A price can also be cleared entirely, which stores NULL and shows "On
 * request" on the public site. That is a real answer for a service that is
 * quoted per client, and it is better than a made-up number.
 *
 * ---------------------------------------------------------------------------
 * WHY EDITING IS INLINE AND SAVES PER ROW
 * ---------------------------------------------------------------------------
 * There are four services. A modal, a form page and a separate "edit service"
 * route are three screens too many for a list that fits above the fold. Each
 * row opens where it sits and saves itself, so nothing is staged and there is
 * no unsaved-changes state to lose.
 */
export function AdminServices() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  /* `.then()` rather than await, for the reason in admin-locations.tsx. */
  const load = useCallback(
    () =>
      fetchAllServices().then(({ services: found, error: failed }) => {
        setServices(found);
        setError(failed);
        setLoading(false);
      }),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <LoadingPanel label="Loading your services" />;

  const unconfirmed = services.filter((service) => !service.pricing_confirmed);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-ink lg:text-3xl">
          Services
        </h2>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-muted">
          What people can book, what it costs, and how long you need for it. The
          duration is what reserves the slot, so a two hour install blocks two
          hours in the diary rather than one.
        </p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {unconfirmed.length > 0 ? (
        <Notice
          tone="info"
          title={`${unconfirmed.length} ${unconfirmed.length === 1 ? "price is" : "prices are"} still a placeholder.`}
        >
          These came from the website copy and nobody has confirmed them with
          you. Open each one, set the real price and duration, and tick
          &ldquo;this price is confirmed&rdquo;. Until you do, treat the figures
          on the public site as a draft.
        </Notice>
      ) : null}

      <ul className="overflow-hidden rounded-3xl border border-line-strong bg-surface">
        {services.map((service, index) => (
          <li key={service.id} className={index > 0 ? "border-t border-line" : ""}>
            <ServiceRow
              service={service}
              open={openId === service.id}
              onToggle={() =>
                setOpenId((current) => (current === service.id ? null : service.id))
              }
              onSaved={() => void load()}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceRow({
  service,
  open,
  onToggle,
  onSaved,
}: {
  service: Service;
  open: boolean;
  onToggle: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(service.name);
  const [description, setDescription] = useState(service.description);
  /** Held as dollars, stored as cents. Empty string means "no price set". */
  const [price, setPrice] = useState(
    service.price_cents === null ? "" : String(service.price_cents / 100),
  );
  const [duration, setDuration] = useState(
    service.duration_minutes === null ? "" : String(service.duration_minutes),
  );
  const [confirmed, setConfirmed] = useState(service.pricing_confirmed);
  const [order, setOrder] = useState(String(service.display_order));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const panelId = `service-${service.id}`;

  async function toggleActive() {
    setBusy(true);
    setError("");
    const { error: failed } = await updateService(service.id, {
      active: !service.active,
    });
    setBusy(false);
    if (failed) {
      setError(failed);
      return;
    }
    onSaved();
  }

  async function save() {
    setError("");
    setSaved(false);

    const dollars = price.trim();
    const minutes = duration.trim();

    if (dollars && !/^\d+(\.\d{1,2})?$/.test(dollars)) {
      setError("Put the price in as a number, like 180 or 180.50.");
      return;
    }
    if (minutes && !/^\d+$/.test(minutes)) {
      setError("Put the duration in as whole minutes, like 120.");
      return;
    }
    if (minutes && (Number(minutes) < 15 || Number(minutes) > 600)) {
      setError("Durations run from 15 minutes to 10 hours.");
      return;
    }

    const patch: ServicePatch = {
      name: name.trim(),
      description: description.trim(),
      price_cents: dollars ? Math.round(Number(dollars) * 100) : null,
      duration_minutes: minutes ? Number(minutes) : null,
      pricing_confirmed: confirmed,
      display_order: Number(order) || service.display_order,
    };

    setBusy(true);
    const { error: failed } = await updateService(service.id, patch);
    setBusy(false);

    if (failed) {
      setError(failed);
      return;
    }
    setSaved(true);
    onSaved();
  }

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-surface-2/60 lg:px-6"
      >
        <span className="min-w-0 flex-1 basis-52">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg tracking-tight text-ink">
              {service.name}
            </span>
            {!service.active ? (
              <span className="rounded-full border border-line-strong px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.1em] text-muted">
                Hidden
              </span>
            ) : null}
            {!service.pricing_confirmed ? (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.1em] text-accent">
                Placeholder price
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {formatDuration(service.duration_minutes) || "No duration set"}
          </span>
        </span>

        <span className="tabular shrink-0 font-display text-lg tracking-tight text-accent">
          {formatPrice(service.price_cents)}
        </span>

        <CaretDown
          size={16}
          weight="regular"
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <div
          id={panelId}
          className="border-t border-line bg-surface-2/40 px-5 py-6 lg:px-6"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField
              id={`name-${service.id}`}
              label="Name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="sm:col-span-2"
            />
            <TextAreaField
              id={`desc-${service.id}`}
              label="Description"
              value={description}
              rows={3}
              onChange={(event) => setDescription(event.target.value)}
              className="sm:col-span-2"
            />
            <TextField
              id={`price-${service.id}`}
              label="Price in dollars"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              help="Leave it empty to show On request."
            />
            <TextField
              id={`duration-${service.id}`}
              label="Minutes in the chair"
              inputMode="numeric"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              help="This is what blocks out the slot."
            />
            <TextField
              id={`order-${service.id}`}
              label="Order on the page"
              inputMode="numeric"
              value={order}
              onChange={(event) => setOrder(event.target.value)}
              help="Lowest first. The first one gets the photograph."
            />
          </div>

          <label className="mt-6 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--accent)]"
            />
            <span className="text-sm leading-relaxed text-ink">
              This price is confirmed.
              <span className="mt-1 block text-muted">
                Tick this once the figure is really yours. Until then the site
                treats it as a draft and this dashboard keeps flagging it.
              </span>
            </span>
          </label>

          {error ? (
            <div className="mt-6">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
          {saved ? (
            <div className="mt-6">
              <Notice tone="success">Saved. The public site has it already.</Notice>
            </div>
          ) : null}

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={save}
              disabled={busy}
              className={buttonStyles.primary}
            >
              {busy ? <Spinner size={16} /> : null}
              Save this service
            </button>
            <button
              type="button"
              onClick={toggleActive}
              disabled={busy}
              className={buttonStyles.secondary}
            >
              {service.active ? "Hide from the site" : "Show on the site"}
            </button>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-muted">
            Hiding a service stops new bookings for it. Appointments already
            booked keep the name and price they were booked at.
          </p>
        </div>
      ) : null}
    </>
  );
}
