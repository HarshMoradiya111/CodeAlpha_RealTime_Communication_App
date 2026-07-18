const express = require('express');
const crypto = require('crypto');
const Room = require('../models/Room');
const { protect } = require('../middleware/auth');

const router = express.Router();

function createRoomId() {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

router.post('/', protect, async (req, res) => {
  try {
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ message: 'Room title is required.' });
    }

    let roomId = createRoomId();
    let roomExists = await Room.findOne({ roomId });

    while (roomExists) {
      roomId = createRoomId();
      roomExists = await Room.findOne({ roomId });
    }

    const room = await Room.create({
      roomId,
      title,
      owner: req.user._id,
      members: [req.user._id],
    });

    return res.status(201).json({
      id: room._id,
      roomId: room.roomId,
      title: room.title,
      owner: room.owner,
      members: room.members,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create room.', error: error.message });
  }
});

router.post('/join', protect, async (req, res) => {
  try {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ message: 'Room ID is required.' });
    }

    const room = await Room.findOne({ roomId }).populate('members', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    if (!room.members.some((member) => member._id.toString() === req.user._id.toString())) {
      room.members.push(req.user._id);
      await room.save();
    }

    return res.json({
      id: room._id,
      roomId: room.roomId,
      title: room.title,
      owner: room.owner,
      members: room.members,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to join room.', error: error.message });
  }
});

router.get('/:roomId', protect, async (req, res) => {
  try {
    const room = await Room.findOne({ roomId: req.params.roomId }).populate('members', 'name email');

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const isMember =
      room.owner.toString() === req.user._id.toString() ||
      room.members.some((member) => member._id.toString() === req.user._id.toString());

    if (!isMember) {
      return res.status(403).json({ message: 'Room membership required.' });
    }

    return res.json({
      id: room._id,
      roomId: room.roomId,
      title: room.title,
      owner: room.owner,
      members: room.members,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch room.', error: error.message });
  }
});

module.exports = router;
