-- =====================================================
-- 四川固定资产盘点系统 - 完整建表脚本 + 测试数据
-- 数据库: sai_db
-- 执行时间: 2026-07-18
-- 表数量: 4个
-- =====================================================

-- =====================================================
-- 1. 删除旧表（如果存在）
-- =====================================================
DROP TABLE IF EXISTS sai_review_assignments;
DROP TABLE IF EXISTS sai_inventory_records;
DROP TABLE IF EXISTS sai_inventory_tasks;
DROP TABLE IF EXISTS sai_assets;

-- =====================================================
-- 2. 创建资产主数据表 (sai_assets)
-- 说明: 对应SAP中台同步的固定资产台账
-- =====================================================
CREATE TABLE sai_assets (
    Id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    AssetCode VARCHAR(50) NOT NULL COMMENT '资产卡片编码（唯一标识，用于二维码）',
    AssetName VARCHAR(200) NOT NULL COMMENT '资产名称',
    CategoryCode VARCHAR(50) DEFAULT NULL COMMENT '资产分类编码',
    CategoryName VARCHAR(100) DEFAULT NULL COMMENT '资产分类名称',
    UserName VARCHAR(100) DEFAULT NULL COMMENT '使用人姓名',
    DingtalkId VARCHAR(100) DEFAULT NULL COMMENT '使用人钉钉ID',
    CostCenter VARCHAR(50) DEFAULT NULL COMMENT '成本中心',
    Location VARCHAR(200) DEFAULT NULL COMMENT '存放地点',
    OriginalValue DECIMAL(18,2) DEFAULT NULL COMMENT '原值',
    NetValue DECIMAL(18,2) DEFAULT NULL COMMENT '净值',
    PurchaseDate DATETIME DEFAULT NULL COMMENT '采购日期',
    UseStatus VARCHAR(20) DEFAULT '在用' COMMENT '使用状态：在用/闲置/维修/报废',
    LabelPrinted TINYINT(1) DEFAULT 0 COMMENT '标签是否已打印',
    SyncTime DATETIME DEFAULT NULL COMMENT '数据同步时间',
    PRIMARY KEY (Id),
    UNIQUE KEY UK_AssetCode (AssetCode),
    KEY IDX_CategoryCode (CategoryCode),
    KEY IDX_CostCenter (CostCenter),
    KEY IDX_UseStatus (UseStatus)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='资产主数据表';

-- =====================================================
-- 3. 创建盘点任务表 (sai_inventory_tasks)
-- =====================================================
CREATE TABLE sai_inventory_tasks (
    Id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    TaskName VARCHAR(200) NOT NULL COMMENT '任务名称',
    ScopeType VARCHAR(20) NOT NULL COMMENT '盘点范围类型：all/by_org/by_category/by_cost_center',
    ScopeConfig VARCHAR(2000) DEFAULT NULL COMMENT '盘点范围配置（JSON格式）',
    NeedReview TINYINT(1) DEFAULT 0 COMMENT '是否需要复盘',
    ReviewRatio DECIMAL(5,2) DEFAULT NULL COMMENT '复盘比例（0.1=10%）',
    Deadline DATETIME DEFAULT NULL COMMENT '截止日期',
    Status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '状态：draft/running/completed/cancelled',
    CreatedBy VARCHAR(100) DEFAULT NULL COMMENT '创建人',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (Id),
    KEY IDX_Status (Status),
    KEY IDX_Deadline (Deadline)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点任务表';

-- =====================================================
-- 4. 创建盘点记录表 (sai_inventory_records)
-- =====================================================
CREATE TABLE sai_inventory_records (
    Id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    TaskId BIGINT NOT NULL COMMENT '关联盘点任务ID',
    AssetId BIGINT NOT NULL COMMENT '关联资产ID',
    AssetCode VARCHAR(50) NOT NULL COMMENT '资产编码',
    OperatorType VARCHAR(10) DEFAULT 'self' COMMENT '盘点类型：self=自盘, review=复盘',
    OperatorName VARCHAR(100) DEFAULT NULL COMMENT '盘点人姓名',
    OperatorDingtalkId VARCHAR(100) DEFAULT NULL COMMENT '盘点人钉钉ID',
    Status VARCHAR(20) DEFAULT 'normal' COMMENT '盘点状态：normal/abnormal/lost/scrapped',
    PhotoUrl VARCHAR(500) DEFAULT NULL COMMENT '照片OSS地址',
    FunctionStatus VARCHAR(50) DEFAULT NULL COMMENT '功能状态',
    AppearanceStatus VARCHAR(50) DEFAULT NULL COMMENT '外观状态',
    Remark VARCHAR(2000) DEFAULT NULL COMMENT '异常说明/备注',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (Id),
    KEY IDX_TaskId (TaskId),
    KEY IDX_AssetId (AssetId),
    KEY IDX_AssetCode (AssetCode),
    KEY IDX_OperatorDingtalkId (OperatorDingtalkId),
    KEY IDX_Status (Status),
    KEY IDX_CreatedAt (CreatedAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='盘点记录表';

-- =====================================================
-- 5. 创建复盘分配表 (sai_review_assignments)
-- =====================================================
CREATE TABLE sai_review_assignments (
    Id BIGINT NOT NULL AUTO_INCREMENT COMMENT '自增主键',
    TaskId BIGINT NOT NULL COMMENT '关联盘点任务ID',
    RecordId BIGINT NOT NULL COMMENT '关联的自盘记录ID',
    ReviewerName VARCHAR(100) DEFAULT NULL COMMENT '复盘人姓名',
    ReviewerDingtalkId VARCHAR(100) NOT NULL COMMENT '复盘人钉钉ID',
    Status VARCHAR(20) DEFAULT 'pending' COMMENT '状态：pending/completed/conflict',
    CreatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    PRIMARY KEY (Id),
    KEY IDX_TaskId (TaskId),
    KEY IDX_RecordId (RecordId),
    KEY IDX_ReviewerDingtalkId (ReviewerDingtalkId),
    KEY IDX_Status (Status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='复盘分配表';

-- =====================================================
-- 6. 插入测试数据 - 资产表 (12条)
-- =====================================================
INSERT INTO sai_assets 
(AssetCode, AssetName, CategoryCode, CategoryName, UserName, DingtalkId, CostCenter, Location, OriginalValue, NetValue, PurchaseDate, UseStatus, LabelPrinted, SyncTime)
VALUES
-- IT部设备
('ZC-2024-0001', '戴尔笔记本 Latitude 7430', 'CAT-001', '计算机设备', '张三', '1234567890', 'IT部', '办公楼302-001', 8500.00, 6800.00, '2024-03-15', '在用', 1, NOW()),
('ZC-2024-0002', '联想笔记本 ThinkPad X1 Carbon', 'CAT-001', '计算机设备', '李四', '1234567891', 'IT部', '办公楼302-002', 12000.00, 9600.00, '2024-03-15', '在用', 1, NOW()),
('ZC-2024-0003', 'MacBook Pro 16寸 M3', 'CAT-001', '计算机设备', '王五', '1234567892', 'IT部', '办公楼302-003', 22000.00, 19800.00, '2024-06-01', '在用', 1, NOW()),
-- 行政部设备
('ZC-2024-0004', 'HP激光打印机 M479fdw', 'CAT-002', '办公设备', '赵六', '1234567893', '行政部', '办公楼101-文印区', 4500.00, 3800.00, '2024-01-20', '在用', 1, NOW()),
('ZC-2024-0005', '佳能投影仪 LV-X300', 'CAT-002', '办公设备', '钱七', '1234567894', '行政部', '会议室-301', 3200.00, 2800.00, '2024-02-28', '在用', 1, NOW()),
('ZC-2024-0006', '碎纸机 科密C-838', 'CAT-002', '办公设备', '孙八', '1234567895', '行政部', '办公楼102-前台', 800.00, 650.00, '2024-01-15', '在用', 0, NOW()),
-- 运维部通信设备
('ZC-2024-0007', '华为交换机 S5720-28P', 'CAT-003', '通信设备', '周九', '1234567896', '运维部', '机房-A区-01', 8000.00, 6500.00, '2023-11-10', '在用', 1, NOW()),
('ZC-2024-0008', 'H3C防火墙 F1000-AI', 'CAT-003', '通信设备', '吴十', '1234567897', '运维部', '机房-A区-02', 15000.00, 12000.00, '2023-11-10', '在用', 1, NOW()),
('ZC-2024-0009', 'UPS电源 APC SRT3000', 'CAT-003', '通信设备', '郑十一', '1234567898', '运维部', '机房-C区-UPS', 28000.00, 22000.00, '2023-06-20', '在用', 1, NOW()),
-- 运维部服务器
('ZC-2024-0010', '戴尔服务器 R740', 'CAT-004', '服务器', '王十二', '1234567899', '运维部', '机房-B区-01', 45000.00, 38000.00, '2023-08-05', '在用', 1, NOW()),
('ZC-2024-0011', '联想服务器 SR650', 'CAT-004', '服务器', '冯十三', '1234567900', '运维部', '机房-B区-02', 42000.00, 35000.00, '2023-08-05', '维修', 1, NOW()),
-- 特殊状态资产
('ZC-2023-0001', '旧台式机 Dell 7080', 'CAT-001', '计算机设备', NULL, NULL, 'IT部', '库房-待报废区', 5500.00, 0.00, '2020-05-10', '报废', 1, DATE_SUB(NOW(), INTERVAL 2 YEAR)),
('ZC-2023-0002', '旧交换机 H3C S5110', 'CAT-003', '通信设备', NULL, NULL, '运维部', '未知', 3500.00, 0.00, '2019-08-20', '丢失', 1, DATE_SUB(NOW(), INTERVAL 3 YEAR));

-- =====================================================
-- 7. 插入测试数据 - 盘点任务表 (5条)
-- =====================================================
INSERT INTO sai_inventory_tasks 
(TaskName, ScopeType, ScopeConfig, NeedReview, ReviewRatio, Deadline, Status, CreatedBy, CreatedAt)
VALUES
('2026年办公区资产大盘点', 'all', '{}', 1, 0.10, '2026-07-31', 'running', '宋伯茂', NOW()),
('通信机房设备季度盘点', 'by_category', '{"category":"通信设备","categoryCode":"CAT-003"}', 1, 0.15, '2026-08-15', 'draft', '宋伯茂', NOW()),
('服务器资产专项盘点', 'by_category', '{"category":"服务器","categoryCode":"CAT-004"}', 0, NULL, '2026-08-30', 'completed', '宋伯茂', DATE_SUB(NOW(), INTERVAL 7 DAY)),
('IT设备日常巡检', 'by_cost_center', '{"costCenter":"IT部"}', 1, 0.10, '2026-07-25', 'running', '宋伯茂', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('报废设备清理盘点', 'by_cost_center', '{"costCenter":"运维部"}', 0, NULL, '2026-07-20', 'cancelled', '宋伯茂', DATE_SUB(NOW(), INTERVAL 30 DAY));

-- =====================================================
-- 8. 插入测试数据 - 盘点记录表 (6条)
-- =====================================================
INSERT INTO sai_inventory_records 
(TaskId, AssetId, AssetCode, OperatorType, OperatorName, OperatorDingtalkId, Status, PhotoUrl, FunctionStatus, AppearanceStatus, Remark, CreatedAt)
VALUES
-- 任务1(办公区盘点)的记录
(1, 1, 'ZC-2024-0001', 'self', '张三', '1234567890', 'normal', 'https://scwms.chinaccsscm.cn/uploads/20260718/001.jpg', '正常', '良好', '设备运行正常，电池健康度92%', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, 2, 'ZC-2024-0002', 'self', '李四', '1234567891', 'normal', 'https://scwms.chinaccsscm.cn/uploads/20260718/002.jpg', '正常', '良好', '', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(1, 4, 'ZC-2024-0004', 'self', '赵六', '1234567893', 'normal', 'https://scwms.chinaccsscm.cn/uploads/20260718/004.jpg', '正常', '良好', '墨盒余量约60%', DATE_SUB(NOW(), INTERVAL 2 DAY)),
-- 任务4(IT巡检)的记录
(4, 1, 'ZC-2024-0001', 'self', '张三', '1234567890', 'normal', 'https://scwms.chinaccsscm.cn/uploads/20260718/101.jpg', '正常', '良好', '定期检查，无异常', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, 2, 'ZC-2024-0002', 'self', '李四', '1234567891', 'normal', 'https://scwms.chinaccsscm.cn/uploads/20260718/102.jpg', '正常', '良好', '键盘清洁', DATE_SUB(NOW(), INTERVAL 3 DAY)),
-- 异常记录(维修中)
(4, 11, 'ZC-2024-0011', 'self', '冯十三', '1234567900', 'abnormal', 'https://scwms.chinaccsscm.cn/uploads/20260718/111.jpg', '故障', '外观破损', '风扇异响，电源灯不亮，已报修', DATE_SUB(NOW(), INTERVAL 5 DAY));

-- =====================================================
-- 9. 插入测试数据 - 复盘分配表 (3条)
-- =====================================================
INSERT INTO sai_review_assignments 
(TaskId, RecordId, ReviewerName, ReviewerDingtalkId, Status, CreatedAt)
VALUES
-- 任务1的复盘抽查(10%比例，抽查2条)
(1, 1, '王经理', 'manager001', 'pending', NOW()),
(1, 2, '王经理', 'manager001', 'completed', DATE_SUB(NOW(), INTERVAL 1 DAY)),
-- 任务4的复盘抽查
(4, 4, '李主管', 'manager002', 'completed', DATE_SUB(NOW(), INTERVAL 2 DAY));

-- =====================================================
-- 10. 数据验证查询
-- =====================================================
SELECT '========== 数据验证 ==========' AS 信息;

SELECT 
    '资产总数' AS 指标, 
    COUNT(*) AS 数量,
    CONCAT('原值合计: ', FORMAT(SUM(OriginalValue), 2)) AS 备注
FROM sai_assets;

SELECT 
    '任务统计' AS 指标,
    COUNT(*) AS 总数,
    CONCAT(
        'running:', SUM(CASE WHEN Status='running' THEN 1 ELSE 0 END),
        ', draft:', SUM(CASE WHEN Status='draft' THEN 1 ELSE 0 END),
        ', completed:', SUM(CASE WHEN Status='completed' THEN 1 ELSE 0 END)
    ) AS 状态分布
FROM sai_inventory_tasks;

SELECT 
    '盘点记录' AS 指标,
    COUNT(*) AS 总数,
    CONCAT(
        'normal:', SUM(CASE WHEN Status='normal' THEN 1 ELSE 0 END),
        ', abnormal:', SUM(CASE WHEN Status='abnormal' THEN 1 ELSE 0 END)
    ) AS 状态分布
FROM sai_inventory_records;

SELECT 
    '复盘分配' AS 指标,
    COUNT(*) AS 总数,
    CONCAT(
        'pending:', SUM(CASE WHEN Status='pending' THEN 1 ELSE 0 END),
        ', completed:', SUM(CASE WHEN Status='completed' THEN 1 ELSE 0 END)
    ) AS 状态分布
FROM sai_review_assignments;

-- =====================================================
-- 11. 建表完成
-- =====================================================
SELECT '所有表创建完成！' AS 结果;
