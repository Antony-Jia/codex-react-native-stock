import { Button, Card, Input, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { useOrchestratorStore } from "../state/useOrchestratorStore";

const { TextArea } = Input;

const VfsPanel = () => {
  const loadVfs = useOrchestratorStore((state) => state.loadVfs);
  const saveVfs = useOrchestratorStore((state) => state.saveVfs);
  const vfsData = useOrchestratorStore((state) => state.vfsData);
  const vfsPath = useOrchestratorStore((state) => state.vfsPath);
  const loading = useOrchestratorStore((state) => state.loading);
  const [path, setPath] = useState<string>(vfsPath);
  const [draft, setDraft] = useState<string>(JSON.stringify(vfsData ?? {}, null, 2));

  useEffect(() => {
    setPath(vfsPath);
  }, [vfsPath]);

  useEffect(() => {
    setDraft(JSON.stringify(vfsData ?? {}, null, 2));
  }, [vfsData]);

  const onLoad = async () => {
    await loadVfs(path);
  };

  const onSave = async () => {
    try {
      const payload = JSON.parse(draft) as Record<string, unknown>;
      await saveVfs(path, payload);
    } catch (err) {
      console.error("Invalid JSON payload", err);
    }
  };

  return (
    <Card title="Virtual File System">
      <Space direction="vertical" style={{ width: "100%" }} size="middle">
        <Input
          value={path}
          onChange={(event) => setPath(event.target.value)}
          placeholder="tenant/workspace/result.json"
        />
        <Space>
          <Button type="default" onClick={onLoad} loading={loading}>
            Load
          </Button>
          <Button type="primary" onClick={onSave} loading={loading}>
            Save
          </Button>
        </Space>
        <Typography.Text type="secondary">JSON Payload</Typography.Text>
        <TextArea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          autoSize={{ minRows: 6, maxRows: 12 }}
          spellCheck={false}
          style={{ fontFamily: "Consolas, Monaco, monospace" }}
        />
      </Space>
    </Card>
  );
};

export default VfsPanel;
