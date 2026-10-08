<script>
  import { shared, uploadAsset, assetUrl, httpsLink } from './crm.js';
  let { kind, record, companies, venues, onsave, oncancel } = $props();
  // The editor is mounted for one record; save/cancel unmounts it.
  // svelte-ignore state_referenced_locally
  let draft = $state(structuredClone($state.snapshot(record)));
  let error = $state('');
  let busy = $state(false);
  let imageLink = $state('');
  let recipient = $state('');
  let emailLink = $state('');
  let emailBody = $state('');
  draft.images ??= [];
  async function save(event) {
    event.preventDefault(); busy = true; error = '';
    try {
      draft.website = httpsLink(draft.website);
      if (draft.pack?.url) draft.pack.url = httpsLink(draft.pack.url);
      await onsave(structuredClone($state.snapshot(draft)));
    } catch (e) { error = e.message; }
    finally { busy = false; }
  }
  async function upload(event, pack = false) {
    busy = true; error = '';
    try {
      for (const file of event.target.files) {
        if (file.size > 20 * 1024 * 1024) throw new Error('Each file must be 20 MB or smaller.');
        if (pack ? file.type !== 'application/pdf' : !['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Choose a PDF pack or JPEG, PNG or WebP images.');
        const asset = await uploadAsset(file);
        if (pack) draft.pack = asset; else draft.images = [...draft.images, asset];
      }
    } catch (e) { error = e.message; }
    finally { busy = false; event.target.value = ''; }
  }
  function addImage() {
    try { draft.images = [...draft.images, { url: httpsLink(imageLink), name: 'Image' }]; imageLink = ''; }
    catch (e) { error = e.message; }
  }
  async function openAsset(asset) {
    try { const url = await assetUrl(asset); window.open(url, '_blank', 'noopener,noreferrer'); }
    catch (e) { error = e.message; }
  }
  async function prepareEmail() {
    busy = true; error = ''; emailLink = '';
    try {
      const lines = [draft.name, draft.marketingCopy || '', draft.pullQuotes || '', draft.about || '', draft.website ? httpsLink(draft.website) : '', draft.contact || '', draft.email || '', draft.phone || ''];
      if (draft.pack && (draft.pack.path || draft.pack.url)) lines.push(`Venue pack: ${await assetUrl(draft.pack)}`);
      for (const asset of draft.images) lines.push(`Image: ${await assetUrl(asset)}`);
      emailBody = lines.filter(Boolean).join('\n\n');
      emailLink = `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(draft.name + ' — marketing materials')}&body=${encodeURIComponent(emailBody)}`;
    } catch (e) { error = e.message; }
    finally { busy = false; }
  }
</script>

<section class="panel directory-editor">
  <h2>{record.name ? 'Edit ' + record.name : 'New ' + (kind === 'productions' ? 'production' : 'company')}</h2>
  {#if error}<p class="notice" role="alert">{error}</p>{/if}
  <form onsubmit={save}>
    <fieldset disabled={busy}>
      <label>Name<input required bind:value={draft.name} /></label>
      {#if kind === 'productions'}
        <label>Company<select aria-label="Company" required bind:value={draft.companyId}>{#each companies as company}<option value={company.id}>{company.name}</option>{/each}</select></label>
        <label>Show description<textarea bind:value={draft.description}></textarea></label>
        <label>Pull quotes<textarea rows="4" bind:value={draft.pullQuotes} placeholder="Quote and reviewer/publication, one per line"></textarea></label>
        <label>Venue pack PDF link<input type="url" value={draft.pack?.url || ''} onchange={(e) => draft.pack = e.currentTarget.value ? {url: e.currentTarget.value, name: 'Venue pack'} : null} /></label>
        {#if draft.pack?.path}<button type="button" class="secondary" onclick={() => openAsset(draft.pack)}>Open uploaded venue pack</button>{/if}
        {#if draft.pack}<button type="button" class="secondary" onclick={() => draft.pack = null}>Remove venue pack</button>{/if}
        <label>Upload venue pack PDF<input type="file" accept="application/pdf" disabled={!shared} onchange={(e) => upload(e, true)} /></label>
      {:else}
        <label>About the company<textarea rows="5" bind:value={draft.about}></textarea></label>
        <label>Contact name<input bind:value={draft.contact} /></label>
        <label>Contact email<input type="email" bind:value={draft.email} /></label>
        <label>Contact phone<input type="tel" bind:value={draft.phone} /></label>
        <label>Contact address<textarea bind:value={draft.address}></textarea></label>
        <label>Services<input bind:value={draft.services} /></label>
      {/if}
      <label>Website link<input type="url" bind:value={draft.website} placeholder="https://…" /></label>
      <label>Marketing copy<textarea rows="7" bind:value={draft.marketingCopy}></textarea></label>
      <h3>Images</h3>
      <label>Image link<input type="url" bind:value={imageLink} placeholder="https://…" /></label>
      <button type="button" class="secondary" disabled={!imageLink} onclick={addImage}>Add image link</button>
      <label>Upload images<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={!shared} onchange={(e) => upload(e)} /></label>
      {#if !shared}<p class="hint">Demo mode supports existing HTTPS links. Shared CRM setup enables private PDF and image uploads.</p>{/if}
      {#each draft.images as asset, i}<div class="asset-row"><button type="button" class="text-link" onclick={() => openAsset(asset)}>{asset.name || asset.url}</button><button type="button" class="secondary" onclick={() => draft.images = draft.images.filter((_, index) => index !== i)}>Remove image</button></div>{/each}
      <div class="form-footer"><button type="submit">Save {kind === 'productions' ? 'production' : 'company'}</button><button type="button" class="secondary" onclick={oncancel}>Cancel</button></div>
    </fieldset>
  </form>
  <hr />
  <h3>Email marketing materials</h3>
  <label>Venue<select aria-label="Venue" bind:value={recipient}><option value="">Choose a venue</option>{#each venues as venue}<option value={venue.email}>{venue.name}</option>{/each}</select></label>
  <label>Recipient email<input type="email" bind:value={recipient} /></label>
  <button type="button" class="secondary" disabled={busy || !recipient} onclick={prepareEmail}>Prepare email</button>
  {#if emailLink}<p><a href={emailLink}>Open draft in your email app</a></p><label>Email preview<textarea readonly rows="8" value={emailBody}></textarea></label><p class="hint">Review before sending. Files are linked, not attached. Private file links expire after seven days; prepare the email close to sending, or download and attach the files in your email app.</p>{/if}
</section>
