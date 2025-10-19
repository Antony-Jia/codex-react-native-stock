import React, { useState, useEffect } from 'react';
import { Table, Spin, Alert, Pagination } from 'antd';
import { apiClient } from '../../api/client';

const CompanyNewsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [news, setNews] = useState([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const response = await apiClient.get(`/api/shanghai_a/company-news?page=${currentPage}&page_size=${pageSize}`);
        setNews(response.data.items);
        setTotal(response.data.total);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [currentPage, pageSize]);

  const columns = [
    {
      title: '交易日',
      dataIndex: 'trade_date',
      key: 'trade_date',
    },
    {
      title: '代码',
      dataIndex: 'code',
      key: 'code',
    },
    {
      title: '简称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '事件类型',
      dataIndex: 'event_type',
      key: 'event_type',
    },
    {
      title: '具体事项',
      dataIndex: 'specific_matters',
      key: 'specific_matters',
    },
  ];

  if (loading) {
    return <Spin tip="Loading..."><div style={{ height: '100vh' }} /></Spin>;
  }

  if (error) {
    return <Alert message="Error" description={error} type="error" showIcon />;
  }

  return (
    <div>
      <h1>公司动态</h1>
      <Table
        dataSource={news}
        columns={columns}
        rowKey="id"
        pagination={false}
      />
      <Pagination
        current={currentPage}
        pageSize={pageSize}
        total={total}
        onChange={(page, size) => {
          setCurrentPage(page);
          setPageSize(size);
        }}
        showSizeChanger
        showQuickJumper
        style={{ marginTop: '16px', textAlign: 'right' }}
      />
    </div>
  );
};

export default CompanyNewsPage;
