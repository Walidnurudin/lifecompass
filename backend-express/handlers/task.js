const db = require('../database/db');
const { getRedisClient } = require('../database/redis');
const { validate: validateUuid } = require('uuid');
const { v4: uuidv4 } = require('uuid');

const validStatuses = { todo: true, in_progress: true, done: true };
const validPriorities = { low: true, medium: true, high: true };
const validCategories = { task: true, hobby: true, event: true };

async function invalidateTaskCache(userID) {
  const redisClient = getRedisClient();
  if (!redisClient) return;

  try {
    let cursor = 0;
    const pattern = `tasks:${userID}:*`;
    do {
      const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = reply.cursor;
      const keys = reply.keys;
      if (keys && keys.length > 0) {
        await redisClient.del(keys);
      }
    } while (cursor !== 0);
  } catch (err) {
    console.error('Failed to invalidate task cache:', err);
  }
}

async function getTasks(req, res) {
  try {
    const userID = req.userID;
    
    // Get query string to reconstruct cache key
    const urlParts = req.originalUrl.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const cacheKey = `tasks:${userID}:${queryString}`;

    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const tasks = JSON.parse(cached);
          return res.status(200).json({ tasks });
        }
      } catch (err) {
        console.warn('Redis read error:', err.message);
      }
    }

    let queryText = 'SELECT * FROM tasks WHERE user_id = $1';
    const queryParams = [userID];
    let paramIndex = 2;

    // Filter status
    const status = req.query.status;
    if (status) {
      const statusLower = status.toLowerCase();
      if (validStatuses[statusLower]) {
        queryText += ` AND status = $${paramIndex}`;
        queryParams.push(statusLower);
        paramIndex++;
      }
    }

    // Filter priority
    const priority = req.query.priority;
    if (priority) {
      const priorityLower = priority.toLowerCase();
      if (validPriorities[priorityLower]) {
        queryText += ` AND priority = $${paramIndex}`;
        queryParams.push(priorityLower);
        paramIndex++;
      }
    }

    // Filter due_date
    const dueDate = req.query.due_date;
    if (dueDate) {
      // Expecting YYYY-MM-DD
      const parsedDate = new Date(dueDate);
      if (!isNaN(parsedDate.getTime())) {
        const nextDay = new Date(parsedDate);
        nextDay.setDate(nextDay.getDate() + 1);

        queryText += ` AND due_date >= $${paramIndex} AND due_date < $${paramIndex + 1}`;
        queryParams.push(parsedDate.toISOString().split('T')[0]);
        queryParams.push(nextDay.toISOString().split('T')[0]);
        paramIndex += 2;
      }
    }

    // Sorting
    const sortBy = req.query.sort_by || 'created_at';
    const order = (req.query.order || 'desc').toLowerCase();

    let orderByClause = '';
    if (sortBy === 'priority') {
      if (order === 'desc') {
        orderByClause = "CASE priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END";
      } else {
        orderByClause = "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END";
      }
    } else {
      const allowedSorts = ['due_date', 'created_at', 'title', 'status'];
      const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'created_at';
      const safeOrder = order === 'asc' ? 'ASC' : 'DESC';
      orderByClause = `${safeSortBy} ${safeOrder}`;
    }

    queryText += ` ORDER BY ${orderByClause}`;

    const dbRes = await db.query(queryText, queryParams);
    const tasks = dbRes.rows;

    if (redisClient) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(tasks), {
          EX: 300, // 5 minutes
        });
      } catch (err) {
        console.warn('Redis write error:', err.message);
      }
    }

    return res.status(200).json({ tasks });
  } catch (err) {
    console.error('Error fetching tasks:', err);
    return res.status(500).json({ error: 'Failed to fetch tasks' });
  }
}

