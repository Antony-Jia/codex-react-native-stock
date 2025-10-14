import { Button, Dropdown, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DownOutlined, EditOutlined, MoreOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { ApiSpec } from '../types';

export interface ApiTableProps {
  dataSource: ApiSpec[];
  onCreate: () => void;
  onEdit: (record: ApiSpec) => void;
  onRemove: (id: string) => void;
}

const statusTagColor: Record<ApiSpec['status'], string> = {
  draft: 'gold',
  active: 'green',
  deprecated: 'red'
};

const ApiTable = ({ dataSource, onCreate, onEdit, onRemove }: ApiTableProps) => {
  const columns: ColumnsType<ApiSpec> = [
    {
      title: '接口名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{text}</Typography.Text>
          <Typography.Text type="secondary">{record.description}</Typography.Text>
        </Space>
      )
    },
    {
      title: '方法',
      dataIndex: 'methods',
      key: 'methods',
      render: methods => (
        <Space wrap>
          {methods.map((method: string) => (
            <Tag key={method} color="blue">
              {method}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: '版本',
      dataIndex: 'version',
      key: 'version'
    },
    {
      title: '限流 (次/分钟)',
      dataIndex: 'rateLimitPerMinute',
      key: 'rateLimitPerMinute'
    },
    {
      title: '负责人',
      dataIndex: 'owner',
      key: 'owner'
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: ApiSpec['status']) => <Tag color={statusTagColor[status]}>{status}</Tag>
    },
    {
      title: '更新于',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (value: string) => dayjs(value).format('YYYY-MM-DD HH:mm')
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EditOutlined />} type="link" onClick={() => onEdit(record)}>
            编辑
          </Button>
          <Dropdown
            menu={{
              items: [
                {
                  key: 'duplicate',
                  label: '复制配置',
                  onClick: () => onEdit({ ...record, id: `${record.id}-copy`, name: `${record.name}（复制）` })
                },
                {
                  key: 'delete',
                  label: '删除',
                  danger: true,
                  onClick: () => onRemove(record.id)
                }
              ]
            }}
          >
            <Button type="text" icon={<MoreOutlined />}>更多</Button>
          </Dropdown>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
          新建接口
        </Button>
        <Button icon={<DownOutlined />}>批量导入</Button>
      </Space>
      <Table<ApiSpec>
        rowKey="id"
        columns={columns}
        dataSource={dataSource}
        pagination={{ pageSize: 8 }}
      />
    </div>
  );
};

export default ApiTable;
