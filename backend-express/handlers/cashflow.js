const db = require('../database/db');
const { getRedisClient } = require('../database/redis');
const { validate: validateUuid } = require('uuid');
const { v4: uuidv4 } = require('uuid');

const validTypes = { income: true, outcome: true };
const validIncomeCategories = { salary: true, business: true, other: true };
const validOutcomeCategories = {
  snacks: true,
  food: true,
  internet: true,
  transportation: true,
  shopping: true,
  toiletries: true,
  other: true,
};

async function invalidateCashFlowCache(userID) {
  const redisClient = getRedisClient();
  if (!redisClient) return;

  try {
    let cursor = 0;
    const pattern = `cashflows:${userID}:*`;
    do {
      const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: 100 });
      cursor = reply.cursor;
      const keys = reply.keys;
      if (keys && keys.length > 0) {
        await redisClient.del(keys);
      }
    } while (cursor !== 0);
  } catch (err) {
    console.error('Failed to invalidate cashflow cache:', err);
  }
}

async function getCashFlows(req, res) {
  try {
    const userID = req.userID;

    // Get query string to reconstruct cache key
    const urlParts = req.originalUrl.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const cacheKey = `cashflows:${userID}:${queryString}`;

    const redisClient = getRedisClient();
    if (redisClient) {
      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          const list = JSON.parse(cached);
          return res.status(200).json({ cash_flows: list });
        }
      } catch (err) {
        console.warn('Redis read error:', err.message);
      }
    }

    let queryText = 'SELECT * FROM cash_flows WHERE user_id = $1';
    const queryParams = [userID];
    let paramIndex = 2;

    // Filter by month / year
    const { month, year } = req.query;
    if (month && year) {
      // Month and year query range: date >= startDate AND date < endDate
      // Month is 01-12
      const monthInt = parseInt(month, 10);
      const yearInt = parseInt(year, 10);
      if (!isNaN(monthInt) && !isNaN(yearInt) && monthInt >= 1 && monthInt <= 12) {
        const startMonthStr = monthInt < 10 ? `0${monthInt}` : `${monthInt}`;
        const startDate = new Date(`${yearInt}-${startMonthStr}-01T00:00:00Z`);
        const endDate = new Date(startDate);
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);

        queryText += ` AND date >= $${paramIndex} AND date < $${paramIndex + 1}`;
        queryParams.push(startDate.toISOString());
        queryParams.push(endDate.toISOString());
        paramIndex += 2;
      }
    }

    // Sorting
    const sortBy = req.query.sort_by || 'date';
    const order = (req.query.order || 'desc').toLowerCase();

    const allowedSorts = ['date', 'created_at', 'title', 'amount', 'category', 'type'];
    const safeSortBy = allowedSorts.includes(sortBy) ? sortBy : 'date';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    queryText += ` ORDER BY ${safeSortBy} ${safeOrder}`;

    const dbRes = await db.query(queryText, queryParams);
    const list = dbRes.rows;

    if (redisClient) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(list), {
          EX: 300, // 5 minutes
        });
      } catch (err) {
        console.warn('Redis write error:', err.message);
      }
    }

    return res.status(200).json({ cash_flows: list });
  } catch (err) {
    console.error('Error fetching cash flows:', err);
    return res.status(500).json({ error: 'Failed to fetch cash flow entries' });
  }
}

