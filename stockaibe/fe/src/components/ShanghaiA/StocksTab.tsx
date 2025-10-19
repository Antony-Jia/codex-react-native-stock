import React, { useMemo } from 'react';
import { Button, Card, Input, Space, Switch, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DatabaseOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import type { ShanghaiAStock } from '../../types/api';
import type { StocksTabProps } from './types';

const StocksTab: React.FC<StocksTabProps> = ({
  stocks,
  loading,
  onlyActive,
  keyword,
  syncingCodes,
  onLoad,
  onSetOnlyActive,
  onSetKeyword,
  onViewDetails,
  onSync,
  onEdit,
  onOpenCreate,
}) => {
  const columns: ColumnsType<ShanghaiAStock> = useMemo(
    () => [
      { title: '代码', dataIndex: 'code', width: 100 },
      { title: '名称', dataIndex: 'name', width: 160 },
      {
        title: '简称',
        dataIndex: 'short_name',
        width: 120,
        render: (value) => value || '-',
      },
      {
        title: '行业',
        dataIndex: 'industry',
        width: 140,
        render: (value) => value || '-',
      },
      {
        title: '上市日期',
        dataIndex: 'listing_date',
        width: 140,
        render: (value: string | undefined) => value || '-',
      },
      {
        title: '启用',
        dataIndex: 'is_active',
        width: 80,
        render: (value: boolean) => <Tag color={value ? 'green' : 'default'}>{value ? '启用' : '停用'}</Tag>,
      },
      {
        title: '操作',
        key: 'actions',
        width: 200,
        render: (_, record) => {
          const syncing = syncingCodes.includes(record.code);
          return (
            <Space>
              <Button size="small" loading={syncing} onClick={() => onSync(record)}>
                同步信息
              </Button>
              <Button size="small" onClick={() => onViewDetails(record)}>
                查看详细
              </Button>
              <Button size="small" onClick={() => onEdit(record)}>
                编辑
              </Button>
            </Space>
          );
        },
      },
    ],
    [syncingCodes, onSync, onViewDetails, onEdit]
  );

  return (
    <Card>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          placeholder="按代码或名称搜索"
          allowClear
          defaultValue={keyword}
          onSearch={(value) => onSetKeyword(value || undefined)}
          style={{ width: 220 }}
        />
        <Switch
          checked={onlyActive}
          onChange={(checked) => onSetOnlyActive(checked)}
          checkedChildren="仅启用"
          unCheckedChildren="全部"
        />
        <Button icon={<ReloadOutlined />} onClick={onLoad} loading={loading}>
          刷新
        </Button>
        <Button type="primary" icon={<PlusOutlined />} onClick={onOpenCreate}>
          新建股票
        </Button>
      </Space>
      <Table<ShanghaiAStock>
        columns={columns}
        dataSource={stocks}
        loading={loading}
        rowKey="code"
        pagination={{ pageSize: 20 }}
        scroll={{ x: 800 }}
      />
    </Card>
  );
};

export default StocksTab;
