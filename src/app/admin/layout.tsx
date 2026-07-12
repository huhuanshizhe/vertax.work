import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import "./admin.css";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AntdRegistry>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#e67e22",
            borderRadius: 8,
          },
        }}
      >
        <div className="admin-scope">{children}</div>
      </ConfigProvider>
    </AntdRegistry>
  );
}