async function createCashFlow(req, res) {
  try {
    const userID = req.userID;
    const { title, type, category, amount, description, date } = req.body;

    if (!title || !type || !category || amount === undefined) {
      return res.status(400).json({ error: 'Invalid input: title, type, category, and amount are required' });
    }

    const cfType = type.toLowerCase();
    if (!validTypes[cfType]) {
      return res.status(400).json({ error: 'Invalid type. Must be: income or outcome' });
    }

    const cfCategory = category.toLowerCase();
    if (cfType === 'income' && !validIncomeCategories[cfCategory]) {
      return res.status(400).json({ error: 'Invalid income category' });
    }
    if (cfType === 'outcome' && !validOutcomeCategories[cfCategory]) {
      return res.status(400).json({ error: 'Invalid outcome category' });
    }

    let cfDate = new Date();
    if (date) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
      }
      cfDate = parsedDate;
    }

    const id = uuidv4();
    const now = new Date();

    const insertRes = await db.query(
      `INSERT INTO cash_flows (id, user_id, title, type, category, amount, description, date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, userID, title.trim(), cfType, cfCategory, Number(amount), description || null, cfDate, now, now]
    );

    const cf = insertRes.rows[0];
    await invalidateCashFlowCache(userID);

    return res.status(201).json({ cash_flow: cf });
  } catch (err) {
    console.error('Error creating cash flow:', err);
    return res.status(500).json({ error: 'Failed to create entry' });
  }
}

async function updateCashFlow(req, res) {
  try {
    const userID = req.userID;
    const cfID = req.params.id;

    if (!validateUuid(cfID)) {
      return res.status(400).json({ error: 'Invalid cash flow ID' });
    }

    // Check if cash flow exists
    const checkRes = await db.query(
      'SELECT * FROM cash_flows WHERE id = $1 AND user_id = $2',
      [cfID, userID]
    );

    if (checkRes.rows.length === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    const currentCF = checkRes.rows[0];
    const { title, type, category, amount, description, date } = req.body;

    let updatedTitle = currentCF.title;
    if (title !== undefined) {
      const trimmed = title.trim();
      if (trimmed === '') {
        return res.status(400).json({ error: 'Title cannot be empty' });
      }
      updatedTitle = trimmed;
    }

    let updatedType = currentCF.type;
    if (type !== undefined) {
      const t = type.toLowerCase();
      if (!validTypes[t]) {
        return res.status(400).json({ error: 'Invalid type' });
      }
      updatedType = t;
    }

    let updatedCategory = currentCF.category;
    if (category !== undefined) {
      const cat = category.toLowerCase();
      // Validate against potentially updated type
      if (updatedType === 'income' && !validIncomeCategories[cat]) {
        return res.status(400).json({ error: 'Invalid income category' });
      }
      if (updatedType === 'outcome' && !validOutcomeCategories[cat]) {
        return res.status(400).json({ error: 'Invalid outcome category' });
      }
      updatedCategory = cat;
    } else if (type !== undefined) {
      // Type was updated but category wasn't. Check if current category is still valid for new type
      if (updatedType === 'income' && !validIncomeCategories[updatedCategory]) {
        return res.status(400).json({ error: 'Current category is invalid for the new type' });
      }
      if (updatedType === 'outcome' && !validOutcomeCategories[updatedCategory]) {
        return res.status(400).json({ error: 'Current category is invalid for the new type' });
      }
    }

    let updatedAmount = currentCF.amount;
    if (amount !== undefined) {
      updatedAmount = Number(amount);
    }

    let updatedDescription = currentCF.description;
    if (description !== undefined) {
      updatedDescription = description;
    }

    let updatedDate = currentCF.date;
    if (date !== undefined) {
      if (date === '') {
        updatedDate = null;
      } else {
        const parsedDate = new Date(date);
        if (isNaN(parsedDate.getTime())) {
          return res.status(400).json({ error: 'Invalid date format' });
        }
        updatedDate = parsedDate;
      }
    }

    const now = new Date();

    const updateRes = await db.query(
      `UPDATE cash_flows
       SET title = $1, type = $2, category = $3, amount = $4, description = $5, date = $6, updated_at = $7
       WHERE id = $8 AND user_id = $9
       RETURNING *`,
      [updatedTitle, updatedType, updatedCategory, updatedAmount, updatedDescription, updatedDate, now, cfID, userID]
    );

    await invalidateCashFlowCache(userID);

    return res.status(200).json({ cash_flow: updateRes.rows[0] });
  } catch (err) {
    console.error('Error updating cash flow:', err);
    return res.status(500).json({ error: 'Failed to update entry' });
  }
}

async function deleteCashFlow(req, res) {
  try {
    const userID = req.userID;
    const cfID = req.params.id;

    if (!validateUuid(cfID)) {
      return res.status(400).json({ error: 'Invalid cash flow ID' });
    }

    const deleteRes = await db.query(
      'DELETE FROM cash_flows WHERE id = $1 AND user_id = $2',
      [cfID, userID]
    );

    if (deleteRes.rowCount === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    await invalidateCashFlowCache(userID);

    return res.status(200).json({ message: 'Entry deleted successfully' });
  } catch (err) {
    console.error('Error deleting cash flow:', err);
    return res.status(500).json({ error: 'Failed to delete entry' });
  }
}

module.exports = {
  getCashFlows,
  createCashFlow,
  updateCashFlow,
  deleteCashFlow,
};
