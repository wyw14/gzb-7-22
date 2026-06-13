const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/storage');

const router = express.Router();

router.get('/', (req, res) => {
  const users = readJSON('users.json', []);
  const { skillLevel, instrument, city, keyword, currentUserId } = req.query;
  
  let result = users;

  if (currentUserId) {
    const currentUser = users.find(u => u.id === currentUserId);
    const blockedIds = currentUser?.blockedUsers || [];
    result = result.filter(u => !blockedIds.includes(u.id) && u.id !== currentUserId);
  }
  
  if (skillLevel) {
    result = result.filter(u => u.skillLevel === skillLevel);
  }
  if (instrument) {
    result = result.filter(u => u.instruments.includes(instrument));
  }
  if (city) {
    result = result.filter(u => u.city.includes(city));
  }
  if (keyword) {
    const kw = keyword.toLowerCase();
    result = result.filter(u => 
      u.username.toLowerCase().includes(kw) ||
      u.bio.toLowerCase().includes(kw) ||
      u.instruments.some(i => i.toLowerCase().includes(kw))
    );
  }
  
  res.json(result);
});

router.get('/:id/blocked', (req, res) => {
  const users = readJSON('users.json', []);
  const currentUser = users.find(u => u.id === req.params.id);
  if (!currentUser) {
    return res.status(404).json({ error: '用户不存在' });
  }
  const blockedIds = currentUser.blockedUsers || [];
  const blockedUsers = users.filter(u => blockedIds.includes(u.id));
  res.json(blockedUsers);
});

router.post('/:id/block', (req, res) => {
  const users = readJSON('users.json', []);
  const { blockedUserId } = req.body;
  const idx = users.findIndex(u => u.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }
  if (!blockedUserId || blockedUserId === req.params.id) {
    return res.status(400).json({ success: false, error: '无效的屏蔽用户ID' });
  }
  const targetUser = users.find(u => u.id === blockedUserId);
  if (!targetUser) {
    return res.status(404).json({ success: false, error: '被屏蔽用户不存在' });
  }

  if (!users[idx].blockedUsers) {
    users[idx].blockedUsers = [];
  }
  if (users[idx].blockedUsers.includes(blockedUserId)) {
    return res.json({ success: true, alreadyBlocked: true, user: users[idx] });
  }

  users[idx].blockedUsers.push(blockedUserId);
  writeJSON('users.json', users);

  res.json({ success: true, user: users[idx] });
});

router.delete('/:id/block/:blockedUserId', (req, res) => {
  const users = readJSON('users.json', []);
  const idx = users.findIndex(u => u.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ success: false, error: '用户不存在' });
  }

  if (!users[idx].blockedUsers) {
    users[idx].blockedUsers = [];
  }
  users[idx].blockedUsers = users[idx].blockedUsers.filter(id => id !== req.params.blockedUserId);
  writeJSON('users.json', users);

  res.json({ success: true, user: users[idx] });
});

router.get('/:id/block-status/:targetUserId', (req, res) => {
  const users = readJSON('users.json', []);
  const currentUser = users.find(u => u.id === req.params.id);
  if (!currentUser) {
    return res.status(404).json({ error: '用户不存在' });
  }
  const isBlocked = (currentUser.blockedUsers || []).includes(req.params.targetUserId);
  res.json({ isBlocked });
});

router.get('/:id', (req, res) => {
  const users = readJSON('users.json', []);
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: '用户不存在' });
  }
  res.json(user);
});

router.post('/login', (req, res) => {
  const { username, phone } = req.body;
  const users = readJSON('users.json', []);
  
  let user = users.find(u => u.phone === phone);
  
  if (!user) {
    user = {
      id: 'u' + uuidv4().slice(0, 8),
      username: username || '音乐爱好者' + Math.floor(Math.random() * 1000),
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${uuidv4().slice(0, 6)}`,
      phone: phone || '138' + Math.floor(Math.random() * 100000000),
      city: '北京市',
      district: '海淀区',
      latitude: 39.9042,
      longitude: 116.4074,
      bio: '这个人很懒，什么都没留下...',
      skillLevel: '初级',
      instruments: [],
      favoritePieces: [],
      freeTimes: [],
      rating: 5.0,
      reviewCount: 0,
      blockedUsers: [],
      createdAt: new Date().toISOString()
    };
    users.push(user);
    writeJSON('users.json', users);
  }
  
  res.json({ success: true, user });
});

router.put('/:id', (req, res) => {
  const users = readJSON('users.json', []);
  const idx = users.findIndex(u => u.id === req.params.id);
  
  if (idx === -1) {
    return res.status(404).json({ error: '用户不存在' });
  }
  
  users[idx] = { ...users[idx], ...req.body, id: users[idx].id };
  writeJSON('users.json', users);
  
  res.json({ success: true, user: users[idx] });
});

module.exports = router;
