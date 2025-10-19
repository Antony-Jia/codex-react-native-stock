import type { Dayjs } from 'dayjs';
import type {
  ShanghaiAStock,
  ShanghaiAStockBalanceSheetSummary,
  ShanghaiAStockCreate,
  ShanghaiAStockPerformanceSummary,
} from '../../types/api';

export type StockFormValues = ShanghaiAStockCreate & { listing_date?: Dayjs; is_active?: boolean };

export type BalanceSheetTableRow = Partial<ShanghaiAStockBalanceSheetSummary> & {
  key: string;
  isGroup?: boolean;
  children?: BalanceSheetTableRow[];
};

export type PerformanceTableRow = Partial<ShanghaiAStockPerformanceSummary> & {
  key: string;
  isGroup?: boolean;
  children?: PerformanceTableRow[];
};

export interface StocksTabProps {
  stocks: ShanghaiAStock[];
  loading: boolean;
  onlyActive: boolean;
  keyword?: string;
  syncingCodes: string[];
  onLoad: () => void;
  onSetOnlyActive: (value: boolean) => void;
  onSetKeyword: (value?: string) => void;
  onViewDetails: (stock: ShanghaiAStock) => void;
  onSync: (stock: ShanghaiAStock) => void;
  onEdit: (stock: ShanghaiAStock) => void;
  onOpenCreate: () => void;
}
