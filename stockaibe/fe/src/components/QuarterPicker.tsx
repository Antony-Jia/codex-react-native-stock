import React from 'react';
import { Select, Space } from 'antd';
import dayjs, { Dayjs } from 'dayjs';

interface QuarterPickerProps {
  value?: Dayjs | null;
  onChange?: (value: Dayjs | null) => void;
  placeholder?: string;
  style?: React.CSSProperties;
  allowClear?: boolean;
}

const quarterEndDates: Record<string, string> = {
  Q1: '03-31',
  Q2: '06-30',
  Q3: '09-30',
  Q4: '12-31',
};

const parseValue = (val?: Dayjs | null) => {
  if (!val) {
    return null;
  }
  const month = val.month() + 1;
  if (month <= 3) {
    return { year: val.year(), quarter: 'Q1' };
  }
  if (month <= 6) {
    return { year: val.year(), quarter: 'Q2' };
  }
  if (month <= 9) {
    return { year: val.year(), quarter: 'Q3' };
  }
  return { year: val.year(), quarter: 'Q4' };
};

const getQuarterEndDate = (year: number, quarter: keyof typeof quarterEndDates) =>
  dayjs(`${year}-${quarterEndDates[quarter]}`);

const QuarterPicker: React.FC<QuarterPickerProps> = ({
  value,
  onChange,
  placeholder,
  style,
  allowClear = true,
}) => {
  const currentYear = dayjs().year();
  const years = React.useMemo(
    () => Array.from({ length: currentYear - 2009 + 1 }, (_, index) => 2010 + index),
    [currentYear]
  );

  const parsed = parseValue(value);
  const selectedYear = parsed?.year;
  const selectedQuarter = parsed?.quarter as keyof typeof quarterEndDates | undefined;
  const quarterPlaceholder = placeholder ?? '季度';

  const emitChange = (year: number, quarter: keyof typeof quarterEndDates) => {
    const newValue = getQuarterEndDate(year, quarter);
    onChange?.(newValue);
  };

  const handleYearChange = (year: number) => {
    const nextQuarter = selectedQuarter ?? 'Q1';
    emitChange(year, nextQuarter);
  };

  const handleQuarterChange = (quarter: keyof typeof quarterEndDates) => {
    const nextYear = selectedYear ?? currentYear;
    emitChange(nextYear, quarter);
  };

  const handleClear = () => {
    onChange?.(null);
  };

  return (
    <Space.Compact style={style}>
      <Select<number>
        value={selectedYear}
        onChange={handleYearChange}
        placeholder="年份"
        style={{ width: 110 }}
        allowClear={allowClear}
        onClear={handleClear}
        showSearch
        optionFilterProp="value"
      >
        {years.map((year) => (
          <Select.Option key={year} value={year}>
            {year}
          </Select.Option>
        ))}
      </Select>
      <Select<keyof typeof quarterEndDates>
        value={selectedQuarter}
        onChange={handleQuarterChange}
        placeholder={quarterPlaceholder}
        style={{ width: 120 }}
        allowClear={allowClear}
        onClear={handleClear}
      >
        {Object.keys(quarterEndDates).map((quarter) => (
          <Select.Option key={quarter} value={quarter as keyof typeof quarterEndDates}>
            {quarter}
          </Select.Option>
        ))}
      </Select>
    </Space.Compact>
  );
};

export default QuarterPicker;
