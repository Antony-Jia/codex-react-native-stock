import React from 'react';
import { Table, Space, Button } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { ShanghaiACompanyNews } from '../../types/api';

interface CompanyNewsTabProps {
  data: ShanghaiACompanyNews[];
  loading: boolean;
  page: number;
  total: number;
  onLoad: () => void;
  onSetPage: (page: number) => void;
}

const CompanyNewsTab: React.FC<CompanyNewsTabProps> = ({
  data,
  loading,
  page,
  total,
  onLoad,
  onSetPage,
}) => {
  const columns: ColumnsType<ShanghaiACompanyNews> = [
    {
      title: '交易日',
      dataIndex: 'trade_date',
      key: 'trade_date',
      width: 120,
    },
    {
      title: '代码',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: '简称',
      dataIndex: 'name',
      key: 'name',
      width: 150,
    },
    {
      title: '事件类型',
      dataIndex: 'event_type',
      key: 'event_type',
      width: 150,
    },
    {
      title: '具体事项',
      dataIndex: 'specific_matters',
      key: 'specific_matters',
      ellipsis: true,
    },
  ];

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space>
        <Button icon={<ReloadOutlined />} onClick={onLoad} loading={loading}>
          刷新
        </Button>
      </Space>
      <Table<ShanghaiACompanyNews>
        columns={columns}
        dataSource={data}
        loading={loading}
        rowKey="id"
        pagination={{
          current: page,
          pageSize: 20,
          total: total,
          showSizeChanger: false,
          showQuickJumper: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (page) => onSetPage(page),
        }}
      />
    </Space>
  );
};

export default CompanyNewsTab;
