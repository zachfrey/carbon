import type { IconType } from "react-icons";
import {
  LuFileCheck,
  LuGauge,
  LuHardHat,
  LuOctagonAlert,
  LuShoppingCart,
  LuSquareUser,
  LuUser,
  LuWrench
} from "react-icons/lu";
import { PiShareNetworkFill } from "react-icons/pi";
import { RiProgress8Line } from "react-icons/ri";

// Entity type styling configuration
export const entityTypeConfig: Record<
  string,
  { bgColor: string; textColor: string; icon: IconType }
> = {
  customer: {
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    textColor: "text-blue-600 dark:text-blue-400",
    icon: LuSquareUser
  },
  supplier: {
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    textColor: "text-purple-600 dark:text-purple-400",
    icon: PiShareNetworkFill
  },
  gauge: {
    bgColor: "",
    textColor: "",
    icon: LuGauge
  },
  issue: {
    bgColor: "",
    textColor: "",
    icon: LuOctagonAlert
  },
  item: {
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    textColor: "text-emerald-600 dark:text-emerald-400",
    icon: LuWrench
  },
  job: {
    bgColor: "bg-orange-100 dark:bg-orange-900/30",
    textColor: "text-orange-600 dark:text-orange-400",
    icon: LuHardHat
  },
  employee: {
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    textColor: "text-cyan-600 dark:text-cyan-400",
    icon: LuUser
  },
  purchaseOrder: {
    bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
    textColor: "text-yellow-600 dark:text-yellow-400",
    icon: LuShoppingCart
  },
  salesInvoice: {
    bgColor: "bg-green-100 dark:bg-green-900/30",
    textColor: "text-green-600 dark:text-green-400",
    icon: RiProgress8Line
  },
  purchaseInvoice: {
    bgColor: "bg-red-100 dark:bg-red-900/30",
    textColor: "text-red-600 dark:text-red-400",
    icon: LuFileCheck
  }
};

export function getEntityTypeConfig(entityType: string) {
  return (
    entityTypeConfig[entityType] ?? {
      bgColor: "bg-muted",
      textColor: "text-muted-foreground",
      icon: null
    }
  );
}

export function getEntityTypeLabel(entityType: string): string {
  const labels: Record<string, string> = {
    customer: "Customer",
    supplier: "Supplier",
    gauge: "Gauge",
    issue: "Issue",
    item: "Item",
    job: "Job",
    employee: "Person",
    purchaseOrder: "Purchase Order",
    salesInvoice: "Sales Invoice",
    purchaseInvoice: "Purchase Invoice"
  };
  return labels[entityType] ?? entityType;
}
