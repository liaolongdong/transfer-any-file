<script setup lang="ts">
import { computed } from 'vue';
import { TopRight } from '@element-plus/icons-vue';
import { useI18n } from '~/composables/useI18n';
import {
  AUTHOR_GITHUB_URL,
  CHROME_WEB_STORE_URL,
  CONVERSION_GUIDES_URL,
  GITHUB_RELEASES_PAGE_URL,
  PRIVACY_POLICY_URL,
  PRODUCT_DOCS_URL,
  REPO_GITHUB_URL,
  REPO_ISSUES_URL,
  REPO_LICENSE_URL,
} from '~/utils/urls';

const props = defineProps<{
  modelValue: boolean;
  /** The version `runtime.getManifest()` reported; it has to agree with the topbar chip. */
  version: string;
}>();

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();

const { t } = useI18n();

const visible = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

/**
 * The exits, in the order a reader looks for them: how to use it, where to install and rate it,
 * where the source and the complaint desk are, and the legal documents last.
 *
 * `id` is the list key rather than `href`: the store listing and the review entry deliberately
 * point at the same address.
 */
const LINK_ENTRIES = [
  { id: 'docs', href: PRODUCT_DOCS_URL, labelKey: 'about.linkDocs' },
  { id: 'guides', href: CONVERSION_GUIDES_URL, labelKey: 'about.linkGuides' },
  { id: 'store', href: CHROME_WEB_STORE_URL, labelKey: 'about.linkStore' },
  { id: 'review', href: CHROME_WEB_STORE_URL, labelKey: 'about.linkReview' },
  { id: 'repo', href: REPO_GITHUB_URL, labelKey: 'about.linkRepo' },
  { id: 'issues', href: REPO_ISSUES_URL, labelKey: 'about.linkIssues' },
  { id: 'privacy', href: PRIVACY_POLICY_URL, labelKey: 'about.linkPrivacy' },
  { id: 'license', href: REPO_LICENSE_URL, labelKey: 'about.linkLicense' },
  { id: 'releases', href: GITHUB_RELEASES_PAGE_URL, labelKey: 'about.linkReleases' },
  { id: 'author', href: AUTHOR_GITHUB_URL, labelKey: 'about.linkAuthor' },
] as const;

const links = computed(() =>
  LINK_ENTRIES.map(entry => {
    const label = t(entry.labelKey);
    return {
      id: entry.id,
      href: entry.href,
      label,
      // Shown beside the label so "where will this take me" is a visible fact, not a tooltip.
      host: new URL(entry.href).host,
      // The accessible name keeps the visible text as a substring (WCAG 2.5.3) while still naming
      // the new tab, which the arrow alone cannot say to a screen reader.
      ariaLabel: `${label}${t('options.newTabSuffix')}`,
    };
  }),
);

const facts = computed(() => [
  { id: 'network', label: t('about.factNetwork'), value: t('about.factNetworkValue') },
  { id: 'permission', label: t('about.factPermission'), value: t('about.factPermissionValue') },
  { id: 'account', label: t('about.factAccount'), value: t('about.factAccountValue') },
]);
</script>

<template>
  <el-drawer
    v-model="visible"
    :title="t('about.title')"
    direction="rtl"
    size="min(400px, 100vw)"
    append-to-body
  >
    <div class="about">
      <div class="about-brand">
        <span class="about-name">{{ t('appName') }}</span>
        <span class="about-version">v{{ version }}</span>
      </div>
      <p class="about-summary">{{ t('options.subtitle') }}</p>

      <h3 class="about-section-title">{{ t('about.factsTitle') }}</h3>
      <dl class="about-facts">
        <div
          v-for="fact in facts"
          :key="fact.id"
          class="about-fact"
        >
          <dt>{{ fact.label }}</dt>
          <dd>{{ fact.value }}</dd>
        </div>
      </dl>

      <h3 class="about-section-title">{{ t('about.linksTitle') }}</h3>
      <ul class="about-links">
        <li
          v-for="link in links"
          :key="link.id"
        >
          <a
            :href="link.href"
            class="about-link"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="link.ariaLabel"
          >
            <span class="about-link-label">{{ link.label }}</span>
            <span class="about-link-host">{{ link.host }}</span>
            <el-icon
              class="about-link-icon"
              aria-hidden="true"
            >
              <TopRight />
            </el-icon>
          </a>
        </li>
      </ul>

      <p class="about-license">{{ t('about.license') }}</p>
    </div>
  </el-drawer>
</template>

<style scoped>
.about {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-md);
}

.about-brand {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--fat-space-sm);
}

.about-name {
  color: var(--fat-text-primary);
  font-size: 16px;
  font-weight: 700;
}

/* The same card-coloured pill the topbar chip uses, on the drawer's card surface. */
.about-version {
  padding: 2px var(--fat-space-sm);
  background: var(--fat-surface-2);
  border-radius: var(--fat-radius-pill);
  color: var(--fat-text-primary);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.about-summary {
  margin: 0;
  color: var(--fat-text-secondary);
  font-size: 13px;
  line-height: 1.5;
}

/* The same quiet uppercase label the preferences dialog uses for its groups. */
.about-section-title {
  margin: var(--fat-space-sm) 0 calc(var(--fat-space-xs) * -1);
  color: var(--fat-text-secondary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.about-facts {
  display: flex;
  flex-direction: column;
  gap: var(--fat-space-sm);
  margin: 0;
  padding: var(--fat-space-md);
  background: var(--fat-surface-2);
  border-radius: var(--fat-radius-sm);
}

.about-fact {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.about-fact dt {
  color: var(--fat-text-primary);
  font-size: 12px;
  font-weight: 600;
}

.about-fact dd {
  margin: 0;
  color: var(--fat-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.about-links {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* Label left, destination host right, arrow last. `minmax(0, …)` on both text columns is what lets
   a long host ellipsize instead of widening the drawer at phone widths. */
.about-link {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, auto) 16px;
  align-items: center;
  gap: var(--fat-space-sm);
  padding: var(--fat-space-sm) var(--fat-space-xs);
  border-radius: var(--fat-radius-sm);
  color: var(--fat-text-primary);
  font-size: 13px;
  text-decoration: none;
  transition: var(--fat-transition-fast);
}

.about-link:hover {
  background: var(--fat-surface-hover);
}

/* The drawer's surface is `--fat-bg-card` (tokens.css maps `--el-bg-color` to it), the pair the
   focus ring is certified against at 3:1. */
.about-link:focus-visible {
  outline: 2px solid var(--fat-focus-ring);
  outline-offset: 2px;
}

/* Accent ink rather than body ink and no permanent underline: this is the siblings' link-row
   treatment, and --fat-link-ink is the token that certifies the accent as 13px text on the card
   in all six themes and both modes (blue's 2.78:1 primary is deliberately not used here). The
   row's hover wash and the trailing arrow still carry the "this leaves the page" affordance. */
.about-link-label {
  color: var(--fat-link-ink);
}

.about-link-host {
  overflow: hidden;
  min-width: 0;
  color: var(--fat-text-secondary);
  font-size: 12px;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.about-link-icon {
  color: var(--fat-text-secondary);
}

.about-license {
  margin: 0;
  color: var(--fat-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
</style>
