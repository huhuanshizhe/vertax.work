import { RightOutlined } from "@ant-design/icons";
import Link from "next/link";

export type PendingOrderCardData = {
  orderNumber: string;
  contactName: string;
  contactEmail: string;
  amountLabel: string;
  moduleLabels: string[];
  periodLabel: string;
  paymentMethod: string;
  placedAtLabel: string;
  statusLabel?: string;
};

export function OrderPendingCard({ order }: { order: PendingOrderCardData }) {
  const customerLine =
    [order.contactName, order.contactEmail].filter(Boolean).join(" · ") ||
    "客户信息未填写";
  const planLine = [
    order.moduleLabels.join("、") || "未选模块",
    order.periodLabel,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={`/admin/orders/${order.orderNumber}`}
      className="inquiry-active-card-link"
    >
      <article className="info-card inquiry-active-card order-pending-card">
        <div className="inquiry-active-card__header">
          <h2 className="inquiry-active-card__title">{order.orderNumber}</h2>
          <span className="product-badge" data-color="orange">
            {order.statusLabel || "待处理"}
          </span>
        </div>
        <p className="inquiry-active-card__meta">{customerLine}</p>
        <p className="inquiry-active-card__meta">
          {order.amountLabel} · {order.paymentMethod || "未设置支付"} ·{" "}
          {planLine}
        </p>
        <div className="inquiry-active-card__footer">
          <span className="inquiry-active-card__action">
            <span>查看详情</span>
            <RightOutlined />
          </span>
          <p className="inquiry-active-card__meta inquiry-active-card__meta--footer">
            下单时间：{order.placedAtLabel}
          </p>
        </div>
      </article>
    </Link>
  );
}
