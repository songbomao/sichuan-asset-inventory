-- 四川固定资产盘点系统 - 测试数据插入脚本 (修正版)
-- 执行时间: 2026-07-18
-- 数据库: sai_db
-- 注意: 只有4个表，无 sai_task_assets/sai_inventory_assets

-- ==================== 1. 盘点任务表 ====================
INSERT INTO sai_inventory_tasks 
(TaskName, ScopeType, ScopeConfig, NeedReview, ReviewRatio, Deadline, Status, CreatedBy, CreatedAt)
VALUES
('2026年办公区资产大盘点', 'all', '{}', 1, 0.1, '2026-07-31', 'running', '宋伯茂', NOW()),
('通信机房设备季度盘点', 'by_category', '{"category":"通信设备"}', 1, 0.15, '2026-08-15', 'draft', '宋伯茂', NOW()),
('服务器资产专项盘点', 'by_category', '{"category":"服务器"}', 0, NULL, '2026-08-30', 'completed', '宋伯茂', DATE_SUB(NOW(), INTERVAL 7 DAY)),
('IT设备日常巡检', 'by_cost_center', '{"costCenter":"IT部"}', 1, 0.1, '2026-07-25', 'running', '宋伯茂', DATE_SUB(NOW(), INTERVAL 2 DAY)),
('报废设备清理盘点', 'by_cost_center', '{"costCenter":"运维部"}', 0, NULL, '2026-07-20', 'cancelled', '宋伯茂', DATE_SUB(NOW(), INTERVAL 30 DAY));

-- ==================== 2. 资产主数据表 ====================
INSERT INTO sai_assets
(AssetCode, AssetName, Category, Department, CostCenter, Status, Location, PurchaseDate, OriginalValue, CurrentValue, CreatedAt)
VALUES
('ZC-2024-0001', '戴尔笔记本 Latitude 7430', '计算机设备', 'IT部', 'IT部', 'normal', '办公楼302-001', '2024-03-15', 8500.00, 6800.00, NOW()),
('ZC-2024-0002', '联想笔记本 ThinkPad X1', '计算机设备', 'IT部', 'IT部', 'normal', '办公楼302-002', '2024-03-15', 12000.00, 9600.00, NOW()),
('ZC-2024-0003', 'HP激光打印机 M479fdw', '办公设备', '行政部', '行政部', 'normal', '办公楼101-文印区', '2024-01-20', 4500.00, 3800.00, NOW()),
('ZC-2024-0004', '华为交换机 S5720-28P', '通信设备', '运维部', '运维部', 'normal', '机房-A区-01', '2023-11-10', 8000.00, 6500.00, NOW()),
('ZC-2024-0005', 'H3C防火墙 F1000-AI', '通信设备', '运维部', '运维部', 'normal', '机房-A区-02', '2023-11-10', 15000.00, 12000.00, NOW()),
('ZC-2024-0006', '戴尔服务器 R740', '服务器', '运维部', '运维部', 'normal', '机房-B区-01', '2023-08-05', 45000.00, 38000.00, NOW()),
('ZC-2024-0007', '联想服务器 SR650', '服务器', '运维部', '运维部', 'repair', '机房-B区-02', '2023-08-05', 42000.00, 35000.00, NOW()),
('ZC-2024-0008', '投影仪 明基MX560', '办公设备', '会议室', '行政部', 'normal', '会议室-301', '2024-02-28', 3200.00, 2800.00, NOW()),
('ZC-2024-0009', '碎纸机 科密C-838', '办公设备', '行政部', '行政部', 'normal', '办公楼102-前台', '2024-01-15', 800.00, 650.00, NOW()),
('ZC-2024-0010', 'UPS电源 APC SRT3000', '通信设备', '运维部', '运维部', 'normal', '机房-C区-UPS', '2023-06-20', 28000.00, 22000.00, NOW()),
('ZC-2023-0001', '旧台式机 Dell 7080', '计算机设备', 'IT部', 'IT部', 'scrapped', '库房-待报废区', '2020-05-10', 5500.00, 0.00, DATE_SUB(NOW(), INTERVAL 2 YEAR)),
('ZC-2023-0002', '旧交换机 H3C S5110', '通信设备', '运维部', '运维部', 'lost', '未知', '2019-08-20', 3500.00, 0.00, DATE_SUB(NOW(), INTERVAL 3 YEAR));

-- ==================== 3. 盘点记录表 ====================
INSERT INTO sai_inventory_records
(TaskId, AssetId, AssetCode, OperatorType, Status, OperatorName, OperatorDingtalkId, PhotoUrl, FunctionStatus, AppearanceStatus, Remark, Location, Longitude, Latitude, CreatedAt)
VALUES
-- 任务1的盘点记录
(1, 1, 'ZC-2024-0001', 'self', 'normal', '张三', '1234567890', '/uploads/20260718/001.jpg', '正常', '良好', '设备运行正常', '办公楼302-001', '104.0668', '30.5728', NOW()),
(1, 2, 'ZC-2024-0002', 'self', 'normal', '李四', '1234567891', '/uploads/20260718/002.jpg', '正常', '良好', '', '办公楼302-002', '104.0669', '30.5729', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(1, 3, 'ZC-2024-0003', 'self', 'normal', '王五', '1234567892', '/uploads/20260718/003.jpg', '正常', '良好', '墨盒需更换', '办公楼101-文印区', '104.0670', '30.5730', DATE_SUB(NOW(), INTERVAL 2 DAY)),
-- 任务4的异常记录
(4, 7, 'ZC-2024-0007', 'self', 'repair', '赵六', '1234567893', '/uploads/20260718/007.jpg', '故障', '外观破损', '风扇异响，需维修', '机房-B区-02', '104.0671', '30.5731', DATE_SUB(NOW(), INTERVAL 3 DAY));

-- ==================== 4. 复盘分配表 ====================
INSERT INTO sai_review_assignments
(TaskId, AssetId, AssetCode, ReviewerDingtalkId, ReviewStatus, ReviewTime, ReviewResult, Remark, CreatedAt)
VALUES
-- 任务1的复盘分配（10%比例抽查）
(1, 1, 'ZC-2024-0001', 'manager789', 'pending', NULL, NULL, '', NOW()),
(1, 2, 'ZC-2024-0002', 'manager789', 'pending', NULL, NULL, '', NOW()),
-- 任务4的复盘分配
(4, 1, 'ZC-2024-0001', 'manager789', 'completed', DATE_SUB(NOW(), INTERVAL 1 DAY), 'normal', '核对无误', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 2, 'ZC-2024-0002', 'manager789', 'completed', DATE_SUB(NOW(), INTERVAL 1 DAY), 'normal', '', DATE_SUB(NOW(), INTERVAL 2 DAY));

-- ==================== 数据验证查询 ====================
-- 查看任务统计
SELECT '任务总数' as 指标, COUNT(*) as 数量 FROM sai_inventory_tasks
UNION ALL
SELECT '进行中任务', COUNT(*) FROM sai_inventory_tasks WHERE Status = 'running'
UNION ALL
SELECT '资产总数', COUNT(*) FROM sai_assets
UNION ALL
SELECT '盘点记录数', COUNT(*) FROM sai_inventory_records
UNION ALL
SELECT '复盘分配数', COUNT(*) FROM sai_review_assignments;
