<script lang="ts" module>
  import { logEvent, logMermaidChartClick } from '$lib/util/stats';
  import { version } from 'mermaid/package.json';

  void logEvent('version', {
    mermaidVersion: version
  });
</script>

<script lang="ts">
  import MainMenu from '$/components/MainMenu.svelte';
  import { Button } from '$/components/ui/button';
  import { Separator } from '$/components/ui/separator';
  import { dismissPromotion, getActivePromotion } from '$lib/util/promos/promo';
  import type { ComponentProps, Snippet } from 'svelte';
  import MermaidIcon from '~icons/custom/mermaid';
  import CloseIcon from '~icons/material-symbols/close-rounded';
  import GithubIcon from '~icons/mdi/github';
  import DropdownNavMenu from './DropdownNavMenu.svelte';

  interface Props {
    mobileToggle?: Snippet;
    children: Snippet;
    hidePromotion?: boolean;
  }

  let { children, mobileToggle, hidePromotion = false }: Props = $props();

  type Links = ComponentProps<typeof DropdownNavMenu>['links'];

  const githubLinks: Links = [
    { title: 'Mermaid JS', href: 'https://github.com/mermaid-js/mermaid' },
    {
      title: 'Mermaid Live Editor',
      href: 'https://github.com/mermaid-js/mermaid-live-editor'
    },
    {
      title: 'Mermaid CLI',
      href: 'https://github.com/mermaid-js/mermaid-cli'
    }
  ];

  let activePromotion = $state(hidePromotion ? undefined : getActivePromotion());

  const trackBannerClick = () => {
    if (!activePromotion) {
      return;
    }
    logEvent('bannerClick', {
      promotion: activePromotion.id
    });
    logMermaidChartClick('banner');
  };
</script>

{@render children?.()}
{@render mobileToggle?.()}
