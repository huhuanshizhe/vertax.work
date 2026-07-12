import type {
  OrderStatus,
  PaymentStatus,
  RefundStatus,
  ShippingStatus,
} from "@/db/schema";

export const ORDER_STATUS_LABELS: Record<string, string> = {
  unpaid: "未付款",
  pending_processing: "待处理",
  partially_shipped: "部分开通",
  shipped: "已开通",
  completed: "已完成",
  cancelled: "已取消",
  terminated: "已终止",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "未付款",
  paid: "已付款",
};

export const SHIPPING_STATUS_LABELS: Record<string, string> = {
  unshipped: "未发货",
  shipped: "已发货",
  delivered: "已签收",
};

export const REFUND_STATUS_LABELS: Record<string, string> = {
  none: "无退款",
  pending: "退款处理中",
  refunded: "已退款",
  partially_refunded: "部分退款",
  refund_rejected: "退款驳回",
};

export const INQUIRY_STATUS_LABELS: Record<string, string> = {
  new: "新询盘",
  contacted: "已联系",
  quoted: "已报价",
  closed: "已关闭",
};

export const INQUIRY_SALES_STATUS_LABELS: Record<string, string> = {
  unset: "未标记",
  following: "跟进中",
  negotiating: "洽谈中",
  won: "已成交",
  lost: "已丢失",
};

/** Customer-facing badge / short label */
export function getCustomerOrderBadge(order: {
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  refundStatus: string;
}): { badge: string; tone: "default" | "warning" | "success" | "danger" | "info" } {
  if (order.refundStatus === "pending") {
    return { badge: "退款处理中", tone: "warning" };
  }
  if (
    order.refundStatus === "refunded" ||
    order.refundStatus === "partially_refunded"
  ) {
    return { badge: "已退款", tone: "danger" };
  }
  if (order.status === "cancelled") return { badge: "已取消", tone: "default" };
  if (order.status === "terminated") return { badge: "已终止", tone: "danger" };
  if (order.status === "completed") return { badge: "已完成", tone: "success" };
  if (order.paymentStatus === "unpaid" || order.status === "unpaid") {
    return { badge: "待支付", tone: "warning" };
  }
  if (
    order.shippingStatus === "shipped" ||
    order.shippingStatus === "delivered" ||
    order.status === "shipped" ||
    order.status === "partially_shipped"
  ) {
    return { badge: "已开通", tone: "success" };
  }
  return { badge: "开通中", tone: "info" };
}

export function getCustomerOrderDetailCopy(order: {
  status: string;
  paymentStatus: string;
  shippingStatus: string;
  refundStatus: string;
}): string {
  const { badge } = getCustomerOrderBadge(order);
  if (badge === "待支付") return "完成支付后开始开通";
  if (badge === "开通中") {
    return "支付成功，授权开通中，通常 1 个工作日内送达";
  }
  if (badge === "已开通") return "授权已送达，可复制授权码";
  if (badge === "已完成") return "订单已完成";
  if (badge === "已取消") return "订单已取消";
  if (badge === "已终止") return "订单已终止";
  if (badge === "退款处理中") return "退款处理中，如有疑问请联系客服";
  if (badge === "已退款") return "该订单已退款";
  return ORDER_STATUS_LABELS[order.status] || order.status;
}

export const EDITABLE_ORDER_STATUSES: OrderStatus[] = [
  "pending_processing",
  "partially_shipped",
  "shipped",
  "completed",
];

export function isPaidPending(order: {
  status: string;
  paymentStatus: PaymentStatus | string;
}): boolean {
  return (
    order.paymentStatus === "paid" && order.status === "pending_processing"
  );
}

export function isProcessedOrder(order: {
  status: string;
  refundStatus: string;
}): boolean {
  return (
    (order.status === "partially_shipped" || order.status === "shipped") &&
    order.refundStatus !== "pending"
  );
}

export function isRefundOrder(order: { refundStatus: string }): boolean {
  return (
    order.refundStatus === "pending" ||
    order.refundStatus === "refunded" ||
    order.refundStatus === "partially_refunded"
  );
}

export function isHistoryOrder(order: {
  status: string;
  refundStatus: string;
}): boolean {
  return (
    order.status === "completed" ||
    order.status === "cancelled" ||
    order.status === "terminated" ||
    order.refundStatus === "refunded" ||
    order.refundStatus === "partially_refunded" ||
    order.refundStatus === "refund_rejected"
  );
}

export type { OrderStatus, PaymentStatus, ShippingStatus, RefundStatus };
