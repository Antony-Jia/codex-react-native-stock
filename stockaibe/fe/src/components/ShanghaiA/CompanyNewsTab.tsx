import React, { useState } from 'react';
import { Table, Space, Button, DatePicker, message } from 'antd';
import { ReloadOutlined, CloudDownloadOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import type { ShanghaiACompanyNews } from '../../types/api';
import { apiClient } from '../../api/client';

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
  const [collectLoading, setCollectLoading] = useState(false);
  const [collectDate, setCollectDate] = useState<Dayjs | null>(null);

  const handleCollect = async () => {
    try {
      setCollectLoading(true);
      const targetDate = collectDate ? collectDate.format('YYYY-MM-DD') : undefined;
      const result = await apiClient.collectCompanyNews(targetDate);
      message.success(`采集完成！日期: ${result.date}, 新增 ${result.new_items} 条`);
      onLoad(); // 刷新列表
    } catch (error: any) {
      console.error('Failed to collect company news:', error);
      message.error(`采集失败: ${error.response?.data?.detail || error.message}`);
    } finally {
      setCollectLoading(false);
    }
  };

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
        <DatePicker
          placeholder="选择采集日期"
          value={collectDate}
          onChange={setCollectDate}
          style={{ width: 200 }}
        />
        <Button
          type="primary"
          icon={<CloudDownloadOutlined />}
          onClick={handleCollect}
          loading={collectLoading}
        >
          采集公司动态
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
