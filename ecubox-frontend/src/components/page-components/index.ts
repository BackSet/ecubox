/**
 * Barrel de primitivos de estructura de página.
 * Importa desde aquí para acceder a todos los bloques de layout de página
 * en un solo import: `import { PageHeader, PageCard, ... } from '@/components/page-components'`
 *
 * No incluye componentes de dominio ni de UI base (shadcn/Radix).
 */

// Encabezados y estructura
export { PageHeader } from '@/components/PageHeader';
export { PageSection } from '@/components/PageSection';
export { PageCard } from '@/components/PageCard';

// Estados de página
export { EmptyState } from '@/components/EmptyState';
export { LoadingState } from '@/components/LoadingState';
export { PageErrorState } from '@/components/PageErrorState';
export { InlineErrorBanner } from '@/components/InlineErrorBanner';

// Listados
export { ListToolbar } from '@/components/ListToolbar';
export { ListTableShell } from '@/components/ListTableShell';
export { FiltrosBar, FiltroCampo } from '@/components/FiltrosBar';
export { ChipFiltro } from '@/components/ChipFiltro';

// Formularios
export { FormSection } from '@/components/FormSection';
export { LabeledField } from '@/components/LabeledField';

// KPIs
export { KpiCard } from '@/components/KpiCard';
export type { KpiTone } from '@/components/KpiCard';
export { KpiCardsGrid } from '@/components/KpiCardsGrid';

// Tipografía de sección
export { SectionTitle } from '@/components/SectionTitle';
