export interface PurchaseClusteringPreprocessingConfig {
  log1p?: string[];
  n_init?: number;
  scaler?: string;
  random_state?: number;
  categorical_variables_used_for_description_only?: string[];
  [key: string]: unknown;
}

export interface PurchaseClusteringIntegrity {
  expectedClusters: number;
  actualProfiles: number;
  expectedOrders: number;
  assignedOrders: number;
  profileOrdersSum: number;
  profilePercentageSum: number;
  consistent: boolean;
}

export interface PurchaseClusteringSummary {
  runId: number;
  modelVersion: string;
  algorithm: string;
  selectedK: number;
  ordersAnalyzed: number;
  featureCount: number;
  datasetView: string;
  dataOrigin: string;
  periodStart: string;
  periodEnd: string;
  inertia: number | null;
  silhouetteScore: number | null;
  daviesBouldinScore: number | null;
  calinskiHarabaszScore: number | null;
  featureNames: string[];
  preprocessingConfig: PurchaseClusteringPreprocessingConfig;
  notebookName: string | null;
  status: string;
  active: boolean;
  executedAt: string;
  academicData: boolean;
  dataDisclaimer: string;
  integrity: PurchaseClusteringIntegrity;
}

export interface PurchaseClusterProfile {
  clusterNumber: number;
  clusterName: string;
  clusterDescription: string | null;
  orderCount: number;
  percentage: number;
  averageTotal: number | null;
  averageDiscountPct: number | null;
  averageShippingPct: number | null;
  averageUnitPrice: number | null;
  averageTotalUnits: number | null;
  averageUniqueProducts: number | null;
  averageUniqueCategories: number | null;
  averageUnitsPerProduct: number | null;
  averageAccessoryUnits: number | null;
  averageInstrumentUnits: number | null;
  averageViolinUnits: number | null;
  averageJaranaUnits: number | null;
  averageQuintaUnits: number | null;
  averageAccessoryValueShare: number | null;
  averageInstrumentValueShare: number | null;
  averageLargestProductValueShare: number | null;
  weekendPercentage: number | null;
  dominantPaymentMethod: string | null;
  dominantDeliveryType: string | null;
  recommendedAction: string;
}

export interface PurchaseClusterOrder {
  orderId: number;
  orderNumber: string;
  createdAt: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  discountPct: number;
  shippingPct: number;
  totalUnits: number;
  uniqueProducts: number;
  uniqueCategories: number;
  unitsPerProduct: number;
  accessoryUnits: number;
  instrumentUnits: number;
  violinUnits: number;
  jaranaUnits: number;
  quintaUnits: number;
  accessoryValueShare: number;
  instrumentValueShare: number;
  largestProductValueShare: number;
  averageUnitPrice: number;
  weekend: boolean;
  paymentMethod: string;
  deliveryType: string;
  clusterNumber: number;
  clusterName: string;
  recommendedAction: string;
}

export interface PurchaseClusterOrdersPage {
  content: PurchaseClusterOrder[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface PurchaseClusteringModelStatus {
    versionEsquema: string;
    versionModelo: string;
    fechaGeneracionUtc: string;
    algoritmoNombre: string;
    numeroClusters: number;
    numeroCaracteristicas: number;
    unidadAnalisis: string;
}

export interface PurchaseOrderClusteringPrediction {
    orderId: number;
    orderNumber: string;
    modelVersion: string;
    algorithm: string;
    predictedCluster: number;
    clusterName: string;
    clusterDescription: string;
    recommendedAction: string;
    distanceToCentroid: number;
    distancesToAllCentroids: number[];
    featureValues: number[];
    storedCluster: number | null;
    matchesStoredAssignment: boolean | null;
    assignmentMethod: string;
}
