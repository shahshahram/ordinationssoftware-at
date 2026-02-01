const express = require('express');
const router = express.Router();
const ChatConversation = require('../models/ChatConversation');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const auth = require('../middleware/auth');
const mongoose = require('mongoose');

router.use(auth);

/**
 * GET /api/chat/conversations
 * Liste der Konversationen des aktuellen Users (mit letzter Nachricht + Ungelesen-Zähler)
 */
router.get('/conversations', async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await ChatConversation.find({ participants: userId })
      .sort({ updatedAt: -1 })
      .populate('participants', 'firstName lastName email profilePhoto')
      .lean();

    const result = await Promise.all(
      conversations.map(async (conv) => {
        const lastMessage = await ChatMessage.findOne({ conversationId: conv._id })
          .sort({ createdAt: -1 })
          .populate('senderId', 'firstName lastName')
          .lean();
        const unreadCount = await ChatMessage.countDocuments({
          conversationId: conv._id,
          senderId: { $ne: userId },
          'readBy.userId': { $ne: userId }
        });
        return {
          ...conv,
          lastMessage: lastMessage
            ? {
                _id: lastMessage._id,
                text: lastMessage.text,
                senderId: lastMessage.senderId,
                createdAt: lastMessage.createdAt
              }
            : null,
          unreadCount
        };
      })
    );

    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error fetching chat conversations:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Konversationen',
      error: error.message
    });
  }
});

/**
 * POST /api/chat/conversations
 * 1:1: Body { otherUserId } – vorhandene Konversation zurückgeben oder anlegen.
 * Gruppe: Body { participantIds: [...], name? } – neue Gruppenkonversation anlegen.
 */
router.post('/conversations', async (req, res) => {
  try {
    const userId = req.user._id;
    const { otherUserId, participantIds, name } = req.body;

    if (otherUserId) {
      const otherId = mongoose.Types.ObjectId.isValid(otherUserId) ? new mongoose.Types.ObjectId(otherUserId) : null;
      if (!otherId || otherId.equals(userId)) {
        return res.status(400).json({ success: false, message: 'Ungültiger otherUserId' });
      }
      const sorted = [userId, otherId].sort((a, b) => a.toString().localeCompare(b.toString()));
      let conv = await ChatConversation.findOne({ type: 'direct', participants: sorted });
      if (!conv) {
        conv = await ChatConversation.create({ type: 'direct', participants: sorted });
      }
      const populated = await ChatConversation.findById(conv._id)
        .populate('participants', 'firstName lastName email profilePhoto')
        .lean();
      return res.json({ success: true, data: populated });
    }

    if (participantIds && Array.isArray(participantIds)) {
      const ids = [userId];
      const seen = new Set([userId.toString()]);
      for (const id of participantIds) {
        const oid = mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : null;
        if (oid && !seen.has(oid.toString())) {
          ids.push(oid);
          seen.add(oid.toString());
        }
      }
      if (ids.length < 2) {
        return res.status(400).json({ success: false, message: 'Mindestens einen weiteren Teilnehmer auswählen' });
      }
      const conv = await ChatConversation.create({
        type: 'group',
        participants: ids,
        name: name && String(name).trim() ? String(name).trim().slice(0, 100) : null
      });
      const populated = await ChatConversation.findById(conv._id)
        .populate('participants', 'firstName lastName email profilePhoto')
        .lean();
      return res.json({ success: true, data: populated });
    }

    return res.status(400).json({
      success: false,
      message: 'Body: otherUserId (1:1) oder participantIds (+ optional name) für Gruppe erforderlich'
    });
  } catch (error) {
    console.error('Error creating chat conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Anlegen der Konversation',
      error: error.message
    });
  }
});

/**
 * GET /api/chat/conversations/:id/messages
 * Nachrichten einer Konversation (limit, before = cursor vor älteren Nachrichten)
 */
router.get('/conversations/:id/messages', async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const before = req.query.before;

    const conv = await ChatConversation.findById(id);
    if (!conv || !conv.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(404).json({ success: false, message: 'Konversation nicht gefunden' });
    }

    const query = { conversationId: id };
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) query.createdAt = { $lt: beforeDate };
    }
    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('senderId', 'firstName lastName')
      .lean();

    res.json({ success: true, data: messages.reverse() });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Nachrichten',
      error: error.message
    });
  }
});

/**
 * POST /api/chat/conversations/:id/messages
 * Nachricht senden (Body: { text })
 */
router.post('/conversations/:id/messages', async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;
    const { text } = req.body;

    const conv = await ChatConversation.findById(id);
    if (!conv || !conv.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(404).json({ success: false, message: 'Konversation nicht gefunden' });
    }
    if (!text || typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Text erforderlich' });
    }

    const msg = await ChatMessage.create({
      conversationId: id,
      senderId: userId,
      text: text.trim().slice(0, 10000)
    });
    await ChatConversation.updateOne({ _id: id }, { $set: { updatedAt: new Date() } });

    const populated = await ChatMessage.findById(msg._id)
      .populate('senderId', 'firstName lastName')
      .lean();
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error sending chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Senden der Nachricht',
      error: error.message
    });
  }
});

/**
 * PUT /api/chat/conversations/:id/read
 * Nachrichten der Konversation für den aktuellen User als gelesen markieren
 */
router.put('/conversations/:id/read', async (req, res) => {
  try {
    const userId = req.user._id;
    const { id } = req.params;

    const conv = await ChatConversation.findById(id);
    if (!conv || !conv.participants.some((p) => p.toString() === userId.toString())) {
      return res.status(404).json({ success: false, message: 'Konversation nicht gefunden' });
    }

    const messages = await ChatMessage.find({
      conversationId: id,
      senderId: { $ne: userId },
      'readBy.userId': { $ne: userId }
    });
    const now = new Date();
    await Promise.all(
      messages.map((msg) =>
        ChatMessage.updateOne(
          { _id: msg._id },
          { $push: { readBy: { userId, readAt: now } } }
        )
      )
    );

    res.json({ success: true, message: 'Als gelesen markiert' });
  } catch (error) {
    console.error('Error marking chat as read:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Markieren',
      error: error.message
    });
  }
});

/**
 * GET /api/chat/users
 * Liste der User, mit denen gechattet werden darf (alle außer patient, aktiv)
 */
router.get('/users', async (req, res) => {
  try {
    const users = await User.find(
      { role: { $ne: 'patient' }, isActive: true },
      'firstName lastName email role'
    )
      .sort({ firstName: 1, lastName: 1 })
      .lean();
    res.json({ success: true, data: users });
  } catch (error) {
    console.error('Error fetching chat users:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Benutzer',
      error: error.message
    });
  }
});

module.exports = router;
