
# 接口: stock_fund_flow_industry
# 目标地址: http://data.10jqka.com.cn/funds/hyzjl/#refCountId=data_55f13c2c_254
# 描述: 同花顺-数据中心-资金流向-行业资金流
# 限量: 单次获取指定 symbol 的行业资金流数据
# 更新频率: 每日收盘后更新,同时也需要即时更新
# example:
#             序号      行业      行业指数  行业-涨跌幅    流入资金    流出资金     净额  公司家数   领涨股  领涨股-涨跌幅    当前价
# 0    1    光伏设备   7932.33    3.58  170.29  146.82  23.47    75   艾能聚    13.95  21.48

# stock_fund_flow_industry_df = ak.stock_fund_flow_industry(symbol="即时")
# print(stock_fund_flow_industry_df)


# -----------------------------------------------------------------------------------------------------
# 接口: stock_hk_company_profile_em
# 目标地址: https://emweb.securities.eastmoney.com/PC_HKF10/pages/home/index.html?code=03900&type=web&color=w#/CompanyProfile
# 描述: 东方财富-港股-公司资料
# 限量: 单次返回全部数据
# 输入参数
# symbol: 股票代码
# example:
#         公司名称                              英文名称                      注册地  ...       核数师                                                传真
#         公司介绍
# 0  绿城中国控股有限公司  Greentown China Holdings Limited  Cayman Islands 开曼群岛（英属）  ...  安永会计师事务所  +852 2523-6608,+852 2576-3551,+86(571) 8790-1717      绿城中国控股有限公司( 
# 以下简称“绿城中国”)(股票代码03900.HK),1995年...
# stock_hk_company_profile_em_df = ak.stock_hk_company_profile_em(symbol="03900")
# print(stock_hk_company_profile_em_df)