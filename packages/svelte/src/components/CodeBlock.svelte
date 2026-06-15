<script lang="ts">
  let {
    code,
    language,
    copyable = false,
  }: { code: string; language?: string; copyable?: boolean } = $props()

  function copy() {
    void globalThis.navigator?.clipboard?.writeText(code)
  }
</script>

<div data-ak-code-block data-ak-language={language}>
  <pre><code>{code}</code></pre>
  {#if copyable}
    <button data-ak-copy type="button" onclick={copy}>Copy</button>
  {/if}
</div>
