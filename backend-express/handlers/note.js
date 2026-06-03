const db = require('../database/db');
const { v4: uuidv4 } = require('uuid');

async function getNote(req, res) {
  try {
    const userID = req.userID;

    const dbRes = await db.query(
      'SELECT * FROM notes WHERE user_id = $1',
      [userID]
    );

    if (dbRes.rows.length === 0) {
      // Replicate Go empty Note response structure
      return res.status(200).json({
        note: {
          id: '00000000-0000-0000-0000-000000000000',
          user_id: userID,
          content: '',
          created_at: '0001-01-01T00:00:00Z',
          updated_at: '0001-01-01T00:00:00Z',
        },
      });
    }

    return res.status(200).json({ note: dbRes.rows[0] });
  } catch (err) {
    console.error('Error getting note:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateNote(req, res) {
  try {
    const userID = req.userID;
    const { content } = req.body;

    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Check if exists
    const checkRes = await db.query(
      'SELECT * FROM notes WHERE user_id = $1',
      [userID]
    );

    const now = new Date();
    let note;

    if (checkRes.rows.length === 0) {
      // Create new note
      const id = uuidv4();
      const insertRes = await db.query(
        `INSERT INTO notes (id, user_id, content, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [id, userID, content, now, now]
      );
      note = insertRes.rows[0];
    } else {
      // Update existing note
      const updateRes = await db.query(
        `UPDATE notes
         SET content = $1, updated_at = $2
         WHERE user_id = $3
         RETURNING *`,
        [content, now, userID]
      );
      note = updateRes.rows[0];
    }

    return res.status(200).json({ note });
  } catch (err) {
    console.error('Error updating note:', err);
    return res.status(500).json({ error: 'Failed to update note' });
  }
}

module.exports = {
  getNote,
  updateNote,
};
