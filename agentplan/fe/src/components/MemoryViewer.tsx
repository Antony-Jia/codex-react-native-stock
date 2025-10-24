import { Card, Empty, List, Typography } from "antd";
import { useOrchestratorStore } from "../state/useOrchestratorStore";

const MemoryViewer = () => {
  const memoryRecords = useOrchestratorStore((state) => state.memoryRecords);

  if (!memoryRecords.length) {
    return (
      <Card title="Memory Records">
        <Empty description="Generate a plan to populate planning memories." />
      </Card>
    );
  }

  return (
    <Card title="Memory Records">
      <List
        dataSource={memoryRecords}
        renderItem={(record) => (
          <List.Item>
            <List.Item.Meta
              title={
                <Typography.Text strong>{record.path}</Typography.Text>
              }
              description={
                <Typography.Paragraph style={{ marginBottom: 0 }}>
                  {record.note ? (
                    <Typography.Text type="secondary">{record.note}</Typography.Text>
                  ) : null}
                  <pre style={{ margin: 0, marginTop: 4, whiteSpace: "pre-wrap" }}>
                    {JSON.stringify(record.payload ?? {}, null, 2)}
                  </pre>
                </Typography.Paragraph>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};

export default MemoryViewer;
