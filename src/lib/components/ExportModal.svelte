<script lang="ts">
  interface Props {
    onClose: () => void;
  }
  let { onClose }: Props = $props();
</script>

<div class="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
  <div class="bg-white p-6 rounded-lg shadow-xl w-96">
    <h3 class="text-lg font-semibold mb-2 text-gray-900">Export Options</h3>
    <p class="text-sm text-gray-600 mb-6">Placeholder for custom export adjustments (e.g., scale, dark mode export, etc.)</p>
    <div class="flex justify-end">
      <button 
        onclick={onClose} 
        class="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium text-gray-700 transition"
      >
        Close
      </button>
    </div>
  </div>
</div>
