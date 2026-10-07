<script>
  import { onMount } from "svelte";
  import { base } from "$app/paths";
  import { venues, companies, productions, seedBookings } from "$lib/data";
  import "./style.css";
  let bookings = $state(structuredClone(seedBookings));
  let page = $state("Bookings");
  let search = $state("");
  let status = $state("All statuses");
  let productionFilter = $state("All productions");
  let companyFilter = $state("All companies");
  let selected = $state(null);
  let draft = $state(null);
  let view = $state("List");
  let notice = $state("");
  let storageReady = $state(false);
  const statuses = ["Placeholder", "Pencilled", "Confirmed", "Cancelled"];
  const production = (id) => productions.find((p) => p.id === id);
  const venue = (id) => venues.find((v) => v.id === id);
  const company = (id) => companies.find((c) => c.id === id);
  const matchesSearch = (values) =>
    values.join(" ").toLowerCase().includes(search.trim().toLowerCase());
  let directoryItems = $derived(
    (page === "Venues"
      ? venues
      : page === "Companies"
        ? companies
        : productions
    ).filter((item) =>
      matchesSearch([
        item.name,
        item.city || "",
        item.contact || "",
        item.email || "",
        item.companyId ? company(item.companyId).name : "",
      ]),
    ),
  );
  const dateLabel = (value) =>
    new Date(value + "T12:00:00").toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  let filtered = $derived(
    bookings
      .filter(
        (b) =>
          (status === "All statuses" || b.status === status) &&
          (productionFilter === "All productions" ||
            production(b.productionId).name === productionFilter) &&
          (companyFilter === "All companies" ||
            company(production(b.productionId).companyId).name ===
              companyFilter) &&
          matchesSearch([
            production(b.productionId).name,
            company(production(b.productionId).companyId).name,
            venue(b.venueId).name,
            venue(b.venueId).city,
          ]),
      )
      .sort((a, b) => a.date.localeCompare(b.date)),
  );
  let publicBookings = $derived(
    bookings
      .filter(
        (b) =>
          b.publish &&
          b.status === "Confirmed" &&
          b.date >=
            new Date().toLocaleDateString("en-CA", {
              timeZone: "Europe/London",
            }),
      )
      .sort((a, b) => a.date.localeCompare(b.date)),
  );
  onMount(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("turnpike-demo-v1") || "null",
      );
      if (
        Array.isArray(saved) &&
        saved.every(
          (b) =>
            production(b.productionId) &&
            venue(b.venueId) &&
            /^\d{4}-\d{2}-\d{2}$/.test(b.date) &&
            statuses.includes(b.status),
        )
      )
        bookings = saved;
    } catch {
      notice = "Saved demo data could not be read. Sample records loaded.";
    }
    storageReady = true;
  });
  $effect(() => {
    if (storageReady) {
      try {
        localStorage.setItem("turnpike-demo-v1", JSON.stringify(bookings));
      } catch {
        notice =
          "Browser storage is unavailable. Changes will last only for this session.";
      }
    }
  });
  function open(b) {
    selected = b.id;
    draft = structuredClone($state.snapshot(b));
  }
  function add() {
    selected = "new";
    draft = {
      id: Math.max(0, ...bookings.map((b) => b.id)) + 1,
      productionId: 1,
      venueId: 1,
      date: "",
      time: "19:30",
      status: "Placeholder",
      deal: "",
      getIn: "",
      getOut: "",
      contract: "Not started",
      marketing: "Not sent",
      task: "Confirm date with artist",
      due: "",
      done: false,
      publish: false,
      ticketUrl: "",
      notes: "",
      report: "Not due",
      amount: "",
      payment: "Not invoiced",
    };
  }
  function save() {
    if (!draft.date) return;
    bookings =
      selected === "new"
        ? [...bookings, structuredClone($state.snapshot(draft))]
        : bookings.map((b) =>
            b.id === draft.id ? structuredClone($state.snapshot(draft)) : b,
          );
    selected = null;
    notice = "Booking saved in this browser.";
  }
  function download(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const csvCell = (value) =>
    '"' + String(value ?? "").replaceAll('"', '""') + '"';
  function exportCsv() {
    const rows = [
      [
        "Title",
        "Description",
        "Start Date",
        "Start Time",
        "End Date",
        "End Time",
        "All Day Event",
        "Location",
        "Venue Name",
        "Venue Website",
        "Venue Phone",
      ],
      ...publicBookings.map((b) => [
        production(b.productionId).name,
        production(b.productionId).description,
        b.date,
        b.time,
        b.date,
        "",
        b.time ? "FALSE" : "TRUE",
        venue(b.venueId).city,
        venue(b.venueId).name,
        b.ticketUrl,
        "",
      ]),
    ];
    download(
      "turnpike-wix-preview.csv",
      rows.map((r) => r.map(csvCell).join(",")).join("\r\n"),
      "text/csv;charset=utf-8",
    );
  }
  function briefing() {
    const v = venue(draft.venueId),
      p = production(draft.productionId);
    download(
      "artist-briefing.txt",
      `${p.name}\n${dateLabel(draft.date)} · ${v.name}, ${v.city}\n\nVenue contact: ${v.contact} (${v.email})\nPerformance: ${draft.time || "TBC"}\nGet-in: ${draft.getIn || "TBC"}\nGet-out: ${draft.getOut || "TBC"}\nParking: ${v.parking}\nTechnical information: ${v.tech}\nDeal: ${draft.deal || "TBC"}\n\nNotes: ${draft.notes}\n\nPrototype: fictional information.`,
      "text/plain",
    );
  }
</script>

<svelte:head
  ><title>Turnpike · Production CRM</title><meta
    name="description"
    content="Turnpike Productions booking CRM prototype with fictional sample records"
  /></svelte:head
>

<div class="app-shell">
  <aside class="sidebar">
    <a
      class="brand"
      href="#bookings"
      onclick={() => {
        page = "Bookings";
        selected = null;
        search = "";
      }}
      ><picture
        ><source
          media="(max-width: 760px)"
          srcset={base + "/branding/turnpike-black.jpg"}
        /><img
          class="brand-logo"
          src={base + "/branding/turnpike-cream.png"}
          alt="Turnpike Productions"
          width="1200"
          height="896"
        /></picture
      ></a
    >
    <div class="workspace-label">YOUR WORKSPACE</div>
    <nav aria-label="Main navigation">
      {#each [["Bookings", "▦"], ["Venues", "⌂"], ["Companies", "◉"], ["Productions", "◇"], ["Tasks", "✓"], ["Website export", "↗"]] as [item, icon]}<button
          aria-label={item}
          class:active={page === item}
          onclick={() => {
            page = item;
            selected = null;
            search = "";
          }}
          ><span class="nav-icon">{icon}</span>{item}{#if item === "Tasks"}<span
              class="nav-count"
              >{bookings.filter(
                (b) => !b.done && b.status !== "Cancelled" && b.task,
              ).length}</span
            >{/if}</button
        >{/each}
    </nav>
    <div class="sidebar-bottom">
      <span class="demo-dot"></span> Prototype workspace
      <p>Fictional data · saved locally</p>
      <div class="profile">
        <span class="avatar">TP</span>
        <div>Turnpike team<small>Editor preview</small></div>
      </div>
    </div>
  </aside>
  <main id="bookings">
    <header class="topbar">
      <span>Workspace <span class="slash">/</span> {page}</span><span
        class="sample-badge">SAMPLE DATA</span
      >
    </header>
    <div class="content">
      {#if notice}<div class="notice" role="status">
          {notice}<button
            aria-label="Dismiss message"
            onclick={() => (notice = "")}>×</button
          >
        </div>{/if}
      {#if selected !== null && draft}
        <button class="back" onclick={() => (selected = null)}
          >← Back to {page.toLowerCase()}</button
        >
        <div class="heading">
          <div>
            <h1>
              {selected === "new"
                ? "New booking"
                : production(draft.productionId).name}
            </h1>
          </div>
        </div>
        <form
          onsubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div class="detail-grid">
            <section class="panel">
              <h2>Overview</h2>
              <div class="fields">
                <label
                  >Production<select
                    aria-label="Production"
                    bind:value={draft.productionId}
                    >{#each productions as p}<option value={p.id}
                        >{p.name}</option
                      >{/each}</select
                  ></label
                ><label
                  >Venue<select aria-label="Venue" bind:value={draft.venueId}
                    >{#each venues as v}<option value={v.id}
                        >{v.name} · {v.city}</option
                      >{/each}</select
                  ></label
                ><label
                  >Performance date<input
                    type="date"
                    required
                    bind:value={draft.date}
                  /></label
                ><label
                  >Booking status<select
                    aria-label="Booking status"
                    bind:value={draft.status}
                    >{#each statuses as s}<option>{s}</option>{/each}</select
                  ></label
                >
              </div>
              <label class="checkbox"
                ><input type="checkbox" bind:checked={draft.publish} /> Publish to
                website when confirmed</label
              ><label
                >Ticket / event link<input
                  type="url"
                  placeholder="https://…"
                  bind:value={draft.ticketUrl}
                /></label
              >
            </section>
            <section class="panel">
              <h2>Schedule & logistics</h2>
              <div class="fields">
                <label
                  >Performance time<input
                    type="time"
                    bind:value={draft.time}
                  /></label
                ><label
                  >Get-in<input type="time" bind:value={draft.getIn} /></label
                ><label
                  >Get-out<input type="time" bind:value={draft.getOut} /></label
                >
              </div>
              <div class="info-block">
                <strong>{venue(draft.venueId).contact}</strong>
                <p>{venue(draft.venueId).email}</p>
                <p><strong>Parking:</strong> {venue(draft.venueId).parking}</p>
                <p><strong>Technical:</strong> {venue(draft.venueId).tech}</p>
              </div>
            </section>
            <section class="panel">
              <h2>Deal & settlement</h2>
              <label
                >Agreed deal<textarea
                  rows="3"
                  bind:value={draft.deal}
                  placeholder="Guarantee, split and agreed deductions"
                ></textarea></label
              >
              <div class="fields">
                <label
                  >Sales report<select
                    aria-label="Sales report"
                    bind:value={draft.report}
                    ><option>Not due</option><option>Requested</option><option
                      >Received</option
                    ></select
                  ></label
                ><label
                  >Amount owed (£)<input
                    type="number"
                    min="0"
                    step="0.01"
                    bind:value={draft.amount}
                  /></label
                ><label
                  >Payment<select
                    aria-label="Payment"
                    bind:value={draft.payment}
                    ><option>Not invoiced</option><option>Invoiced</option
                    ><option>Paid</option></select
                  ></label
                >
              </div>
              <p class="hint">
                Amounts are entered manually; no automatic settlement
                calculation yet.
              </p>
            </section>
            <section class="panel">
              <h2>Contract & marketing</h2>
              <div class="fields">
                <label
                  >Contract<select
                    aria-label="Contract"
                    bind:value={draft.contract}
                    ><option>Not started</option><option>Drafting</option
                    ><option>Awaiting signature</option><option>Signed</option
                    ></select
                  ></label
                ><label
                  >Marketing assets<select
                    aria-label="Marketing assets"
                    bind:value={draft.marketing}
                    ><option>Not sent</option><option>Requested</option><option
                      >Sent</option
                    ></select
                  ></label
                >
              </div>
              <p class="hint">
                Track progress here. Document uploads and signatures will follow
                in the shared CRM.
              </p>
              <button
                class="secondary"
                type="button"
                disabled={!draft.date}
                onclick={briefing}>↓ Download artist briefing</button
              >
            </section>
            <section class="panel">
              <h2>Next action</h2>
              <label>Follow-up task<input bind:value={draft.task} /></label>
              <div class="fields">
                <label
                  >Due date<input type="date" bind:value={draft.due} /></label
                ><label class="checkbox"
                  ><input type="checkbox" bind:checked={draft.done} /> Completed</label
                >
              </div>
            </section>
            <section class="panel">
              <h2>Working notes</h2>
              <label
                >Notes<textarea
                  rows="5"
                  bind:value={draft.notes}
                  placeholder="Conversations, arrangements and anything still to confirm…"
                ></textarea></label
              >
            </section>
          </div>
          <div class="form-footer">
            <span class="hint"
              >Demo changes are stored on this device only.</span
            ><button
              class="secondary"
              type="button"
              onclick={() => (selected = null)}>Cancel</button
            ><button class="primary" type="submit">Save booking</button>
          </div>
        </form>
      {:else if page === "Bookings"}
        <div class="heading">
          <div>
            <h1>Your bookings</h1>
          </div>
          <button class="primary" onclick={add}>＋ New booking</button>
        </div>
        <div class="stats">
          <div>
            <span>Total bookings</span><strong
              >{bookings.length}<small>in your workspace</small></strong
            >
          </div>
          <div>
            <span><i class="dot green"></i> Confirmed</span><strong
              >{bookings.filter((b) => b.status === "Confirmed").length}</strong
            >
          </div>
          <div>
            <span><i class="dot amber"></i> Pencilled</span><strong
              >{bookings.filter((b) => b.status === "Pencilled").length}<small
                >awaiting agreement</small
              ></strong
            >
          </div>
          <div>
            <span><i class="dot purple"></i> Open actions</span><strong
              >{bookings.filter(
                (b) => !b.done && b.task && b.status !== "Cancelled",
              ).length}</strong
            >
          </div>
        </div>
        <section class="booking-panel">
          <div class="panel-heading">
            <div>
              <h2>Tour schedule</h2>
            </div>
            <div class="segmented">
              {#each ["List", "Calendar"] as mode}<button
                  class:chosen={view === mode}
                  onclick={() => (view = mode)}>{mode}</button
                >{/each}
            </div>
          </div>
          <div class="filters">
            <label class="search"
              ><span>⌕</span><input
                aria-label="Search bookings"
                placeholder="Search productions, companies, venues or cities…"
                bind:value={search}
              /></label
            ><select
              aria-label="Filter by production"
              bind:value={productionFilter}
              ><option>All productions</option>{#each productions as p}<option
                  >{p.name}</option
                >{/each}</select
            ><select aria-label="Filter by company" bind:value={companyFilter}
              ><option>All companies</option>{#each companies as c}<option
                  >{c.name}</option
                >{/each}</select
            ><select aria-label="Filter by status" bind:value={status}
              ><option>All statuses</option>{#each statuses as s}<option
                  >{s}</option
                >{/each}</select
            >
          </div>
          {#if view === "List"}<div class="table-wrap">
              <table>
                <thead
                  ><tr
                    ><th>Date</th><th>Production</th><th>Venue</th><th
                      >Status</th
                    ><th>Next action</th><th
                      ><span class="sr-only">Open</span></th
                    ></tr
                  ></thead
                ><tbody
                  >{#each filtered as b}<tr
                      ><td class="date-cell"
                        >{dateLabel(b.date)}<small>{b.time || "Time TBC"}</small
                        ></td
                      ><td
                        ><button class="text-link" onclick={() => open(b)}
                          >{production(b.productionId).name}</button
                        ><small
                          >{companies.find(
                            (c) =>
                              c.id === production(b.productionId).companyId,
                          ).name}</small
                        ></td
                      ><td
                        >{venue(b.venueId).name}<small
                          >{venue(b.venueId).city}</small
                        ></td
                      ><td
                        ><span class="status {b.status.toLowerCase()}"
                          ><i></i>{b.status}</span
                        ></td
                      ><td
                        ><span class:completed={b.done}
                          >{b.done ? "✓ " : ""}{b.task || "No action set"}</span
                        ><small
                          >{b.done
                            ? "Completed"
                            : b.due
                              ? `Due ${dateLabel(b.due)}`
                              : "No deadline"}</small
                        ></td
                      ><td
                        ><button
                          class="row-open"
                          aria-label={"Open " +
                            production(b.productionId).name +
                            " at " +
                            venue(b.venueId).name}
                          onclick={() => open(b)}>↗</button
                        ></td
                      ></tr
                    >{/each}</tbody
                >
              </table>
            </div>{:else}<div class="calendar">
              {#each [...new Set(filtered.map( (b) => b.date.slice(0, 7) ))] as month}<section
                >
                  <h3>
                    {new Date(month + "-01T12:00:00").toLocaleDateString(
                      "en-GB",
                      { month: "long", year: "numeric" },
                    )}
                  </h3>
                  {#each filtered.filter( (b) => b.date.startsWith(month) ) as b}<button
                      class="calendar-event"
                      onclick={() => open(b)}
                      ><span class="calendar-day"
                        >{b.date.slice(8)}<small
                          >{new Date(b.date + "T12:00:00").toLocaleDateString(
                            "en-GB",
                            { weekday: "short" },
                          )}</small
                        ></span
                      ><span
                        ><strong>{production(b.productionId).name}</strong
                        ><small
                          >{venue(b.venueId).name} · {b.time ||
                            "Time TBC"}</small
                        ></span
                      ><span class="status {b.status.toLowerCase()}"
                        >{b.status}</span
                      ></button
                    >{/each}
                </section>{/each}
            </div>{/if}
          {#if !filtered.length}<div class="empty">
              No bookings match these filters.
            </div>{/if}
          <div class="table-footer">
            {filtered.length} bookings
            <span>All dates shown in UK local time</span>
          </div>
        </section>
        <div class="bottom-cards">
          <section class="panel soft">
            <span class="card-symbol">↗</span>
            <div>
              <h2>Website export</h2>
              <button
                class="text-link"
                onclick={() => (page = "Website export")}
                >Preview website export →</button
              >
            </div>
          </section>
          <section class="panel">
            <span class="card-symbol">✓</span>
            <div>
              <h2>Follow-ups</h2>
              <button class="text-link" onclick={() => (page = "Tasks")}
                >View follow-ups →</button
              >
            </div>
          </section>
        </div>
      {:else if page === "Venues" || page === "Companies" || page === "Productions"}
        <div class="heading">
          <div>
            <h1>{page}</h1>
          </div>
        </div>
        <div class="notice neutral">
          Sample directory · Editing and importing these records will follow in
          the next iteration.
        </div>
        <div class="directory-search">
          <label class="search"
            ><span aria-hidden="true">⌕</span><input
              aria-label={"Search " + page.toLowerCase()}
              placeholder={page === "Venues"
                ? "Search venues, cities or contacts…"
                : page === "Companies"
                  ? "Search companies or contacts…"
                  : "Search productions or companies…"}
              bind:value={search}
            /></label
          >
          <span class="hint" role="status"
            >{directoryItems.length} {page.toLowerCase()}</span
          >
        </div>
        <div class="directory">
          {#each directoryItems as item}<section class="panel">
              <span class="directory-icon"
                >{page === "Venues"
                  ? "⌂"
                  : page === "Companies"
                    ? "◉"
                    : "◇"}</span
              >
              <h2>{item.name}</h2>
              {#if page === "Venues"}<p>
                  {item.city} · {item.capacity} capacity
                </p>
                <hr />
                <strong>{item.contact}</strong>
                <p>{item.email}</p>
                <p class="hint">{item.tech}</p>{:else if page === "Companies"}<p
                >
                  {item.contact}
                </p>
                <p>{item.email}</p>
                <hr />
                <p class="hint">{item.services}</p>{:else}<p>
                  {companies.find((c) => c.id === item.companyId).name}
                </p>
                <hr />
                <p>{item.description}</p>
                <p class="hint">{item.assets}</p>{/if}
            </section>{/each}
        </div>
        {#if !directoryItems.length}<div class="panel empty">
            No {page.toLowerCase()} match your search.
          </div>{/if}
      {:else if page === "Tasks"}
        <div class="heading">
          <div>
            <h1>Your follow-ups</h1>
          </div>
        </div>
        <section class="panel task-list">
          {#each bookings
            .filter((b) => b.task && b.status !== "Cancelled")
            .sort( (a, b) => (a.due || "9999").localeCompare(b.due || "9999") ) as b}<div
              class="task"
            >
              <input
                type="checkbox"
                aria-label={"Complete " + b.task}
                checked={b.done}
                onchange={() =>
                  (bookings = bookings.map((x) =>
                    x.id === b.id ? { ...x, done: !x.done } : x,
                  ))}
              />
              <div>
                <button
                  class="text-link"
                  class:completed={b.done}
                  onclick={() => open(b)}>{b.task}</button
                >
                <p>
                  {production(b.productionId).name} · {venue(b.venueId).name}
                </p>
              </div>
              <span>{b.due ? dateLabel(b.due) : "No deadline"}</span>
            </div>{/each}
        </section>
        <p class="hint">
          For post-show follow-ups, add “Request feedback and sales report” with
          a due date the day after the performance.
        </p>
      {:else if page === "Website export"}
        <div class="heading">
          <div>
            <h1>Website export</h1>
            <p>Upcoming, confirmed performances marked for publication.</p>
          </div>
          <button
            class="primary"
            disabled={!publicBookings.length}
            onclick={exportCsv}>↓ Download CSV</button
          >
        </div>
        <div class="notice neutral">
          Wix preview format based on your screenshot. Verify the complete Wix
          template before importing. Missing end times and ticket links remain
          blank.
        </div>
        <div class="directory">
          {#each publicBookings as b}<section class="panel">
              <span class="status confirmed">Confirmed</span>
              <h2 class="export-title">{production(b.productionId).name}</h2>
              <p>{production(b.productionId).description}</p>
              <hr />
              <strong>{dateLabel(b.date)} · {b.time || "All day"}</strong>
              <p>{venue(b.venueId).name}, {venue(b.venueId).city}</p>
              {#if !b.ticketUrl}<p class="hint">
                  Ticket link not yet added
                </p>{/if}<button class="text-link" onclick={() => open(b)}
                >Edit booking →</button
              >
            </section>{/each}
        </div>
        {#if !publicBookings.length}<section class="panel empty">
            No upcoming confirmed bookings are marked for publication.
          </section>{/if}
      {/if}
      <footer>
        Turnpike Productions <span
          >Prototype · No shared accounts or live email integration yet</span
        >
      </footer>
    </div>
  </main>
</div>
