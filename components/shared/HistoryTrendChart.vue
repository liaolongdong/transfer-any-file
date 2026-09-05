<script setup lang="ts">
import { computed } from 'vue';
import type { HistoryRecord } from '~/composables/useHistory';
import { formatSize } from '~/utils/core/format';
import { useI18n } from '~/composables/useI18n';

const props = withDefaults(
  defineProps<{
    records: HistoryRecord[];
    maxPoints?: number;
  }>(),
  { maxPoints: 12 },
);

const { t } = useI18n();

const WIDTH = 120;
const HEIGHT = 32;
const PAD = 3;

/** Records are stored newest-first; we render oldest-to-newest so the line advances rightward.
 *  `slice(0, n)` already returns a fresh array, so `reverse()` cannot touch the prop. */
const data = computed<HistoryRecord[]>(() => props.records.slice(0, props.maxPoints).reverse());

const hasEnough = computed(() => data.value.length >= 2);

const maxSize = computed(() => Math.max(1, ...data.value.map(r => r.resultSize)));

const points = computed(() => {
  const ds = data.value;
  if (ds.length < 2) return [] as { size: number; x: number; y: number; label: string }[];
  const innerW = WIDTH - PAD * 2;
  const innerH = HEIGHT - PAD * 2;
  return ds.map((r, i) => {
    const x = PAD + (i / (ds.length - 1)) * innerW;
    const y = PAD + (1 - r.resultSize / maxSize.value) * innerH;
    return { size: r.resultSize, x, y, label: formatSize(r.resultSize) };
  });
});

const linePath = computed(() => {
  return points.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)},${p.y.toFixed(2)}`)
    .join(' ');
});

/** Mirror the line across the X-axis to suggest a filled area without adding a second path element. */
const areaPath = computed(() => {
  if (points.value.length === 0) return '';
  const last = points.value[points.value.length - 1];
  const first = points.value[0];
  return `${linePath.value} L${last.x.toFixed(2)},${(HEIGHT - PAD).toFixed(2)} L${first.x.toFixed(2)},${(HEIGHT - PAD).toFixed(2)} Z`;
});

const lastPoint = computed(() => points.value[points.value.length - 1]);

/** Hover target for the "head" dot. The SVG is rendered 1:1 (width/height match the
 *  viewBox), so r=12 is a 24×24 CSS px target — the WCAG 2.5.8 minimum. The circle is
 *  `fill: transparent`, so enlarging it costs nothing visually. */
const headHit = computed(() => {
  if (!lastPoint.value) return null;
  return { cx: lastPoint.value.x, cy: lastPoint.value.y, r: 12 };
});
</script>

<template>
  <div
    v-if="hasEnough"
    class="trend-chart"
    role="img"
    :aria-label="t('history.trend')"
  >
    <span class="trend-label">{{ t('history.trend') }}</span>
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      :width="WIDTH"
      :height="HEIGHT"
      class="trend-svg"
      preserveAspectRatio="none"
    >
      <path
        :d="areaPath"
        class="trend-area"
      />
      <path
        :d="linePath"
        class="trend-line"
        fill="none"
      />
      <circle
        v-if="lastPoint"
        :cx="lastPoint.x"
        :cy="lastPoint.y"
        r="1.6"
        class="trend-head"
      />
      <circle
        v-if="headHit"
        :cx="headHit.cx"
        :cy="headHit.cy"
        :r="headHit.r"
        class="trend-hit"
      >
        <title>{{ lastPoint?.label }}</title>
      </circle>
    </svg>
  </div>
</template>

<style scoped>
.trend-chart {
  display: inline-flex;
  align-items: center;
  gap: var(--fat-space-xs);
}

.trend-label {
  font-size: 11px;
  color: var(--fat-text-secondary);
  font-weight: 500;
}

.trend-svg {
  display: block;
  overflow: visible;
}

.trend-line {
  stroke: var(--fat-primary);
  stroke-width: 1.25;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-area {
  fill: var(--fat-primary);
  fill-opacity: 0.12;
  stroke: none;
}

.trend-head {
  fill: var(--fat-primary);
}

.trend-hit {
  fill: transparent;
  cursor: default;
  pointer-events: all;
}
</style>
