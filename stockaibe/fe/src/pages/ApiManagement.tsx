import { Button, Card, Input, Segmented, Space, Tag, message } from 'antd';
import { useMemo, useState } from 'react';
import { ApiSpec } from '../types';
import ApiTable from '../components/ApiTable';
import ApiForm from '../components/ApiForm';
import { useApiRegistry } from '../hooks/useApiRegistry';

const ApiManagement = () => {
  const { apis, dispatch, groupedByStatus } = useApiRegistry();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | ApiSpec['status']>('all');
  const [editing, setEditing] = useState<ApiSpec | undefined>();
  const [isModalOpen, setModalOpen] = useState(false);

  const filteredApis = useMemo(() => {
    return apis.filter(api => {
      const matchKeyword =
        !search || api.name.includes(search) || api.description?.includes(search) || api.owner.includes(search);
      const matchStatus = filterStatus === 'all' || api.status === filterStatus;
      return matchKeyword && matchStatus;
    });
  }, [apis, search, filterStatus]);

  const handleCreate = () => {
    setEditing(undefined);
    setModalOpen(true);
  };

  const handleEdit = (record: ApiSpec) => {
    setEditing(record);
    setModalOpen(true);
  };

  const handleRemove = (id: string) => {
    dispatch({ type: 'remove', payload: id });
    message.success('接口已移除');
  };

  const handleSubmit = (value: ApiSpec) => {
    if (apis.some(api => api.id === value.id)) {
      dispatch({ type: 'update', payload: value });
      message.success('接口已更新');
    } else {
      dispatch({ type: 'create', payload: value });
      message.success('接口已创建');
    }
    setModalOpen(false);
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Space wrap>
            <Input.Search
              allowClear
              placeholder="搜索接口名称、描述或负责人"
              onSearch={setSearch}
              onChange={event => setSearch(event.target.value)}
              style={{ width: 320 }}
            />
            <Segmented
              options={[
                { label: `全部 (${apis.length})`, value: 'all' },
                { label: `草稿 (${groupedByStatus.draft ?? 0})`, value: 'draft' },
                { label: `已发布 (${groupedByStatus.active ?? 0})`, value: 'active' },
                { label: `下线计划 (${groupedByStatus.deprecated ?? 0})`, value: 'deprecated' }
              ]}
              value={filterStatus}
              onChange={value => setFilterStatus(value as typeof filterStatus)}
            />
            <Space>
              <Button onClick={() => message.info('批量导入功能筹备中')}>批量导入</Button>
              <Button type="primary" onClick={handleCreate}>
                新建接口
              </Button>
            </Space>
          </Space>
          <Space wrap>
            <Tag color="processing">支持动态扩展字段</Tag>
            <Tag color="purple">后续可接入审批、流控、灰度等能力</Tag>
          </Space>
        </Space>
      </Card>
      <Card>
        <ApiTable dataSource={filteredApis} onCreate={handleCreate} onEdit={handleEdit} onRemove={handleRemove} />
      </Card>
      <ApiForm
        open={isModalOpen}
        initialValue={editing}
        onSubmit={handleSubmit}
        onCancel={() => setModalOpen(false)}
      />
    </Space>
  );
};

export default ApiManagement;