async function createTask(req, res) {
  try {
    const userID = req.userID;
    const { title, description, status, due_date, priority, category } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    let taskStatus = 'todo';
    if (status) {
      const s = status.toLowerCase();
      if (!validStatuses[s]) {
        return res.status(400).json({ error: 'Invalid status. Must be: todo, in_progress, or done' });
      }
      taskStatus = s;
    }

    let taskPriority = 'medium';
    if (priority) {
      const p = priority.toLowerCase();
      if (!validPriorities[p]) {
        return res.status(400).json({ error: 'Invalid priority. Must be: low, medium, or high' });
      }
      taskPriority = p;
    }

    let taskCategory = 'task';
    if (category) {
      const cat = category.toLowerCase();
      if (!validCategories[cat]) {
        return res.status(400).json({ error: 'Invalid category. Must be: task, hobby, or event' });
      }
      taskCategory = cat;
    }

    let parsedDueDate = null;
    if (due_date) {
      const dateObj = new Date(due_date);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({ error: 'Invalid due_date format. Use YYYY-MM-DD' });
      }
      parsedDueDate = dateObj;
    }

    const id = uuidv4();
    const now = new Date();

    const insertRes = await db.query(
      `INSERT INTO tasks (id, user_id, title, description, status, due_date, priority, category, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, userID, title.trim(), description || null, taskStatus, parsedDueDate, taskPriority, taskCategory, now, now]
    );

    const task = insertRes.rows[0];
    await invalidateTaskCache(userID);

    return res.status(201).json({ task });
  } catch (err) {
    console.error('Error creating task:', err);
    return res.status(500).json({ error: 'Failed to create task' });
  }
}

async function getTask(req, res) {
  try {
    const userID = req.userID;
    const taskID = req.params.id;

    if (!validateUuid(taskID)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const dbRes = await db.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskID, userID]
    );

    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    return res.status(200).json({ task: dbRes.rows[0] });
  } catch (err) {
    console.error('Error getting task:', err);
    return res.status(500).json({ error: 'Failed to get task' });
  }
}

async function updateTask(req, res) {
  try {
    const userID = req.userID;
    const taskID = req.params.id;

    if (!validateUuid(taskID)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    // Check if task exists
    const checkRes = await db.query(
      'SELECT * FROM tasks WHERE id = $1 AND user_id = $2',
      [taskID, userID]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const currentTask = checkRes.rows[0];
    const { title, description, status, due_date, priority, category } = req.body;

    let updatedTitle = currentTask.title;
    if (title !== undefined) {
      const trimmed = title.trim();
      if (trimmed === '') {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      updatedTitle = trimmed;
    }

    let updatedDescription = currentTask.description;
    if (description !== undefined) {
      updatedDescription = description;
    }

    let updatedStatus = currentTask.status;
    if (status !== undefined) {
      const s = status.toLowerCase();
      if (!validStatuses[s]) {
        return res.status(400).json({ error: 'Invalid status. Must be: todo, in_progress, or done' });
      }
      updatedStatus = s;
    }

    let updatedPriority = currentTask.priority;
    if (priority !== undefined) {
      const p = priority.toLowerCase();
      if (!validPriorities[p]) {
        return res.status(400).json({ error: 'Invalid priority. Must be: low, medium, or high' });
      }
      updatedPriority = p;
    }

    let updatedCategory = currentTask.category;
    if (category !== undefined) {
      const cat = category.toLowerCase();
      if (!validCategories[cat]) {
        return res.status(400).json({ error: 'Invalid category. Must be: task, hobby, or event' });
      }
      updatedCategory = cat;
    }

    let updatedDueDate = currentTask.due_date;
    if (due_date !== undefined) {
      if (due_date === '') {
        updatedDueDate = null;
      } else {
        const dateObj = new Date(due_date);
        if (isNaN(dateObj.getTime())) {
          return res.status(400).json({ error: 'Invalid due_date format. Use YYYY-MM-DD' });
        }
        updatedDueDate = dateObj;
      }
    }

    const now = new Date();

    const updateRes = await db.query(
      `UPDATE tasks
       SET title = $1, description = $2, status = $3, due_date = $4, priority = $5, category = $6, updated_at = $7
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [updatedTitle, updatedDescription, updatedStatus, updatedDueDate, updatedPriority, updatedCategory, now, taskID, userID]
    );

    await invalidateTaskCache(userID);

    return res.status(200).json({ task: updateRes.rows[0] });
  } catch (err) {
    console.error('Error updating task:', err);
    return res.status(500).json({ error: 'Failed to update task' });
  }
}

async function deleteTask(req, res) {
  try {
    const userID = req.userID;
    const taskID = req.params.id;

    if (!validateUuid(taskID)) {
      return res.status(400).json({ error: 'Invalid task ID' });
    }

    const deleteRes = await db.query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2',
      [taskID, userID]
    );

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await invalidateTaskCache(userID);

    return res.status(200).json({ message: 'Task deleted successfully' });
  } catch (err) {
    console.error('Error deleting task:', err);
    return res.status(500).json({ error: 'Failed to delete task' });
  }
}

module.exports = {
  getTasks,
  createTask,
  getTask,
  updateTask,
  deleteTask,
};
