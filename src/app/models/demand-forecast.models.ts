export interface DemandForecastModelStatusDTO {
  modelVersion: string;
  algorithmFamily: string;
  method: string;
  windowWeeks: number;
  forecastHorizonWeeks: number;
  dataSource: string;
  dynamicCalculation: boolean;
  timezone: string;
  weekDefinition: string;
  minimumHistoryWeeks: number;
  artifactGeneratedAt: string;
  evaluationMetrics: { [key: string]: number };
  limitations: string;
  currentDataLastCompleteWeek: string | null;
  eligibleProducts: number;
  insufficientHistoryProducts: number;
  configurationErrors: string[];
}

export interface DemandForecastListDTO {
  productId: number;
  productSku: string;
  productName: string;
  categoryId: number;
  categoryName: string;
  productActive: boolean;
  forecastStatus: string; // AVAILABLE | INSUFFICIENT_HISTORY
  forecastWeekStart: string;
  forecastWeekEnd: string;
  modelVersion: string;
  modelMethod: string;
  windowWeeks: number;
  forecastUnits: number;
  forecastUnitsRoundedUp: number;
  trend: string; // CRECIENTE | ESTABLE | DECRECIENTE
  demandPriority: string; // ALTA | MEDIA | BAJA
  currentStock: number;
  suggestedReplenishment: number;
  historyWeeksCount: number;
  lastCompleteWeek: string;
  message: string;
}

export interface WeeklySalesRecord {
  weekStart: string;
  weekEnd: string;
  unitsSold: number;
  ordersCount: number;
}

export interface DemandForecastDetailDTO extends DemandForecastListDTO {
  historyTail: WeeklySalesRecord[];
  previousHalfMean: number;
  recentHalfMean: number;
  relativeChange: number;
  percentileRank: number;
}
