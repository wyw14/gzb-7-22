const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/storage');

const router = express.Router();

const REPORT_TYPES = {
  instrument: ['虚假信息', '伪劣乐器', '价格欺诈', '其他违规'],
  user: ['爽约搭子', '骚扰行为', '虚假身份', '其他违规'],
  review: ['不友好评价', '恶意差评', '虚假评价', '其他违规'],
  borrow: ['异常借用行为', '损坏乐器', '逾期不还', '其他违规']
};

router.get('/types', (req, res) => {
  res.json(REPORT_TYPES);
});

router.get('/', (req, res) => {
  const reports = readJSON('reports.json', []);
  const users = readJSON('users.json', []);
  const { reporterId, targetType, targetId, status } = req.query;

  let result = reports;

  if (reporterId) {
    result = result.filter(r => r.reporterId === reporterId);
  }
  if (targetType) {
    result = result.filter(r => r.targetType === targetType);
  }
  if (targetId) {
    result = result.filter(r => r.targetId === targetId);
  }
  if (status) {
    result = result.filter(r => r.status === status);
  }

  result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const enriched = result.map(r => ({
    ...r,
    reporter: users.find(u => u.id === r.reporterId) || null
  }));

  res.json(enriched);
});

router.post('/', (req, res) => {
  const reports = readJSON('reports.json', []);
  const { reporterId, targetType, targetId, reason, description } = req.body;

  if (!reporterId || !targetType || !targetId || !reason) {
    return res.status(400).json({ success: false, error: '缺少必填参数' });
  }

  if (!REPORT_TYPES[targetType]) {
    return res.status(400).json({ success: false, error: '无效的举报类型' });
  }

  if (!REPORT_TYPES[targetType].includes(reason)) {
    return res.status(400).json({ success: false, error: '无效的举报原因' });
  }

  const exists = reports.some(r =>
    r.reporterId === reporterId &&
    r.targetType === targetType &&
    r.targetId === targetId &&
    r.status === 'pending'
  );

  if (exists) {
    return res.status(400).json({ success: false, error: '您已举报过该内容，请等待处理' });
  }

  const newReport = {
    id: 'rep' + uuidv4().slice(0, 8),
    reporterId,
    targetType,
    targetId,
    reason,
    description: description || '',
    status: 'pending',
    createdAt: new Date().toISOString(),
    handledAt: null,
    handlerNote: ''
  };

  reports.push(newReport);
  writeJSON('reports.json', reports);

  res.json({ success: true, report: newReport });
});

router.put('/:id/status', (req, res) => {
  const reports = readJSON('reports.json', []);
  const { id } = req.params;
  const { status, handlerNote } = req.body;

  const idx = reports.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: '举报记录不存在' });
  }

  if (!['pending', 'resolved', 'rejected'].includes(status)) {
    return res.status(400).json({ success: false, error: '无效的状态值' });
  }

  reports[idx] = {
    ...reports[idx],
    status,
    handlerNote: handlerNote || reports[idx].handlerNote,
    handledAt: status !== 'pending' ? new Date().toISOString() : null
  };

  writeJSON('reports.json', reports);
  res.json({ success: true, report: reports[idx] });
});

module.exports = router;
