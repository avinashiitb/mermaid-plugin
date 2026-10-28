<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { base } from '$app/paths';

  onMount(async () => {
    // Preserve query parameters from search or hash (e.g. ?fileId=...)
    const search = window.location.search;
    const hash = window.location.hash;
    let query = search;
    if (!query && hash.includes('?')) {
      query = '?' + hash.split('?')[1];
    }

    const parts = hash.split('/');
    let newURL = 'edit' + (query || '');
    if (parts.length > 2) {
      newURL = `${parts[1]}#${parts[2]}`;
    }
    await goto(`${base}/${newURL}`, {
      replaceState: true
    });
  });
</script>
