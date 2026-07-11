<script lang="ts">
  let { content, streaming = false }: { content: string; streaming?: boolean } = $props()
</script>

<div data-ak-markdown data-ak-streaming={streaming ? 'true' : undefined}>{content}</div>
